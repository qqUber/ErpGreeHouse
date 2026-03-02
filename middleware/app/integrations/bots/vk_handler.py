"""
VK (VKontakte) Bot Integration
Handles message processing via VK Long Poll API and Callback API webhooks

This module uses the shared bot framework for consent, registration, and keys management.
Only VK-specific API code is kept in this file.
"""

import asyncio
import json
import logging
from typing import Any, Callable, Dict, Literal, Mapping, Optional, Sequence, SupportsInt, Union, cast

import aiohttp
from aiohttp import ClientSession, TCPConnector

from ...config import get_settings
from ...db import get_db
from ...identify import generate_qr_token, normalize_name, normalize_phone
from ...storage import get_redis

# Import shared modules
from .shared import (
    consent_key,
    registration_key,
    store_consent,
    get_customer_consents,
    cleanup_user_data,
    update_consent,
    RegistrationFlow,
    format_vk_keyboard,
    get_consent_buttons,
    get_marketing_buttons,
    get_consent_text,
    get_marketing_consent_text,
    CURRENT_POLICY_VERSION,
)

logger = logging.getLogger(__name__)

# VK API base URL
VK_API_URL = "https://api.vk.com/method"

# Source identifier for 152-ФЗ compliance - typed as Literal for type safety
VK_SOURCE: Literal["vk"] = "vk"


