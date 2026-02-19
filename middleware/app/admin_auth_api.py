import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field

from .db import get_db
from .request_context import get_admin_session_token
from .rate_limit import register_bruteforce_failure, require_bruteforce_guard, require_rate_limit
from .security import constant_time_equals, hash_password, new_salt


public_router = APIRouter(prefix="/api/v1/public/auth")
router = APIRouter(prefix="/api/v1/auth")

_ADMIN_COOKIE_NAME = "admin_session"


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _bootstrap_default_admin() -> None:
    enabled = os.getenv("ADMIN_BOOTSTRAP_DEFAULT", "true").lower() in ("1", "true", "yes")
    if not enabled:
        return

    username = os.getenv("ADMIN_DEFAULT_USERNAME", "admin").strip() or "admin"
    password = os.getenv("ADMIN_DEFAULT_PASSWORD", "admin").strip() or "admin"
    iterations = int(os.getenv("ADMIN_PBKDF2_ITER", "200000"))
    role = os.getenv("ADMIN_DEFAULT_ROLE", "owner").strip() or "owner"

    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute("SELECT id FROM admin_users WHERE username=?", (username,)).fetchone()
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
    enabled = os.getenv("ADMIN_BOOTSTRAP_DEMO_USERS", "true").lower() in ("1", "true", "yes")
    if not enabled:
        return

    iterations = int(os.getenv("ADMIN_PBKDF2_ITER", "200000"))
    operator_username = os.getenv("ADMIN_OPERATOR_USERNAME", "operator").strip() or "operator"
    operator_password = os.getenv("ADMIN_OPERATOR_PASSWORD", "operator").strip() or "operator"
    marketer_username = os.getenv("ADMIN_MARKETER_USERNAME", "manager").strip() or "manager"
    marketer_password = os.getenv("ADMIN_MARKETER_PASSWORD", "manager").strip() or "manager"

    db = get_db()
    conn = db.connect()
    try:
        for username, password, role in (
            (operator_username, operator_password, "operator"),
            (marketer_username, marketer_password, "marketer"),
        ):
            if not username:
                continue
            row = conn.execute("SELECT id FROM admin_users WHERE username=?", (username,)).fetchone()
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
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=ttl_min)).strftime("%Y-%m-%d %H:%M:%S")

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
        if str(row["expires_at"]) <= datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"):
            return None
        return dict(row)
    finally:
        conn.close()


def require_admin_token_or_env(x_admin_secret: str | None) -> dict[str, Any]:
    expected = os.getenv("ADMIN_SECRET", "").strip()
    if expected and x_admin_secret and constant_time_equals(x_admin_secret, expected):
        return {"user_id": 0, "username": "env", "role": "owner"}

    token = x_admin_secret or get_admin_session_token()
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    admin = _get_admin_by_token(token)
    if not admin:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if int(admin.get("disabled") or 0) == 1:
        raise HTTPException(status_code=403, detail="User disabled")
    return admin


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)


class LoginOut(BaseModel):
    token: str
    must_change_password: bool


@public_router.get("/status")
def auth_status(request: Request) -> dict[str, Any]:
    require_rate_limit(request, scope="auth_status", limit=60, window_sec=60)
    _bootstrap_default_admin()
    username = os.getenv("ADMIN_DEFAULT_USERNAME", "admin").strip() or "admin"

    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute("SELECT id, must_change_password FROM admin_users WHERE username=?", (username,)).fetchone()
        return {
            "bootstrap_enabled": os.getenv("ADMIN_BOOTSTRAP_DEFAULT", "true").lower() in ("1", "true", "yes"),
            "default_admin_present": bool(row),
            "default_admin_username": username,
            "must_change_password": bool(int(row["must_change_password"])) if row else False,
        }
    finally:
        conn.close()


