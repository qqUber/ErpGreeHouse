import csv
import io
import json
import os
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Header, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .auth import require_admin, require_roles, require_permission, ALL_PERMISSIONS, get_default_permissions
from .db import get_db
from .erp_client import ERPClient
from .identify import generate_qr_token, normalize_name, normalize_phone
from .loyalty import LoyaltyRules, calc_earned_points, clamp_redeem_points
from .pdfgen import ReceiptLine, write_simple_receipt_pdf
from .storage import get_redis
from .worker import send_customer_message
from .integration_events import dispatch_event
from .trigger_engine import evaluate_and_queue_triggers


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


class CreateCustomerIn(BaseModel):
    full_name: str
    phone: str | None = None
    notes: str | None = None
    birthday: str | None = None # YYYY-MM-DD
    marketing_allowed: int = 1
    data_processing_allowed: int = 1


class SaleItem(BaseModel):
    code: str = Field(min_length=1)
    name: str = Field(min_length=1)
    price: int = Field(ge=0)
    qty: int = Field(ge=1)


class CreateSaleIn(BaseModel):
    customer_id: int
    items: list[SaleItem]
    requested_bonus: int = Field(default=0, ge=0)


class PermissionUpdate(BaseModel):
    role: str
    permission: str
    is_allowed: bool


