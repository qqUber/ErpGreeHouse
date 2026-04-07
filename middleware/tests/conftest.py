"""
Test Configuration and Fixtures - Telegram CRM MVP

This module provides:
- Test database setup and teardown
- Redis connection fixtures
- Mock ERP client
- Mock Telegram bot
- Test data factories
- Common utilities for all tests
"""

import os
import sqlite3
import sys
from pathlib import Path
from typing import Any, Dict, Generator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from dotenv import load_dotenv

# Import required app modules
from app.db import get_db

# Import new mocks
from tests.mocks.erpnext import ERPNextMock
from tests.mocks.telegram import TelegramMock

# ---------------------------------------------------------------------------
# 1. Stub out aiogram & celery BEFORE any app module is imported.
#    This must happen at module (collection) time, not inside fixtures.
# ---------------------------------------------------------------------------
_aiogram_mock = MagicMock()
_aiogram_types_mock = MagicMock()
_aiogram_client_mock = MagicMock()
_aiogram_enums_mock = MagicMock()
_celery_mock = MagicMock()

for _mod in [
    "aiogram",
    "aiogram.types",
    "aiogram.filters",
    "aiogram.fsm",
    "aiogram.fsm.context",
    "aiogram.fsm.storage",
    "aiogram.fsm.storage.redis",
    "aiogram.utils",
    "aiogram.utils.keyboard",
    "aiogram.client",
    "aiogram.client.default",
    "aiogram.enums",
    "celery",
    "celery.app",
]:
    sys.modules.setdefault(_mod, MagicMock())

# Configure specific mocks for aiogram components that are imported
# aiogram.client.default.DefaultBotProperties
sys.modules["aiogram.client.default"].DefaultBotProperties = MagicMock()

# aiogram.enums.ParseMode
sys.modules["aiogram.enums"].ParseMode = MagicMock()
sys.modules["aiogram.enums"].ParseMode.HTML = "HTML"
sys.modules["aiogram.enums"].ParseMode.Markdown = "Markdown"

# aiogram.Bot and aiogram.Dispatcher are accessed from the main aiogram module
sys.modules["aiogram"].Bot = MagicMock()
sys.modules["aiogram"].Dispatcher = MagicMock()


# Configure Router to not break decorators
def mock_decorator(*args, **kwargs):
    def decorator(func):
        return func

    return decorator


mock_router = MagicMock()
mock_router.message = MagicMock(side_effect=mock_decorator)
mock_router.callback_query = MagicMock(side_effect=mock_decorator)
sys.modules["aiogram"].Router = MagicMock(return_value=mock_router)

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent))

if not os.getenv("TELEGRAM_BOT_TOKEN") or not os.getenv("TELEGRAM_CHANNEL_ID"):
    env_test_path = Path(__file__).parent.parent.parent / ".env.test"
    if env_test_path.exists():
        load_dotenv(env_test_path)
        print(f"[conftest] Loaded environment from {env_test_path}")
    else:
        # Also try .env file in middleware directory
        env_path = Path(__file__).parent.parent / ".env"
        if env_path.exists():
            load_dotenv(env_path)
            print(f"[conftest] Loaded environment from {env_path}")
else:
    print("[conftest] Using Telegram credentials from environment (Docker)")

# Set test environment variables before importing app modules
os.environ["TEST_MODE"] = "true"
os.environ["ERP_MOCK_MODE"] = "true"
os.environ["REDIS_URL"] = os.getenv("REDIS_URL", "redis://localhost:6379/1")
# Use container-local tmp dir in Docker to avoid file locking/disk I/O issues
# on bind-mounted volumes during frequent create/delete cycles in tests.
if os.path.isdir("/app"):
    _test_db_dir = "/tmp/erp_tests"
else:
    _test_db_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".local")
