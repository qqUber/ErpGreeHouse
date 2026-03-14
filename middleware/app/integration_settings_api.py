"""
Integration Settings API
Provides endpoints for managing Telegram and VK bot configurations
"""

import json
import secrets
import shutil
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from .admin_auth_api import require_jwt_auth
from .auth import check_roles
from .config import get_settings
from .db import get_db
from .integrations.bots.telegram_handler import (
    create_bot,
    create_bot_with_token,
    ensure_telegram_bot_menu,
    get_configured_telegram_token,
    get_stored_telegram_token,
)
from .integrations.bots.vk_handler import validate_vk_token

router = APIRouter(prefix="/api/v1/admin/integrations")


async def _setup_telegram_webhook_impl(
    webhook_url: Optional[str] = None,
    secret: Optional[str] = None,
) -> dict[str, Any]:
    settings = get_settings()
    bot = create_bot()

    resolved_webhook_url = webhook_url or f"{settings.base_web_url}/telegram/webhook"
    resolved_secret = secret or settings.webhook_secret

    if not settings.base_web_url and not webhook_url:
        raise HTTPException(
            status_code=400,
            detail="BASE_WEB_URL is not configured, cannot set Telegram webhook automatically.",
        )

    try:
        await bot.set_webhook(
            url=resolved_webhook_url,
            secret_token=resolved_secret,
        )
        await ensure_telegram_bot_menu(bot)
        return {
            "webhook_set": True,
            "url": resolved_webhook_url,
            "secret": resolved_secret,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to set webhook: {e}")


# --- Request Models ---


class TelegramSettingsIn(BaseModel):
    bot_token: str = Field(min_length=1)
    enabled: bool = True
    menu_items: list[dict[str, Any]] = Field(default_factory=list)
    support_chat_id: str = ""


class VKSettingsIn(BaseModel):
    access_token: str = Field(min_length=1)
    group_id: int = Field(ge=1)
    api_version: str = "5.131"
    enabled: bool = True


class WebhookSetupIn(BaseModel):
    webhook_url: Optional[str] = None
    secret: Optional[str] = None


# --- Response Models ---


class IntegrationStatus(BaseModel):
    connected: bool
    details: Optional[dict] = None
    error: Optional[str] = None


# --- Telegram Endpoints ---


def _get_telegram_status_impl() -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT enabled, config_json FROM integrations WHERE kind='telegram' ORDER BY id DESC LIMIT 1"
        )
        row = cur.fetchone()

        config = {}
        enabled = False
        if row:
            try:
                config = json.loads(row["config_json"] or "{}")
                enabled = bool(int(row["enabled"] or 0))
            except Exception:
                config = {}

        configured_token = get_stored_telegram_token()
        return {
            "enabled": enabled,
            "configured": bool(configured_token),
            "bot_token_set": bool(configured_token),
            "config": config,
        }
    finally:
        conn.close()


