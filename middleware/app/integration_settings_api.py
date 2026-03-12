"""
Integration Settings API
Provides endpoints for managing Telegram and VK bot configurations
"""

import json
import secrets
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from .admin_auth_api import require_jwt_auth
from .auth import check_roles, require_roles
from .config import get_settings
from .db import get_db
from .integrations.bots.telegram_handler import create_bot, create_bot_with_token
from .integrations.bots.vk_handler import validate_vk_token

router = APIRouter(prefix="/api/v1/admin/integrations")


# --- Request Models ---


class TelegramSettingsIn(BaseModel):
    bot_token: str = Field(min_length=1)
    enabled: bool = True


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


@router.get("/telegram/status")
def get_telegram_status(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    """Get current Telegram bot status"""
    require_roles(x_admin_secret, roles=("owner", "marketer"))
    settings = get_settings()

    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT config_json FROM integrations WHERE kind='telegram' LIMIT 1"
        )
        row = cur.fetchone()

        config = {}
        enabled = False
        if row:
            try:
                config = json.loads(row["config_json"] or "{}")
                enabled = config.get("enabled", False)
            except Exception:
                config = {}

        return {
            "enabled": enabled,
            "configured": bool(settings.telegram_bot_token),
            "bot_token_set": bool(settings.telegram_bot_token),
            "config": config,
        }
    finally:
        conn.close()


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
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    """Save Telegram bot settings"""
    require_roles(x_admin_secret, roles=("owner", "marketer"))

    db = get_db()
    conn = db.connect()
    try:
        # Find or create telegram integration
        cur = conn.execute("SELECT id FROM integrations WHERE kind='telegram' LIMIT 1")
        row = cur.fetchone()

        config = {
            "bot_token": payload.bot_token,
            "enabled": payload.enabled,
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
        return {"saved": True}
    finally:
        conn.close()


@router.post("/telegram/set_webhook")
async def setup_telegram_webhook(
    payload: WebhookSetupIn,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    """Setup Telegram webhook"""
    require_roles(x_admin_secret, roles=("owner", "marketer"))

    settings = get_settings()
    bot = create_bot()

    webhook_url = payload.webhook_url or f"{settings.base_web_url}/telegram/webhook"
    secret = payload.secret or settings.webhook_secret

    try:
        await bot.set_webhook(
            url=webhook_url,
            secret_token=secret,
        )
        return {
            "webhook_set": True,
            "url": webhook_url,
            "secret": secret,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to set webhook: {e}")


# --- VK Endpoints ---


@router.get("/vk/status")
def get_vk_status(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    """Get current VK bot status"""
    require_roles(x_admin_secret, roles=("owner", "marketer"))

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


@router.post("/vk/validate")
async def validate_vk_settings(
    payload: VKSettingsIn,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    """Validate VK access token and group ID"""
    require_roles(x_admin_secret, roles=("owner", "marketer"))

    result = await validate_vk_token(
        access_token=payload.access_token,
        group_id=payload.group_id,
        api_version=payload.api_version,
    )

    return result


@router.post("/vk/save")
async def save_vk_settings(
    payload: VKSettingsIn,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    """Save VK bot settings"""
    require_roles(x_admin_secret, roles=("owner", "marketer"))

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
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    """Setup VK webhook (callback API)"""
    require_roles(x_admin_secret, roles=("owner", "marketer"))

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
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    """Get status of all integrations (Telegram and VK)"""
    require_roles(x_admin_secret, roles=("owner", "marketer"))

    # Get Telegram status
    tg_status = get_telegram_status(x_admin_secret)

    # Get VK status
    vk_status = get_vk_status(x_admin_secret)

    return {
        "telegram": tg_status,
        "vk": vk_status,
    }
