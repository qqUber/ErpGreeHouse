import os
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from .auth import require_roles
from .db import get_db


router = APIRouter(prefix="/api/v1/test")


def _enabled() -> None:
    if os.getenv("E2E_TEST_MODE", "false").lower() not in ("1", "true", "yes"):
        raise HTTPException(status_code=404, detail="Not Found")


@router.get("/ping")
def ping(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    _enabled()
    require_roles(x_admin_secret, roles=("owner",))
    return {"ok": True}


@router.get("/customer_by_phone")
def customer_by_phone(
    phone: str,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    _enabled()
    require_roles(x_admin_secret, roles=("owner",))
    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT id, phone, full_name, telegram_id, qr_token, balance_points, created_at, updated_at FROM customers WHERE phone=?",
            (phone,),
        ).fetchone()
        return {"customer": dict(row) if row else None}
    finally:
        conn.close()


@router.get("/product_by_code")
def product_by_code(
    code: str,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    _enabled()
    require_roles(x_admin_secret, roles=("owner",))
    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT id, code, name, kind, price, active, created_at, updated_at FROM products WHERE code=?",
            (code,),
        ).fetchone()
        if not row:
            return {"product": None}
        d = dict(row)
        d["active"] = bool(int(d["active"]))
        d["price"] = int(d["price"])
        return {"product": d}
    finally:
        conn.close()


@router.get("/transactions_by_customer")
def transactions_by_customer(
    customer_id: int,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    _enabled()
    require_roles(x_admin_secret, roles=("owner",))
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT id, customer_id, total_amount, bonus_used, bonus_earned, items_json, receipt_pdf_path, external_erp_ref, created_at "
            "FROM transactions WHERE customer_id=? ORDER BY id DESC LIMIT 50",
            (int(customer_id),),
        )
        return {"items": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


class CleanupIn(BaseModel):
    phones: list[str] = Field(default_factory=list)
    product_codes: list[str] = Field(default_factory=list)
    product_code_prefix: str | None = None


@router.post("/cleanup")
def cleanup(
    payload: CleanupIn,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    _enabled()
    require_roles(x_admin_secret, roles=("owner",))
    db = get_db()
    conn = db.connect()
    try:
        removed_customers = 0
        removed_products = 0

        for ph in payload.phones:
            cur = conn.execute("DELETE FROM customers WHERE phone=?", (ph,))
            removed_customers += int(cur.rowcount or 0)

        if payload.product_codes:
            q = ",".join(["?"] * len(payload.product_codes))
            cur = conn.execute(f"DELETE FROM products WHERE code IN ({q})", tuple(payload.product_codes))
            removed_products += int(cur.rowcount or 0)

        if payload.product_code_prefix:
            cur = conn.execute("DELETE FROM products WHERE code LIKE ?", (f"{payload.product_code_prefix}%",))
            removed_products += int(cur.rowcount or 0)

        conn.commit()
        return {"removed_customers": removed_customers, "removed_products": removed_products}
    finally:
        conn.close()
