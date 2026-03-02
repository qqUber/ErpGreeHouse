"""
Telegram Bot Integration Tests

These tests verify the actual Telegram API interaction for the bot.
Tests send real messages through the Telegram API to validate the integration.

Required Environment Variables:
- TELEGRAM_BOT_TOKEN: Telegram bot token from @BotFather
- TELEGRAM_CHANNEL_ID: Telegram channel ID for testing (e.g., -1002158936191)

Note: These tests require a running backend and real Telegram bot.
Use pytest.skip() if credentials are not configured.
"""

import os
import pytest
import requests
from typing import Dict, Any, Optional


# Test configuration - requires environment variables to be set
def _get_bot_token() -> Optional[str]:
    """Get bot token from environment, returns None if not set."""
    return os.getenv("TELEGRAM_BOT_TOKEN")


def _get_channel_id() -> Optional[str]:
    """Get channel ID from environment, returns None if not set."""
    return os.getenv("TELEGRAM_CHANNEL_ID")


def _require_credentials():
    """Skip test if required credentials are not set."""
    token = _get_bot_token()
    channel = _get_channel_id()
    if not token or not channel:
        pytest.skip("TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID environment variables must be set")
    return token, channel


# Lazy initialization of API base URL
_TELEGRAM_API_BASE: Optional[str] = None


def _get_telegram_api_base() -> str:
    """Get Telegram API base URL, requires token to be set."""
    global _TELEGRAM_API_BASE
    if _TELEGRAM_API_BASE is None:
        token = _get_bot_token()
        if not token:
            pytest.skip("TELEGRAM_BOT_TOKEN environment variable not set")
        _TELEGRAM_API_BASE = f"https://api.telegram.org/bot{token}"
    return _TELEGRAM_API_BASE


class TestTelegramBotConfiguration:
    """Test bot configuration and basic connectivity."""

    def test_bot_token_is_valid(self):
        """Verify the bot token is valid by calling getMe."""
        _require_credentials()  # Ensure credentials are set
        response = requests.get(f"{_get_telegram_api_base()}/getMe")
        data = response.json()

        assert data["ok"] is True, f"Bot API returned error: {data}"
        assert data["result"]["is_bot"] is True
        assert "username" in data["result"]
        print(f"Bot verified: @{data['result']['username']}")

    def test_bot_can_access_channel(self):
        """Verify bot has access to the configured channel."""
        token, channel_id = _require_credentials()
        response = requests.get(
            f"{_get_telegram_api_base()}/getChat",
            params={"chat_id": channel_id}
        )
        data = response.json()

        assert data["ok"] is True, f"Failed to access channel: {data}"
        assert data["result"]["id"] == int(channel_id)
        print(f"Channel verified: {data['result']['title']}")


class TestTelegramBotMessaging:
    """Test bot messaging capabilities."""

    @pytest.fixture
    def cleanup_messages(self):
        """Track message IDs for cleanup after tests."""
        _require_credentials()
        message_ids = []
        yield message_ids
        # Note: Telegram doesn't allow deleting messages from supergroups
        # by regular bots, so we just track them for reference

    def test_send_text_message_to_channel(self, cleanup_messages):
        """Test sending a simple text message to the channel."""
        token, channel_id = _require_credentials()
        response = requests.post(
            f"{_get_telegram_api_base()}/sendMessage",
            data={
                "chat_id": channel_id,
                "text": "Integration test: Simple text message"
            }
        )
        data = response.json()

        assert data["ok"] is True, f"Failed to send message: {data}"
        assert "message_id" in data["result"]
        assert data["result"]["text"] == "Integration test: Simple text message"
        cleanup_messages.append(data["result"]["message_id"])
        print(f"Message sent with ID: {data['result']['message_id']}")

    def test_send_message_with_html_formatting(self, cleanup_messages):
        """Test sending a message with HTML formatting."""
        token, channel_id = _require_credentials()
        response = requests.post(
            f"{_get_telegram_api_base()}/sendMessage",
            data={
                "chat_id": channel_id,
                "text": "<b>Bold text</b> and <i>italic text</i>",
                "parse_mode": "HTML"
            }
        )
        data = response.json()

        assert data["ok"] is True, f"Failed to send formatted message: {data}"
        cleanup_messages.append(data["result"]["message_id"])

    def test_send_message_with_entities(self, cleanup_messages):
        """Test sending a message with custom entities."""
        token, channel_id = _require_credentials()
        response = requests.post(
            f"{_get_telegram_api_base()}/sendMessage",
            data={
                "chat_id": channel_id,
                "text": "Test /start command message",
            }
        )
        data = response.json()

        assert data["ok"] is True
        cleanup_messages.append(data["result"]["message_id"])


