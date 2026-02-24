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
import sys
import pytest
import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Generator, Dict, Any

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
    "aiogram", "aiogram.types", "aiogram.filters", "aiogram.fsm",
    "aiogram.fsm.context", "aiogram.fsm.storage", "aiogram.fsm.storage.redis",
    "aiogram.utils", "aiogram.utils.keyboard",
    "aiogram.client", "aiogram.client.default", "aiogram.enums",
    "celery", "celery.app",
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

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set test environment variables before importing app modules
os.environ['TEST_MODE'] = 'true'
os.environ['ERP_MOCK_MODE'] = 'true'
os.environ['REDIS_URL'] = 'redis://localhost:6379/1'
os.environ['DATABASE_URL'] = 'sqlite:///test_telegram_crm.db'
os.environ['JWT_SECRET_KEY'] = 'test_jwt_secret_key_for_testing_only_12345'
os.environ['TELEGRAM_BOT_TOKEN'] = 'test_token_123456789:AABBccDDeeFFggHHiiJJkkLLmmNNooP'


# =============================================================================
# Database Fixtures
# =============================================================================

@pytest.fixture(scope='session')
def test_db_path() -> str:
    """Get test database path"""
    return 'sqlite:///test_telegram_crm.db'


@pytest.fixture(scope='function')
def clean_database(test_db_path: str) -> Generator[str, None, None]:
    """
    Create a clean test database for each test function.
    Automatically cleans up after test completes.
    """
    from app.db import get_db, init_db
    
    # Delete existing test database file to ensure clean state
    db = get_db()
    db_path = db.path
    import sqlite3
    
    # Close any existing connections and delete the file
    try:
        conn = sqlite3.connect(db_path)
        conn.close()
    except:
        pass
    
    import os
    if os.path.exists(db_path):
        os.remove(db_path)
    
    # Initialize fresh test database (this creates all tables)
    init_db()
    
    # Get a fresh connection after init_db
    db = get_db()
    conn = db.connect()
    
    # Seed default role_permissions data
    _seed_role_permissions(conn)
    
    try:
        yield test_db_path
        
    finally:
        # Cleanup: Drop all tables created by init_db()
        # Order matters due to foreign key constraints
        conn.execute("DROP TABLE IF EXISTS marketing_trigger_events")
        conn.execute("DROP TABLE IF EXISTS marketing_events")
        conn.execute("DROP TABLE IF EXISTS marketing_campaigns")
        conn.execute("DROP TABLE IF EXISTS marketing_triggers")
        conn.execute("DROP TABLE IF EXISTS marketing_segments")
        conn.execute("DROP TABLE IF EXISTS integration_deliveries")
        conn.execute("DROP TABLE IF EXISTS vk_settings")
        conn.execute("DROP TABLE IF EXISTS admin_tokens")
        conn.execute("DROP TABLE IF EXISTS admin_users")
        conn.execute("DROP TABLE IF EXISTS role_permissions")
        conn.execute("DROP TABLE IF EXISTS products")
        conn.execute("DROP TABLE IF EXISTS integrations")
        conn.execute("DROP TABLE IF EXISTS sync_log")
        conn.execute("DROP TABLE IF EXISTS transactions")
        conn.execute("DROP TABLE IF EXISTS consents")
        conn.execute("DROP TABLE IF EXISTS customers")
        conn.commit()
        conn.close()


def _seed_role_permissions(conn: sqlite3.Connection) -> None:
    """
    Seed the role_permissions table with default role data.
    This ensures JWT tests work correctly.
    """
    # Default permissions matching app/auth.py get_default_permissions()
    default_permissions = [
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
    ]
    
    conn.executemany(
        "INSERT OR IGNORE INTO role_permissions (role, permission, is_allowed) VALUES (?, ?, ?)",
        default_permissions
    )
    conn.commit()


# =============================================================================
# Redis Fixtures
# =============================================================================

@pytest.fixture(scope='function')
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


