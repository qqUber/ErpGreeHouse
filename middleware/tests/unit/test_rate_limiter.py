"""
Unit tests for app.rate_limiter module.

Covers Redis-backed token bucket rate limiting for chat channels.
"""

from unittest.mock import MagicMock, patch

import app.rate_limiter as rate_limiter_module
from app.rate_limiter import (
    _RATE_LIMIT_LUA,
    _get_redis,
    check_rate_limit,
    get_rate_limit_config,
    is_rate_limited,
)


class TestGetRedis:
    """Tests for _get_redis function."""

    def test_get_redis_returns_none_when_redis_unavailable(self):
        """Should return None when Redis connection fails."""
        # Reset module-level client
        rate_limiter_module._redis_client = None

        with patch("redis.from_url") as mock_from_url:
            mock_from_url.side_effect = Exception("Connection refused")
            result = _get_redis()
            assert result is None

    def test_get_redis_caches_connection(self):
        """Should cache Redis connection after first successful call."""
        # Reset module-level client
        rate_limiter_module._redis_client = None

        mock_redis = MagicMock()
        mock_redis.ping.return_value = True

        with patch("redis.from_url", return_value=mock_redis) as mock_from_url:
            result1 = _get_redis()
            result2 = _get_redis()

            # Should only create connection once
            mock_from_url.assert_called_once()
            assert result1 is result2

    def test_get_redis_returns_existing_client(self):
        """Should return existing client if already initialized."""
        mock_client = MagicMock()
        rate_limiter_module._redis_client = mock_client

        result = _get_redis()
        assert result is mock_client


class TestCheckRateLimit:
    """Tests for check_rate_limit function."""

    def test_allows_when_redis_unavailable(self):
        """Should allow requests when Redis is unavailable."""
        with patch.object(rate_limiter_module, "_get_redis", return_value=None):
            result = check_rate_limit(123, "telegram", 10, 1.0)
            assert result is True

    def test_denies_when_invalid_config(self):
        """Should deny when max_tokens or refill_rate is invalid."""
        mock_redis = MagicMock()

        with patch.object(rate_limiter_module, "_get_redis", return_value=mock_redis):
            # Zero max_tokens
            assert check_rate_limit(123, "telegram", 0, 1.0) is False
            # Negative max_tokens
            assert check_rate_limit(123, "telegram", -1, 1.0) is False
            # Zero refill_rate
            assert check_rate_limit(123, "telegram", 10, 0) is False
            # Negative refill_rate
            assert check_rate_limit(123, "telegram", 10, -1.0) is False

    def test_allows_on_lua_script_failure(self):
        """Should allow requests when Lua script fails."""
        mock_redis = MagicMock()
        mock_script = MagicMock()
        mock_script.side_effect = Exception("Script error")
        mock_redis.register_script.return_value = mock_script

        with patch.object(rate_limiter_module, "_get_redis", return_value=mock_redis):
            # Reset the script cache
            rate_limiter_module._rate_limit_script = None

            result = check_rate_limit(123, "telegram", 10, 1.0)
            assert result is True

    def test_registers_script_on_first_call(self):
        """Should register Lua script on first call."""
        mock_redis = MagicMock()
        mock_script = MagicMock()
        mock_script.return_value = 1
        mock_redis.register_script.return_value = mock_script

        with patch.object(rate_limiter_module, "_get_redis", return_value=mock_redis):
            # Reset the script cache
            rate_limiter_module._rate_limit_script = None

            check_rate_limit(123, "telegram", 10, 1.0)

            mock_redis.register_script.assert_called_once_with(_RATE_LIMIT_LUA)

    def test_reuses_registered_script(self):
        """Should reuse existing script on subsequent calls."""
        mock_redis = MagicMock()
        mock_script = MagicMock()
        mock_script.return_value = 1
        mock_redis.register_script.return_value = mock_script

        with patch.object(rate_limiter_module, "_get_redis", return_value=mock_redis):
            # Reset and first call
            rate_limiter_module._rate_limit_script = None
            check_rate_limit(123, "telegram", 10, 1.0)

            # Second call should reuse
            mock_redis.register_script.reset_mock()
            check_rate_limit(123, "telegram", 10, 1.0)

            mock_redis.register_script.assert_not_called()

    def test_denies_when_rate_limit_exceeded(self):
        """Should deny when rate limit exceeded (script returns 0)."""
        mock_redis = MagicMock()
        mock_script = MagicMock()
        mock_script.return_value = 0
        mock_redis.register_script.return_value = mock_script

        with patch.object(rate_limiter_module, "_get_redis", return_value=mock_redis):
            rate_limiter_module._rate_limit_script = None

            result = check_rate_limit(123, "telegram", 10, 1.0)
            assert result is False

    def test_allows_when_under_rate_limit(self):
        """Should allow when under rate limit (script returns 1)."""
        mock_redis = MagicMock()
        mock_script = MagicMock()
        mock_script.return_value = 1
        mock_redis.register_script.return_value = mock_script

        with patch.object(rate_limiter_module, "_get_redis", return_value=mock_redis):
            rate_limiter_module._rate_limit_script = None

            result = check_rate_limit(123, "telegram", 10, 1.0)
            assert result is True


