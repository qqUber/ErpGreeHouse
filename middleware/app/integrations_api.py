import json
import secrets
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from .admin_auth_api import require_jwt_auth
from .auth import check_roles, has_permission, require_integration_secret
from .customer_identity import resolve_or_create_customer
from .db import get_db
from .identify import normalize_phone
from .utils.currency import format_currency
from .integration_events import dispatch_event
from .loyalty import LoyaltyRules, calc_earned_points, clamp_redeem_points
from .loyalty_profile import build_customer_loyalty_profile
from .pos_templates import list_integration_templates
from .runtime import is_debug
from .storage import get_redis
from .trigger_engine import evaluate_and_queue_triggers
from .worker import send_customer_message

router = APIRouter(prefix="/api/v1/integrations")
public_router = APIRouter(prefix="/api/v1/public/integrations")


def _cache_del_prefix(prefix: str) -> None:
    try:
        r = get_redis()
        keys = r.keys(prefix + "*") or []
        if keys:
            r.delete(*keys)  # type: ignore[misc]
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
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> list[IntegrationOut]:
    check_roles(auth_result, roles=("owner", "marketer"))
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT id, name, kind, enabled, secret, config_json FROM integrations ORDER BY id DESC"
        )
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
                    "enabled": bool(int(r["enabled"])),
                    "secret": str(r["secret"]),
                    "config": cfg,
                }
            )
        return items  # type: ignore[return-value]
    finally:
        conn.close()