@pytest.fixture(scope='function')
def redis_url() -> str:
    """Get test Redis URL"""
    return 'redis://localhost:6379/1'


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
    mock_client.get_customer_by_phone = AsyncMock(return_value={
        'customer_id': 'CRM-CUST-00001',
        'customer_name': 'Test Customer',
        'phone': '+79991234567',
        'email': 'test@example.com'
    })
    
    mock_client.get_customer_by_telegram = AsyncMock(return_value={
        'customer_id': 'CRM-CUST-00001',
        'customer_name': 'Test Customer',
        'telegram_id': '123456789'
    })
    
    mock_client.create_customer = AsyncMock(return_value={
        'customer_id': 'CRM-CUST-00002',
        'success': True
    })
    
    # Mock loyalty methods
    mock_client.get_loyalty_balance = AsyncMock(return_value={
        'customer_id': 'CRM-CUST-00001',
        'available_points': 500,
        'accrued_points': 1000,
        'redeemed_points': 500
    })
    
    mock_client.add_loyalty_points = AsyncMock(return_value={
        'success': True,
        'transaction_id': 'LT-00001',
        'points_added': 100
    })
    
    mock_client.redeem_loyalty_points = AsyncMock(return_value={
        'success': True,
        'transaction_id': 'LT-00002',
        'points_redeemed': 50
    })
    
    # Mock order methods
    mock_client.create_order = AsyncMock(return_value={
        'order_id': 'ORD-00001',
        'success': True,
        'total': 1000.0,
        'bonus_used': 50.0
    })
    
    mock_client.get_order = AsyncMock(return_value={
        'order_id': 'ORD-00001',
        'status': 'completed',
        'total': 1000.0,
        'items': [
            {'item_code': 'ITEM-001', 'qty': 2, 'rate': 250.0}
        ]
    })
    
    mock_client.get_customer_orders = AsyncMock(return_value=[
        {
            'order_id': 'ORD-00001',
            'status': 'completed',
            'total': 1000.0,
            'date': '2024-01-15'
        }
    ])
    
    # Mock product methods
    mock_client.get_products = AsyncMock(return_value=[
        {
            'item_code': 'LATTE',
            'item_name': 'Coffee Latte',
            'rate': 250.0,
            'available_qty': 100
        },
        {
            'item_code': 'CAPPUCCINO',
            'item_name': 'Coffee Cappuccino',
            'rate': 200.0,
            'available_qty': 150
        }
    ])
    
    mock_client.get_product_by_id = AsyncMock(return_value={
        'item_code': 'LATTE',
        'item_name': 'Coffee Latte',
        'rate': 250.0
    })
    
    return mock_client


@pytest.fixture
def erp_mock_responses() -> Dict[str, Any]:
    """
    Provide standard mock ERP responses for testing.
    """
    return {
        'customer': {
            'customer_id': 'CRM-CUST-00001',
            'customer_name': 'Test Customer',
            'phone': '+79991234567',
            'email': 'test@example.com',
            'telegram_id': '123456789'
        },
        'loyalty_balance': {
            'customer_id': 'CRM-CUST-00001',
            'available_points': 500,
            'accrued_points': 1000,
            'redeemed_points': 500
        },
        'order': {
            'order_id': 'ORD-00001',
            'status': 'completed',
            'total': 1000.0,
            'bonus_used': 50.0,
            'items': [
                {'item_code': 'ITEM-001', 'qty': 2, 'rate': 250.0}
            ]
        },
        'products': [
            {
                'item_code': 'LATTE',
                'item_name': 'Coffee Latte',
                'rate': 250.0,
                'available_qty': 100
            }
        ]
    }


# =============================================================================
# Telegram Bot Mocks
# =============================================================================

@pytest.fixture
def mock_bot() -> AsyncMock:
    """
    Create a mock Telegram bot for testing.
    """
    bot = AsyncMock()
    bot.send_message = AsyncMock()
    bot.edit_message_text = AsyncMock()
    bot.answer_callback_query = AsyncMock()
    bot.get_me = AsyncMock(return_value=MagicMock(username='test_bot'))
    return bot


@pytest.fixture
def mock_message() -> MagicMock:
    """
    Create a mock Telegram message for testing.
    """
    from aiogram import types
    
    message = MagicMock(spec=types.Message)
    message.answer = AsyncMock()
    message.reply = AsyncMock()
    message.edit_text = AsyncMock()
    message.delete = AsyncMock()
    
    message.from_user = types.User(
        id=123456789,
        is_bot=False,
        first_name="Test",
        last_name="User",
        username="testuser",
        language_code="ru"
    )
    
    message.chat = types.Chat(
        id=123456789,
        type="private",
        first_name="Test",
        last_name="User",
        username="testuser"
    )
    
    message.date = 1234567890
    message.message_id = 1
    message.text = "/start"
    
    return message


