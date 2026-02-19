import csv
import io
import json
import os
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import FileResponse
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .auth import require_admin, require_roles
from .db import get_db
from .erp_client import ERPClient
from .identify import generate_qr_token, normalize_name, normalize_phone
from .loyalty import LoyaltyRules, calc_earned_points, clamp_redeem_points
from .pdfgen import ReceiptLine, write_simple_receipt_pdf
from .storage import get_redis
from .worker import send_customer_message
from .integration_events import dispatch_event


router = APIRouter(prefix="/api/v1")
public_router = APIRouter(prefix="/api/v1/public")


@public_router.get("/status")
def public_status() -> dict[str, Any]:
    admin_configured = bool(os.getenv("ADMIN_SECRET", ""))
    return {
        "api": "ok",
        "admin_auth_configured": admin_configured,
        "erp_sync_enabled": os.getenv("ERP_SYNC_ENABLED", "false").lower() in ("1", "true", "yes"),
    }


def _cache_get_json(key: str) -> Any | None:
    try:
        r = get_redis()
        raw = r.get(key)
        return json.loads(raw) if raw else None
    except Exception:
        return None


def _cache_set_json(key: str, value: Any, ttl_seconds: int) -> None:
    try:
        r = get_redis()
        r.set(key, json.dumps(value, ensure_ascii=False), ex=ttl_seconds)
    except Exception:
        return


def _cache_del_prefix(prefix: str) -> None:
    try:
        r = get_redis()
        keys = r.keys(prefix + "*") or []
        if keys:
            r.delete(*keys)
    except Exception:
        return


class IdentifyPhoneIn(BaseModel):
    phone: str


class IdentifyNameIn(BaseModel):
    name: str


class IdentifyQrIn(BaseModel):
    qr: str


class SaleItem(BaseModel):
    code: str = Field(min_length=1)
    name: str = Field(min_length=1)
    price: int = Field(ge=0)
    qty: int = Field(ge=1)


class CreateSaleIn(BaseModel):
    customer_id: int
    items: list[SaleItem]
    requested_bonus: int = Field(default=0, ge=0)


@router.get("/dashboard")
def dashboard(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_admin(x_admin_secret)
    today = datetime.now().strftime("%Y-%m-%d")
    cache_key = f"crm:cache:dashboard:{today}"
    cached = _cache_get_json(cache_key)
    if isinstance(cached, dict):
        return cached
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount),0) as sum_total, COALESCE(SUM(bonus_earned),0) as sum_earned, COALESCE(SUM(bonus_used),0) as sum_used FROM transactions WHERE date(created_at)=?",
            (today,),
        )
        row = cur.fetchone()
        cur2 = conn.execute("SELECT COUNT(*) as cnt FROM customers")
        customers_total = int(cur2.fetchone()[0])
        data = {
            "today": today,
            "sales_count": int(row["cnt"]),
            "sales_total": int(row["sum_total"]),
            "bonus_earned": int(row["sum_earned"]),
            "bonus_used": int(row["sum_used"]),
            "customers_total": customers_total,
        }
        _cache_set_json(cache_key, data, ttl_seconds=2)
        return data
    finally:
        conn.close()


