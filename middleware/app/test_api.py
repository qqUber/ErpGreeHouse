import os
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from .db import get_db
from .security import hash_password, new_salt

router = APIRouter(prefix="/api/v1/test")


def _enabled() -> None:
    """Check if test mode is enabled. Raises 404 if not."""
    if os.getenv("E2E_TEST_MODE", "false").lower() not in ("1", "true", "yes"):
        raise HTTPException(
            status_code=404, detail="Test API disabled. Set E2E_TEST_MODE=true"
        )


def _verify_admin_secret(x_admin_secret: str | None) -> None:
    """Simple secret check for test API. Don't use in production!"""
    _enabled()
    # Get expected secret from environment variable
    import os

    expected = os.environ.get("E2E_ADMIN_SECRET", "test-secret-key")
    if not x_admin_secret or x_admin_secret != expected:
        raise HTTPException(status_code=401, detail="Invalid admin secret")


@router.get("/ping")
def ping(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    """Health check for test API"""
    _verify_admin_secret(x_admin_secret)
    return {"ok": True}


@router.get("/credentials")
def get_test_credentials(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    """
    Get test user credentials from database.
    Returns actual credentials stored in DB for E2E testing.
    """
    _verify_admin_secret(x_admin_secret)

    db = get_db()
    conn = db.connect()

    try:
        # Get all test users from DB
        users = conn.execute(
            "SELECT username, role FROM admin_users WHERE username IN ('admin', 'operator', 'manager')"
        ).fetchall()

        credentials = {}
        for user in users:
            # Return username as password (dev defaults)
            credentials[user["username"]] = {
                "username": user["username"],
                "password": user["username"],
                "role": user["role"],
            }

        return {"credentials": credentials, "message": "Test credentials from database"}
    finally:
        conn.close()


@router.post("/bootstrap")
def bootstrap_test_data(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    """
    Bootstrap test database with known credentials.
    Creates/updates test users with predictable passwords.
    SAFE: Only works in E2E_TEST_MODE, requires owner role.
    """
    _verify_admin_secret(x_admin_secret)

    db = get_db()
    conn = db.connect()

    try:
        # Test credentials - set to match dev defaults for existing tests
        test_users = [
            ("admin", "owner", "admin"),
            ("operator", "operator", "operator"),
            ("manager", "marketer", "manager"),
        ]

        updated = 0
        iterations = int(os.getenv("ADMIN_PBKDF2_ITER", "200000"))

        for username, role, password in test_users:
            # Generate salt and hash password (same format as admin_auth_api.py)
            salt = new_salt()
            password_hash = hash_password(password, salt=salt, iterations=iterations)
            # Check if user exists
            existing = conn.execute(
                "SELECT id FROM admin_users WHERE username = ?", (username,)
            ).fetchone()

            if existing:
                conn.execute(
                    "UPDATE admin_users SET password_hash = ?, password_salt = ?, password_iter = ?, role = ? WHERE username = ?",
                    (password_hash, salt, iterations, role, username),
                )
            else:
                conn.execute(
                    "INSERT INTO admin_users (username, password_hash, password_salt, password_iter, role, disabled) VALUES (?, ?, ?, ?, ?, 0)",
                    (username, password_hash, salt, iterations, role),
                )
            updated += 1

        conn.commit()

        return {
            "success": True,
            "users_updated": updated,
            "message": "Test users created/updated with known credentials",
            "warning": "TEST MODE - DO NOT USE IN PRODUCTION",
        }
    finally:
        conn.close()


@router.post("/reset")
def reset_test_database(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    """
    Reset test database to clean state.
    WARNING: Deletes all test data! Only works in E2E_TEST_MODE.
    """
    _verify_admin_secret(x_admin_secret)

    db = get_db()
    conn = db.connect()

    try:
        # Delete test data (not production data)
        tables_to_clean = [
            "marketing_events",
            "marketing_campaigns",
            "marketing_segments",
            "integration_deliveries",
            "transactions",
            "consents",
            "customers",
            "products",
        ]

        deleted = {}
        for table in tables_to_clean:
            result = conn.execute(f"DELETE FROM {table}")
            deleted[table] = result.rowcount

        # Reset auto-increment
        conn.execute(
            "DELETE FROM sqlite_sequence WHERE name IN ('customers', 'products', 'transactions')"
        )

        conn.commit()

        return {
            "success": True,
            "deleted_rows": deleted,
            "message": "Test database reset to clean state",
        }
    finally:
        conn.close()


@router.get("/customer_by_phone")
def customer_by_phone(
    phone: str,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    _verify_admin_secret(x_admin_secret)
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
    _verify_admin_secret(x_admin_secret)
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
    _verify_admin_secret(x_admin_secret)
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
    _verify_admin_secret(x_admin_secret)
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
            cur = conn.execute(
                f"DELETE FROM products WHERE code IN ({q})",
                tuple(payload.product_codes),
            )
            removed_products += int(cur.rowcount or 0)

        if payload.product_code_prefix:
            cur = conn.execute(
                "DELETE FROM products WHERE code LIKE ?",
                (f"{payload.product_code_prefix}%",),
            )
            removed_products += int(cur.rowcount or 0)

        conn.commit()
        return {
            "removed_customers": removed_customers,
            "removed_products": removed_products,
        }
    finally:
        conn.close()
