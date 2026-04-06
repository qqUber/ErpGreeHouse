import time
from typing import Any, Dict, Optional
from unittest.mock import AsyncMock, MagicMock


class TelegramMock:
    """Helper to mock aiogram's Message, CallbackQuery, and Bot."""

    @staticmethod
    def create_message(
        text: str,
        user_id: int = 12345,
        username: str = "testuser",
        chat_id: Optional[int] = None,
    ) -> MagicMock:
        """Create a mock aiogram Message."""
        message = MagicMock()
        message.text = text
        message.from_user = MagicMock()
        message.from_user.id = user_id
        message.from_user.username = username
        message.from_user.first_name = "Test"
        message.from_user.last_name = "User"
        message.chat = MagicMock()
        message.chat.id = chat_id or user_id
        message.date = int(time.time())
        message.answer = AsyncMock()
        message.reply = AsyncMock()
        message.edit_text = AsyncMock()
        message.delete = AsyncMock()
        return message

    @staticmethod
    def create_callback_query(data: str, user_id: int = 12345, message: Optional[MagicMock] = None) -> MagicMock:
        """Create a mock aiogram CallbackQuery."""
        cb = MagicMock()
        cb.data = data
        cb.from_user = MagicMock()
        cb.from_user.id = user_id
        cb.message = message or TelegramMock.create_message("", user_id=user_id)
        cb.answer = AsyncMock()
        return cb

    @staticmethod
    def create_bot() -> MagicMock:
        """Create a mock aiogram Bot."""
        bot = MagicMock()
        bot.send_message = AsyncMock()
        bot.edit_message_text = AsyncMock()
        bot.answer_callback_query = AsyncMock()
        return bot