class TestGetRateLimitConfig:
    """Tests for get_rate_limit_config function."""

    def test_telegram_config(self):
        """Should return correct config for telegram channel."""
        config = get_rate_limit_config("telegram")

        assert "global" in config
        assert "per_chat" in config
        assert config["global"]["max_tokens"] > 0
        assert config["global"]["refill_rate"] > 0

    def test_vk_config(self):
        """Should return correct config for vk channel."""
        config = get_rate_limit_config("vk")

        assert "global" in config
        assert "per_chat" in config

    def test_mobile_config(self):
        """Should return correct config for mobile channel."""
        config = get_rate_limit_config("mobile")

        assert "global" in config
        assert "per_chat" in config

    def test_default_config_for_unknown_channel(self):
        """Should return conservative defaults for unknown channels."""
        config = get_rate_limit_config("unknown")

        assert config["global"]["max_tokens"] == 10
        assert config["global"]["refill_rate"] == 10.0
        assert config["per_chat"]["max_tokens"] == 1
        assert config["per_chat"]["refill_rate"] == 1.0


class TestIsRateLimited:
    """Tests for is_rate_limited function."""

    def test_not_limited_when_under_limits(self):
        """Should return False when both limits allow."""
        mock_redis = MagicMock()
        mock_script = MagicMock()
        mock_script.return_value = 1
        mock_redis.register_script.return_value = mock_script

        with patch.object(rate_limiter_module, "_get_redis", return_value=mock_redis):
            rate_limiter_module._rate_limit_script = None

            result = is_rate_limited(123, "telegram")
            assert result is False

    def test_limited_when_per_chat_exceeded(self):
        """Should return True when per-chat limit exceeded."""
        mock_redis = MagicMock()
        mock_script = MagicMock()
        # First call (per-chat) returns 0, second (global) returns 1
        mock_script.side_effect = [0, 1]
        mock_redis.register_script.return_value = mock_script

        with patch.object(rate_limiter_module, "_get_redis", return_value=mock_redis):
            rate_limiter_module._rate_limit_script = None

            result = is_rate_limited(123, "telegram")
            assert result is True

    def test_limited_when_global_exceeded(self):
        """Should return True when global limit exceeded."""
        mock_redis = MagicMock()
        mock_script = MagicMock()
        # First call (per-chat) returns 1, second (global) returns 0
        mock_script.side_effect = [1, 0]
        mock_redis.register_script.return_value = mock_script

        with patch.object(rate_limiter_module, "_get_redis", return_value=mock_redis):
            rate_limiter_module._rate_limit_script = None

            result = is_rate_limited(123, "telegram")
            assert result is True

    def test_allows_when_redis_unavailable(self):
        """Should allow when Redis is unavailable."""
        with patch.object(rate_limiter_module, "_get_redis", return_value=None):
            result = is_rate_limited(123, "telegram")
            assert result is False  # Not limited when Redis down

    def test_works_with_string_chat_id(self):
        """Should work with string chat IDs."""
        mock_redis = MagicMock()
        mock_script = MagicMock()
        mock_script.return_value = 1
        mock_redis.register_script.return_value = mock_script

        with patch.object(rate_limiter_module, "_get_redis", return_value=mock_redis):
            rate_limiter_module._rate_limit_script = None

            result = is_rate_limited("channel_123", "telegram")
            assert result is False