@router.get("/roles/permissions")
def list_permissions(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    # Owner only for managing permissions
    require_roles(x_admin_secret, roles=("owner",))
    
    db = get_db()
    conn = db.connect()
    try:
        # Get all configured permissions
        cur = conn.execute("SELECT role, permission, is_allowed FROM role_permissions ORDER BY role, permission")
        items = [dict(r) for r in cur.fetchall()]
        
        # Ensure we return a structure that includes defaults if not in DB?
        # For now, let's just return what's in DB. The UI can handle "undefined means default false/true based on role".
        # But actually, the UI needs to know the full list of available permissions to show checkboxes.
        
        # Use the single source of truth from auth.py
        known_permissions = ALL_PERMISSIONS
        
        known_roles = ["operator", "manager", "marketer"] # Owner has all
        
        # Build a complete matrix
        matrix = []
        configured = {(r["role"], r["permission"]): bool(r["is_allowed"]) for r in items}
        
        for role in known_roles:
            role_defaults = get_default_permissions(role)
            for perm in known_permissions:
                is_allowed = configured.get((role, perm), False)
                # Apply defaults for operator if not configured
                if (role, perm) not in configured:
                    if perm in role_defaults:
                        is_allowed = True
                
                matrix.append({
                    "role": role,
                    "permission": perm,
                    "is_allowed": is_allowed
                })
                
        return {"items": matrix}
    finally:
        conn.close()


@router.post("/roles/permissions")
def update_permission(
    payload: PermissionUpdate,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_roles(x_admin_secret, roles=("owner",))
    
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "INSERT INTO role_permissions(role, permission, is_allowed, updated_at) VALUES(?,?,?, datetime('now')) "
            "ON CONFLICT(role, permission) DO UPDATE SET is_allowed=excluded.is_allowed, updated_at=excluded.updated_at",
            (payload.role, payload.permission, 1 if payload.is_allowed else 0)
        )
        conn.commit()
        return {"status": "ok"}
    finally:
        conn.close()


@router.get("/dashboard")
def dashboard(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_permission(x_admin_secret, "dashboard.read")
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
        # Recent Activity (Transactions)
        cur_tx = conn.execute(
            "SELECT id, created_at, total_amount, bonus_earned, bonus_used FROM transactions ORDER BY created_at DESC LIMIT 10"
        )
        txs = [dict(r) for r in cur_tx.fetchall()]
        
        # Recent Marketing Triggers (Events)
        cur_tr = conn.execute(
            "SELECT e.id, e.created_at, e.status, t.name as trigger_name "
            "FROM marketing_trigger_events e "
            "JOIN marketing_triggers t ON e.trigger_id = t.id "
            "ORDER BY e.created_at DESC LIMIT 5"
        )
        trevents = [dict(r) for r in cur_tr.fetchall()]

        data = {
            "today": today,
            "sales_count": int(row["cnt"]),
            "sales_total": int(row["sum_total"]),
            "bonus_earned": int(row["sum_earned"]),
            "bonus_used": int(row["sum_used"]),
            "customers_total": customers_total,
            "recent_activity": {
                "transactions": txs,
                "marketing_events": trevents
            }
        }
        _cache_set_json(cache_key, data, ttl_seconds=300) 
        return data
    finally:
        conn.close()


@router.get("/stats/sales")
def sales_stats(
    days: int = 7,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_permission(x_admin_secret, "dashboard.read")
    db = get_db()
    conn = db.connect()
    try:
        # Aggregate daily sales for the trend line
        cur = conn.execute(
            """
            SELECT date(created_at) as day, COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as total
            FROM transactions
            WHERE created_at >= date('now', ?)
            GROUP BY day
            ORDER BY day ASC
            """,
            (f"-{days} days",),
        )
        stats = [dict(r) for r in cur.fetchall()]
        return {"stats": stats}
    finally:
        conn.close()


@router.get("/customers")
def list_customers(
    q: str | None = None,
    min_balance: int | None = None,
    max_balance: int | None = None,
    has_orders: bool | None = None,
    created_after: str | None = None,
    created_before: str | None = None,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_permission(x_admin_secret, "customer.list")
    
    # Cache key depends on all filters
    filters_key = f"{q or ''}:{min_balance}:{max_balance}:{has_orders}:{created_after}:{created_before}"
    cache_key = f"crm:cache:customers:filter:{filters_key}"
    
    cached = _cache_get_json(cache_key)
    if isinstance(cached, dict) and isinstance(cached.get("items"), list):
        return cached

    db = get_db()
    conn = db.connect()
    try:
        where = []
        args = []

        if q:
            qs = normalize_name(q)
            qp = normalize_phone(q)
            where.append("(full_name LIKE ? OR phone LIKE ?)")
            args.extend([f"%{qs}%", f"%{qp}%"])
        
        if min_balance is not None:
            where.append("balance_points >= ?")
            args.append(min_balance)
        
        if max_balance is not None:
            where.append("balance_points <= ?")
            args.append(max_balance)
            
        if created_after:
            where.append("date(created_at) >= ?")
            args.append(created_after)
            
        if created_before:
            where.append("date(created_at) <= ?")
            args.append(created_before)

        if has_orders:
            where.append("EXISTS (SELECT 1 FROM transactions WHERE transactions.customer_id = customers.id)")
            
        sql = "SELECT id, phone, full_name, telegram_id, qr_token, balance_points, created_at FROM customers"
        if where:
            sql += " WHERE " + " AND ".join(where)
        sql += " ORDER BY id DESC LIMIT 200"
        
        cur = conn.execute(sql, tuple(args))
        items = [dict(r) for r in cur.fetchall()]
        data = {"items": items}
        
        # Cache for shorter time if filtered
        _cache_set_json(cache_key, data, ttl_seconds=5)
        return data
    finally:
        conn.close()


@router.get("/customers/{customer_id}")
def get_customer(
    customer_id: int,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_permission(x_admin_secret, "customer.read")
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


@router.post("/customers")
def create_customer(
    payload: CreateCustomerIn,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_permission(x_admin_secret, "customer.create")
    if not payload.full_name:
        raise HTTPException(status_code=400, detail="Name required")
    
    db = get_db()
    conn = db.connect()
    try:
        phone = normalize_phone(payload.phone) if payload.phone else None
        if phone:
            cur = conn.execute("SELECT id FROM customers WHERE phone=?", (phone,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Customer with this phone already exists")
        
        token = generate_qr_token()
        prefs = json.dumps({"notes": payload.notes} if payload.notes else {})
        
        cur = conn.execute(
            """
            INSERT INTO customers(full_name, phone, qr_token, preferences_json, balance_points, birthday, marketing_allowed, data_processing_allowed) 
            VALUES(?,?,?,?,0,?,?,?)
            """,
            (payload.full_name, phone, token, prefs, payload.birthday, payload.marketing_allowed, payload.data_processing_allowed)
        )
        conn.commit()
        cid = cur.lastrowid
        _cache_del_prefix("crm:cache:customers:")
        return {"id": cid, "qr_token": token}
    finally:
        conn.close()


@router.get("/transactions/{transaction_id}/receipt")
def get_receipt(
    transaction_id: int,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> FileResponse:
    require_permission(x_admin_secret, "transaction.read")
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
    require_permission(x_admin_secret, "customer.create")
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
    require_permission(x_admin_secret, "customer.search")
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
    require_permission(x_admin_secret, "customer.search")
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
    background_tasks: BackgroundTasks,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_permission(x_admin_secret, "pos.sale")
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

        spent_row = conn.execute("SELECT SUM(total_amount) FROM transactions WHERE customer_id=?", (payload.customer_id,)).fetchone()
        spent_amount = int(spent_row[0]) if spent_row and spent_row[0] else 0

        rules = LoyaltyRules()
        bonus_used = clamp_redeem_points(total, spent_amount, payload.requested_bonus, int(cust["balance_points"]), rules)
        payable = total - bonus_used
        bonus_earned = calc_earned_points(payable, spent_amount, rules)

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
        
        # Evaluate triggers
        event_data = {
            "transaction_id": tx_id,
            "total_amount": total,
            "bonus_used": bonus_used,
            "bonus_earned": bonus_earned,
        }
        background_tasks.add_task(evaluate_and_queue_triggers, payload.customer_id, "pos.sale", event_data)

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
    require_permission(x_admin_secret, "report.export")
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