@public_router.post("/login")
def login(payload: LoginIn, response: Response, request: Request) -> LoginOut:
    require_rate_limit(request, scope="auth_login", limit=20, window_sec=60)
    require_bruteforce_guard(request, username=payload.username, max_attempts=8, window_sec=900, lock_sec=900)
    _bootstrap_default_admin()
    _bootstrap_demo_users()
    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT id, username, password_hash, password_salt, password_iter, must_change_password, disabled FROM admin_users WHERE username=?",
            (payload.username.strip(),),
        ).fetchone()
        if not row:
            register_bruteforce_failure(request, username=payload.username, max_attempts=8, window_sec=900, lock_sec=900)
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if int(row["disabled"]) == 1:
            raise HTTPException(status_code=403, detail="User disabled")
        ph = hash_password(payload.password, salt=str(row["password_salt"]), iterations=int(row["password_iter"]))
        if not constant_time_equals(ph, str(row["password_hash"])):
            register_bruteforce_failure(request, username=payload.username, max_attempts=8, window_sec=900, lock_sec=900)
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = _issue_token(int(row["id"]))
        ttl_min = int(os.getenv("ADMIN_TOKEN_TTL_MIN", "720"))
        cookie_secure = os.getenv("ADMIN_COOKIE_SECURE", "false").lower() in ("1", "true", "yes")
        response.set_cookie(
            _ADMIN_COOKIE_NAME,
            token,
            httponly=True,
            samesite="lax",
            secure=cookie_secure,
            max_age=int(ttl_min * 60),
            path="/",
        )
        return LoginOut(token=token, must_change_password=bool(int(row["must_change_password"])))
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
        ph = hash_password(payload.old_password, salt=str(row["password_salt"]), iterations=int(row["password_iter"]))
        if not constant_time_equals(ph, str(row["password_hash"])):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        salt = new_salt()
        iterations = int(os.getenv("ADMIN_PBKDF2_ITER", "200000"))
        new_hash = hash_password(payload.new_password, salt=salt, iterations=iterations)
        conn.execute(
            "UPDATE admin_users SET password_hash=?, password_salt=?, password_iter=?, must_change_password=0, updated_at=datetime('now') WHERE id=?",
            (new_hash, salt, iterations, int(admin["user_id"])),
        )
        conn.execute("DELETE FROM admin_tokens WHERE admin_user_id=?", (int(admin["user_id"]),))
        conn.commit()
        return {"changed": True}
    finally:
        conn.close()


@router.post("/logout")
def logout(
    response: Response,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    token = x_admin_secret or get_admin_session_token()
    if token:
        db = get_db()
        conn = db.connect()
        try:
            conn.execute("DELETE FROM admin_tokens WHERE token=?", (_hash_token(token),))
            conn.execute("DELETE FROM admin_tokens WHERE token=?", (token,))
            conn.commit()
        finally:
            conn.close()

    response.delete_cookie(_ADMIN_COOKIE_NAME, path="/")
    return {"logged_out": True}


@router.get("/me")
def me(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    admin = require_admin_token_or_env(x_admin_secret)
    return {"user_id": int(admin.get("user_id") or 0), "username": str(admin.get("username") or ""), "role": str(admin.get("role") or "")}


class RecoverIn(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    new_password: str = Field(min_length=8, max_length=200)


@public_router.post("/recover")
def recover_password(
    request: Request,
    payload: RecoverIn,
    x_admin_recovery: str | None = Header(default=None, alias="x-admin-recovery"),
) -> dict[str, Any]:
    require_rate_limit(request, scope="auth_recover", limit=5, window_sec=60)
    expected = os.getenv("ADMIN_RECOVERY_SECRET", "")
    if not expected:
        raise HTTPException(status_code=500, detail="ADMIN_RECOVERY_SECRET not configured")
    if not x_admin_recovery or not constant_time_equals(x_admin_recovery, expected):
        raise HTTPException(status_code=401, detail="Invalid recovery secret")

    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute("SELECT id FROM admin_users WHERE username=?", (payload.username.strip(),)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        salt = new_salt()
        iterations = int(os.getenv("ADMIN_PBKDF2_ITER", "200000"))
        new_hash = hash_password(payload.new_password, salt=salt, iterations=iterations)
        conn.execute(
            "UPDATE admin_users SET password_hash=?, password_salt=?, password_iter=?, must_change_password=0, updated_at=datetime('now') WHERE id=?",
            (new_hash, salt, iterations, int(row["id"])),
        )
        conn.execute("DELETE FROM admin_tokens WHERE admin_user_id=?", (int(row["id"]),))
        conn.commit()
        return {"recovered": True}
    finally:
        conn.close()
