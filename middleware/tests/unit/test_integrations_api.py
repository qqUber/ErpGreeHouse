from unittest.mock import MagicMock, patch

import pytest

from app.integrations_api import ReceiptCustomer, _find_or_create_customer


class TestIntegrationsAPI:
    """Tests for integrations API functions."""

    def test_find_or_create_customer_by_qr_token(self):
        """Test finding customer by QR token."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = (1,)

        mock_conn.execute.return_value = mock_cursor

        customer = ReceiptCustomer(qr_token="test_qr_token", phone=None, telegram_id=None)
        result = _find_or_create_customer(mock_conn, customer)

        assert result == 1

    def test_find_or_create_customer_by_phone(self):
        """Test finding or creating customer by phone."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.side_effect = [None]
        mock_conn.execute.return_value = mock_cursor

        customer = ReceiptCustomer(qr_token=None, phone="+79001234567", telegram_id=None)
        with patch("app.integrations_api.resolve_or_create_customer", return_value=(2, True)):
            result = _find_or_create_customer(mock_conn, customer)

        assert result == 2

    def test_find_or_create_customer_by_telegram_id(self):
        """Test finding or creating customer by Telegram ID."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchone.side_effect = [None]
        mock_conn.execute.return_value = mock_cursor

        customer = ReceiptCustomer(qr_token=None, phone=None, telegram_id=12345)
        with patch("app.integrations_api.resolve_or_create_customer", return_value=(3, True)):
            result = _find_or_create_customer(mock_conn, customer)

        assert result == 3