@pytest.fixture
def mock_callback_query() -> MagicMock:
    """
    Create a mock callback query for button presses.
    """
    from aiogram import types
    
    query = MagicMock(spec=types.CallbackQuery)
    query.answer = AsyncMock()
    query.message = MagicMock()
    query.message.edit_text = AsyncMock()
    query.message.delete = AsyncMock()
    
    query.from_user = types.User(
        id=123456789,
        is_bot=False,
        first_name="Test",
        username="testuser"
    )
    
    query.data = "callback_data"
    query.id = "query_123"
    
    return query


@pytest.fixture
def mock_inline_keyboard() -> MagicMock:
    """
    Create a mock inline keyboard builder.
    """
    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
    
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
    """
    Generate test customer data.
    """
    return {
        'telegram_id': 123456789,
        'phone': '+79991234567',
        'first_name': 'Test',
        'last_name': 'Customer',
        'full_name': 'Test Customer',
        'consent_version': '1.0',
        'consent_timestamp': '2024-01-15T10:30:00Z',
        'consent_given': True
    }


@pytest.fixture
def test_order_data() -> Dict[str, Any]:
    """
    Generate test order data.
    """
    return {
        'customer_id': 'CRM-CUST-00001',
        'items': [
            {'item_code': 'ITEM-001', 'qty': 2, 'rate': 250.0, 'amount': 500.0},
            {'item_code': 'ITEM-002', 'qty': 1, 'rate': 300.0, 'amount': 300.0}
        ],
        'total': 800.0,
        'bonus_used': 50.0,
        'bonus_available': 500.0,
        'amount_paid': 750.0
    }


@pytest.fixture
def test_product_data() -> Dict[str, Any]:
    """
    Generate test product data.
    """
    return {
        'item_code': 'TEST-001',
        'item_name': 'Test Product',
        'rate': 100.0,
        'available_qty': 50,
        'description': 'Test product for unit tests'
    }


@pytest.fixture
def test_loyalty_transaction() -> Dict[str, Any]:
    """
    Generate test loyalty transaction data.
    """
    return {
        'customer_id': 'CRM-CUST-00001',
        'transaction_type': 'credit',
        'points': 100,
        'order_id': 'ORD-00001',
        'description': 'Test loyalty points'
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
        'test_mode': 'true',
        'erp_mock_mode': 'true',
        'redis_url': 'redis://localhost:6379/1',
        'database_url': 'sqlite:///test_telegram_crm.db',
        'jwt_secret': 'test_jwt_secret',
        'telegram_token': 'test_token'
    }


@pytest.fixture(autouse=True)
def setup_test_environment():
    """
    Automatically setup test environment for each test.
    This fixture runs before every test function.
    """
    # Set test environment variables
    os.environ['TEST_MODE'] = 'true'
    os.environ['ERP_MOCK_MODE'] = 'true'
    os.environ['DEBUG_MODE'] = 'false'
    
    yield
    
    # Cleanup after test
    os.environ.pop('TEST_MODE', None)


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
        async with httpx.AsyncClient(base_url='http://localhost:8000') as client:
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
    response.json = MagicMock(return_value={'success': True})
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
    import jwt
    import time
    
    payload = {
        'user_id': 'test_user',
        'role': 'admin',
        'exp': int(time.time()) + 3600,
        'iat': int(time.time())
    }
    
    return jwt.encode(payload, 'test_jwt_secret_key_for_testing_only_12345', algorithm='HS256')


@pytest.fixture
def test_admin_credentials() -> Dict[str, str]:
    """
    Provide test admin credentials.
    """
    return {
        'username': 'test_admin',
        'password': 'TestPassword123!'
    }


# =============================================================================
# Utility Fixtures
# =============================================================================

@pytest.fixture
def event_loop():
    """
    Create an instance of the default event loop for each test case.
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


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


# =============================================================================
# Helper Functions
# =============================================================================

def create_test_customer(
    telegram_id: int = 123456789,
    phone: str = '+79991234567',
    first_name: str = 'Test',
    last_name: str = 'Customer'
) -> Dict[str, Any]:
    """
    Helper function to create test customer data.
    """
    return {
        'telegram_id': telegram_id,
        'phone': phone,
        'first_name': first_name,
        'last_name': last_name,
        'full_name': f'{first_name} {last_name}'
    }


def create_test_order(
    customer_id: str = 'CRM-CUST-00001',
    total: float = 1000.0,
    items: list = None
) -> Dict[str, Any]:
    """
    Helper function to create test order data.
    """
    if items is None:
        items = [
            {'item_code': 'ITEM-001', 'qty': 2, 'rate': 500.0}
        ]
    
    return {
        'customer_id': customer_id,
        'items': items,
        'total': total,
        'status': 'pending'
    }
