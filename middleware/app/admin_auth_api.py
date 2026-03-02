import os
import secrets
import hashlib
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any

# Configure logging
logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field

from .db import get_db
from .request_context import get_admin_session_token
from .security import constant_time_equals, hash_password, new_salt
from .auth import (
    create_access_token,
    create_refresh_token,
    validate_access_token,
    validate_refresh_token,
    get_admin_from_jwt,
    get_role_permissions,
)
from .config import get_settings
from .storage import get_redis

public_router = APIRouter(prefix="/api/v1/public/auth")
router = APIRouter(prefix="/api/v1/auth")

# Cookie names for JWT tokens
_ACCESS_TOKEN_COOKIE = "access_token"
_REFRESH_TOKEN_COOKIE = "refresh_token"
_ADMIN_COOKIE_NAME = "admin_session"  # Legacy cookie


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _check_rate_limit(client_ip: str) -> tuple[bool, int]:
    """
    Check if the client has exceeded the rate limit for password recovery.
    Returns (is_allowed, remaining_attempts).
    """
    settings = get_settings()
    r = get_redis()
    key = f"rate_limit:recovery:{client_ip}"

    current_count = int(r.get(key) or "0")  # type: ignore[arg-type]
    remaining = max(0, settings.recovery_rate_limit_attempts - current_count - 1)

    if current_count >= settings.recovery_rate_limit_attempts:
        return False, 0

    # Increment the counter
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, settings.recovery_rate_limit_window_seconds)
    pipe.execute()

    return True, remaining


