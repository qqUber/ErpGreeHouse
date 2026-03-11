"""
Telegram Bot Integration Tests - Mocked

These tests verify the Telegram API integration using mocked API calls.
Uses responses for HTTP mocking of requests calls.
"""

import pytest
import responses
import json
from unittest.mock import patch

@pytest.fixture
def telegram_api_mock():
    """Fixture to mock Telegram Bot API."""
    with responses.RequestsMock() as rsps:
        yield rsps

def test_bot_token_is_valid_mocked(telegram_api_mock):
    """Verify the bot token is valid by calling getMe (mocked with responses)."""
    # Setup mock
    telegram_api_mock.add(
        responses.GET,
        "https://api.telegram.org/bot12345:ABCDE/getMe",
        json={
            "ok": True,
            "result": {"is_bot": True, "username": "test_bot"},
        },
        status=200
    )
    
    with patch("tests.integration.test_telegram_integration._get_bot_token", return_value="12345:ABCDE"), \
         patch("tests.integration.test_telegram_integration._require_credentials", return_value=("12345:ABCDE", "-100123456789")):
        
        from tests.integration.test_telegram_integration import TestTelegramBotConfiguration
        test_instance = TestTelegramBotConfiguration()
        test_instance.test_bot_token_is_valid()

def test_bot_can_access_channel_mocked(telegram_api_mock):
    """Verify bot has access to the configured channel (mocked with responses)."""
    channel_id = "-100123456789"
    telegram_api_mock.add(
        responses.GET,
        f"https://api.telegram.org/bot12345:ABCDE/getChat",
        json={
            "ok": True,
            "result": {
                "id": int(channel_id),
                "title": "Test Channel",
                "type": "supergroup"
            },
        },
        status=200
    )
    
    with patch("tests.integration.test_telegram_integration._get_bot_token", return_value="12345:ABCDE"), \
         patch("tests.integration.test_telegram_integration._require_credentials", return_value=("12345:ABCDE", channel_id)):
        
        from tests.integration.test_telegram_integration import TestTelegramBotConfiguration
        test_instance = TestTelegramBotConfiguration()
        test_instance.test_bot_can_access_channel()

def test_send_text_message_mocked(telegram_api_mock):
    """Test sending a text message (mocked with responses)."""
    channel_id = "-100123456789"
    telegram_api_mock.add(
        responses.POST,
        "https://api.telegram.org/bot12345:ABCDE/sendMessage",
        json={
            "ok": True,
            "result": {
                "message_id": 1,
                "text": "Integration test: Simple text message",
                "chat": {"id": int(channel_id), "type": "supergroup"}
            }
        },
        status=200
    )
    
    with patch("tests.integration.test_telegram_integration._get_bot_token", return_value="12345:ABCDE"), \
         patch("tests.integration.test_telegram_integration._require_credentials", return_value=("12345:ABCDE", channel_id)):
        
        from tests.integration.test_telegram_integration import TestTelegramBotMessaging
        test_instance = TestTelegramBotMessaging()
        # The test class might need a real cleanup_messages fixture if it's using it
        # but here we pass an empty list directly
        test_instance.test_send_text_message_to_channel([])
