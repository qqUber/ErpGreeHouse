"""
Unit tests for Telegram bot handlers - helper functions
"""

from unittest.mock import Mock, patch

import pytest

from app.handlers import (
    _cart_key,
    _cleanup_user_data,
    _consent_key,
    _get_customer_consents,
    _store_consent,
    _update_consent,
    _upsert_local_customer,
    register_or_link_user,
)


class TestHandlersHelperFunctions:
    """Tests for handler helper functions that don't require aiogram."""

    def test_cart_key_generation(self):
        """Test cart key generation."""
        assert _cart_key(123) == "crm:cart:123"
        assert _cart_key(456) == "crm:cart:456"

    def test_consent_key_generation(self):
        """Test consent key generation."""
        assert _consent_key(123) == "crm:consent:123"
        assert _consent_key(456) == "crm:consent:456"

    @patch("app.handlers._shared_cleanup")
    def test_cleanup_user_data(self, mock_cleanup):
        """Test _cleanup_user_data function."""
        _cleanup_user_data(123)
        mock_cleanup.assert_called_once_with("tg", 123)

    @patch("app.handlers._shared_store")
    def test_store_consent(self, mock_store):
        """Test _store_consent function."""
        _store_consent(1, "test consent", "1.0")
        mock_store.assert_called_once_with(1, "tg", "test consent", "1.0", "data_processing", None)

    @patch("app.handlers._shared_get")
    def test_get_customer_consents(self, mock_get):
        """Test _get_customer_consents function."""
        mock_get.return_value = {"consent": "yes"}
        result = _get_customer_consents(123)
        assert result == {"consent": "yes"}
        mock_get.assert_called_once_with("tg", 123, None)

    @patch("app.handlers._shared_update")
    def test_update_consent(self, mock_update):
        """Test _update_consent function."""
        _update_consent(123, marketing_allowed=0, data_processing_allowed=1)
        mock_update.assert_called_once_with("tg", 123, 0, 1, None)

    @patch("app.handlers.get_db")
    @patch("app.handlers.normalize_phone")
    @patch("app.handlers.get_customer_row")
    @patch("app.handlers.resolve_or_create_customer")
    def test_register_or_link_user_new_customer_tg(
        self, mock_resolve, mock_get_customer_row, mock_normalize, mock_get_db
    ):
        """Test register_or_link_user for new Telegram customer."""
        mock_normalize.return_value = "+79991234567"
        mock_resolve.return_value = (1, True)
        mock_get_customer_row.return_value = {"id": 1, "phone": "+79991234567"}

        mock_conn = Mock()
        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        customer, is_new = register_or_link_user("+79991234567", "12345", "tg")

        assert is_new is True
        assert customer == {"id": 1, "phone": "+79991234567"}
        mock_normalize.assert_called_once_with("+79991234567")
        mock_resolve.assert_called_once_with(
            mock_conn,
            telegram_id=12345,
            vk_id=None,
            phone="+79991234567",
            preferred_channel="tg",
            onboarding_status="linked",
        )
        mock_conn.commit.assert_called_once()

    @patch("app.handlers.get_db")
    @patch("app.handlers.normalize_phone")
    @patch("app.handlers.get_customer_row")
    @patch("app.handlers.resolve_or_create_customer")
    def test_register_or_link_user_existing_customer(
        self, mock_resolve, mock_get_customer_row, mock_normalize, mock_get_db
    ):
        """Test register_or_link_user for existing customer."""
        mock_normalize.return_value = "+79991234567"
        mock_resolve.return_value = (1, False)
        mock_get_customer_row.return_value = {"id": 1, "phone": "+79991234567"}

        mock_conn = Mock()
        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        customer, is_new = register_or_link_user("+79991234567", "12345", "tg")

        assert is_new is False
        assert customer == {"id": 1, "phone": "+79991234567"}

    @patch("app.handlers.get_db")
    @patch("app.handlers.normalize_phone")
    def test_register_or_link_user_invalid_phone(self, mock_normalize, mock_get_db):
        """Test register_or_link_user with invalid phone."""
        mock_normalize.return_value = None

        with pytest.raises(ValueError) as exc_info:
            register_or_link_user("invalid_phone", "12345", "tg")

        assert "Invalid phone number format" in str(exc_info.value)

    @patch("app.handlers.get_db")
    @patch("app.handlers.normalize_name")
    @patch("app.handlers.resolve_or_create_customer")
    def test_upsert_local_customer_new(self, mock_resolve, mock_normalize, mock_get_db):
        """Test _upsert_local_customer for new customer."""
        mock_resolve.return_value = (1, True)

        mock_conn = Mock()
        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        customer_id = _upsert_local_customer(123, "Test User", "+79991234567")

        assert customer_id == 1
        mock_resolve.assert_called_once()
        mock_conn.commit.assert_called_once()

    @patch("app.handlers.get_db")
    @patch("app.handlers.normalize_name")
    @patch("app.handlers.resolve_or_create_customer")
    def test_upsert_local_customer_existing(self, mock_resolve, mock_normalize, mock_get_db):
        """Test _upsert_local_customer for existing customer."""
        mock_normalize.return_value = "Test User"
        mock_resolve.return_value = (1, False)

        mock_conn = Mock()
        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        customer_id = _upsert_local_customer(123, "Test User", "+79991234567")

        assert customer_id == 1