def _log_password_reset_audit(
    target_username: str, client_ip: str, user_agent: str, reset_by: str, success: bool
) -> None:
    """
    Log password reset events for audit purposes.

    Args:
        target_username: The username whose password was reset
        client_ip: IP address of the client making the request
        user_agent: User-Agent header from the request
        reset_by: How the reset was performed ('admin_recovery' or 'recovery_token')
        success: Whether the reset was successful
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    if success:
        logger.info(
            f"[AUDIT] Password reset SUCCESS | "
            f"Target user: '{target_username}' | "
            f"Reset by: {reset_by} | "
            f"IP: {client_ip} | "
            f"User-Agent: {user_agent} | "
            f"Timestamp: {timestamp}"
        )
    else:
        logger.warning(
            f"[AUDIT] Password reset FAILED | "
            f"Target user: '{target_username}' | "
            f"Reset by: {reset_by} | "
            f"IP: {client_ip} | "
            f"User-Agent: {user_agent} | "
            f"Timestamp: {timestamp}"
        )


def _notify_password_reset(username: str) -> None:
    """
    Send notification about password reset to the user.
    Logs the notification and attempts to send via available channels.
    """
    # Log notification message
    logger.info(
        f"[NOTIFICATION] Password reset notification for user '{username}'. "
        f"User should be informed that their password was changed."
    )

    # TODO: Implement actual notification channels (email, telegram, etc.)
    # For now, we log to console as per requirements
    print(
        f"🔐 PASSWORD RESET NOTIFICATION: User '{username}' - Your password has been reset by an administrator."
    )

    # Attempt to get user contact info and notify via available channels
    db = get_db()
    conn = db.connect()
    try:
        # Check for telegram notification
        tg_user = conn.execute(
            "SELECT telegram_id FROM telegram_users WHERE username=?", (username,)
        ).fetchone()

        if tg_user and tg_user["telegram_id"]:
            # Log that we would send a telegram notification
            logger.info(
                f"[NOTIFICATION] Would send Telegram notification to user '{username}' (telegram_id: {tg_user['telegram_id']})"
            )
    except Exception as e:
        # Log but don't fail - notification is a best-effort feature
        logger.debug(f"Could not send notification: {e}")
    finally:
        conn.close()


def _get_jwt_cookie_settings() -> dict[str, Any]:
    """Get cookie settings for JWT tokens based on environment."""
    settings = get_settings()
    cookie_secure = os.getenv("ADMIN_COOKIE_SECURE", "false").lower() in (
        "1",
        "true",
        "yes",
    )

    # Production safety check: warn if cookies are not secure in production
    if settings.environment == "production" and not cookie_secure:
        logger.critical(
            "SECURITY WARNING: Production environment detected but ADMIN_COOKIE_SECURE is not set! "
            "JWT tokens will be sent over HTTP (insecure). Set ADMIN_COOKIE_SECURE=true in production!"
        )

    cookie_settings = {
        "httponly": True,
        "samesite": "lax",
        "secure": cookie_secure,
        "path": "/",
    }
    logger.info(
        f"JWT cookie settings: httponly={cookie_settings['httponly']}, samesite={cookie_settings['samesite']}, secure={cookie_settings['secure']}, path={cookie_settings['path']}"
    )

    return cookie_settings


def _set_jwt_cookies(
    response: Response, access_token: str, refresh_token: str, username: str = "unknown"
) -> None:
    """Set JWT tokens in httpOnly cookies."""
    settings = get_settings()
    cookie_opts = _get_jwt_cookie_settings()

    # Log what we're about to set
    logger.info(
        f"Setting JWT cookies for user '{username}': access_token present={bool(access_token)}, refresh_token present={bool(refresh_token)}"
    )
    logger.info(
        f"Cookie max_age: access={settings.jwt_access_token_expire_minutes * 60}, refresh={settings.jwt_refresh_token_expire_days * 24 * 60 * 60}"
    )

    # Access token - shorter expiry
    response.set_cookie(
        _ACCESS_TOKEN_COOKIE,
        access_token,
        max_age=settings.jwt_access_token_expire_minutes * 60,
        **cookie_opts,
    )
    logger.info(
        f"Set cookie '{_ACCESS_TOKEN_COOKIE}': httponly={cookie_opts['httponly']}, samesite={cookie_opts['samesite']}, secure={cookie_opts['secure']}"
    )

    # Refresh token - longer expiry
    response.set_cookie(
        _REFRESH_TOKEN_COOKIE,
        refresh_token,
        max_age=settings.jwt_refresh_token_expire_days * 24 * 60 * 60,
        **cookie_opts,
    )
    logger.info(
        f"Set cookie '{_REFRESH_TOKEN_COOKIE}': httponly={cookie_opts['httponly']}, samesite={cookie_opts['samesite']}, secure={cookie_opts['secure']}"
    )


def _clear_jwt_cookies(response: Response) -> None:
    """Clear JWT cookies."""
    cookie_opts = _get_jwt_cookie_settings()
    cookie_opts.pop("max_age", None)

    response.delete_cookie(_ACCESS_TOKEN_COOKIE, **cookie_opts)
    response.delete_cookie(_REFRESH_TOKEN_COOKIE, **cookie_opts)


def _bootstrap_default_admin() -> None:
    enabled = os.getenv("ADMIN_BOOTSTRAP_DEFAULT", "true").lower() in (
        "1",
        "true",
        "yes",
    )
    if not enabled:
        return

    username = os.getenv("ADMIN_DEFAULT_USERNAME", "admin").strip() or "admin"
    password = os.getenv("ADMIN_DEFAULT_PASSWORD", "admin").strip() or "admin"
    iterations = int(os.getenv("ADMIN_PBKDF2_ITER", "200000"))
    role = os.getenv("ADMIN_DEFAULT_ROLE", "owner").strip() or "owner"

    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT id FROM admin_users WHERE username=?", (username,)
        ).fetchone()
        if row:
            return
        salt = new_salt()
        ph = hash_password(password, salt=salt, iterations=iterations)
        conn.execute(
            "INSERT INTO admin_users(username, password_hash, password_salt, password_iter, role, disabled, must_change_password) VALUES(?,?,?,?,?,?,1)",
            (username, ph, salt, iterations, role, 0),
        )
        conn.commit()
    finally:
        conn.close()


def _bootstrap_demo_users() -> None:
    enabled = os.getenv("ADMIN_BOOTSTRAP_DEMO_USERS", "true").lower() in (
        "1",
        "true",
        "yes",
    )
    if not enabled:
        return

    iterations = int(os.getenv("ADMIN_PBKDF2_ITER", "200000"))
    operator_username = (
        os.getenv("ADMIN_OPERATOR_USERNAME", "operator").strip() or "operator"
    )
    operator_password = (
        os.getenv("ADMIN_OPERATOR_PASSWORD", "operator").strip() or "operator"
    )
    marketer_username = (
        os.getenv("ADMIN_MARKETER_USERNAME", "manager").strip() or "manager"
    )
    marketer_password = (
        os.getenv("ADMIN_MARKETER_PASSWORD", "manager").strip() or "manager"
    )

    db = get_db()
    conn = db.connect()
    try:
        for username, password, role in (
            (operator_username, operator_password, "operator"),
            (marketer_username, marketer_password, "marketer"),
        ):
            if not username:
                continue
            row = conn.execute(
                "SELECT id FROM admin_users WHERE username=?", (username,)
            ).fetchone()
            if row:
                continue
            salt = new_salt()
            ph = hash_password(password, salt=salt, iterations=iterations)
            conn.execute(
                "INSERT INTO admin_users(username, password_hash, password_salt, password_iter, role, disabled, must_change_password) VALUES(?,?,?,?,?,?,0)",
                (username, ph, salt, iterations, role, 0),
            )
        conn.commit()
    finally:
        conn.close()


def _issue_token(admin_user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    ttl_min = int(os.getenv("ADMIN_TOKEN_TTL_MIN", "720"))
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=ttl_min)).strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    db = get_db()
    conn = db.connect()
    try:
        token_db = _hash_token(token)
        conn.execute(
            "INSERT INTO admin_tokens(admin_user_id, token, expires_at) VALUES(?,?,?)",
            (int(admin_user_id), token_db, expires_at),
        )
        conn.commit()
        return token
    finally:
        conn.close()


def _get_admin_by_token(token: str) -> dict[str, Any] | None:
    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT t.token, t.expires_at, u.id as user_id, u.username, u.role, u.disabled, u.must_change_password, u.password_hash, u.password_salt, u.password_iter "
            "FROM admin_tokens t JOIN admin_users u ON u.id=t.admin_user_id WHERE t.token=?",
            (_hash_token(token),),
        ).fetchone()
        if not row:
            row = conn.execute(
                "SELECT t.token, t.expires_at, u.id as user_id, u.username, u.role, u.disabled, u.must_change_password, u.password_hash, u.password_salt, u.password_iter "
                "FROM admin_tokens t JOIN admin_users u ON u.id=t.admin_user_id WHERE t.token=?",
                (token,),
            ).fetchone()
        if not row:
            return None
        if str(row["expires_at"]) <= datetime.now(timezone.utc).strftime(
            "%Y-%m-%d %H:%M:%S"
        ):
            return None
        return dict(row)
    finally:
        conn.close()


def _get_admin_by_id(admin_user_id: int) -> dict[str, Any] | None:
    """Get admin user by ID for JWT token generation."""
    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT id, username, role, disabled, must_change_password FROM admin_users WHERE id=?",
            (int(admin_user_id),),
        ).fetchone()
        if not row:
            return None
        if int(row["disabled"]) == 1:
            return None
        return dict(row)
    finally:
        conn.close()


def _is_jwt_format(token: str) -> bool:
    """Check if token has JWT format (exactly two dots)."""
    if not token:
        return False
    return token.count(".") == 2


def require_admin_token_or_env(x_admin_secret: str | None) -> dict[str, Any]:
    """
    Validate admin token or environment secret with robust error handling.

    DUAL-MODE AUTHENTICATION:
    - JWT Mode: If token is JWT format (has 2 dots), validate as JWT
    - Legacy Mode: If token is NOT JWT format, validate as legacy token
    - Environment Secret: ADMIN_SECRET from environment is always valid

    CRITICAL: If a JWT is provided but fails validation, we return 401 immediately.
    We do NOT fall back to legacy validation if JWT was attempted.
    """
    try:
        # Check environment secret first (always valid)
        expected = os.getenv("ADMIN_SECRET", "").strip()
        if (
            expected
            and x_admin_secret
            and constant_time_equals(x_admin_secret, expected)
        ):
            logger.info(f"Environment secret validation successful for user: env")
            return {
                "user_id": 0,
                "username": "env",
                "role": "owner",
                "is_authenticated": True,
            }

        token = x_admin_secret or get_admin_session_token()
        if not token:
            logger.warning("No admin token or environment secret provided")
            return {"is_authenticated": False, "detail": "No token provided"}

        # DUAL-MODE: Check if this is a JWT token - validate as JWT
        if _is_jwt_format(token):
            logger.info("Token is JWT format, validating as JWT...")
            payload = validate_access_token(token)
            if payload:
                admin_data = get_admin_from_jwt(payload)
                admin_data["is_authenticated"] = True
                logger.info(
                    f"JWT validation successful for user: {admin_data.get('username')}"
                )
                return admin_data
            else:
                # JWT validation failed - return 401 immediately, do NOT fall back to legacy
                logger.warning(
                    "JWT validation failed - returning 401, not falling back to legacy"
                )
                return {
                    "is_authenticated": False,
                    "detail": "Invalid or expired JWT token",
                }

        # Legacy token validation for non-JWT tokens
        admin = _get_admin_by_token(token)
        if not admin:
            logger.warning(f"Invalid admin token: {token[:10]}...")
            return {"is_authenticated": False, "detail": "Invalid token"}

        if int(admin.get("disabled") or 0) == 1:
            logger.warning(f"Disabled user attempted login: {admin.get('username')}")
            return {"is_authenticated": False, "detail": "User disabled"}

        logger.info(
            f"Legacy token validation successful for user: {admin.get('username')}"
        )
        admin["is_authenticated"] = True
        return admin
    except Exception as e:
        logger.error(f"Error in require_admin_token_or_env: {type(e).__name__}: {e}")
        return {"is_authenticated": False, "detail": "Authentication error"}


def require_jwt_auth(request: Request) -> dict[str, Any]:
    """
    Dependency to require JWT authentication via cookies or Authorization header.

    DUAL-MODE AUTHENTICATION:
    1. Try JWT from HttpOnly cookies (preferred - most secure)
    2. Try JWT from Authorization: Bearer header
    3. Try legacy token from x-admin-secret header (for demo/backward compatibility)
    4. Try legacy token from session

    CRITICAL: If a JWT is provided (in cookies or Bearer header) but fails validation,
    return 401 immediately. Do NOT fall back to legacy tokens.
    """
    try:
        # Get environment for conditional logging
        settings = get_settings()
        is_debug = settings.environment == "development"

        # Minimal logging - only log in debug mode
        if is_debug:
            logger.debug(f"Auth check: {request.method} {request.url.path}")

        # STEP 1: Try to get JWT from cookies first (most secure - httpOnly)
        access_token = request.cookies.get(_ACCESS_TOKEN_COOKIE)

        # STEP 2: Try Authorization header (Bearer token) - only for JWT
        if not access_token:
            auth_header = request.headers.get("authorization")
            if auth_header and auth_header.startswith("Bearer "):
                access_token = auth_header[7:]

        # STEP 3: If we have a token, check if it's JWT format
        jwt_was_provided = False
        if access_token:
            jwt_was_provided = _is_jwt_format(access_token)

            if jwt_was_provided:
                # It's JWT - validate it
                if is_debug:
                    logger.debug("JWT token found, validating...")
                payload = validate_access_token(access_token)
                if payload:
                    if is_debug:
                        logger.debug(
                            f"JWT validation succeeded for user: {payload.get('sub')}"
                        )
                    admin_data = get_admin_from_jwt(payload)
                    admin_data["is_authenticated"] = True
                    return admin_data
                else:
                    # JWT validation failed - return 401 immediately, do NOT fall back to legacy
                    if is_debug:
                        logger.warning(
                            "JWT validation failed - returning 401, not falling back to legacy"
                        )
                    return {
                        "is_authenticated": False,
                        "detail": "Invalid or expired JWT token",
                    }

        # STEP 4: No JWT or JWT not provided - try legacy token (for demo/backward compatibility)
        # Only use legacy if no JWT was attempted
        if not jwt_was_provided:
            # Try x-admin-secret header
            legacy_token = request.headers.get("x-admin-secret")

            # Try session token
            if not legacy_token:
                legacy_token = get_admin_session_token()

            if legacy_token:
                if is_debug:
                    logger.debug(
                        "No JWT provided, falling back to legacy token validation"
                    )
                legacy_result = require_admin_token_or_env(legacy_token)
                if legacy_result.get("is_authenticated"):
                    return legacy_result
                else:
                    return {"is_authenticated": False, "detail": "Invalid token"}

        # No token at all
        if is_debug:
            logger.warning("No access token found in cookies, headers, or session")
        return {"is_authenticated": False, "detail": "No token found"}

    except Exception as e:
        logger.error(f"Error in require_jwt_auth: {type(e).__name__}: {e}")
        return {"is_authenticated": False, "detail": "Authentication error"}


def require_roles(x_admin_secret: str | None, roles: tuple[str, ...]) -> dict[str, Any]:
    """Require that the user has one of the specified roles. Returns user data or raises HTTPException."""
    admin = require_admin_token_or_env(x_admin_secret)
    if not admin.get("is_authenticated"):
        raise HTTPException(status_code=401, detail=admin.get("detail", "Unauthorized"))
    if admin.get("role") not in roles:
        raise HTTPException(
            status_code=403,
            detail=f"Insufficient permissions. Required one of: {roles}",
        )
    return admin


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)


class LoginOut(BaseModel):
    token: str
    must_change_password: bool
    # Note: JWT tokens are delivered via httpOnly cookies only, NOT in response body
    # Tokens are set via Set-Cookie headers for security


@public_router.get("/status")
def auth_status(request: Request) -> dict[str, Any]:
    _bootstrap_default_admin()
    username = os.getenv("ADMIN_DEFAULT_USERNAME", "admin").strip() or "admin"

    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT id, must_change_password FROM admin_users WHERE username=?",
            (username,),
        ).fetchone()
        return {
            "bootstrap_enabled": os.getenv("ADMIN_BOOTSTRAP_DEFAULT", "true").lower()
            in ("1", "true", "yes"),
            "default_admin_present": bool(row),
            "default_admin_username": username,
            "must_change_password": (
                bool(int(row["must_change_password"])) if row else False
            ),
        }
    finally:
        conn.close()


@public_router.post("/login")
def login(payload: LoginIn, response: Response, request: Request) -> LoginOut:
    _bootstrap_default_admin()
    _bootstrap_demo_users()
    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT id, username, password_hash, password_salt, password_iter, must_change_password, disabled, role FROM admin_users WHERE username=?",
            (payload.username.strip(),),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if int(row["disabled"]) == 1:
            raise HTTPException(status_code=403, detail="User disabled")
        ph = hash_password(
            payload.password,
            salt=str(row["password_salt"]),
            iterations=int(row["password_iter"]),
        )
        if not constant_time_equals(ph, str(row["password_hash"])):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Generate legacy token for backward compatibility
        token = _issue_token(int(row["id"]))

        # Generate JWT tokens
        admin_data = {
            "user_id": int(row["id"]),
            "username": str(row["username"]),
            "role": str(row["role"]),
        }
        access_token = create_access_token(admin_data)
        refresh_token = create_refresh_token(admin_data)

        logger.info(
            f"Generated JWT tokens for user '{row['username']}': access_token length={len(access_token)}, refresh_token length={len(refresh_token)}"
        )

        # Set JWT cookies
        _set_jwt_cookies(
            response, access_token, refresh_token, username=payload.username
        )

        # Also set legacy cookie for backward compatibility
        ttl_min = int(os.getenv("ADMIN_TOKEN_TTL_MIN", "720"))
        cookie_secure = os.getenv("ADMIN_COOKIE_SECURE", "false").lower() in (
            "1",
            "true",
            "yes",
        )
        response.set_cookie(
            _ADMIN_COOKIE_NAME,
            token,
            httponly=True,
            samesite="lax",
            secure=cookie_secure,
            max_age=int(ttl_min * 60),
            path="/",
        )

        return LoginOut(
            token=token,
            must_change_password=bool(int(row["must_change_password"])),
            # JWT tokens are delivered via httpOnly cookies only - see _set_jwt_cookies()
        )
    finally:
        conn.close()


class ChangePasswordIn(BaseModel):
    old_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=8, max_length=200)


@router.post("/change-password")
def change_password(
    payload: ChangePasswordIn,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    admin = require_admin_token_or_env(x_admin_secret)
    if int(admin.get("user_id", 0)) == 0:
        raise HTTPException(status_code=400, detail="Not supported for env-based admin")

    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT id, password_hash, password_salt, password_iter FROM admin_users WHERE id=?",
            (int(admin["user_id"]),),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Unauthorized")
        ph = hash_password(
            payload.old_password,
            salt=str(row["password_salt"]),
            iterations=int(row["password_iter"]),
        )
        if not constant_time_equals(ph, str(row["password_hash"])):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        salt = new_salt()
        iterations = int(os.getenv("ADMIN_PBKDF2_ITER", "200000"))
        new_hash = hash_password(payload.new_password, salt=salt, iterations=iterations)
        conn.execute(
            "UPDATE admin_users SET password_hash=?, password_salt=?, password_iter=?, must_change_password=0, updated_at=datetime('now') WHERE id=?",
            (new_hash, salt, iterations, int(admin["user_id"])),
        )
        conn.execute(
            "DELETE FROM admin_tokens WHERE admin_user_id=?", (int(admin["user_id"]),)
        )
        conn.commit()
        return {"changed": True}
    finally:
        conn.close()


@router.get("/me")
def get_me(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Get current user information."""
    if not auth_result.get("is_authenticated"):
        raise HTTPException(
            status_code=401, detail=auth_result.get("detail", "Unauthorized")
        )

    return {
        "user_id": auth_result["user_id"],
        "username": auth_result["username"],
        "role": auth_result["role"],
        "permissions": auth_result["permissions"],
    }


