"""
Unit tests for Telegram bot handlers - helper functions
"""

import pytest
from unittest.mock import Mock, patch
from app.handlers import (
    _cleanup_user_data,
    _store_consent,
    _get_customer_consents,
    _update_consent,
    register_or_link_user,
    _cart_key,
    _consent_key,
    _upsert_local_customer,
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
        mock_store.assert_called_once_with(
            1, "tg", "test consent", "1.0", "data_processing", None
        )

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
    @patch("app.handlers.generate_qr_token")
    def test_register_or_link_user_new_customer_tg(
        self, mock_qr, mock_normalize, mock_get_db
    ):
        """Test register_or_link_user for new Telegram customer."""
        # Setup mocks
        mock_normalize.return_value = "+79991234567"
        mock_qr.return_value = "test_qr_token"

        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = None  # No existing customer
        mock_conn.execute.return_value = mock_cursor
        mock_cursor.lastrowid = 1

        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        # Test
        customer, is_new = register_or_link_user("+79991234567", "12345", "tg")

        # Verify
        assert is_new is True
        assert customer is not None
        mock_normalize.assert_called_once_with("+79991234567")
        mock_qr.assert_called_once()

    @patch("app.handlers.get_db")
    @patch("app.handlers.normalize_phone")
    @patch("app.handlers.generate_qr_token")
    def test_register_or_link_user_existing_customer(
        self, mock_qr, mock_normalize, mock_get_db
    ):
        """Test register_or_link_user for existing customer."""
        # Setup mocks
        mock_normalize.return_value = "+79991234567"
        mock_qr.return_value = "test_qr_token"

        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = {
            "id": 1,
            "telegram_id": None,
            "vk_id": None,
            "preferred_channel": None,
            "qr_token": "existing_qr",
        }
        mock_conn.execute.return_value = mock_cursor

        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        # Test
        customer, is_new = register_or_link_user("+79991234567", "12345", "tg")

        # Verify
        assert is_new is False
        assert customer is not None

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
    @patch("app.handlers.generate_qr_token")
    def test_upsert_local_customer_new(self, mock_qr, mock_normalize, mock_get_db):
        """Test _upsert_local_customer for new customer."""
        mock_normalize.return_value = "Test User"
        mock_qr.return_value = "test_qr"

        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = None
        mock_conn.execute.return_value = mock_cursor
        mock_cursor.lastrowid = 1

        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        customer_id = _upsert_local_customer(123, "Test User", "+79991234567")

        assert customer_id == 1
        mock_normalize.assert_called_once()
        mock_qr.assert_called_once()

    @patch("app.handlers.get_db")
    @patch("app.handlers.normalize_name")
    @patch("app.handlers.generate_qr_token")
    def test_upsert_local_customer_existing(self, mock_qr, mock_normalize, mock_get_db):
        """Test _upsert_local_customer for existing customer."""
        mock_normalize.return_value = "Test User"

        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = {"id": 1, "qr_token": "existing_qr"}
        mock_conn.execute.return_value = mock_cursor

        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        customer_id = _upsert_local_customer(123, "Test User", "+79991234567")

        assert customer_id == 1
