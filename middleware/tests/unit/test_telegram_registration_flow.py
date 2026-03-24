"""
Integration tests for Telegram bot 152-ФЗ compliance registration flow.

These tests verify the complete user registration flow including:
- /start command for new users (welcome + consent buttons)
- /start command for existing users (balance + consent status)
- User agreement and 152-ФЗ consent handling
- Registration data collection (name → phone)
- Marketing consent optional selection
- Confirmation step with bonus points
- Data cleanup on refusal (152-ФЗ compliance)

These tests use environment variables for credentials (no hardcoded values).
Run with: pytest middleware/tests/unit/test_telegram_registration_flow.py -v
"""

import os
import sqlite3
import tempfile
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest


# Set test database path before importing app modules
@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Set up a temporary test database for registration flow tests."""
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.environ["CRM_DB_PATH"] = db_path

    yield db_path

    # Cleanup
    os.close(db_fd)
    if os.path.exists(db_path):
        os.unlink(db_path)


@pytest.fixture
def clean_redis():
    """Clean Redis before each test."""
    try:
        from app.handlers import get_redis

        r = get_redis()
        # Clean test keys
        for key in r.keys("crm:consent:*"):
            r.delete(key)
        for key in r.keys("crm:cart:*"):
            r.delete(key)
        for key in r.keys("crm:reg:*"):
            r.delete(key)
    except Exception:
        pass  # Redis may not be available in test environment
    yield


@pytest.fixture
def sample_user():
    """Sample user data for testing."""
    return {
        "id": 999999,
        "username": "testuser",
        "first_name": "Test",
        "last_name": "User",
    }


class MockMessage:
    """Mock Telegram Message object."""

    def __init__(self, user_data, text=None, chat_id=123456):
        self.from_user = type("User", (), user_data)()
        self.text = text
        self.contact = None
        self.chat = type("Chat", (), {"id": chat_id})()
        self.answer = AsyncMock()
        self.bot = Mock()


class MockCallbackQuery:
    """Mock Telegram CallbackQuery object."""

    def __init__(self, user_data, callback_data, message_text="Test message"):
        self.from_user = type("User", (), user_data)()
        self.data = callback_data
        self.message = Mock()
        self.message.from_user = type("User", (), user_data)()
        self.message.edit_text = AsyncMock()
        self.message.answer = AsyncMock()
        self.message.answer_photo = AsyncMock()
        self.message.answer_video = AsyncMock()
        self.message.answer_document = AsyncMock()
        self.answer = AsyncMock()


class TestStartCommand:
    """Test /start command behavior."""

    def test_start_new_user_shows_welcome_and_consent_buttons(
        self, setup_test_db, clean_redis, sample_user
    ):
        """Test that /start for new user shows welcome message with consent buttons."""
        from app.handlers import cmd_start

        # Mock ERP client to return None (not registered)
        with patch("app.handlers.ERPClient") as MockERPClient:
            mock_client = Mock()
            mock_client.get_customer_by_telegram_id = AsyncMock(return_value=None)
            mock_client.get_balance = AsyncMock(return_value=0)
            MockERPClient.return_value = mock_client

            # Mock Redis
            with patch("app.handlers.get_redis") as mock_redis:
                mock_r = Mock()
                mock_r.sadd = Mock()
                mock_redis.return_value = mock_r

                # Create mock message
                message = MockMessage(sample_user, text="/start")

                # Run the handler
                import asyncio

                asyncio.run(cmd_start(message))

                # Verify welcome messages were sent (consent intro + menu help)
                assert message.answer.call_count == 2
                # First call should contain consent intro
                first_call_args = message.answer.call_args_list[0]
                call_args = first_call_args

                # Check welcome message contains consent intro semantics
                assert "соглас" in call_args[0][0].lower()

                # Check buttons exist in the call
                assert "reply_markup" in call_args[1]
                kb = call_args[1]["reply_markup"]
                # Since InlineKeyboardMarkup is mocked, we check if it was called/created
                assert kb is not None

    def test_start_existing_user_shows_balance_and_consent_status(
        self, setup_test_db, clean_redis, sample_user
    ):
        """Test that /start for existing user shows balance and consent status."""
        # First create a test customer in the database
        from app.db import get_db
        from app.handlers import _upsert_local_customer, cmd_start

        customer_id = _upsert_local_customer(
            telegram_id=sample_user["id"],
            full_name="Test User",
            phone="+79991234567",
            marketing_allowed=1,
            data_processing_allowed=1,
        )

        # Mock ERP client to return existing customer
        with patch("app.handlers.ERPClient") as MockERPClient:
            mock_client = Mock()
            mock_client.get_customer_by_telegram_id = AsyncMock(
                return_value={"name": "Test User", "telegram_id": sample_user["id"]}
            )
            mock_client.get_balance = AsyncMock(return_value=150)
            MockERPClient.return_value = mock_client

            # Mock Redis
            with patch("app.handlers.get_redis") as mock_redis:
                mock_r = Mock()
                mock_r.sadd = Mock()
                mock_redis.return_value = mock_r

                # Create mock message
                message = MockMessage(sample_user, text="/start")

                # Run the handler
                import asyncio

                asyncio.run(cmd_start(message))

                # Verify message was sent with balance info
                message.answer.assert_called_once()
                call_args = message.answer.call_args

                # Check balance message
                response_text = call_args[0][0]
                assert "150" in response_text  # Balance
                assert "баланс" in response_text.lower()


class TestConsentCallback:
    """Test consent callback handling (agree/refuse)."""

    def test_consent_agree_proceeds_to_phone_request(
        self, setup_test_db, clean_redis, sample_user
    ):
        """Test that clicking consent button proceeds to phone request."""
        from app.handlers import cb_consent

        with patch("app.handlers.get_redis") as mock_redis, patch(
            "app.handlers.resolve_or_create_customer", return_value=(1, True)
        ), patch("app.handlers._store_consent"):
            mock_r = Mock()
            mock_redis.return_value = mock_r

            cb = MockCallbackQuery(sample_user, "consent:yes")

            import asyncio

            asyncio.run(cb_consent(cb))

            cb.message.edit_text.assert_called_once()
            cb.message.answer.assert_called_once()
            call_args = cb.message.answer.call_args
            assert (
                "стран" in call_args[0][0].lower()
                or "country" in call_args[0][0].lower()
            )
            mock_r.hset.assert_called_once()

    def test_consent_refuse_cleans_user_data(
        self, setup_test_db, clean_redis, sample_user
    ):
        """Test that clicking refuse button cleans all user data (152-ФЗ compliance)."""
        # First create a test customer that will be deleted
        from app.handlers import _cleanup_user_data, _upsert_local_customer, cb_consent

        customer_id = _upsert_local_customer(
            telegram_id=sample_user["id"],
            full_name="Test User",
            phone="+79991234567",
            marketing_allowed=1,
            data_processing_allowed=1,
        )

        # Verify customer was created
        from app.db import get_db

        db = get_db()
        conn = db.connect()
        cur = conn.execute(
            "SELECT id FROM customers WHERE telegram_id = ?", (sample_user["id"],)
        )
        assert cur.fetchone() is not None

        # Mock Redis for cleanup
        with patch("app.handlers.get_redis") as mock_redis:
            mock_r = Mock()
            mock_r.delete = Mock()
            mock_redis.return_value = mock_r

            # Create callback query with consent:refuse
            cb = MockCallbackQuery(sample_user, "consent:refuse")

            # Run the handler
            import asyncio

            asyncio.run(cb_consent(cb))

            # Verify message was edited to confirm deletion
            cb.message.edit_text.assert_called_once()
            call_args = cb.message.edit_text.call_args

            assert (
                "регистрация" in call_args[0][0].lower()
                or "удалены" in call_args[0][0].lower()
                or "отменена" in call_args[0][0].lower()
            )

            # Verify customer was deleted from database
            cur = conn.execute(
                "SELECT id FROM customers WHERE telegram_id = ?", (sample_user["id"],)
            )
            assert cur.fetchone() is None

            conn.close()


class TestRegistrationMessage:
    """Test registration message handling."""

    def test_phone_input_stores_phone_and_asks_for_full_name(
        self, setup_test_db, clean_redis, sample_user
    ):
        """Test that entering phone stores it and asks for full name."""
        from app.handlers import handle_registration_message

        with patch("app.handlers.get_redis") as mock_redis:
            mock_r = Mock()
            mock_r.hgetall = Mock(return_value={"consent_given": "1", "step": "phone"})
            mock_r.hset = Mock()
            mock_redis.return_value = mock_r

            message = MockMessage(sample_user, text="+79991234567")
            import asyncio

            asyncio.run(handle_registration_message(message))

            mock_r.hset.assert_called_once()
            message.answer.assert_called_once()
            call_args = message.answer.call_args
            assert (
                "имя" in call_args[0][0].lower() or "фамили" in call_args[0][0].lower()
            )

    def test_full_name_input_stores_name_and_asks_for_gender(
        self, setup_test_db, clean_redis, sample_user
    ):
        """Test that entering full name stores it and asks for gender."""
        from app.handlers import handle_registration_message

        with patch("app.handlers.get_redis") as mock_redis:
            mock_r = Mock()
            mock_r.hgetall = Mock(
                return_value={
                    "consent_given": "1",
                    "step": "full_name",
                    "phone": "+79991234567",
                }
            )
            mock_r.hset = Mock()
            mock_redis.return_value = mock_r

            message = MockMessage(sample_user, text="Иван Иванов")
            import asyncio

            asyncio.run(handle_registration_message(message))

            mock_r.hset.assert_called_once()
            message.answer.assert_called_once()
            call_args = message.answer.call_args
            assert "пол" in call_args[0][0].lower()
            assert call_args[1].get("reply_markup") is not None

    def test_invalid_phone_shows_error(self, setup_test_db, clean_redis, sample_user):
        """Test that invalid phone format shows error message."""
        from app.handlers import handle_registration_message

        # Set up consent state in Redis
        with patch("app.handlers.get_redis") as mock_redis:
            mock_r = Mock()
            mock_r.hgetall = Mock(
                return_value={
                    "consent_given": "1",
                    "step": "phone",
                }
            )
            mock_redis.return_value = mock_r

            # Create message with invalid phone
            message = MockMessage(sample_user, text="not-a-phone")

            # Run the handler
            import asyncio

            asyncio.run(handle_registration_message(message))

            # Verify error message was sent
            message.answer.assert_called_once()
            call_args = message.answer.call_args

            assert (
                "формат" in call_args[0][0].lower()
                or "телефон" in call_args[0][0].lower()
            )


class TestMarketingConsent:
    """Test marketing consent handling."""

    def test_marketing_yes_creates_customer_with_marketing(
        self, setup_test_db, clean_redis, sample_user
    ):
        """Test that accepting marketing creates customer with marketing_allowed=1."""
        from app.handlers import cb_marketing_consent

        # Set up consent state in Redis
        with patch("app.handlers.get_redis") as mock_redis:
            mock_r = Mock()
            mock_r.hgetall = Mock(
                return_value={
                    "consent_given": "1",
                    "step": "marketing",
                    "full_name": "Иван Иванов",
                    "phone": "+79991234567",
                }
            )
            mock_r.delete = Mock()
            mock_redis.return_value = mock_r

            # Mock ERP client
            with patch("app.handlers.ERPClient") as MockERPClient:
                mock_client = Mock()
                mock_client.create_customer = AsyncMock(return_value={"id": "ERP-123"})
                MockERPClient.return_value = mock_client

                # Create callback query with marketing consent: yes
                cb = MockCallbackQuery(sample_user, "marketing:yes")

                # Run the handler
                import asyncio

                asyncio.run(cb_marketing_consent(cb))
                # Verify success message path
                cb.message.edit_text.assert_called_once()
                call_args = cb.message.edit_text.call_args
                response = call_args[0][0]
                assert "Регистрация" in response or "завершена" in response

                # Verify customer was created in database with marketing
                from app.db import get_db

                db = get_db()
                conn = db.connect()
                cur = conn.execute(
                    "SELECT * FROM customers WHERE telegram_id = ?",
                    (sample_user["id"],),
                )
                customer = cur.fetchone()
                assert customer is not None
                assert customer["marketing_allowed"] == 1
                assert customer["data_processing_allowed"] == 1

                # Verify consent records were stored
                cur = conn.execute(
                    "SELECT consent_type FROM consents WHERE customer_id = ?",
                    (customer["id"],),
                )
                consent_types = {row["consent_type"] for row in cur.fetchall()}
                assert "data_processing" in consent_types
                assert "marketing" in consent_types

                conn.close()

    def test_marketing_no_creates_customer_without_marketing(
        self, setup_test_db, clean_redis, sample_user
    ):
        """Test that declining marketing creates customer with marketing_allowed=0."""
        from app.handlers import cb_marketing_consent

        # Set up consent state in Redis
        with patch("app.handlers.get_redis") as mock_redis:
            mock_r = Mock()
            mock_r.hgetall = Mock(
                return_value={
                    "consent_given": "1",
                    "step": "marketing",
                    "full_name": "Иван Иванов",
                    "phone": "+79991234568",
                }
            )
            mock_r.delete = Mock()
            mock_redis.return_value = mock_r

            # Mock ERP client
            with patch("app.handlers.ERPClient") as MockERPClient:
                mock_client = Mock()
                mock_client.create_customer = AsyncMock(return_value={"id": "ERP-124"})
                MockERPClient.return_value = mock_client

                # Create callback query with marketing consent: no
                cb = MockCallbackQuery(sample_user, "marketing:no")

                # Run the handler
                import asyncio

                asyncio.run(cb_marketing_consent(cb))
                # Verify success message path
                cb.message.edit_text.assert_called_once()
                call_args = cb.message.edit_text.call_args
                response = call_args[0][0]
                assert "Регистрация" in response or "завершена" in response

                # Verify customer was created in database without marketing
                from app.db import get_db

                db = get_db()
                conn = db.connect()
                cur = conn.execute(
                    "SELECT * FROM customers WHERE telegram_id = ?",
                    (sample_user["id"],),
                )
                customer = cur.fetchone()
                assert customer is not None
                assert customer["marketing_allowed"] == 0
                assert customer["data_processing_allowed"] == 1

                conn.close()


class TestCleanupUserData:
    """Test _cleanup_user_data function (152-ФЗ compliance)."""

    def test_cleanup_removes_customer_and_consents(self, setup_test_db, sample_user):
        """Test that cleanup removes customer, consents, and cleans Redis."""
        from app.handlers import (
            _cleanup_user_data,
            _store_consent,
            _upsert_local_customer,
        )

        # Create a test customer with consents
        customer_id = _upsert_local_customer(
            telegram_id=sample_user["id"],
            full_name="Test User to Delete",
            phone="+79991234569",
            marketing_allowed=1,
            data_processing_allowed=1,
        )

        # Add consent records
        _store_consent(customer_id, "Test consent 1", "1.0.0", "data_processing")
        _store_consent(customer_id, "Test consent 2", "1.0.0", "marketing")

        # Verify customer and consents exist
        from app.db import get_db

        db = get_db()
        conn = db.connect()

        cur = conn.execute(
            "SELECT id FROM customers WHERE telegram_id = ?", (sample_user["id"],)
        )
        assert cur.fetchone() is not None

        cur = conn.execute(
            "SELECT COUNT(*) as cnt FROM consents WHERE customer_id = ?", (customer_id,)
        )
        assert cur.fetchone()["cnt"] == 2

        # Mock Redis
        with patch("app.integrations.bots.shared.consent.get_redis") as mock_redis:
            mock_r = Mock()
            mock_r.delete = Mock()
            mock_redis.return_value = mock_r

            # Run cleanup
            _cleanup_user_data(sample_user["id"])

            # Verify customer was deleted
            cur = conn.execute(
                "SELECT id FROM customers WHERE telegram_id = ?", (sample_user["id"],)
            )
            assert cur.fetchone() is None

            # Verify Redis was cleaned
            assert mock_r.delete.call_count >= 2  # consent, registration keys

            conn.close()


class TestRegistrationFlow:
    """End-to-end registration flow tests."""

    @pytest.mark.asyncio
    async def test_full_registration_flow_with_marketing(
        self, setup_test_db, clean_redis, sample_user
    ):
        """Test complete registration flow: start → consent → name → phone → marketing yes."""
        from app.handlers import (
            cb_consent,
            cb_gender,
            cb_marketing_consent,
            cmd_start,
            handle_registration_message,
        )

        # Step 1: /start - new user
        with patch("app.handlers.ERPClient") as MockERPClient:
            mock_client = Mock()
            mock_client.get_customer_by_telegram_id = AsyncMock(return_value=None)
            mock_client.get_balance = AsyncMock(return_value=0)
            mock_client.create_customer = AsyncMock(return_value={"id": "ERP-NEW"})
            MockERPClient.return_value = mock_client

            with patch("app.integrations.bots.shared.consent.get_redis") as mock_redis:
                mock_r = Mock()
                mock_r.sadd = Mock()
                mock_r.hgetall = Mock(return_value={})
                mock_r.hset = Mock()
                mock_r.delete = Mock()
                mock_redis.return_value = mock_r

                with patch("app.handlers.get_redis", return_value=mock_r):
                    # Execute /start
                    message = MockMessage(sample_user, text="/start")
                    await cmd_start(message)

                    # Step 2: Click consent button
                    cb = MockCallbackQuery(sample_user, "consent:yes")
                    await cb_consent(cb)

                    # Verify Redis has consent state
                    assert mock_r.hset.called

                    # Step 3: Enter phone
                    mock_r.hgetall.return_value = {
                        "consent_given": "1",
                        "step": "phone",
                    }
                    message = MockMessage(sample_user, text="+79991234560")
                    await handle_registration_message(message)

                    # Step 4: Enter full name
                    mock_r.hgetall.return_value = {
                        "consent_given": "1",
                        "step": "full_name",
                        "phone": "+79991234560",
                    }
                    message = MockMessage(sample_user, text="Тест Тестов")
                    await handle_registration_message(message)

                    # Step 5: Select gender
                    mock_r.hgetall.return_value = {
                        "consent_given": "1",
                        "step": "gender",
                        "phone": "+79991234560",
                        "full_name": "Тест Тестов",
                    }
                    gender_cb = MockCallbackQuery(sample_user, "gender:male")
                    await cb_gender(gender_cb)

                    # Step 6: Enter birthday
                    mock_r.hgetall.return_value = {
                        "consent_given": "1",
                        "step": "birthday",
                        "phone": "+79991234560",
                        "full_name": "Тест Тестов",
                        "gender": "male",
                    }
                    message = MockMessage(sample_user, text="01.01.2000")
                    await handle_registration_message(message)

                    # Step 7: Enter email
                    mock_r.hgetall.return_value = {
                        "consent_given": "1",
                        "step": "email",
                        "phone": "+79991234560",
                        "full_name": "Тест Тестов",
                        "gender": "male",
                        "birthday": "2000-01-01",
                    }
                    message = MockMessage(sample_user, text="test@example.com")
                    await handle_registration_message(message)

                    # Step 8: Enter city
                    mock_r.hgetall.return_value = {
                        "consent_given": "1",
                        "step": "city",
                        "phone": "+79991234560",
                        "full_name": "Тест Тестов",
                        "gender": "male",
                        "birthday": "2000-01-01",
                        "email": "test@example.com",
                    }
                    message = MockMessage(sample_user, text="Москва")
                    await handle_registration_message(message)

                    # Step 9: Accept marketing
                    mock_r.hgetall.return_value = {
                        "consent_given": "1",
                        "step": "marketing",
                        "phone": "+79991234560",
                        "full_name": "Тест Тестов",
                        "gender": "male",
                        "birthday": "2000-01-01",
                        "email": "test@example.com",
                        "city": "Москва",
                    }
                    cb = MockCallbackQuery(sample_user, "marketing:yes")
                    await cb_marketing_consent(cb)

                    # Verify final state
                    from app.db import get_db

                    db = get_db()
                    # Use a fresh connection to see committed data
                    conn = db.connect()
                    cur = conn.execute(
                        "SELECT * FROM customers WHERE telegram_id = ?",
                        (sample_user["id"],),
                    )
                    customer = cur.fetchone()
                    assert customer is not None
                    assert customer["marketing_allowed"] == 1
                    assert customer["full_name"] == "Тест Тестов"
                    conn.close()

    @pytest.mark.asyncio
    async def test_registration_refusal_cleans_all_data(
        self, setup_test_db, clean_redis, sample_user
    ):
        """Test that refusing consent at any point cleans all data."""
        # First create a customer (simulating partially registered user)
        from app.handlers import _cleanup_user_data, _upsert_local_customer, cb_consent

        _upsert_local_customer(
            telegram_id=sample_user["id"],
            full_name="Partial User",
            phone="+79991234561",
            marketing_allowed=1,
            data_processing_allowed=1,
        )

        # Mock Redis
        with patch("app.integrations.bots.shared.consent.get_redis") as mock_redis:
            mock_r = Mock()
            mock_r.delete = Mock()
            mock_redis.return_value = mock_r

            with patch("app.handlers.get_redis", return_value=mock_r):
                # Run refusal handler
                cb = MockCallbackQuery(sample_user, "consent:no")
                await cb_consent(cb)

                # Verify cleanup was called
                # (actual cleanup function was called for existing customer)

                # Verify customer was deleted
                from app.db import get_db

                db = get_db()
                conn = db.connect()
                cur = conn.execute(
                    "SELECT id FROM customers WHERE telegram_id = ?",
                    (sample_user["id"],),
                )
                assert cur.fetchone() is None
                conn.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
