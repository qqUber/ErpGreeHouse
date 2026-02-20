from typing import Iterable
from fastapi import HTTPException
from .admin_auth_api import require_admin_token_or_env
from .db import get_db


def require_admin(x_admin_secret: str | None) -> dict:
    try:
        return require_admin_token_or_env(x_admin_secret)
    except HTTPException as e:
        raise e


def get_default_permissions(role: str) -> set[str]:
    if role == "operator":
        return {
            "dashboard.read",
            "customer.create",
            "customer.search",
            "customer.list",
            "customer.read",
            "pos.sale",
            "transaction.read",
            "product.read",
        }
    if role == "marketer" or role == "manager":
        return {
            "dashboard.read",
            "customer.read",
            "customer.list",
            "product.read",
            "product.create",
            "product.update",
            "product.import",
            "marketing.campaigns",
            "marketing.users",
            "integration.read",
            "integration.update",
            "report.export",
        }
    return set()


def has_permission(role: str, permission: str) -> bool:
    # Owner always has access
    if role == "owner":
        return True
        
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT is_allowed FROM role_permissions WHERE role=? AND permission=?",
            (role, permission)
        )
        row = cur.fetchone()
        if row:
            return bool(row[0])
        
        # Fallback defaults
        return permission in get_default_permissions(role)
    finally:
        conn.close()


ALL_PERMISSIONS = [
    "dashboard.read",
    "customer.read",
    "customer.create",
    "customer.search",
    "customer.list",
    "pos.sale",
    "transaction.read",
    "product.read",
    "product.create",
    "product.update",
    "product.import",
    "integration.read",
    "integration.update",
    "settings.access",
    "marketing.campaigns",
    "marketing.users",
    "receipt.manual",
    "report.export",
]


def get_role_permissions(role: str) -> list[str]:
    if role == "owner":
        return ["*"]
        
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT permission, is_allowed FROM role_permissions WHERE role=?",
            (role,)
        )
        rows = cur.fetchall()
        
        explicit_allowed = {r[0] for r in rows if r[1]}
        explicit_denied = {r[0] for r in rows if not r[1]}
        
        defaults = get_default_permissions(role)
        
        # Final = (Defaults - Denied) + Allowed
        final_perms = (defaults - explicit_denied) | explicit_allowed
            
        return list(final_perms)
    finally:
        conn.close()


def require_permission(x_admin_secret: str | None, permission: str) -> dict:
    admin = require_admin(x_admin_secret)
    role = str(admin.get("role") or "")
    if not has_permission(role, permission):
        raise HTTPException(status_code=403, detail=f"Forbidden: missing permission '{permission}'")
    return admin


def require_roles(x_admin_secret: str | None, *, roles: Iterable[str]) -> dict:
    admin = require_admin(x_admin_secret)
    role = str(admin.get("role") or "")
    if role not in set(roles):
        raise HTTPException(status_code=403, detail="Forbidden")
    return admin


def require_integration_secret(provided: str | None, expected: str) -> None:
    if not expected:
        raise HTTPException(status_code=500, detail="Integration secret not configured")
    if not provided or provided != expected:
        raise HTTPException(status_code=401, detail="Invalid integration secret")
