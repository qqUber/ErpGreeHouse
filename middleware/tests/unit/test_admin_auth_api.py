"""
Unit tests for app.admin_auth_api module.

Tests authentication, authorization, and admin management functions.
"""

import os
import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException

import app.admin_auth_api as admin_auth_module
from app.admin_auth_api import (
    _hash_token,
    _is_jwt_format,
    _is_bootstrap_allowed,
    _get_jwt_cookie_settings,
    _get_admin_by_token,
    _get_admin_by_id,
    _check_rate_limit,
    require_admin_token_or_env,
    require_roles,
    LoginIn,
)


class TestHashToken:
    """Tests for _hash_token function."""

    def test_hash_token_returns_hex(self):
        """Should return SHA256 hex digest."""
        result = _hash_token("test_token")
        assert isinstance(result, str)
        assert len(result) == 64  # SHA256 hex is 64 chars

    def test_hash_token_deterministic(self):
        """Same token should produce same hash."""
        result1 = _hash_token("test_token")
        result2 = _hash_token("test_token")
        assert result1 == result2

    def test_hash_token_different_inputs(self):
        """Different tokens should produce different hashes."""
        result1 = _hash_token("token1")
        result2 = _hash_token("token2")
        assert result1 != result2


class TestIsJwtFormat:
    """Tests for _is_jwt_format function."""

    def test_valid_jwt_format(self):
        """Should return True for valid JWT (two dots)."""
        assert _is_jwt_format("header.payload.signature") is True
        assert _is_jwt_format("a.b.c") is True

    def test_invalid_jwt_format_no_dots(self):
        """Should return False for strings without dots."""
        assert _is_jwt_format("notajwt") is False

    def test_invalid_jwt_format_one_dot(self):
        """Should return False for strings with one dot."""
        assert _is_jwt_format("only.one") is False

    def test_invalid_jwt_format_three_dots(self):
        """Should return False for strings with three dots."""
        assert _is_jwt_format("a.b.c.d") is False

    def test_empty_string(self):
        """Should return False for empty string."""
        assert _is_jwt_format("") is False

    def test_none_input(self):
        """Should return False for None."""
        assert _is_jwt_format(None) is False  # type: ignore


class TestIsBootstrapAllowed:
    """Tests for _is_bootstrap_allowed function."""

    def test_not_allowed_in_production(self):
        """Should return False in production environment."""
        with patch.object(
            admin_auth_module, "get_settings", return_value=MagicMock(environment="production")
        ):
            assert _is_bootstrap_allowed("ADMIN_BOOTSTRAP_DEFAULT") is False

    def test_allowed_when_env_true(self):
        """Should return True when env var is 'true'."""
        with patch.object(
            admin_auth_module, "get_settings", return_value=MagicMock(environment="development")
        ):
            with patch.dict(os.environ, {"ADMIN_BOOTSTRAP_DEFAULT": "true"}):
                assert _is_bootstrap_allowed("ADMIN_BOOTSTRAP_DEFAULT") is True

    def test_allowed_when_env_1(self):
        """Should return True when env var is '1'."""
        with patch.object(
            admin_auth_module, "get_settings", return_value=MagicMock(environment="development")
        ):
            with patch.dict(os.environ, {"ADMIN_BOOTSTRAP_DEFAULT": "1"}):
                assert _is_bootstrap_allowed("ADMIN_BOOTSTRAP_DEFAULT") is True

    def test_allowed_when_env_yes(self):
        """Should return True when env var is 'yes'."""
        with patch.object(
            admin_auth_module, "get_settings", return_value=MagicMock(environment="development")
        ):
            with patch.dict(os.environ, {"ADMIN_BOOTSTRAP_DEFAULT": "yes"}):
                assert _is_bootstrap_allowed("ADMIN_BOOTSTRAP_DEFAULT") is True

    def test_not_allowed_when_env_false(self):
        """Should return False when env var is 'false'."""
        with patch.object(
            admin_auth_module, "get_settings", return_value=MagicMock(environment="development")
        ):
            with patch.dict(os.environ, {"ADMIN_BOOTSTRAP_DEFAULT": "false"}):
                assert _is_bootstrap_allowed("ADMIN_BOOTSTRAP_DEFAULT") is False

    def test_not_allowed_when_env_missing(self):
        """Should return False when env var is missing."""
        with patch.object(
            admin_auth_module, "get_settings", return_value=MagicMock(environment="development")
        ):
            # Remove env var if present
            env_copy = {k: v for k, v in os.environ.items() if k != "ADMIN_BOOTSTRAP_DEFAULT"}
            with patch.dict(os.environ, env_copy, clear=True):
                assert _is_bootstrap_allowed("ADMIN_BOOTSTRAP_DEFAULT") is False


class TestGetJwtCookieSettings:
    """Tests for _get_jwt_cookie_settings function."""

    def test_default_settings(self):
        """Should return correct default settings."""
        with patch.object(
            admin_auth_module, "get_settings", return_value=MagicMock(environment="development")
        ):
            settings = _get_jwt_cookie_settings()
            assert settings["httponly"] is True
            assert settings["samesite"] == "lax"
            assert settings["path"] == "/"
            assert "secure" in settings

    def test_secure_true_when_env_set(self):
        """Should set secure=True when ADMIN_COOKIE_SECURE=true."""
        with patch.object(
            admin_auth_module, "get_settings", return_value=MagicMock(environment="development")
        ):
            with patch.dict(os.environ, {"ADMIN_COOKIE_SECURE": "true"}):
                settings = _get_jwt_cookie_settings()
                assert settings["secure"] is True

    def test_domain_added_when_set(self):
        """Should add domain when ADMIN_COOKIE_DOMAIN is set."""
        with patch.object(
            admin_auth_module, "get_settings", return_value=MagicMock(environment="development")
        ):
            with patch.dict(os.environ, {"ADMIN_COOKIE_DOMAIN": "example.com"}):
                settings = _get_jwt_cookie_settings()
                assert settings["domain"] == "example.com"