os.makedirs(_test_db_dir, exist_ok=True)
_TEST_DB_PATH = os.path.join(_test_db_dir, "test_telegram_crm.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH}"
os.environ["CRM_DB_PATH"] = _TEST_DB_PATH
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key-ci-2026-secure-random-entropy-32b"

# Only set fake Telegram token if no real token is provided in environment
# This allows integration tests to use real Telegram API when credentials are available
if not os.getenv("TELEGRAM_BOT_TOKEN"):
    os.environ["TELEGRAM_BOT_TOKEN"] = "test_token_123456789:AABBccDDeeFFggHHiiJJkkLLmmNNooP"
if not os.getenv("TELEGRAM_CHANNEL_ID"):
    os.environ["TELEGRAM_CHANNEL_ID"] = "-100123456789"

print("[conftest] Module loaded, fixtures registered")

# Global patch for Redis to avoid connection errors during collection/tests
try:
    import fakeredis

    _fake_redis = fakeredis.FakeRedis(decode_responses=True)
    patch("app.storage.get_redis", return_value=_fake_redis).start()
    patch("app.loyalty._get_redis", return_value=_fake_redis).start()
except ImportError:
    pass


# =============================================================================
# Database Fixtures
# =============================================================================


@pytest.fixture(scope="session")
def test_db_path() -> str:
    """Get test database path"""
    return "sqlite:///test_telegram_crm.db"


@pytest.fixture(scope="function")
def clean_database() -> Generator[str, None, None]:
    """
    Unified function-scoped fixture that ensures every test starts with a clean database.
    This combines the database initialization and path restoration logic.

    - Resets CRM_DB_PATH environment variable before each test
    - Deletes existing test database to ensure clean state
    - Initializes fresh database with all tables
    - Seeds role_permissions with Admin Role and Permissions
    """
    import os
    import sqlite3
    import time

    print(f"[conftest] clean_database fixture START")
    
    try:
        from app.db import init_db
    except Exception as e:
        print(f"[conftest] Error importing init_db: {e}")
        raise

    print(f"[conftest] clean_database fixture called")
    
    # Step 1: Restore the test database path before each test
    # This ensures tests that change CRM_DB_PATH don't affect other tests
    db_path = _TEST_DB_PATH
    os.environ["CRM_DB_PATH"] = db_path
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    
    print(f"[conftest] Database path set to {db_path}")

    # Step 2: Ensure database directory exists
    db_dir = os.path.dirname(db_path)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
        print(f"[conftest] Created database directory: {db_dir}")

    # Step 3: Ensure all connections are closed before attempting to delete
    # Step 2-3: Robust database file cleanup - handle Windows file locking issue
    if os.path.exists(db_path):
        max_retries = 8
        retry_delay = 0.5

        # First, try to release all connections and unlock file
        for i in range(max_retries):
            try:
                # Attempt to delete the file directly
                os.remove(db_path)
                break
            except PermissionError as e:
                if i == max_retries - 1:
                    # If all retries failed, try to delete on next run by renaming
                    try:
                        temp_path = f"{db_path}.{int(time.time())}.tmp"
                        os.rename(db_path, temp_path)
                        print(f"Warning: Renamed locked database file to {temp_path}")
                        break
                    except Exception:
                        # If even rename fails, skip cleanup but continue
                        print(f"Warning: Failed to delete or rename database file {db_path}: {e}")

                # Wait and retry with increasing delay
                time.sleep(retry_delay)
                retry_delay += 0.5

    # Step 4: Initialize fresh test database (this creates all tables)
    init_db()
    
    print(f"[conftest] Database initialized at {db_path}")

    # Enable WAL mode for better concurrency
    db = get_db()
    with db.connect() as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        # Step 6: Seed default role_permissions data (Admin Role and Permissions)
        _seed_role_permissions(conn)

    yield db_path

    # Cleanup: Delete all data from tables instead of dropping them
    # This is faster and avoids locking issues with DROP TABLE
    with db.connect() as conn:
        tables = [
            "employee_metrics",
            "security_alerts",
            "news_articles",
            "reviews",
            "reward_items",
            "certificates",
            "referrals",
            "points_ledger",
            "loyalty_tiers",
            "marketing_trigger_events",
            "marketing_events",
            "marketing_campaigns",
            "marketing_triggers",
            "marketing_segments",
            "integration_deliveries",
            "vk_settings",
            "admin_tokens",
            "admin_users",
            "role_permissions",
            "products",
            "integrations",
            "sync_log",
            "transactions",
            "consents",
            "customers",
        ]
        for table in tables:
            try:
                conn.execute(f"DELETE FROM {table}")
            except sqlite3.OperationalError:
                pass  # Table might not exist yet
        conn.commit()


def _seed_role_permissions(conn: sqlite3.Connection) -> None:
    """
    Seed the role_permissions table with default role data.
    This ensures JWT tests work correctly.
    """
    # Default permissions matching app/auth.py get_default_permissions()
    default_permissions = [
        # admin role - full access
        ("admin", "dashboard.read", 1),
        ("admin", "customer.create", 1),
        ("admin", "customer.search", 1),
        ("admin", "customer.list", 1),
        ("admin", "customer.read", 1),
        ("admin", "customer.update", 1),
        ("admin", "customer.delete", 1),
        ("admin", "pos.sale", 1),
        ("admin", "transaction.read", 1),
        ("admin", "product.read", 1),
        ("admin", "product.create", 1),
        ("admin", "product.update", 1),
        ("admin", "product.delete", 1),
        ("admin", "product.import", 1),
        ("admin", "marketing.campaigns", 1),
        ("admin", "marketing.users", 1),
        ("admin", "integration.read", 1),
        ("admin", "integration.update", 1),
        ("admin", "integration.create", 1),
        ("admin", "integration.delete", 1),
        ("admin", "report.export", 1),
        ("admin", "admin.access", 1),
        # operator role
        ("operator", "dashboard.read", 1),
        ("operator", "customer.create", 1),
        ("operator", "customer.search", 1),
        ("operator", "customer.list", 1),
        ("operator", "customer.read", 1),
        ("operator", "pos.sale", 1),
        ("operator", "transaction.read", 1),
        ("operator", "product.read", 1),
        # manager/marketer role
        ("manager", "dashboard.read", 1),
        ("manager", "customer.read", 1),
        ("manager", "customer.list", 1),
        ("manager", "product.read", 1),
        ("manager", "product.create", 1),
        ("manager", "product.update", 1),
        ("manager", "product.import", 1),
        ("manager", "marketing.campaigns", 1),
        ("manager", "marketing.users", 1),
        ("manager", "integration.read", 1),
        ("manager", "integration.update", 1),
        ("manager", "report.export", 1),
        ("marketer", "dashboard.read", 1),
        ("marketer", "customer.read", 1),
        ("marketer", "customer.list", 1),
        ("marketer", "product.read", 1),
        ("marketer", "product.create", 1),
        ("marketer", "product.update", 1),
        ("marketer", "product.import", 1),
        ("marketer", "marketing.campaigns", 1),
        ("marketer", "marketing.users", 1),
        ("marketer", "integration.read", 1),
        ("marketer", "integration.update", 1),
        ("marketer", "report.export", 1),
        # observer role
        ("observer", "dashboard.read", 1),
        ("observer", "customer.read", 1),
        ("observer", "product.read", 1),
        ("observer", "report.read", 1),
    ]

    conn.executemany(
        "INSERT OR IGNORE INTO role_permissions (role, permission, is_allowed) VALUES (?, ?, ?)",
        default_permissions,
    )
    conn.commit()


# =============================================================================
# Redis Fixtures
# =============================================================================


@pytest.fixture(scope="function")
def redis_client() -> Generator[Any, None, None]:
    """
    Provide a Redis client for testing.
    Uses fakeredis if available, otherwise skips test.
    """
    try:
        import fakeredis

        redis = fakeredis.FakeRedis(db=1, decode_responses=True)
        yield redis
        redis.flushdb()
        redis.close()
    except ImportError:
        pytest.skip("fakeredis not installed - Redis tests skipped")


@pytest.fixture(scope="function")
def redis_url() -> str:
    """Get test Redis URL"""
    return "redis://localhost:6379/1"


# =============================================================================
# ERP Client Mocks
# =============================================================================


@pytest.fixture
def mock_erp_client() -> MagicMock:
    """
    Create a mock ERP client for testing.
    Simulates ERPNext API responses.
    """
    mock_client = MagicMock()

    # Mock customer methods
    mock_client.get_customer_by_phone = AsyncMock(
        return_value={
            "customer_id": "CRM-CUST-00001",
            "customer_name": "Test Customer",
            "phone": "+79991234567",
            "email": "test@example.com",
        }
    )

    mock_client.get_customer_by_telegram = AsyncMock(
        return_value={
            "customer_id": "CRM-CUST-00001",
            "customer_name": "Test Customer",
            "telegram_id": "123456789",
        }
    )

    mock_client.create_customer = AsyncMock(return_value={"customer_id": "CRM-CUST-00002", "success": True})

    # Mock loyalty methods
    mock_client.get_loyalty_balance = AsyncMock(
        return_value={
            "customer_id": "CRM-CUST-00001",
            "available_points": 500,
            "accrued_points": 1000,
            "redeemed_points": 500,
        }
    )

    mock_client.add_loyalty_points = AsyncMock(
        return_value={
            "success": True,
            "transaction_id": "LT-00001",
            "points_added": 100,
        }
    )

    mock_client.redeem_loyalty_points = AsyncMock(
        return_value={
            "success": True,
            "transaction_id": "LT-00002",
            "points_redeemed": 50,
        }
    )

    # Mock order methods
    mock_client.create_order = AsyncMock(
        return_value={
            "order_id": "ORD-00001",
            "success": True,
            "total": 1000.0,
            "bonus_used": 50.0,
        }
    )

    mock_client.get_order = AsyncMock(
        return_value={
            "order_id": "ORD-00001",
            "status": "completed",
            "total": 1000.0,
            "items": [{"item_code": "ITEM-001", "qty": 2, "rate": 250.0}],
        }
    )

    mock_client.get_customer_orders = AsyncMock(
        return_value=[
            {
                "order_id": "ORD-00001",
                "status": "completed",
                "total": 1000.0,
                "date": "2024-01-15",
            }
        ]
    )

    # Mock product methods
    mock_client.get_products = AsyncMock(
        return_value=[
            {
                "item_code": "LATTE",
                "item_name": "Coffee Latte",
                "rate": 250.0,
                "available_qty": 100,
            },
            {
                "item_code": "CAPPUCCINO",
                "item_name": "Coffee Cappuccino",
                "rate": 200.0,
                "available_qty": 150,
            },
        ]
    )

    mock_client.get_product_by_id = AsyncMock(
        return_value={"item_code": "LATTE", "item_name": "Coffee Latte", "rate": 250.0}
    )

    return mock_client


@pytest.fixture
def erpnext_mock() -> Generator[ERPNextMock, None, None]:
    """Fixture for ERPNextMock."""
    with ERPNextMock() as mock:
        yield mock


@pytest.fixture
def telegram_mock() -> TelegramMock:
    """Fixture for TelegramMock."""
    return TelegramMock()


@pytest.fixture
def erp_mock_responses() -> Dict[str, Any]:
    """
    Provide standard mock ERP responses for testing.
    """
    return {
        "customer": {
            "customer_id": "CRM-CUST-00001",
            "customer_name": "Test Customer",
            "phone": "+79991234567",
            "email": "test@example.com",
            "telegram_id": "123456789",
        },
        "loyalty_balance": {
            "customer_id": "CRM-CUST-00001",
            "available_points": 500,
            "accrued_points": 1000,
            "redeemed_points": 500,
        },
        "order": {
            "order_id": "ORD-00001",
            "status": "completed",
            "total": 1000.0,
            "bonus_used": 50.0,
            "items": [{"item_code": "ITEM-001", "qty": 2, "rate": 250.0}],
        },
        "products": [
            {
                "item_code": "LATTE",
                "item_name": "Coffee Latte",
                "rate": 250.0,
                "available_qty": 100,
            }
        ],
    }


# =============================================================================
# Telegram Bot Mocks
# =============================================================================


@pytest.fixture
def mock_bot() -> MagicMock:
    """Fixture for a mock aiogram Bot."""
    return TelegramMock.create_bot()


@pytest.fixture
def mock_message(telegram_mock: TelegramMock) -> MagicMock:
    """Fixture for a mock aiogram Message."""
    return telegram_mock.create_message("test message")


@pytest.fixture
def mock_callback_query(telegram_mock: TelegramMock) -> MagicMock:
    """Fixture for a mock aiogram CallbackQuery."""
    return telegram_mock.create_callback_query("test_data")


@pytest.fixture
def mock_inline_keyboard() -> MagicMock:
    """
    Create a mock inline keyboard builder.
    """

    keyboard = MagicMock()
    keyboard.add = MagicMock()
    keyboard.row = MagicMock()
    keyboard.inline_keyboard = []

    return keyboard


# =============================================================================
# Test Data Factories
# =============================================================================


@pytest.fixture
def test_customer_data() -> Dict[str, Any]:
    """Fixture for test customer data."""
    return {
        "customer_id": "CRM-CUST-00001",
        "full_name": "Test Customer",
        "phone": "+79991234567",
        "telegram_id": 123456789,
        "email": "test@example.com",
    }


@pytest.fixture
def test_order_data() -> Dict[str, Any]:
    """
    Generate test order data.
    """
    return {
        "customer_id": "CRM-CUST-00001",
        "items": [
            {"item_code": "ITEM-001", "qty": 2, "rate": 250.0, "amount": 500.0},
            {"item_code": "ITEM-002", "qty": 1, "rate": 300.0, "amount": 300.0},
        ],
        "total": 800.0,
        "bonus_used": 50.0,
        "bonus_available": 500.0,
        "amount_paid": 750.0,
    }


@pytest.fixture
def test_product_data() -> Dict[str, Any]:
    """
    Generate test product data.
    """
    return {
        "item_code": "TEST-001",
        "item_name": "Test Product",
        "rate": 100.0,
        "available_qty": 50,
        "description": "Test product for unit tests",
    }


@pytest.fixture
def test_loyalty_transaction() -> Dict[str, Any]:
    """
    Generate test loyalty transaction data.
    """
    return {
        "customer_id": "CRM-CUST-00001",
        "transaction_type": "credit",
        "points": 100,
        "order_id": "ORD-00001",
        "description": "Test loyalty points",
    }


# =============================================================================
# Application Fixtures
# =============================================================================


@pytest.fixture
def test_app_config() -> Dict[str, str]:
    """
    Provide test application configuration.
    """
    return {
        "test_mode": "true",
        "erp_mock_mode": "true",
        "redis_url": "redis://localhost:6379/1",
        "database_url": "sqlite:///test_telegram_crm.db",
        "jwt_secret": "test_jwt_secret",
        "telegram_token": "test_token",
    }


@pytest.fixture(autouse=True)
def setup_test_environment():
    """
    Automatically setup test environment for each test.
    This fixture runs before every test function.
    """
    # Set test environment variables
    os.environ["TEST_MODE"] = "true"
    os.environ["ERP_MOCK_MODE"] = "true"
    os.environ["DEBUG_MODE"] = "false"

    yield

    # Cleanup after test
    os.environ.pop("TEST_MODE", None)


# =============================================================================
# HTTP Client Fixtures
# =============================================================================


@pytest.fixture
async def http_client() -> Generator[Any, None, None]:
    """
    Provide an async HTTP client for API testing.
    """
    try:
        import httpx

        async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
            yield client
    except ImportError:
        pytest.skip("httpx not installed")


@pytest.fixture
def mock_http_response() -> MagicMock:
    """
    Create a mock HTTP response.
    """
    response = MagicMock()
    response.status_code = 200
    response.json = MagicMock(return_value={"success": True})
    response.text = '{"success": true}'
    return response


# =============================================================================
# Authentication Fixtures
# =============================================================================


@pytest.fixture
def test_jwt_token() -> str:
    """
    Generate a test JWT token.
    """
    import time

    import jwt

    payload = {
        "user_id": "test_user",
        "role": "admin",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }

    return jwt.encode(payload, "test_jwt_secret_key_for_testing_only_12345", algorithm="HS256")


@pytest.fixture
def test_admin_credentials() -> Dict[str, str]:
    """
    Provide test admin credentials.
    """
    return {"username": "test_admin", "password": "TestPassword123!"}


# =============================================================================
# Utility Fixtures
# =============================================================================


@pytest.fixture
def temp_file(tmp_path: Path) -> Path:
    """
    Create a temporary file for testing.
    """
    file = tmp_path / "test_file.txt"
    file.write_text("test content")
    return file


@pytest.fixture
def sample_qr_data() -> str:
    """
    Generate sample QR code data.
    """
    return "crm:auth:test_token_12345"


@pytest.fixture
def cleanup_messages() -> list:
    """
    Fixture to track and cleanup Telegram message IDs sent during tests.
    Used by integration tests that send messages to Telegram API.
    """
    messages = []
    yield messages
    # Cleanup would happen here if we had a way to delete messages
    # For now, we just track them for reference
    if messages:
        print(f"Test sent {len(messages)} message(s): {messages}")


# =============================================================================
# Helper Functions
# =============================================================================


def create_test_customer(
    telegram_id: int = 123456789,
    phone: str = "+79991234567",
    first_name: str = "Test",
    last_name: str = "Customer",
) -> Dict[str, Any]:
    """
    Helper function to create test customer data.
    """
    return {
        "telegram_id": telegram_id,
        "phone": phone,
        "first_name": first_name,
        "last_name": last_name,
        "full_name": f"{first_name} {last_name}",
    }


def create_test_order(customer_id: str = "CRM-CUST-00001", total: float = 1000.0, items: list = None) -> Dict[str, Any]:
    """
    Helper function to create test order data.
    """
    if items is None:
        items = [{"item_code": "ITEM-001", "qty": 2, "rate": 500.0}]

    return {
        "customer_id": customer_id,
        "items": items,
        "total": total,
        "status": "pending",
    }


# =============================================================================
# Seed Data Validation
# =============================================================================


@pytest.fixture(scope="function")
def validate_seed_data():
    """Validate seed data integrity before tests run"""
    from app.db_init import discover_seed_files, load_seed_file

    seed_files = discover_seed_files()
    for seed_file in seed_files:
        data = load_seed_file(seed_file)

        # Validate product codes in demo transactions exist
        if "demo_transactions" in data:
            product_codes = {p["code"] for p in data.get("products", [])}
            for tx in data["demo_transactions"]:
                for item in tx.get("items", []):
                    assert (
                        item["code"] in product_codes
                    ), f"Product {item['code']} referenced in transaction but not defined"

    yield


def get_seed_test_data(entity_type: str, index: int = 0):
    """Get test data from seed files"""
    from app.db_init import discover_seed_files, load_seed_file

    for seed_file in discover_seed_files():
        data = load_seed_file(seed_file)
        if entity_type in data and len(data[entity_type]) > index:
            return data[entity_type][index]
    raise ValueError(f"Entity {entity_type} not found in seed files")