@router.get("/telegram/status")
def get_telegram_status(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Get current Telegram bot status"""
    check_roles(auth_result, roles=("owner", "marketer"))
    return _get_telegram_status_impl()


@router.post("/telegram/validate")
async def validate_telegram_token(
    payload: TelegramSettingsIn,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Validate Telegram bot token"""
    check_roles(auth_result, roles=("owner", "marketer"))

    try:
        # Use dedicated factory function to create bot with custom token
        # This avoids using private _token attribute which could break with aiogram updates
        bot = create_bot_with_token(payload.bot_token)

        # Try to get bot info to validate token
        me = await bot.get_me()
        return {
            "valid": True,
            "bot_id": me.id,
            "bot_username": me.username,
            "bot_first_name": me.first_name,
        }
    except Exception as e:
        return {
            "valid": False,
            "error": str(e),
        }


@router.post("/telegram/save")
async def save_telegram_settings(
    payload: TelegramSettingsIn,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Save Telegram bot settings"""
    check_roles(auth_result, roles=("owner", "marketer"))

    db = get_db()
    conn = db.connect()
    try:
        # Find or create telegram integration
        cur = conn.execute("SELECT id FROM integrations WHERE kind='telegram' LIMIT 1")
        row = cur.fetchone()

        config = {
            "bot_token": payload.bot_token,
            "enabled": payload.enabled,
            "menu_items": payload.menu_items,
            "support_chat_id": payload.support_chat_id.strip(),
        }

        if row:
            conn.execute(
                "UPDATE integrations SET config_json=?, enabled=?, updated_at=datetime('now') WHERE id=?",
                (
                    json.dumps(config, ensure_ascii=False),
                    1 if payload.enabled else 0,
                    int(row["id"]),
                ),
            )
        else:
            secret = secrets.token_urlsafe(24)
            conn.execute(
                "INSERT INTO integrations(name, kind, enabled, secret, config_json) VALUES(?,?,?,?,?)",
                (
                    "Telegram Bot",
                    "telegram",
                    1 if payload.enabled else 0,
                    secret,
                    json.dumps(config, ensure_ascii=False),
                ),
            )

        conn.commit()
    finally:
        conn.close()

    result: dict[str, Any] = {"saved": True}
    if payload.enabled:
        result["webhook"] = await _setup_telegram_webhook_impl()
    return result


@router.post("/telegram/upload_media")
async def upload_telegram_media(
    file: UploadFile = File(...),
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_roles(auth_result, roles=("owner", "marketer"))
    
    # Input validation
    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm', '.pdf'}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    original_name = Path(file.filename).name
    file_ext = Path(original_name).suffix.lower()
    
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File type {file_ext} not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    settings = get_settings()
    upload_root = Path(__file__).resolve().parents[2] / "media" / "telegram"
    upload_root.mkdir(parents=True, exist_ok=True)

    safe_name = f"{secrets.token_hex(8)}-{original_name}"
    target = upload_root / safe_name

    try:
        with target.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        # Clean up on error
        if target.exists():
            target.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
    finally:
        # Ensure file handle is closed
        file.file.close()

    base_url = settings.base_web_url.rstrip("/")
    media_url = f"{base_url}/media/telegram/{safe_name}" if base_url else f"/media/telegram/{safe_name}"

    return {"uploaded": True, "url": media_url, "name": original_name}


@router.post("/telegram/set_webhook")
async def setup_telegram_webhook(
    payload: WebhookSetupIn,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Setup Telegram webhook"""
    check_roles(auth_result, roles=("owner", "marketer"))
    return await _setup_telegram_webhook_impl(payload.webhook_url, payload.secret)


# --- VK Endpoints ---


def _get_vk_status_impl() -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("SELECT * FROM vk_settings LIMIT 1")
        row = cur.fetchone()

        if row:
            return {
                "enabled": bool(int(row["enabled"])),
                "configured": True,
                "group_id": int(row["group_id"]),
                "api_version": str(row["api_version"]),
            }

        return {
            "enabled": False,
            "configured": False,
            "group_id": None,
            "api_version": "5.131",
        }
    finally:
        conn.close()


@router.get("/vk/status")
def get_vk_status(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Get current VK bot status"""
    check_roles(auth_result, roles=("owner", "marketer"))
    return _get_vk_status_impl()


@router.post("/vk/validate")
async def validate_vk_settings(
    payload: VKSettingsIn,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Validate VK access token and group ID"""
    check_roles(auth_result, roles=("owner", "marketer"))

    result = await validate_vk_token(
        access_token=payload.access_token,
        group_id=payload.group_id,
        api_version=payload.api_version,
    )

    return result


@router.post("/vk/save")
async def save_vk_settings(
    payload: VKSettingsIn,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Save VK bot settings"""
    check_roles(auth_result, roles=("owner", "marketer"))

    # Set VK config for webhook processing
    from .integrations.bots.vk_handler import set_vk_config

    set_vk_config(
        access_token=payload.access_token,
        group_id=payload.group_id,
        api_version=payload.api_version or "5.131",
    )

    db = get_db()
    conn = db.connect()
    try:
        # Check if settings exist
        cur = conn.execute("SELECT id FROM vk_settings LIMIT 1")
        row = cur.fetchone()

        if row:
            conn.execute(
                """UPDATE vk_settings SET
                    access_token=?, group_id=?, api_version=?, enabled=?, updated_at=datetime('now')
                WHERE id=?""",
                (
                    payload.access_token,
                    payload.group_id,
                    payload.api_version,
                    1 if payload.enabled else 0,
                    int(row["id"]),
                ),
            )
        else:
            conn.execute(
                """INSERT INTO vk_settings(access_token, group_id, api_version, enabled)
                VALUES(?,?,?,?)""",
                (
                    payload.access_token,
                    payload.group_id,
                    payload.api_version,
                    1 if payload.enabled else 0,
                ),
            )

        conn.commit()
        return {"saved": True}
    finally:
        conn.close()


@router.post("/vk/set_webhook")
async def setup_vk_webhook(
    payload: WebhookSetupIn,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Setup VK webhook (callback API)"""
    check_roles(auth_result, roles=("owner", "marketer"))

    settings = get_settings()
    webhook_url = payload.webhook_url or f"{settings.base_web_url}/vk/webhook"
    secret = payload.secret or secrets.token_urlsafe(16)

    # Save webhook settings
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("SELECT id FROM vk_settings LIMIT 1")
        row = cur.fetchone()

        if row:
            conn.execute(
                "UPDATE vk_settings SET webhook_secret=? WHERE id=?",
                (secret, int(row["id"])),
            )
        conn.commit()
    finally:
        conn.close()

    return {
        "webhook_set": True,
        "url": webhook_url,
        "secret": secret,
        "note": "VK uses Callback API. Use the URL above in your group settings.",
    }


# --- Combined Status ---


@router.get("/status")
def get_all_integrations_status(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Get status of all integrations (Telegram and VK)"""
    check_roles(auth_result, roles=("owner", "marketer"))
    tg_status = _get_telegram_status_impl()
    vk_status = _get_vk_status_impl()
    return {
        "telegram": tg_status,
        "vk": vk_status,
    }