class TestCheckRateLimit:
    """Tests for _check_rate_limit function."""

    def test_allows_first_request(self):
        """Should allow first request."""
        mock_redis = MagicMock()
        mock_redis.get.return_value = "0"

        with patch.object(admin_auth_module, "get_redis", return_value=mock_redis):
            with patch.object(
                admin_auth_module,
                "get_settings",
                return_value=MagicMock(
                    recovery_rate_limit_attempts=5, recovery_rate_limit_window_seconds=3600
                ),
            ):
                is_allowed, remaining = _check_rate_limit("192.168.1.1")
                assert is_allowed is True
                assert remaining == 4

    def test_denies_when_limit_exceeded(self):
        """Should deny when limit exceeded."""
        mock_redis = MagicMock()
        mock_redis.get.return_value = "5"

        with patch.object(admin_auth_module, "get_redis", return_value=mock_redis):
            with patch.object(
                admin_auth_module,
                "get_settings",
                return_value=MagicMock(
                    recovery_rate_limit_attempts=5, recovery_rate_limit_window_seconds=3600
                ),
            ):
                is_allowed, remaining = _check_rate_limit("192.168.1.1")
                assert is_allowed is False
                assert remaining == 0

    def test_handles_none_redis(self):
        """Should handle case when Redis returns None."""
        mock_redis = MagicMock()
        mock_redis.get.return_value = None

        with patch.object(admin_auth_module, "get_redis", return_value=mock_redis):
            with patch.object(
                admin_auth_module,
                "get_settings",
                return_value=MagicMock(
                    recovery_rate_limit_attempts=5, recovery_rate_limit_window_seconds=3600
                ),
            ):
                is_allowed, remaining = _check_rate_limit("192.168.1.1")
                assert is_allowed is True


class TestLoginInModel:
    """Tests for LoginIn Pydantic model."""

    def test_valid_input(self):
        """Should accept valid username and password."""
        login = LoginIn(username="admin", password="secret123")
        assert login.username == "admin"
        assert login.password == "secret123"

    def test_empty_username_rejected(self):
        """Should reject empty username."""
        with pytest.raises(ValueError):
            LoginIn(username="", password="secret123")

    def test_empty_password_rejected(self):
        """Should reject empty password."""
        with pytest.raises(ValueError):
            LoginIn(username="admin", password="")

    def test_username_max_length(self):
        """Should enforce username max length."""
        with pytest.raises(ValueError):
            LoginIn(username="a" * 81, password="secret123")

    def test_password_max_length(self):
        """Should enforce password max length."""
        with pytest.raises(ValueError):
            LoginIn(username="admin", password="a" * 201)


class TestRequireAdminTokenOrEnv:
    """Tests for require_admin_token_or_env function."""

    def test_env_secret_valid(self):
        """Should authenticate with valid ADMIN_SECRET."""
        with patch.dict(os.environ, {"ADMIN_SECRET": "super_secret"}):
            result = require_admin_token_or_env("super_secret")
            assert result["is_authenticated"] is True
            assert result["username"] == "env"
            assert result["role"] == "owner"

    def test_env_secret_invalid(self):
        """Should reject invalid ADMIN_SECRET."""
        with patch.dict(os.environ, {"ADMIN_SECRET": "super_secret"}):
            result = require_admin_token_or_env("wrong_secret")
            assert result["is_authenticated"] is False

    def test_no_env_secret_configured(self):
        """Should handle when ADMIN_SECRET not configured."""
        env_copy = {k: v for k, v in os.environ.items() if k != "ADMIN_SECRET"}
        with patch.dict(os.environ, env_copy, clear=True):
            # With no token provided either
            result = require_admin_token_or_env(None)
            assert result["is_authenticated"] is False

    def test_jwt_format_detection(self):
        """Should detect JWT format tokens."""
        # Mock validate_access_token to return None (invalid JWT)
        with patch.object(admin_auth_module, "validate_access_token", return_value=None):
            result = require_admin_token_or_env("header.payload.sig")
            assert result["is_authenticated"] is False
            assert "Invalid or expired JWT token" in result["detail"]


class TestRequireRoles:
    """Tests for require_roles function."""

    def test_allows_matching_role(self):
        """Should allow user with matching role."""
        with patch.object(
            admin_auth_module,
            "require_admin_token_or_env",
            return_value={
                "is_authenticated": True,
                "role": "owner",
                "detail": "OK",
            },
        ):
            result = require_roles("valid_token", ("owner", "admin"))
            assert result["role"] == "owner"

    def test_rejects_mismatched_role(self):
        """Should reject user without matching role."""
        with patch.object(
            admin_auth_module,
            "require_admin_token_or_env",
            return_value={
                "is_authenticated": True,
                "role": "operator",
                "detail": "OK",
            },
        ):
            with pytest.raises(HTTPException) as exc_info:
                require_roles("valid_token", ("owner", "admin"))
            assert exc_info.value.status_code == 403

    def test_rejects_unauthenticated(self):
        """Should reject unauthenticated user."""
        with patch.object(
            admin_auth_module,
            "require_admin_token_or_env",
            return_value={
                "is_authenticated": False,
                "detail": "Invalid token",
            },
        ):
            with pytest.raises(HTTPException) as exc_info:
                require_roles("invalid_token", ("owner",))
            assert exc_info.value.status_code == 401