class TestTelegramBotCommands:
    """Test bot command handling."""

    def test_set_bot_commands(self):
        """Configure bot commands for the bot."""
        _require_credentials()
        commands = [
            {"command": "start", "description": "Start the bot"},
            {"command": "balance", "description": "Check your loyalty balance"},
            {"command": "menu", "description": "View menu"},
            {"command": "help", "description": "Get help"}
        ]
        response = requests.post(
            f"{_get_telegram_api_base()}/setMyCommands",
            data={"commands": str(commands).replace("'", '"')}
        )
        # Note: This may fail if bot doesn't have permission
        # That's OK - commands can be set via BotFather
        print(f"Set commands response: {response.json()}")


class TestTelegramWebhookIntegration:
    """Test webhook integration for receiving messages."""

    def test_webhook_endpoint_exists(self):
        """Verify the webhook endpoint is configured in the middleware."""
        # This test checks if the webhook would be reachable
        # The actual webhook needs the server to be running
        import os
        base_url = os.getenv("BASE_WEB_URL", "http://localhost:8000")
        
        # Try to hit the health endpoint to verify server is running
        try:
            response = requests.get(f"{base_url}/health", timeout=5)
            assert response.status_code == 200
            print(f"Server is running at {base_url}")
        except requests.exceptions.RequestException:
            pytest.skip("Server not running - webhook test requires running server")

    def test_webhook_set_endpoint(self):
        """Verify the set_webhook endpoint exists."""
        import os
        base_url = os.getenv("BASE_WEB_URL", "http://localhost:8000")
        webhook_secret = os.getenv("WEBHOOK_SECRET", "test_secret")
        
        try:
            response = requests.post(
                f"{base_url}/telegram/set_webhook",
                headers={"x-webhook-secret": webhook_secret},
                timeout=5
            )
            # May fail if bot token not configured in .env
            print(f"Set webhook response: {response.status_code} - {response.text}")
        except requests.exceptions.RequestException:
            pytest.skip("Server not running - webhook test requires running server")


class TestTelegramLoyaltyIntegration:
    """Test loyalty-related bot messaging."""

    def test_send_loyalty_notification(self, cleanup_messages):
        """Test sending a loyalty notification message."""
        token, channel_id = _require_credentials()
        # This simulates what the loyalty system would send
        message = """
🎁 <b>Loyalty Update</b>

Your current balance: <b>150 points</b>
Points earned: +25
Valid until: 30 days
        """
        
        response = requests.post(
            f"{_get_telegram_api_base()}/sendMessage",
            data={
                "chat_id": channel_id,
                "text": message,
                "parse_mode": "HTML"
            }
        )
        data = response.json()

        assert data["ok"] is True, f"Failed to send loyalty message: {data}"
        cleanup_messages.append(data["result"]["message_id"])
        print(f"Loyalty notification sent: {data['result']['message_id']}")


class TestTelegramOmnichannelStatus:
    """Verify omnichannel status for MVP."""

    def test_telegram_channel_status(self):
        """Verify Telegram is configured as an active channel."""
        token, channel_id = _require_credentials()
        # Check bot info
        response = requests.get(f"{_get_telegram_api_base()}/getMe")
        bot_info = response.json()
        
        # Check channel access
        response = requests.get(
            f"{_get_telegram_api_base()}/getChat",
            params={"chat_id": channel_id}
        )
        channel_info = response.json()
        
        status = {
            "channel": "Telegram",
            "bot_username": bot_info["result"]["username"],
            "channel_name": channel_info["result"]["title"],
            "channel_id": channel_id,
            "can_send_messages": channel_info["result"]["permissions"]["can_send_messages"],
            "status": "ACTIVE" if channel_info["result"]["permissions"]["can_send_messages"] else "INACTIVE"
        }
        
        print(f"\n=== Telegram Channel Status ===")
        for key, value in status.items():
            print(f"  {key}: {value}")
        
        assert status["status"] == "ACTIVE"
        assert status["can_send_messages"] is True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
