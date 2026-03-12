"""
Unit tests for Telegram bot handlers

Smoke tests verify handler functions can be imported and have correct signatures.
Full handler logic is tested via integration tests.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app import handlers
from tests.mocks.telegram import TelegramMock


def test_handlers_module_imports():
    """Smoke test: Verify handlers module can be imported."""
    assert handlers is not None


def test_handlers_have_expected_functions():
    """Smoke test: Verify handler functions exist."""
    # Check for expected handler functions
    assert hasattr(handlers, "cmd_start"), "Missing cmd_start handler"
    assert hasattr(handlers, "cmd_register"), "Missing cmd_register handler"
    assert hasattr(handlers, "cb_consent"), "Missing cb_consent callback handler"


@pytest.mark.asyncio
async def test_cmd_start_new_user(telegram_mock, clean_database, redis_client):
    """Test /start command for a new user (shows consent)."""
    message = telegram_mock.create_message("/start")

    with patch("app.handlers.get_redis", return_value=redis_client):
        await handlers.cmd_start(message)

    # Verify that message.answer was called with the welcome text and keyboard
    message.answer.assert_called_once()
    args, kwargs = message.answer.call_args
    assert "Добро пожаловать" in args[0]
    assert "reply_markup" in kwargs


@pytest.mark.asyncio
async def test_cmd_register_invalid_format(telegram_mock):
    """Test /register with invalid format."""
    message = telegram_mock.create_message("/register Invalid")

    await handlers.cmd_register(message)

    message.answer.assert_called_once_with("Формат: /register Имя Телефон")


@pytest.mark.asyncio
async def test_cmd_register_valid(telegram_mock, redis_client):
    """Test /register with valid format."""
    message = telegram_mock.create_message("/register Test +79991234567")

    with patch("app.handlers.get_redis", return_value=redis_client):
        await handlers.cmd_register(message)

    message.answer.assert_called_once()
    args, kwargs = message.answer.call_args
    assert "соглашаюсь" in args[0]
    assert "reply_markup" in kwargs


@pytest.mark.asyncio
async def test_cb_consent_no(telegram_mock, redis_client):
    """Test consent:no callback."""
    cb = telegram_mock.create_callback_query("consent:no")

    with patch("app.handlers.get_redis", return_value=redis_client), patch(
        "app.storage.get_redis", return_value=redis_client
    ):
        await handlers.cb_consent(cb)

    cb.message.edit_text.assert_called_once_with("Регистрация отменена.")
    cb.answer.assert_called_once()