class VKBot:
    """VK Bot handler for processing messages via Long Poll"""

    def __init__(
        self,
        access_token: str,
        group_id: int,
        api_version: str = "5.131",
        message_handler: Optional[Callable[[int, str], Any]] = None,
    ):
        self.access_token = access_token
        self.group_id = group_id
        self.api_version = api_version
        self.message_handler = message_handler
        self._running = False
        self._session: Optional[aiohttp.ClientSession] = None
        self._server_info: Optional[dict] = None
        # Use shared RegistrationFlow for VK
        self._reg_flow = RegistrationFlow(VK_SOURCE)

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def close(self):
        """Close the bot and cleanup resources"""
        self._running = False
        if self._session and not self._session.closed:
            await self._session.close()

    async def get_long_poll_server(self) -> dict[str, Any]:
        """Get VK Long Poll server info"""
        session = await self._get_session()
        params: Any = {
            "group_id": self.group_id,
            "access_token": self.access_token,
            "v": self.api_version,
        }
        async with session.get(
            f"{VK_API_URL}/groups.getLongPollServer", params=params
        ) as resp:
            data = await resp.json()
            if "error" in data:
                raise Exception(f"VK API error: {data['error']}")
            return data["response"]  # type: ignore[no-any-return]

    async def long_poll(self) -> list[dict[str, Any]]:
        """Poll for new events from VK"""
        if not self._server_info:
            self._server_info = await self.get_long_poll_server()

        params = {
            "act": "a_check",
            "key": self._server_info["key"],
            "ts": self._server_info["ts"],
            "wait": 25,  # Max wait time in seconds
            "mode": 2,  # Return messages only
            "version": 3,
        }

        session = await self._get_session()
        async with session.get(
            f"https://{self._server_info['server']}",
            params=params,
            timeout=aiohttp.ClientTimeout(total=30),
        ) as resp:
            data = await resp.json()

            if "failed" in data:
                # Re-fetch server info on failure
                if data["failed"] in (1, 2, 3, 4):
                    self._server_info = await self.get_long_poll_server()
                return []

            self._server_info["ts"] = data["ts"]
            return data.get("updates", [])  # type: ignore[no-any-return]

    async def process_updates(self, updates: list):
        """Process incoming VK updates"""
        for update in updates:
            update_type = update.get("type")
            
            if update_type == "message_new":
                await self._handle_message(update["object"]["message"])
            elif update_type == "message_event":
                # Handle keyboard button clicks (callback_query)
                await self._handle_message_event(update["object"])

    async def _handle_message(self, message: dict):
        """Handle incoming VK message"""
        user_id = message.get("from_id")
        text = message.get("text", "")
        peer_id = message.get("peer_id")

        if not user_id or not text or not peer_id:
            return

        logger.info(f"VK message from user {user_id}: {text}")

        # Process commands similar to Telegram
        command = text.strip().lower()

        if command.startswith("/start"):
            await self._handle_start(user_id, peer_id)
        elif command.startswith("/register"):
            await self._handle_register(user_id, text)
        elif command.startswith("/balance"):
            await self._handle_balance(user_id, peer_id)
        elif command.startswith("/profile"):
            await self.handle_profile(user_id)  # type: ignore[attr-defined]
        elif command.startswith("/help"):
            await self._send_message(peer_id, self._get_help_text())
        elif command.startswith("/revoke_consent"):
            await self._handle_revoke_consent(user_id, peer_id)
        elif command.startswith("/subscribe"):
            await self._handle_subscribe(user_id, peer_id)
        else:
            # Handle registration flow - check if user is in consent flow
            await self._handle_registration_message(user_id, peer_id, text)

        # Call custom message handler if set
        if self.message_handler:
            await self.message_handler(user_id, text)

    async def _handle_message_event(self, event_data: dict):
        """Handle message events (keyboard button clicks) from VK."""
        user_id = event_data.get("user_id")
        peer_id = event_data.get("peer_id")
        payload = event_data.get("payload", {})
        
        if not user_id or not peer_id:
            return
            
        logger.info(f"VK message event from user {user_id}: {payload}")
        
        # Parse payload - could be string or dict
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except json.JSONDecodeError:
                payload = {}
        
        command = payload.get("command", "")
        
        if command.startswith("consent:marketing:"):
            # Handle marketing consent
            await self._handle_marketing_consent(user_id, peer_id, payload)
        elif command.startswith("consent:"):
            # Handle main consent
            await self._handle_consent(user_id, peer_id, payload)

    async def _handle_registration_message(self, user_id: int, peer_id: int, text: str):
        """Handle registration flow - capture name, then phone."""
        # Use shared RegistrationFlow
        r = get_redis()
        consent_data = r.hgetall(consent_key(VK_SOURCE, user_id))
        
        # Only handle if user is in registration flow (consent was given)
        if consent_data.get("consent_given") != "1":
            await self._send_message(peer_id, "Используйте /start для начала регистрации")
            return
        
        step = consent_data.get("step", consent_data.get("state", ""))
        
        if step == "name":
            # Store name and ask for phone
            name = text.strip()
            r.hset(consent_key(VK_SOURCE, user_id), mapping={"name": name, "step": "phone"})
            r.expire(consent_key(VK_SOURCE, user_id), 3600)  # 1 hour TTL for abandoned registrations
            await self._send_message(peer_id, "Телефон? (Формат: +79991234567)")
        
        elif step == "phone":
            # Store phone and ask for marketing consent
            phone = normalize_phone(text.strip())
            if not phone:
                await self._send_message(peer_id, "Телефон должен быть в формате +79991234567")
                return
            
            r.hset(consent_key(VK_SOURCE, user_id), mapping={"phone": phone, "step": "marketing"})
            r.expire(consent_key(VK_SOURCE, user_id), 3600)  # 1 hour TTL for abandoned registrations

            # Ask for marketing consent - use shared keyboard formatting
            await self._send_message(
                peer_id,
                "Хотите получать новости и акции?",
                keyboard=format_vk_keyboard(get_marketing_buttons())
            )
        else:
            # Not in registration flow
            await self._send_message(peer_id, "Используйте /start для начала регистрации")

    async def _handle_revoke_consent(self, user_id: int, peer_id: int):
        """Handle /revoke_consent command - opt out of marketing."""
        # Use shared update_consent function
        consents = get_customer_consents(VK_SOURCE, user_id)
        
        if not consents.get("data_processing_allowed"):
            await self._send_message(
                peer_id, 
                "Вы ещё не зарегистрированы. Используйте /start"
            )
            return
        
        # Update marketing consent using shared function
        update_consent(VK_SOURCE, user_id, marketing_allowed=0)
        
        await self._send_message(
            peer_id,
            "Вы отписаны от рассылки.\n"
            "Для повторной подписки используйте /subscribe"
        )

    async def _handle_subscribe(self, user_id: int, peer_id: int):
        """Handle /subscribe command - opt in to marketing."""
        # Use shared get_customer_consents function
        consents = get_customer_consents(VK_SOURCE, user_id)
        
        if not consents.get("data_processing_allowed"):
            await self._send_message(
                peer_id, 
                "Вы ещё не зарегистрированы. Используйте /start"
            )
            return
        
        # Get customer_id using shared function
        from .shared.consent import get_customer_id
        customer_id = get_customer_id(VK_SOURCE, user_id)
        
        if not customer_id:
            await self._send_message(
                peer_id, 
                "Вы ещё не зарегистрированы. Используйте /start"
            )
            return
        
        # Update marketing consent using shared function
        update_consent(VK_SOURCE, user_id, marketing_allowed=1)
        
        # Store marketing consent using shared function
        store_consent(
            customer_id, 
            VK_SOURCE, 
            get_marketing_consent_text(), 
            CURRENT_POLICY_VERSION, 
            "marketing"
        )
        
        await self._send_message(
            peer_id,
            "Вы подписаны на рассылку!\n"
            "Отписаться: /revoke_consent"
        )

    async def _handle_register(self, user_id: int, text: str):
        """Handle /register command"""
        args = text.split(maxsplit=2)
        if len(args) < 3:
            await self._send_message(user_id, "Формат: /register Имя Телефон")
            return

        name = args[1]
        phone = normalize_phone(args[2])
        if not phone:
            await self._send_message(
                user_id, "Телефон должен быть в формате +79991234567"
            )
            return

        # Use shared RegistrationFlow to complete registration
        try:
            customer, is_new = self._reg_flow.complete_registration(
                user_id, name, phone, marketing_allowed=1
            )
            if customer:
                await self._send_message(
                    user_id, "Регистрация успешна! Начислено 100 приветственных баллов."
                )
            else:
                await self._send_message(user_id, "Ошибка регистрации")
        except Exception as e:
            await self._send_message(user_id, f"Ошибка регистрации: {e}")

    async def _handle_balance(self, user_id: int, peer_id: int):
        """Handle /balance command"""
        # Use shared get_customer_consents to check if user exists
        consents = get_customer_consents(VK_SOURCE, user_id)
        
        if not consents.get("data_processing_allowed"):
            await self._send_message(
                peer_id, "Вы ещё не зарегистрированы. Используйте /start"
            )
            return
        
        # Get customer data
        from .shared.consent import find_customer_by_platform
        customer = find_customer_by_platform(VK_SOURCE, user_id)
        
        if not customer:
            await self._send_message(
                peer_id, "Вы ещё не зарегистрированы. Используйте /start"
            )
            return
        
        balance = int(customer.get("balance_points", 0))
        name = customer.get("full_name", "") or "гость"
        await self._send_message(
            peer_id, f"Привет, {name}.\nБаланс: {balance} баллов."
        )

    async def _send_message(self, peer_id: int, text: str, keyboard: Optional[dict] = None):
        """Send message to VK user with optional keyboard."""
        session = await self._get_session()
        params: Any = {
            "peer_id": peer_id,
            "message": text,
            "access_token": self.access_token,
            "v": self.api_version,
            "random_id": 0,  # Will be auto-generated by VK
        }
        
        # Add keyboard if provided (VK uses special keyboard format)
        if keyboard:
            params["keyboard"] = json.dumps(keyboard)

        try:
            async with session.post(
                f"{VK_API_URL}/messages.send", params=params
            ) as resp:
                data = await resp.json()
                if "error" in data:
                    logger.error(f"VK send message error: {data['error']}")
        except Exception as e:
            logger.error(f"Failed to send VK message: {e}")

    def _get_consent_keyboard(self) -> dict:
        """Get keyboard for 152-ФЗ consent request (VK community bot format).
        
        Uses shared keyboard formatting for consistency.
        """
        return format_vk_keyboard(get_consent_buttons())

    def _get_marketing_keyboard(self) -> dict:
        """Get keyboard for marketing consent request.
        
        Uses shared keyboard formatting for consistency.
        """
        return format_vk_keyboard(get_marketing_buttons())

    async def _handle_start(self, user_id: int, peer_id: int):
        """Handle /start command - check if user is registered and show consent if new."""
        # Use shared consent check
        consents = get_customer_consents(VK_SOURCE, user_id)
        
        if consents.get("data_processing_allowed"):
            # User already registered - show balance
            await self._handle_balance(user_id, peer_id)
        else:
            # New user - show consent message first using shared keyboard
            await self._send_message(
                peer_id,
                "Добро пожаловать в GreenHouse! 🏠☕",
                keyboard=self._get_consent_keyboard()
            )
            # Store consent state in Redis using shared key function
            r = get_redis()
            r.hset(consent_key(VK_SOURCE, user_id), mapping={"state": "consent_shown"})
            r.expire(consent_key(VK_SOURCE, user_id), 3600)  # 1 hour TTL

    async def _handle_consent(self, user_id: int, peer_id: int, payload: dict):
        """Handle consent button response."""
        command = payload.get("command", "")
        r = get_redis()
        
        # Handle refusal
        if command == "consent:refuse":
            # Use shared cleanup_user_data function for 152-ФЗ compliance
            cleanup_user_data(VK_SOURCE, user_id)
            
            await self._send_message(
                peer_id,
                "Вы отказались от регистрации.\n\n"
                "Ваши данные были удалены.\n"
                "Для повторной регистрации используйте /start"
            )
            return
        
        # Handle agreement
        if command not in ("consent:agree", "consent:yes"):
            return
        
        # Store consent state and ask for name using shared RegistrationFlow
        self._reg_flow.start_registration(user_id)
        
        await self._send_message(
            peer_id,
            "Согласие принято! ✅\n\n"
            "Как тебя зовут? (Имя)"
        )

    async def _handle_marketing_consent(self, user_id: int, peer_id: int, payload: dict):
        """Handle marketing consent button response."""
        command = payload.get("command", "")
        r = get_redis()
        consent_data = r.hgetall(consent_key(VK_SOURCE, user_id))
        
        if not consent_data or consent_data.get("consent_given") != "1":
            await self._send_message(
                peer_id,
                "Сессия регистрации истекла. Используйте /start для начала заново."
            )
            return
        
        marketing_allowed = 1 if command == "consent:marketing:yes" else 0
        
        # Get stored registration data
        phone = consent_data.get("phone", "")
        name = consent_data.get("name", "")
        
        if not phone or not name:
            await self._send_message(
                peer_id,
                "Сессия регистрации неполна. Используйте /start для начала заново."
            )
            r.delete(consent_key(VK_SOURCE, user_id))
            return
        
        # Complete registration using shared RegistrationFlow
        await self._complete_registration(user_id, peer_id, name, phone, marketing_allowed)

    async def _complete_registration(self, user_id: int, peer_id: int, name: str, phone: str, marketing_allowed: int):
        """Complete the registration process using shared RegistrationFlow."""
        from ...integrations.pos.erpnext_client import ERPClient
        
        try:
            # Use shared RegistrationFlow.complete_registration
            customer, is_new = self._reg_flow.complete_registration(
                user_id, name, phone, marketing_allowed
            )
            
            if not customer:
                await self._send_message(peer_id, "Ошибка регистрации: не удалось создать запись")
                return
            
            # Try to create customer in ERP
            client = ERPClient()
            try:
                # Use telegram_id parameter - it's used for both platforms
                await client.create_customer(
                    telegram_id=user_id,
                    name=name,
                    phone=phone,
                    consent_text="Согласие принято (152-ФЗ)",
                )
            except Exception as e:
                logger.warning(f"Failed to create customer in ERP: {e}")
            
            # Clean up registration data using shared function
            self._reg_flow.clear_registration(user_id)
            
            # Show success message
            if marketing_allowed:
                await self._send_message(
                    peer_id,
                    "Готово! Начислено 100 приветственных баллов.\n\n"
                    "Вы будете получать новости и акции.\n"
                    "Отписаться: /revoke_consent"
                )
            else:
                await self._send_message(
                    peer_id,
                    "Готово! Начислено 100 приветственных баллов.\n\n"
                    "Вы не будете получать рекламные сообщения.\n"
                    "Подписаться: /subscribe"
                )
        except Exception as e:
            await self._send_message(peer_id, f"Ошибка регистрации: {e}")

    def _get_help_text(self) -> str:
        """Get help text for VK bot"""
        return "\n".join(
            [
                "/start — начать",
                "/register Имя Телефон — регистрация",
                "/balance — баланс и последние операции",
                "/help — справка",
            ]
        )

    async def run(self):
        """Run the bot in polling mode"""
        self._running = True
        logger.info(f"VK Bot started for group {self.group_id}")

        while self._running:
            try:
                updates = await self.long_poll()
                if updates:
                    await self.process_updates(updates)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"VK Long Poll error: {e}")
                await asyncio.sleep(5)  # Wait before retrying

        logger.info("VK Bot stopped")

    def stop(self):
        """Stop the bot"""
        self._running = False