@router.get("/templates")
def list_templates(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_roles(auth_result, roles=("owner", "marketer"))
    return {"items": list_integration_templates()}


@router.post("")
def create_integration(
    payload: IntegrationIn,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_roles(auth_result, roles=("owner", "marketer"))
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
        return {"id": int(cur.lastrowid)}  # type: ignore[arg-type]
    finally:
        conn.close()


@router.get("/{integration_id}")
def get_integration(
    integration_id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_roles(auth_result, roles=("owner", "marketer"))
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT id, name, kind, enabled, secret, config_json FROM integrations WHERE id=?",
            (integration_id,),
        )
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
                "enabled": bool(int(r["enabled"])),
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
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_roles(auth_result, roles=("owner", "marketer"))
    cfg = json.dumps(payload.config or {}, ensure_ascii=False)
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "UPDATE integrations SET name=?, kind=?, enabled=?, config_json=?, updated_at=datetime('now') WHERE id=?",
            (
                payload.name,
                payload.kind,
                1 if payload.enabled else 0,
                cfg,
                integration_id,
            ),
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
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_roles(auth_result, roles=("owner", "marketer"))
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
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_roles(auth_result, roles=("owner", "marketer"))
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
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_roles(auth_result, roles=("owner", "marketer"))
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


class DevCreateSaleIn(BaseModel):
    customer_qr: str = Field(min_length=1, max_length=120)


@public_router.post("/{integration_id}/pos/receipt")
def ingest_pos_receipt(
    integration_id: int,
    payload: ReceiptIn,
    x_integration_secret: str | None = Header(
        default=None, alias="x-integration-secret"
    ),
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT id, enabled, secret, kind FROM integrations WHERE id=?",
            (integration_id,),
        )
        integ = cur.fetchone()
        if not integ:
            raise HTTPException(status_code=404, detail="Integration not found")
        if str(integ["kind"]) != "pos_webhook":
            raise HTTPException(status_code=400, detail="Integration kind mismatch")
        if int(integ["enabled"]) != 1:
            raise HTTPException(status_code=403, detail="Integration disabled")
        require_integration_secret(x_integration_secret, str(integ["secret"]))

        existing = conn.execute(
            "SELECT id FROM transactions WHERE pos_receipt_id=?", (payload.receipt_id,)
        ).fetchone()
        if existing:
            return {
                "accepted": True,
                "duplicate": True,
                "transaction_id": int(existing[0]),
            }

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

        spent_row = conn.execute(
            "SELECT SUM(total_amount) FROM transactions WHERE customer_id=?", (cust_id,)
        ).fetchone()
        spent_amount = int(spent_row[0]) if spent_row and spent_row[0] else 0

        rules = LoyaltyRules()
        available = int(cust["balance_points"])
        requested_used = int(payload.bonus_used or 0)
        bonus_used = clamp_redeem_points(
            int(total), spent_amount, requested_used, available, rules
        )
        payable = int(total) - bonus_used
        bonus_earned = (
            int(payload.bonus_earned)
            if payload.bonus_earned is not None
            else calc_earned_points(payable, spent_amount, rules)
        )
        new_balance = available - bonus_used + bonus_earned

        items_json = json.dumps(
            [i.model_dump() for i in payload.items], ensure_ascii=False
        )
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
        tx_id = int(cur2.lastrowid)  # type: ignore[arg-type]

        _cache_del_prefix("crm:cache:dashboard:")
        _cache_del_prefix("crm:cache:customers:")

        tg_id = cust["telegram_id"]
        if tg_id:
            send_customer_message.delay(
                int(tg_id), f"Покупка: {format_currency(total)}\nБаланс: {new_balance}"
            )

        dispatch_event(
            "pos.receipt.ingested",
            {
                "transaction_id": tx_id,
                "customer_id": cust_id,
                "receipt_id": payload.receipt_id,
                "total": int(total),
            },
        )
        dispatch_event(
            "transaction.created",
            {
                "transaction_id": tx_id,
                "customer_id": cust_id,
                "total": int(total),
                "bonus_used": int(bonus_used),
                "bonus_earned": int(bonus_earned),
            },
        )

        return {"accepted": True, "transaction_id": tx_id, "customer_id": cust_id}
    finally:
        conn.close()


@router.post("/dev/create-sale")
def create_dev_sale(
    payload: DevCreateSaleIn,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    if not is_debug():
        raise HTTPException(status_code=404, detail="Not found")

    role = str(auth_result.get("role") or "")
    if not (
        has_permission(role, "pos.sale") or has_permission(role, "integration.update")
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: missing permission 'pos.sale' or 'integration.update'",
        )

    customer_qr = payload.customer_qr.strip()
    if not customer_qr:
        raise HTTPException(status_code=400, detail="customer_qr is required")

    db = get_db()
    conn = db.connect()
    try:
        integrations = conn.execute(
            "SELECT id, secret FROM integrations WHERE kind='pos_webhook' AND enabled=1 ORDER BY id DESC"
        ).fetchall()
        if not integrations:
            raise HTTPException(
                status_code=404, detail="Enabled pos_webhook integration not found"
            )
        if len(integrations) > 1:
            raise HTTPException(
                status_code=409,
                detail="Multiple enabled pos_webhook integrations found; select a single active integration for DEV sale",
            )
        integration = integrations[0]
        customer = conn.execute(
            "SELECT id FROM customers WHERE qr_token=?",
            (customer_qr,),
        ).fetchone()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer QR not found")
        integration_id = int(integration["id"])
        integration_secret = str(integration["secret"])
        customer_id = int(customer["id"])
    finally:
        conn.close()

    now = datetime.now()
    transaction_id = (
        f"POS-KAF-{now.strftime('%Y%m%d-%H%M%S-%f')}-{secrets.token_hex(3).upper()}"
    )
    pos_payload = {
        "transactionId": transaction_id,
        "posDeviceId": "KAFANA-BG-01",
        "businessDate": now.strftime("%Y-%m-%d"),
        "timestamp": now.isoformat(timespec="seconds"),
        "operatorId": "barista_anon",
        "customerQr": customer_qr,
        "items": [
            {
                "name": "Espresso",
                "quantity": 1,
                "price": 280,
                "vatRate": 20,
                "total": 280,
            },
            {
                "name": "Kafa sa mlekom",
                "quantity": 1,
                "price": 350,
                "vatRate": 20,
                "total": 350,
            },
        ],
        "totalAmount": 630,
        "paymentMethod": "CARD",
        "fiscalInfo": {
            "pib": "123456789",
            "fiscalNumber": f"FSC-{now.strftime('%Y%m%d-%H%M%S')}",
            "invoiceNumber": "R-001/2026",
            "qrCodeUrl": "https://efiskal.poreskauprava.gov.rs/qr?tx=abc123",
        },
        "loyaltyTrigger": True,
        "notes": "Anonimna prodaja preko QR",
    }

    receipt_payload = ReceiptIn(
        receipt_id=pos_payload["transactionId"],
        occurred_at=pos_payload["timestamp"],
        total_amount=int(pos_payload["totalAmount"]),
        bonus_used=0,
        bonus_earned=0,
        customer=ReceiptCustomer(qr_token=customer_qr),
        items=[
            ReceiptItem(code="ESPRESSO", name="Espresso", price=280, qty=1),
            ReceiptItem(code="KAFA_MLEKO", name="Kafa sa mlekom", price=350, qty=1),
        ],
    )

    result = ingest_pos_receipt(integration_id, receipt_payload, integration_secret)
    db = get_db()
    conn = db.connect()
    try:
        profile = build_customer_loyalty_profile(conn, customer_id)
    finally:
        conn.close()
    return {
        **result,
        "customer_id": int(result.get("customer_id") or customer_id),
        "integration_id": integration_id,
        "receipt_id": receipt_payload.receipt_id,
        "debug_mode": True,
        "loyalty_profile": profile,
    }


def _find_or_create_customer(conn, cust: ReceiptCustomer) -> int:
    if cust.qr_token:
        row = conn.execute(
            "SELECT id FROM customers WHERE qr_token=?", (cust.qr_token.strip(),)
        ).fetchone()
        if row:
            return int(row[0])
    if cust.phone:
        phone = normalize_phone(cust.phone)
        if phone:
            row = conn.execute(
                "SELECT id FROM customers WHERE phone=?", (phone,)
            ).fetchone()
            if row:
                return int(row[0])
            customer_id, _ = resolve_or_create_customer(
                conn,
                telegram_id=int(cust.telegram_id) if cust.telegram_id else None,
                phone=phone,
                preferred_channel="tg" if cust.telegram_id else None,
                onboarding_status="identified",
            )
            return customer_id
    if cust.telegram_id:
        row = conn.execute(
            "SELECT id FROM customers WHERE telegram_id=?", (int(cust.telegram_id),)
        ).fetchone()
        if row:
            return int(row[0])
        customer_id, _ = resolve_or_create_customer(
            conn,
            telegram_id=int(cust.telegram_id),
            preferred_channel="tg",
            onboarding_status="identified",
        )
        return customer_id

    customer_id, _ = resolve_or_create_customer(
        conn,
        preferred_channel=None,
        onboarding_status="identified",
    )
    return customer_id