@public_router.post("/refresh")
def refresh_token_public(response: Response, request: Request) -> dict[str, Any]:
    """Refresh access token using refresh token from cookie or header (public endpoint)."""
    # Get refresh token from cookie or header
    refresh_token_cookie = request.cookies.get(_REFRESH_TOKEN_COOKIE)
    refresh_token_header = request.headers.get("x-admin-secret")

    refresh_token = refresh_token_cookie or refresh_token_header

    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token not found")

    # Validate refresh token
    payload = validate_refresh_token(refresh_token)
    if not payload:
        _clear_jwt_cookies(response)
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Get admin user from refresh token
    admin_user_id = payload.get("sub")
    admin = _get_admin_by_id(int(admin_user_id))  # type: ignore[arg-type]
    if not admin:
        _clear_jwt_cookies(response)
        raise HTTPException(status_code=401, detail="User not found")

    # Generate new tokens
    admin_data = {
        "user_id": int(admin["id"]),
        "username": str(admin["username"]),
        "role": str(admin["role"]),
    }
    new_access_token = create_access_token(admin_data)
    new_refresh_token = create_refresh_token(admin_data)

    # Set new cookies only - tokens NOT returned in response body
    _set_jwt_cookies(
        response, new_access_token, new_refresh_token, username=admin["username"]
    )

    return {"refreshed": True, "token_type": "bearer"}


