import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable, cast

import jwt
from fastapi import HTTPException, Request

from .config import get_settings
from .db import get_db

# Configure logging
logger = logging.getLogger(__name__)


def create_access_token(admin: dict[str, Any]) -> str:
    """Create a JWT access token with short expiration (15-30 min)."""
    settings = get_settings()
    logger.info(f"Creating access token with JWT_SECRET_KEY length: {len(settings.jwt_secret_key)}")
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)

    # Get permissions for this user
    role = str(admin.get("role") or "")
    permissions = _get_role_permissions(role)

    payload = {
        "sub": str(admin.get("user_id")),
        "username": str(admin.get("username") or ""),
        "role": role,
        "permissions": permissions,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(admin: dict[str, Any]) -> str:
    """Create a JWT refresh token with longer expiration (7 days)."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expire_days)

    payload = {
        "sub": str(admin.get("user_id")),
        "type": "refresh",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token."""
    settings = get_settings()
    logger.info(
        f"Decoding token with JWT_SECRET_KEY length: {len(settings.jwt_secret_key)}, algorithm: {settings.jwt_algorithm}"
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return cast(dict[str, Any], payload)
    except jwt.ExpiredSignatureError:
        logger.warning("JWT validation failed: Token has expired")
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        logger.warning(f"JWT validation failed: Invalid token - {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


def validate_access_token(token: str) -> dict[str, Any] | None:
    """Validate an access token and return the payload if valid."""
    logger.info("Validating access token")
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            logger.warning("Access token validation failed: Invalid token type (expected 'access')")
            return None
        logger.info(f"Access token validation succeeded for user: {payload.get('sub')}")
        return payload
    except HTTPException as e:
        logger.warning(f"Access token validation failed: {e.detail}")
        return None
    except Exception as e:
        logger.error(f"Access token validation failed with unexpected error: {type(e).__name__}: {str(e)}")
        return None


def validate_refresh_token(token: str) -> dict[str, Any] | None:
    """Validate a refresh token and return the payload if valid."""
    logger.info("Validating refresh token")
    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            logger.warning("Refresh token validation failed: Invalid token type (expected 'refresh')")
            return None
        logger.info(f"Refresh token validation succeeded for user: {payload.get('sub')}")
        return payload
    except HTTPException as e:
        logger.warning(f"Refresh token validation failed: {e.detail}")
        return None
    except Exception as e:
        logger.error(f"Refresh token validation failed with unexpected error: {type(e).__name__}: {str(e)}")
        return None


def get_admin_from_jwt(payload: dict[str, Any]) -> dict[str, Any]:
    """Convert JWT payload to admin dict format for compatibility."""
    return {
        "is_authenticated": True,
        "user_id": int(payload.get("sub", 0)),
        "username": payload.get("username", ""),
        "role": payload.get("role", ""),
        "permissions": payload.get("permissions", []),
    }


def require_admin(x_admin_secret: str | None) -> dict:
    from .admin_auth_api import require_admin_token_or_env

    try:
        return require_admin_token_or_env(x_admin_secret)
    except HTTPException as e:
        raise e


def require_admin_jwt(request: Request) -> dict[str, Any]:
    """Dependency to require JWT authentication via cookies."""
    from .request_context import get_admin_session_token

    # Try to get token from cookies first (for JWT)
    access_token = request.cookies.get("access_token")

    # Fall back to header or session token (legacy support)
    if not access_token:
        access_token = request.headers.get("x-admin-secret")
    if not access_token:
        access_token = get_admin_session_token()

    if not access_token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Try JWT first, then fall back to legacy token
    payload = validate_access_token(access_token)
    if payload:
        return get_admin_from_jwt(payload)

    # Fall back to legacy token validation
    from .admin_auth_api import require_admin_token_or_env

    return require_admin_token_or_env(access_token)


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
            "analytics.read",
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
            "analytics.read",
            "analytics.export",
        }
    if role == "observer":
        return {
            "dashboard.read",
            "customer.read",
            "product.read",
            "analytics.read",
        }
    return set()


def has_permission(role: str, permission: str) -> bool:
    # Owner and admin always have access (superuser roles)
    if role in ("owner", "admin"):
        return True

    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT is_allowed FROM role_permissions WHERE role=? AND permission=?",
            (role, permission),
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
    "analytics.read",
    "analytics.export",
]


def get_role_permissions(role: str) -> list[str]:
    if role == "owner":
        return ["*"]

    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("SELECT permission, is_allowed FROM role_permissions WHERE role=?", (role,))
        rows = cur.fetchall()

        explicit_allowed = {r[0] for r in rows if r[1]}
        explicit_denied = {r[0] for r in rows if not r[1]}

        defaults = get_default_permissions(role)

        # Final = (Defaults - Denied) + Allowed
        final_perms = (defaults - explicit_denied) | explicit_allowed

        return list(final_perms)
    finally:
        conn.close()


def _get_role_permissions(role: str) -> list[str]:
    """Internal function to get role permissions (used by JWT)."""
    return get_role_permissions(role)


def require_permission(x_admin_secret: str | None, permission: str) -> dict:
    admin = require_admin(x_admin_secret)
    if not admin.get("is_authenticated"):
        raise HTTPException(status_code=401, detail=admin.get("detail", "Unauthorized"))
    role = str(admin.get("role") or "")
    if not has_permission(role, permission):
        raise HTTPException(status_code=403, detail=f"Forbidden: missing permission '{permission}'")
    return admin


def require_roles(x_admin_secret: str | None, *, roles: Iterable[str]) -> dict:
    admin = require_admin(x_admin_secret)
    if not admin.get("is_authenticated"):
        raise HTTPException(status_code=401, detail=admin.get("detail", "Unauthorized"))
    role = str(admin.get("role") or "")
    if role not in set(roles):
        raise HTTPException(status_code=403, detail="Forbidden")
    return admin


def require_integration_secret(provided: str | None, expected: str) -> None:
    if not expected:
        raise HTTPException(status_code=500, detail="Integration secret not configured")
    if not provided or provided != expected:
        raise HTTPException(status_code=401, detail="Invalid integration secret")


def check_permission(admin: dict[str, Any], permission: str) -> None:
    """Check if the authenticated user has the required permission."""
    if not admin.get("is_authenticated"):
        raise HTTPException(status_code=401, detail=admin.get("detail", "Unauthorized"))

    role = str(admin.get("role") or "")
    if not has_permission(role, permission):
        raise HTTPException(status_code=403, detail=f"Forbidden: missing permission '{permission}'")


def check_roles(admin: dict[str, Any], roles: Iterable[str]) -> None:
    """Check if the authenticated user has one of the required roles."""
    if not admin.get("is_authenticated"):
        raise HTTPException(status_code=401, detail=admin.get("detail", "Unauthorized"))

    role = str(admin.get("role") or "")
    if role not in set(roles):
        raise HTTPException(status_code=403, detail="Forbidden")
