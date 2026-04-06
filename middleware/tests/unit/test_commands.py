"""
Tests for shared commands module.
"""

from unittest.mock import Mock, patch

from app.integrations.bots.shared.commands import (
    cmd_profile,
    cmd_revoke_consent,
    cmd_start,
    cmd_subscribe,
    get_customer_info,
    is_registered,
)


class TestSharedCommands:
    """Tests for shared command handlers."""

    @patch("app.integrations.bots.shared.commands.get_db")
    def test_cmd_start_new_user(self, mock_get_db):
        """Test /start command for new user."""
        # Setup mock
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = None
        mock_conn.execute.return_value = mock_cursor
        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        # Test
        send_message = Mock()
        cmd_start("tg", 123, send_message)

        # Verify
        send_message.assert_called_once_with("__show_consent_keyboard__")

    @patch("app.integrations.bots.shared.commands.get_db")
    def test_cmd_start_existing_user(self, mock_get_db):
        """Test /start command for existing user."""
        # Setup mock
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = {
            "full_name": "Test User",
            "marketing_allowed": 1,
            "data_processing_allowed": 1,
        }
        mock_conn.execute.return_value = mock_cursor
        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        # Test
        send_message = Mock()
        cmd_start("tg", 123, send_message)

        # Verify
        assert send_message.called
        assert "С возвращением" in send_message.call_args[0][0]

    @patch("app.integrations.bots.shared.commands.get_db")
    @patch("app.integrations.bots.shared.commands.update_consent")
    @patch("app.integrations.bots.shared.commands.store_consent")
    def test_cmd_subscribe_not_registered(self, mock_store, mock_update, mock_get_db):
        """Test /subscribe command for unregistered user."""
        # Setup mock
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = None
        mock_conn.execute.return_value = mock_cursor
        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        # Test
        send_message = Mock()
        cmd_subscribe("tg", 123, send_message)

        # Verify
        send_message.assert_called_once_with("Вы ещё не зарегистрированы. /start")
        mock_update.assert_not_called()
        mock_store.assert_not_called()

    @patch("app.integrations.bots.shared.commands.get_db")
    @patch("app.integrations.bots.shared.commands.update_consent")
    @patch("app.integrations.bots.shared.commands.store_consent")
    def test_cmd_subscribe_registered(self, mock_store, mock_update, mock_get_db):
        """Test /subscribe command for registered user."""
        # Setup mock
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = {"id": 1, "full_name": "Test User"}
        mock_conn.execute.return_value = mock_cursor
        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        # Test
        send_message = Mock()
        cmd_subscribe("tg", 123, send_message)

        # Verify
        mock_update.assert_called_once_with("tg", 123, marketing_allowed=1)
        mock_store.assert_called_once()
        assert "Подписка возобновлена" in send_message.call_args[0][0]

    @patch("app.integrations.bots.shared.commands.get_db")
    @patch("app.integrations.bots.shared.commands.update_consent")
    @patch("app.integrations.bots.shared.commands.store_consent")
    def test_cmd_revoke_consent_not_registered(self, mock_store, mock_update, mock_get_db):
        """Test /revoke_consent command for unregistered user."""
        # Setup mock
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = None
        mock_conn.execute.return_value = mock_cursor
        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        # Test
        send_message = Mock()
        cmd_revoke_consent("tg", 123, send_message)

        # Verify
        send_message.assert_called_once_with("Вы ещё не зарегистрированы. /start")
        mock_update.assert_not_called()
        mock_store.assert_not_called()

    @patch("app.integrations.bots.shared.commands.get_db")
    @patch("app.integrations.bots.shared.commands.update_consent")
    @patch("app.integrations.bots.shared.commands.store_consent")
    def test_cmd_revoke_consent_registered(self, mock_store, mock_update, mock_get_db):
        """Test /revoke_consent command for registered user."""
        # Setup mock
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = {"id": 1, "full_name": "Test User"}
        mock_conn.execute.return_value = mock_cursor
        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        # Test
        send_message = Mock()
        cmd_revoke_consent("tg", 123, send_message)

        # Verify
        mock_update.assert_called_once_with("tg", 123, marketing_allowed=0)
        mock_store.assert_called_once()
        assert "Рассылки отключены мгновенно" in send_message.call_args[0][0]

    @patch("app.integrations.bots.shared.commands.get_db")
    def test_cmd_profile_not_registered(self, mock_get_db):
        """Test /profile command for unregistered user."""
        # Setup mock
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = None
        mock_conn.execute.return_value = mock_cursor
        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        # Test
        send_message = Mock()
        cmd_profile("tg", 123, send_message)

        # Verify
        send_message.assert_called_once_with("Вы ещё не зарегистрированы. /start")

    @patch("app.integrations.bots.shared.commands.get_db")
    def test_cmd_profile_registered(self, mock_get_db):
        """Test /profile command for registered user."""
        # Setup mock
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = {
            "full_name": "Test User",
            "phone": "+79991234567",
            "balance_points": 100,
            "marketing_allowed": 1,
            "data_processing_allowed": 1,
            "created_at": "2024-01-01",
        }
        mock_conn.execute.return_value = mock_cursor
        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        # Test
        send_message = Mock()
        cmd_profile("tg", 123, send_message)

        # Verify
        assert send_message.called
        assert "Ваш профиль" in send_message.call_args[0][0]
        assert "Test User" in send_message.call_args[0][0]
        assert "+79991234567" in send_message.call_args[0][0]
        assert "100" in send_message.call_args[0][0]

    @patch("app.integrations.bots.shared.commands.get_db")
    def test_get_customer_info_found(self, mock_get_db):
        """Test get_customer_info returns customer data when found."""
        # Setup mock
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = {
            "id": 1,
            "full_name": "Test User",
            "phone": "+79991234567",
        }
        mock_conn.execute.return_value = mock_cursor
        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        # Test
        result = get_customer_info("tg", 123)

        # Verify
        assert result is not None
        assert result["id"] == 1
        assert result["full_name"] == "Test User"
        assert result["phone"] == "+79991234567"

    @patch("app.integrations.bots.shared.commands.get_db")
    def test_get_customer_info_not_found(self, mock_get_db):
        """Test get_customer_info returns None when customer not found."""
        # Setup mock
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_cursor.fetchone.return_value = None
        mock_conn.execute.return_value = mock_cursor
        mock_db = Mock()
        mock_db.connect.return_value = mock_conn
        mock_get_db.return_value = mock_db

        # Test
        result = get_customer_info("tg", 123)

        # Verify
        assert result is None

    @patch("app.integrations.bots.shared.commands.get_customer_info")
    def test_is_registered_true(self, mock_get):
        """Test is_registered returns True when customer exists."""
        mock_get.return_value = {"id": 1}
        assert is_registered("tg", 123) is True

    @patch("app.integrations.bots.shared.commands.get_customer_info")
    def test_is_registered_false(self, mock_get):
        """Test is_registered returns False when customer doesn't exist."""
        mock_get.return_value = None
        assert is_registered("tg", 123) is False