# Global VK bot instance
_vk_bot: Optional[VKBot] = None


def create_vk_bot(
    access_token: str,
    group_id: int,
    api_version: str = "5.131",
    message_handler: Optional[Callable[[int, str], Any]] = None,
) -> VKBot:
    """Create a VK bot instance"""
    global _vk_bot
    _vk_bot = VKBot(
        access_token=access_token,
        group_id=group_id,
        api_version=api_version,
        message_handler=message_handler,
    )
    return _vk_bot


async def get_vk_bot() -> Optional[VKBot]:
    """Get the current VK bot instance"""
    return _vk_bot


async def validate_vk_token(
    access_token: str, group_id: int, api_version: str = "5.131"
) -> dict:
    """
    Validate VK access token and group ID
    Returns dict with 'valid' boolean and optional 'error' message
    """
    async with aiohttp.ClientSession() as session:
        params: Any = {
            "group_id": group_id,
            "access_token": access_token,
            "v": api_version,
        }
        try:
            async with session.get(
                f"{VK_API_URL}/groups.getById", params=params
            ) as resp:
                data = await resp.json()

                if "error" in data:
                    error_msg = data["error"].get("error_msg", "Unknown error")
                    return {"valid": False, "error": error_msg}

                if data.get("response"):
                    group_info = data["response"][0]
                    return {
                        "valid": True,
                        "group_name": group_info.get("name"),
                        "group_id": group_info.get("id"),
                    }

                return {"valid": False, "error": "No group found"}

        except aiohttp.ClientError as e:
            return {"valid": False, "error": str(e)}
        except Exception as e:
            return {"valid": False, "error": f"Validation failed: {e}"}


