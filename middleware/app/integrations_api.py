import json
import secrets
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from .auth import require_integration_secret, require_roles
from .db import get_db
from .identify import generate_qr_token, normalize_phone
from .integration_events import dispatch_event
from .loyalty import LoyaltyRules, calc_earned_points, clamp_redeem_points
from .pos_templates import list_integration_templates
from .storage import get_redis
from .worker import send_customer_message


router = APIRouter(prefix="/api/v1/integrations")
public_router = APIRouter(prefix="/api/v1/public/integrations")


def _cache_del_prefix(prefix: str) -> None:
    try:
        r = get_redis()
        keys = r.keys(prefix + "*") or []
        if keys:
            r.delete(*keys)
    except Exception:
        return

class IntegrationIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    kind: str = Field(min_length=1, max_length=50)
    enabled: bool = True
    config: dict[str, Any] = Field(default_factory=dict)


class IntegrationOut(BaseModel):
    id: int
    name: str
    kind: str
    enabled: bool
    secret: str
    config: dict[str, Any]


@router.get("")
def list_integrations(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_roles(x_admin_secret, roles=("owner", "marketer"))
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("SELECT id, name, kind, enabled, secret, config_json FROM integrations ORDER BY id DESC")
        items = []
        for r in cur.fetchall():
            try:
                cfg = json.loads(r["config_json"] or "{}")
            except Exception:
                cfg = {}
            items.append(
                {
                    "id": int(r["id"]),
                    "name": str(r["name"]),
                    "kind": str(r["kind"]),
                    "enabled": bool(int(r["enabled"])) ,
                    "secret": str(r["secret"]),
                    "config": cfg,
                }
            )
        return {"items": items}
    finally:
        conn.close()


@router.get("/templates")
def list_templates(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_roles(x_admin_secret, roles=("owner", "marketer"))
    return {"items": list_integration_templates()}


@router.post("")
def create_integration(
    payload: IntegrationIn,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_roles(x_admin_secret, roles=("owner", "marketer"))
    secret = secrets.token_urlsafe(24)
    cfg = json.dumps(payload.config or {}, ensure_ascii=False)
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "INSERT INTO integrations(name, kind, enabled, secret, config_json) VALUES(?,?,?,?,?)",
            (payload.name, payload.kind, 1 if payload.enabled else 0, secret, cfg),
        )
        conn.commit()
        return {"id": int(cur.lastrowid)}
    finally:
        conn.close()


@router.get("/{integration_id}")
def get_integration(
    integration_id: int,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_roles(x_admin_secret, roles=("owner", "marketer"))
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("SELECT id, name, kind, enabled, secret, config_json FROM integrations WHERE id=?", (integration_id,))
        r = cur.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Integration not found")
        try:
            cfg = json.loads(r["config_json"] or "{}")
        except Exception:
            cfg = {}
        return {
            "integration": {
                "id": int(r["id"]),
                "name": str(r["name"]),
                "kind": str(r["kind"]),
                "enabled": bool(int(r["enabled"])) ,
                "secret": str(r["secret"]),
                "config": cfg,
            }
        }
    finally:
        conn.close()


@router.put("/{integration_id}")
def update_integration(
    integration_id: int,
    payload: IntegrationIn,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_roles(x_admin_secret, roles=("owner", "marketer"))
    cfg = json.dumps(payload.config or {}, ensure_ascii=False)
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "UPDATE integrations SET name=?, kind=?, enabled=?, config_json=?, updated_at=datetime('now') WHERE id=?",
            (payload.name, payload.kind, 1 if payload.enabled else 0, cfg, integration_id),
        )
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Integration not found")
        return {"updated": True}
    finally:
        conn.close()


@router.post("/{integration_id}/rotate-secret")
def rotate_secret(
    integration_id: int,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_roles(x_admin_secret, roles=("owner", "marketer"))
    secret = secrets.token_urlsafe(24)
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "UPDATE integrations SET secret=?, updated_at=datetime('now') WHERE id=?",
            (secret, integration_id),
        )
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Integration not found")
        return {"secret": secret}
    finally:
        conn.close()


@router.delete("/{integration_id}")
def delete_integration(
    integration_id: int,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_roles(x_admin_secret, roles=("owner", "marketer"))
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("DELETE FROM integrations WHERE id=?", (integration_id,))
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Integration not found")
        return {"deleted": True}
    finally:
        conn.close()


@router.get("/{integration_id}/deliveries")
def list_deliveries(
    integration_id: int,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_roles(x_admin_secret, roles=("owner", "marketer"))
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT id, event_type, status, http_status, created_at FROM integration_deliveries WHERE integration_id=? ORDER BY id DESC LIMIT 200",
            (integration_id,),
        )
        return {"items": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


class ReceiptCustomer(BaseModel):
    phone: str | None = None
    qr_token: str | None = None
    telegram_id: int | None = None


class ReceiptItem(BaseModel):
    code: str = Field(min_length=1)
    name: str = Field(min_length=1)
    price: int = Field(ge=0)
    qty: int = Field(ge=1)


class ReceiptIn(BaseModel):
    receipt_id: str = Field(min_length=1, max_length=120)
    occurred_at: str | None = None
    total_amount: int | None = Field(default=None, ge=0)
    bonus_used: int | None = Field(default=None, ge=0)
    bonus_earned: int | None = Field(default=None, ge=0)
    customer: ReceiptCustomer
    items: list[ReceiptItem]


@public_router.post("/{integration_id}/pos/receipt")
def ingest_pos_receipt(
    integration_id: int,
    payload: ReceiptIn,
    x_integration_secret: str | None = Header(default=None, alias="x-integration-secret"),
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("SELECT id, enabled, secret, kind FROM integrations WHERE id=?", (integration_id,))
        integ = cur.fetchone()
        if not integ:
            raise HTTPException(status_code=404, detail="Integration not found")
        if str(integ["kind"]) != "pos_webhook":
            raise HTTPException(status_code=400, detail="Integration kind mismatch")
        if int(integ["enabled"]) != 1:
            raise HTTPException(status_code=403, detail="Integration disabled")
        require_integration_secret(x_integration_secret, str(integ["secret"]))

        existing = conn.execute("SELECT id FROM transactions WHERE pos_receipt_id=?", (payload.receipt_id,)).fetchone()
        if existing:
            return {"accepted": True, "duplicate": True, "transaction_id": int(existing[0])}

        cust_id = _find_or_create_customer(conn, payload.customer)
        cust = conn.execute(
            "SELECT id, balance_points, telegram_id FROM customers WHERE id=?",
            (cust_id,),
        ).fetchone()
        if not cust:
            raise HTTPException(status_code=500, detail="Customer lookup failed")

        total = payload.total_amount
        if total is None:
            total = sum(i.price * i.qty for i in payload.items)

        rules = LoyaltyRules()
        available = int(cust["balance_points"])
        requested_used = int(payload.bonus_used or 0)
        bonus_used = clamp_redeem_points(int(total), requested_used, available, rules)
        payable = int(total) - bonus_used
        bonus_earned = int(payload.bonus_earned) if payload.bonus_earned is not None else calc_earned_points(payable, rules)
        new_balance = available - bonus_used + bonus_earned

        items_json = json.dumps([i.model_dump() for i in payload.items], ensure_ascii=False)
        cur2 = conn.execute(
            "INSERT INTO transactions(customer_id, total_amount, bonus_used, bonus_earned, items_json, pos_receipt_id, created_at) VALUES(?,?,?,?,?,?,?)",
            (
                cust_id,
                int(total),
                int(bonus_used),
                int(bonus_earned),
                items_json,
                payload.receipt_id,
                payload.occurred_at or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            ),
        )
        conn.execute(
            "UPDATE customers SET balance_points=?, updated_at=datetime('now') WHERE id=?",
            (new_balance, cust_id),
        )
        conn.commit()
        tx_id = int(cur2.lastrowid)

        _cache_del_prefix("crm:cache:dashboard:")
        _cache_del_prefix("crm:cache:customers:")

        tg_id = cust["telegram_id"]
        if tg_id:
            send_customer_message.delay(int(tg_id), f"Покупка: {int(total)} ₽\nБаланс: {new_balance}")

        dispatch_event(
            "pos.receipt.ingested",
            {"transaction_id": tx_id, "customer_id": cust_id, "receipt_id": payload.receipt_id, "total": int(total)},
        )
        dispatch_event(
            "transaction.created",
            {"transaction_id": tx_id, "customer_id": cust_id, "total": int(total), "bonus_used": int(bonus_used), "bonus_earned": int(bonus_earned)},
        )

        return {"accepted": True, "transaction_id": tx_id, "customer_id": cust_id}
    finally:
        conn.close()


def _find_or_create_customer(conn, cust: ReceiptCustomer) -> int:
    if cust.qr_token:
        row = conn.execute("SELECT id FROM customers WHERE qr_token=?", (cust.qr_token.strip(),)).fetchone()
        if row:
            return int(row[0])
    if cust.phone:
        phone = normalize_phone(cust.phone)
        if phone:
            row = conn.execute("SELECT id FROM customers WHERE phone=?", (phone,)).fetchone()
            if row:
                return int(row[0])
            token = generate_qr_token()
            cur = conn.execute(
                "INSERT INTO customers(phone, full_name, qr_token, telegram_id) VALUES(?,?,?,?)",
                (phone, "", token, int(cust.telegram_id) if cust.telegram_id else None),
            )
            return int(cur.lastrowid)
    if cust.telegram_id:
        row = conn.execute("SELECT id FROM customers WHERE telegram_id=?", (int(cust.telegram_id),)).fetchone()
        if row:
            return int(row[0])
        token = generate_qr_token()
        cur = conn.execute(
            "INSERT INTO customers(phone, full_name, qr_token, telegram_id) VALUES(?,?,?,?)",
            (None, "", token, int(cust.telegram_id)),
        )
        return int(cur.lastrowid)

    token = generate_qr_token()
    cur = conn.execute("INSERT INTO customers(phone, full_name, qr_token) VALUES(?,?,?)", (None, "", token))
    return int(cur.lastrowid)