@router.get("/customers")
def list_customers(
    q: str | None = None,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_admin(x_admin_secret)
    q_norm = (normalize_name(q) or normalize_phone(q) or "").strip() if q else ""
    cache_key = f"crm:cache:customers:{q_norm}" if q_norm else "crm:cache:customers:all"
    cached = _cache_get_json(cache_key)
    if isinstance(cached, dict) and isinstance(cached.get("items"), list):
        return cached
    db = get_db()
    conn = db.connect()
    try:
        if q:
            qs = normalize_name(q)
            qp = normalize_phone(q)
            like = f"%{qs}%" if qs else "%%"
            cur = conn.execute(
                "SELECT id, phone, full_name, telegram_id, qr_token, balance_points, created_at FROM customers WHERE full_name LIKE ? OR phone=? ORDER BY id DESC LIMIT 200",
                (like, qp),
            )
        else:
            cur = conn.execute(
                "SELECT id, phone, full_name, telegram_id, qr_token, balance_points, created_at FROM customers ORDER BY id DESC LIMIT 200"
            )
        items = [dict(r) for r in cur.fetchall()]
        data = {"items": items}
        _cache_set_json(cache_key, data, ttl_seconds=5)
        return data
    finally:
        conn.close()


@router.get("/customers/{customer_id}")
def get_customer(
    customer_id: int,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_admin(x_admin_secret)
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT id, phone, full_name, telegram_id, qr_token, balance_points, preferences_json, created_at FROM customers WHERE id=?",
            (customer_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Customer not found")
        cust = dict(row)
        cust["preferences"] = json.loads(cust.pop("preferences_json") or "{}")
        cur2 = conn.execute(
            "SELECT id, total_amount, bonus_used, bonus_earned, items_json, receipt_pdf_path, external_erp_ref, created_at FROM transactions WHERE customer_id=? ORDER BY id DESC LIMIT 50",
            (customer_id,),
        )
        tx = []
        for r in cur2.fetchall():
            d = dict(r)
            d["items"] = json.loads(d.pop("items_json") or "[]")
            tx.append(d)
        return {"customer": cust, "transactions": tx}
    finally:
        conn.close()


@router.get("/transactions/{transaction_id}/receipt")
def get_receipt(
    transaction_id: int,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> FileResponse:
    require_admin(x_admin_secret)
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("SELECT receipt_pdf_path FROM transactions WHERE id=?", (transaction_id,))
        row = cur.fetchone()
        if not row or not row["receipt_pdf_path"]:
            raise HTTPException(status_code=404, detail="Receipt not found")
        path = str(row["receipt_pdf_path"])
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="Receipt file missing")
        return FileResponse(path, media_type="application/pdf", filename=os.path.basename(path))
    finally:
        conn.close()


@router.post("/identify/phone")
def identify_phone(
    payload: IdentifyPhoneIn,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_roles(x_admin_secret, roles=("owner", "operator"))
    phone = normalize_phone(payload.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="Invalid phone")
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("SELECT id FROM customers WHERE phone=?", (phone,))
        row = cur.fetchone()
        if row:
            return {"customer_id": int(row[0])}
        token = generate_qr_token()
        cur2 = conn.execute(
            "INSERT INTO customers(phone, full_name, qr_token) VALUES(?,?,?)",
            (phone, "", token),
        )
        conn.commit()
        _cache_del_prefix("crm:cache:customers:")
        return {"customer_id": int(cur2.lastrowid)}
    finally:
        conn.close()


@router.post("/identify/name")
def identify_name(
    payload: IdentifyNameIn,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_roles(x_admin_secret, roles=("owner", "operator"))
    name = normalize_name(payload.name)
    if not name:
        raise HTTPException(status_code=400, detail="Invalid name")
    db = get_db()
    conn = db.connect()
    try:
        like = f"%{name}%"
        cur = conn.execute(
            "SELECT id, phone, full_name, balance_points FROM customers WHERE full_name LIKE ? ORDER BY id DESC LIMIT 20",
            (like,),
        )
        return {"items": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


@router.post("/identify/qr")
def identify_qr(
    payload: IdentifyQrIn,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_roles(x_admin_secret, roles=("owner", "operator"))
    token = payload.qr.strip()
    if not token:
        raise HTTPException(status_code=400, detail="Invalid qr")
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("SELECT id FROM customers WHERE qr_token=?", (token,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Customer not found")
        return {"customer_id": int(row[0])}
    finally:
        conn.close()


@router.post("/pos/sale")
def create_sale(
    payload: CreateSaleIn,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_roles(x_admin_secret, roles=("owner", "operator"))
    if not payload.items:
        raise HTTPException(status_code=400, detail="items required")

    total = sum(i.price * i.qty for i in payload.items)
    tx_id = 0
    result: dict[str, Any] | None = None

    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT id, balance_points, telegram_id, phone, full_name, qr_token FROM customers WHERE id=?",
            (payload.customer_id,),
        )
        cust = cur.fetchone()
        if not cust:
            raise HTTPException(status_code=404, detail="Customer not found")

        rules = LoyaltyRules()
        bonus_used = clamp_redeem_points(total, payload.requested_bonus, int(cust["balance_points"]), rules)
        payable = total - bonus_used
        bonus_earned = calc_earned_points(payable, rules)

        receipt_dir = os.getenv("RECEIPTS_DIR", "receipts")
        receipt_name = f"receipt_{payload.customer_id}_{int(datetime.now().timestamp())}.pdf"
        receipt_path = os.path.join(os.path.dirname(db.path), receipt_dir, receipt_name)
        lines = []
        for it in payload.items:
            lines.append(ReceiptLine(text=f"{it.name} x{it.qty} = {it.price * it.qty} ₽"))
        lines.append(ReceiptLine(text=f"Сумма: {total} ₽"))
        lines.append(ReceiptLine(text=f"Списано: {bonus_used}"))
        lines.append(ReceiptLine(text=f"К оплате: {payable} ₽"))
        lines.append(ReceiptLine(text=f"Начислено: {bonus_earned}"))
        lines.append(ReceiptLine(text=f"Баланс до: {int(cust['balance_points'])}"))
        lines.append(ReceiptLine(text=f"Баланс после: {int(cust['balance_points']) - bonus_used + bonus_earned}"))
        write_simple_receipt_pdf(receipt_path, title="Coffee CRM Receipt", lines=lines)

        new_balance = int(cust["balance_points"]) - bonus_used + bonus_earned

        items_json = json.dumps([i.model_dump() for i in payload.items], ensure_ascii=False)
        cur2 = conn.execute(
            "INSERT INTO transactions(customer_id, total_amount, bonus_used, bonus_earned, items_json, receipt_pdf_path) VALUES(?,?,?,?,?,?)",
            (payload.customer_id, total, bonus_used, bonus_earned, items_json, receipt_path),
        )
        conn.execute(
            "UPDATE customers SET balance_points=?, updated_at=datetime('now') WHERE id=?",
            (new_balance, payload.customer_id),
        )
        conn.commit()
        tx_id = int(cur2.lastrowid)
        _cache_del_prefix("crm:cache:dashboard:")
        _cache_del_prefix("crm:cache:customers:")

        tg_id = cust["telegram_id"]
        if tg_id:
            msg_lines = [
                f"Покупка: {total} ₽",
                f"Списано: {bonus_used}",
                f"Начислено: {bonus_earned}",
                f"Баланс: {new_balance}",
            ]
            send_customer_message.delay(int(tg_id), "\n".join(msg_lines))

        erp_ref = _maybe_sync_to_erpnext(int(cust["telegram_id"] or 0), payload.items, bonus_used)
        if erp_ref:
            conn.execute(
                "UPDATE transactions SET external_erp_ref=? WHERE id=?",
                (erp_ref, tx_id),
            )
            conn.commit()

        result = {
            "transaction_id": tx_id,
            "total": total,
            "bonus_used": bonus_used,
            "bonus_earned": bonus_earned,
            "payable": payable,
            "balance": new_balance,
            "receipt_pdf_path": receipt_path,
            "external_erp_ref": erp_ref,
        }
    finally:
        conn.close()

    if result:
        dispatch_event(
            "transaction.created",
            {
                "transaction_id": int(result["transaction_id"]),
                "customer_id": payload.customer_id,
                "total": int(result["total"]),
                "bonus_used": int(result["bonus_used"]),
                "bonus_earned": int(result["bonus_earned"]),
            },
        )
        return result

    raise HTTPException(status_code=500, detail="Transaction not created")


def _maybe_sync_to_erpnext(telegram_id: int, items: list[SaleItem], bonus_used: int) -> str | None:
    enabled = os.getenv("ERP_SYNC_ENABLED", "false").lower() in ("1", "true", "yes")
    if not enabled:
        return None
    if not telegram_id:
        return None
    client = ERPClient()

    async def runner() -> str | None:
        tg = await client.get_customer_by_telegram_id(telegram_id)
        if not tg:
            return None
        mapped = [{"code": i.code, "qty": i.qty, "price": i.price, "name": i.name} for i in items]
        res = await client.create_order(tg["name"], mapped, bonus_used)
        return res.get("order_id")

    import asyncio

    try:
        return asyncio.run(runner())
    except Exception:
        return None


@router.get("/exports/transactions.csv")
def export_transactions_csv(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> StreamingResponse:
    require_admin(x_admin_secret)
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT t.id, t.created_at, c.phone, c.full_name, t.total_amount, t.bonus_used, t.bonus_earned, t.external_erp_ref FROM transactions t JOIN customers c ON c.id=t.customer_id ORDER BY t.id DESC LIMIT 2000"
        )
        out = io.StringIO()
        w = csv.writer(out)
        w.writerow(["id", "created_at", "phone", "full_name", "total_amount", "bonus_used", "bonus_earned", "external_erp_ref"])
        for r in cur.fetchall():
            w.writerow([r["id"], r["created_at"], r["phone"], r["full_name"], r["total_amount"], r["bonus_used"], r["bonus_earned"], r["external_erp_ref"]])
        data = out.getvalue().encode("utf-8")
        return StreamingResponse(
            io.BytesIO(data),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=transactions.csv"},
        )
    finally:
        conn.close()