@router.post("/logout")
def logout(
    response: Response,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    # Clear JWT cookies
    _clear_jwt_cookies(response)

    # Also clear legacy cookie
    response.delete_cookie(_ADMIN_COOKIE_NAME, path="/")
    return {"logged_out": True}


class RefreshIn(BaseModel):
    refresh_token: str | None = None


@router.post("/refresh")
def rotate_token(
    request: Request,
    response: Response,
    payload: RefreshIn | None = None,
) -> dict[str, Any]:
    """Refresh access token using refresh token from cookie or body."""
    # Try to get refresh token from cookie first
    refresh_token = request.cookies.get(_REFRESH_TOKEN_COOKIE)

    # Fall back to body or header
    if not refresh_token:
        if payload:
            refresh_token = payload.refresh_token
        if not refresh_token:
            refresh_token = request.headers.get("x-refresh-token")

    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token required")

    # Validate refresh token
    token_payload = validate_refresh_token(refresh_token)
    if not token_payload:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Get admin user data
    admin_user_id = int(token_payload.get("sub", 0))
    admin = _get_admin_by_id(admin_user_id)
    if not admin:
        raise HTTPException(status_code=401, detail="User not found or disabled")

    # Generate new tokens
    admin_data = {
        "user_id": int(admin["id"]),
        "username": str(admin["username"]),
        "role": str(admin["role"]),
    }
    new_access_token = create_access_token(admin_data)
    new_refresh_token = create_refresh_token(admin_data)

    # Set new JWT cookies only - tokens NOT returned in response body
    _set_jwt_cookies(response, new_access_token, new_refresh_token)

    return {
        "refreshed": True,
    }


class RecoverIn(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    new_password: str = Field(min_length=8, max_length=200)


@public_router.post("/recover")
def recover_password(
    request: Request,
    payload: RecoverIn,
    x_admin_recovery: str | None = Header(default=None, alias="x-admin-recovery"),
) -> dict[str, Any]:
    """
    Recover password for a user using the admin recovery secret.

    This endpoint is rate-limited to prevent brute-force attacks.
    All password reset attempts are logged for audit purposes.
    """
    # Get client information for rate limiting and logging
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # Check rate limit before processing
    is_allowed, remaining = _check_rate_limit(client_ip)
    if not is_allowed:
        _log_password_reset_audit(
            target_username=payload.username,
            client_ip=client_ip,
            user_agent=user_agent,
            reset_by="rate_limited",
            success=False,
        )
        raise HTTPException(
            status_code=429,
            detail="Too many password recovery attempts. Please try again later.",
        )

    # Log rate limit info for debugging
    logger.info(
        f"Password recovery attempt for '{payload.username}' from {client_ip} (remaining: {remaining})"
    )

    expected = os.getenv("ADMIN_RECOVERY_SECRET", "")
    if not expected:
        _log_password_reset_audit(
            target_username=payload.username,
            client_ip=client_ip,
            user_agent=user_agent,
            reset_by="admin_recovery",
            success=False,
        )
        logger.critical(
            "Password recovery attempted but ADMIN_RECOVERY_SECRET not configured"
        )
        raise HTTPException(
            status_code=500, detail="ADMIN_RECOVERY_SECRET not configured"
        )

    if not x_admin_recovery or not constant_time_equals(x_admin_recovery, expected):
        _log_password_reset_audit(
            target_username=payload.username,
            client_ip=client_ip,
            user_agent=user_agent,
            reset_by="admin_recovery",
            success=False,
        )
        raise HTTPException(status_code=401, detail="Invalid recovery secret")

    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT id FROM admin_users WHERE username=?", (payload.username.strip(),)
        ).fetchone()
        if not row:
            _log_password_reset_audit(
                target_username=payload.username,
                client_ip=client_ip,
                user_agent=user_agent,
                reset_by="admin_recovery",
                success=False,
            )
            raise HTTPException(status_code=404, detail="User not found")

        salt = new_salt()
        iterations = int(os.getenv("ADMIN_PBKDF2_ITER", "200000"))
        new_hash = hash_password(payload.new_password, salt=salt, iterations=iterations)
        conn.execute(
            "UPDATE admin_users SET password_hash=?, password_salt=?, password_iter=?, must_change_password=0, updated_at=datetime('now') WHERE id=?",
            (new_hash, salt, iterations, int(row["id"])),
        )
        conn.execute(
            "DELETE FROM admin_tokens WHERE admin_user_id=?", (int(row["id"]),)
        )
        conn.commit()

        # Log successful password reset for audit
        _log_password_reset_audit(
            target_username=payload.username,
            client_ip=client_ip,
            user_agent=user_agent,
            reset_by="admin_recovery",
            success=True,
        )

        # Send notification to user about password reset
        _notify_password_reset(payload.username)

        return {"recovered": True}
    finally:
        conn.close()