import asyncio

# Global config for webhook processing
_vk_config: Optional[dict] = None
_vk_config_lock = asyncio.Lock()

# Global bot instance for webhook processing (lazy initialized)
_vk_webhook_bot: Optional["VKBot"] = None


def set_vk_config(access_token: str, group_id: int, api_version: str = "5.131"):
    """Set VK config for webhook processing (async-safe)."""
    global _vk_config, _vk_webhook_bot
    _vk_config = {
        "access_token": access_token,
        "group_id": group_id,
        "api_version": api_version,
    }
    # Reset the webhook bot so it gets recreated with new config
    _vk_webhook_bot = None


async def _get_webhook_bot() -> Optional["VKBot"]:
    """Get or create a reusable bot instance for webhook processing."""
    global _vk_webhook_bot, _vk_config
    
    if _vk_webhook_bot is not None:
        return _vk_webhook_bot
    
    if not _vk_config:
        logger.error("VK config not set, cannot create webhook bot")
        return None
    
    _vk_webhook_bot = VKBot(
        access_token=_vk_config["access_token"],
        group_id=_vk_config["group_id"],
        api_version=_vk_config["api_version"],
    )
    return _vk_webhook_bot


async def process_vk_webhook_event(event: dict) -> None:
    """
    Process a VK webhook event.
    
    Args:
        event: The VK event payload from Callback API
    """
    global _vk_config
    
    # Check if config is set
    async with _vk_config_lock:
        if not _vk_config:
            logger.error("VK config not set, cannot process webhook event")
            return
    
    # Get reusable bot instance
    bot = await _get_webhook_bot()
    if bot is None:
        logger.error("Failed to get VK bot instance")
        return
    
    try:
        event_type = event.get("type")
        
        if event_type == "message_new":
            # Handle new message
            message = event.get("object", {}).get("message", {})
            await bot._handle_message(message)
            
        elif event_type == "message_event":
            # Handle keyboard button clicks (callback_query)
            event_data = event.get("object", {})
            await bot._handle_message_event(event_data)
            
        else:
            logger.debug(f"Unhandled VK event type: {event_type}")
    
    except Exception as e:
        logger.error(f"Error processing VK webhook event: {e}")
