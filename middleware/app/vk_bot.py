"""
VK (VKontakte) Bot Integration
Handles message processing via VK Long Poll API
"""
import asyncio
import json
import logging
from typing import Any, Callable, Optional

import aiohttp

from .config import get_settings
from .db import get_db
from .identify import generate_qr_token, normalize_name, normalize_phone

logger = logging.getLogger(__name__)

# VK API base URL
VK_API_URL = "https://api.vk.com/method"


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

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def close(self):
        """Close the bot and cleanup resources"""
        self._running = False
        if self._session and not self._session.closed:
            await self._session.close()

    async def get_long_poll_server(self) -> dict:
        """Get VK Long Poll server info"""
        session = await self._get_session()
        params = {
            "group_id": self.group_id,
            "access_token": self.access_token,
            "v": self.api_version,
        }
        async with session.get(f"{VK_API_URL}/groups.getLongPollServer", params=params) as resp:
            data = await resp.json()
            if "error" in data:
                raise Exception(f"VK API error: {data['error']}")
            return data["response"]

    async def long_poll(self) -> list:
        """Poll for new events from VK"""
        if not self._server_info:
            self._server_info = await self.get_long_poll_server()

        params = {
            "act": "a_check",
            "key": self._server_info["key"],
            "ts": self._server_info["ts"],
            "wait": 25,  # Max wait time in seconds
            "mode": 2,   # Return messages only
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
            return data.get("updates", [])

    async def process_updates(self, updates: list):
        """Process incoming VK updates"""
        for update in updates:
            if update.get("type") == "message_new":
                await self._handle_message(update["object"]["message"])

    async def _handle_message(self, message: dict):
        """Handle incoming VK message"""
        user_id = message.get("from_id")
        text = message.get("text", "")
        peer_id = message.get("peer_id")

        if not user_id or not text:
            return

        logger.info(f"VK message from user {user_id}: {text}")

        # Process commands similar to Telegram
        command = text.strip().lower()

        if command.startswith("/start"):
            await self._handle_start(user_id, peer_id)
        elif command.startswith("/register"):
            await self._handle_register(user_id, text)
        elif command.startswith("/balance"):
            await self._handle_balance(user_id)
        elif command.startswith("/help"):
            await self._send_message(peer_id, self._get_help_text())
        else:
            await self._send_message(peer_id, "Используйте /help для списка команд")

        # Call custom message handler if set
        if self.message_handler:
            await self.message_handler(user_id, text)

    async def _handle_start(self, user_id: int, peer_id: int):
        """Handle /start command - check if user is registered"""
        db = get_db()
        conn = db.connect()
        try:
            # Check if VK user exists in database
            # Note: We might need to add vk_id column to customers table
            cur = conn.execute("SELECT id FROM customers WHERE vk_id=?", (user_id,))
            row = cur.fetchone()

            if row:
                await self._send_message(peer_id, "Вы уже зарегистрированы. Используйте /balance для просмотра баланса.")
            else:
                await self._send_message(peer_id, "Привет! Давайте зарегистрируемся. Используйте команду: /register Имя +79991234567")
        finally:
            conn.close()

    async def _handle_register(self, user_id: int, text: str):
        """Handle /register command"""
        args = text.split(maxsplit=2)
        if len(args) < 3:
            await self._send_message(user_id, "Формат: /register Имя Телефон")
            return

        name = args[1]
        phone = normalize_phone(args[2])
        if not phone:
            await self._send_message(user_id, "Телефон должен быть в формате +79991234567")
            return

        db = get_db()
        conn = db.connect()
        try:
            # Check if phone already exists
            cur = conn.execute("SELECT id, vk_id FROM customers WHERE phone=?", (phone,))
            row = cur.fetchone()

            if row:
                # Update existing customer with VK ID
                conn.execute(
                    "UPDATE customers SET vk_id=?, updated_at=datetime('now') WHERE id=?",
                    (user_id, int(row["id"])),
                )
            else:
                # Create new customer
                qr_token = generate_qr_token()
                name_norm = normalize_name(name)
                conn.execute(
                    "INSERT INTO customers(phone, full_name, vk_id, qr_token) VALUES(?,?,?,?)",
                    (phone, name_norm, user_id, qr_token),
                )

            conn.commit()
            await self._send_message(user_id, "Регистрация успешна! Начислено 100 приветственных баллов.")
        except Exception as e:
            await self._send_message(user_id, f"Ошибка регистрации: {e}")
        finally:
            conn.close()

    async def _handle_balance(self, user_id: int):
        """Handle /balance command"""
        db = get_db()
        conn = db.connect()
        try:
            cur = conn.execute("SELECT balance_points, full_name FROM customers WHERE vk_id=?", (user_id,))
            row = cur.fetchone()

            if not row:
                await self._send_message(user_id, "Вы ещё не зарегистрированы. Используйте /start")
                return

            balance = int(row["balance_points"])
            name = row["full_name"] or "гость"
            await self._send_message(user_id, f"Привет, {name}.\nБаланс: {balance} баллов.")
        finally:
            conn.close()

    async def _send_message(self, peer_id: int, text: str):
        """Send message to VK user"""
        session = await self._get_session()
        params = {
            "peer_id": peer_id,
            "message": text,
            "access_token": self.access_token,
            "v": self.api_version,
            "random_id": 0,  # Will be auto-generated by VK
        }

        try:
            async with session.post(f"{VK_API_URL}/messages.send", params=params) as resp:
                data = await resp.json()
                if "error" in data:
                    logger.error(f"VK send message error: {data['error']}")
        except Exception as e:
            logger.error(f"Failed to send VK message: {e}")

    def _get_help_text(self) -> str:
        """Get help text for VK bot"""
        return "\n".join([
            "/start — начать",
            "/register Имя Телефон — регистрация",
            "/balance — баланс и последние операции",
            "/help — справка",
        ])

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


async def validate_vk_token(access_token: str, group_id: int, api_version: str = "5.131") -> dict:
    """
    Validate VK access token and group ID
    Returns dict with 'valid' boolean and optional 'error' message
    """
    async with aiohttp.ClientSession() as session:
        params = {
            "group_id": group_id,
            "access_token": access_token,
            "v": api_version,
        }
        try:
            async with session.get(f"{VK_API_URL}/groups.getById", params=params) as resp:
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
