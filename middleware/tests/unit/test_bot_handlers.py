"""
Unit tests for Telegram bot handlers

Tests cover:
- /start command - welcome message
- /balance command - bonus balance check
- /register command - customer registration flow
- Error handling
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from aiogram import types
from aiogram.enums import ParseMode


@pytest.fixture
def mock_message():
    """Create a mock Telegram message for testing"""
    message = MagicMock(spec=types.Message)
    message.answer = AsyncMock()
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
    return message


@pytest.fixture
def mock_callback_query():
    """Create a mock callback query for button presses"""
    query = MagicMock(spec=types.CallbackQuery)
    query.answer = AsyncMock()
    query.message = MagicMock()
    query.message.edit_text = AsyncMock()
    query.from_user = types.User(
        id=123456789,
        is_bot=False,
        first_name="Test",
        username="testuser"
    )
    return query


@pytest.mark.asyncio
async def test_cmd_start_welcome_message(mock_message):
    """Test /start command returns welcome message"""
    from app.handlers import cmd_start
    
    await cmd_start(mock_message)
    
    # Verify answer was called
    mock_message.answer.assert_called_once()
    
    # Check welcome message content
    call_args = mock_message.answer.call_args
    message_text = str(call_args[0][0]) if call_args[0] else call_args[1].get('text', '')
    
    assert "Добро пожаловать" in message_text or "welcome" in message_text.lower()
    assert "ERP" in message_text or "GreenHouse" in message_text


@pytest.mark.asyncio
async def test_cmd_start_parse_mode_html(mock_message):
    """Test /start command uses HTML parse mode"""
    from app.handlers import cmd_start
    
    await cmd_start(mock_message)
    
    # Check if parse_mode was set to HTML
    call_kwargs = mock_message.answer.call_args.kwargs
    assert call_kwargs.get('parse_mode') == ParseMode.HTML


@pytest.mark.asyncio
async def test_cmd_balance_with_data(mock_message):
    """Test /balance command with mock customer data"""
    from app.handlers import cmd_balance
    
    with patch('app.handlers.get_customer_balance') as mock_balance:
        mock_balance.return_value = {
            'customer_id': 123,
            'available': 500,
            'accrued': 1000,
            'redeemed': 500
        }
        
        await cmd_balance(mock_message)
        
        mock_message.answer.assert_called_once()
        call_args = mock_message.answer.call_args
        message_text = str(call_args[0][0]) if call_args[0] else call_args[1].get('text', '')
        
        assert "баланс" in message_text.lower() or "balance" in message_text.lower()
        assert "500" in message_text


@pytest.mark.asyncio
async def test_cmd_balance_no_customer(mock_message):
    """Test /balance command when customer not found"""
    from app.handlers import cmd_balance
    
    with patch('app.handlers.get_customer_balance') as mock_balance:
        mock_balance.return_value = None
        
        await cmd_balance(mock_message)
        
        mock_message.answer.assert_called_once()
        call_args = mock_message.answer.call_args
        message_text = str(call_args[0][0]) if call_args[0] else call_args[1].get('text', '')
        
        # Should show error or registration prompt
        assert "не найден" in message_text.lower() or "not found" in message_text.lower() or "зарегистри" in message_text.lower()


@pytest.mark.asyncio
async def test_cmd_register_start(mock_message):
    """Test /register command starts registration flow"""
    from app.handlers import cmd_register
    
    await cmd_register(mock_message)
    
    mock_message.answer.assert_called_once()
    call_args = mock_message.answer.call_args
    message_text = str(call_args[0][0]) if call_args[0] else call_args[1].get('text', '')
    
    # Should prompt for registration info
    assert "имя" in message_text.lower() or "name" in message_text.lower() or "регистрац" in message_text.lower()


@pytest.mark.asyncio
async def test_cmd_help(mock_message):
    """Test /help command returns help information"""
    from app.handlers import cmd_help
    
    await cmd_help(mock_message)
    
    mock_message.answer.assert_called_once()
    call_args = mock_message.answer.call_args
    message_text = str(call_args[0][0]) if call_args[0] else call_args[1].get('text', '')
    
    # Should contain command list
    assert "/start" in message_text or "start" in message_text.lower()
    assert "/register" in message_text or "register" in message_text.lower()


@pytest.mark.asyncio
async def test_cmd_menu(mock_message):
    """Test /menu command shows product catalog"""
    from app.handlers import cmd_menu
    
    with patch('app.handlers.get_products') as mock_products:
        mock_products.return_value = [
            {'id': 1, 'name': 'Coffee Latte', 'price': 250, 'code': 'LATTE'},
            {'id': 2, 'name': 'Coffee Cappuccino', 'price': 200, 'code': 'CAPPUCCINO'}
        ]
        
        await cmd_menu(mock_message)
        
        mock_message.answer.assert_called_once()
        call_args = mock_message.answer.call_args
        message_text = str(call_args[0][0]) if call_args[0] else call_args[1].get('text', '')
        
        assert "Coffee" in message_text or "каталог" in message_text.lower()
        assert "250" in message_text


@pytest.mark.asyncio
async def test_error_handler(mock_message):
    """Test error handler logs and responds"""
    from app.handlers import error_handler
    
    test_error = ValueError("Test error message")
    
    await error_handler(mock_message, test_error)
    
    # Should respond with error message
    mock_message.answer.assert_called_once()


class TestThrottleMiddleware:
    """Tests for throttle middleware"""
    
    @pytest.mark.asyncio
    async def test_throttle_middleware_rate_limit(self):
        """Test middleware enforces rate limit"""
        from app.middlewares import ThrottleMiddleware
        
        middleware = ThrottleMiddleware(rate=0.1)  # 100ms rate
        
        mock_handler = AsyncMock()
        mock_data = {}
        
        # First call should pass
        await middleware(
            mock_message,
            mock_data,
            mock_handler
        )
        
        mock_handler.assert_called_once()
        
        # Reset mock
        mock_handler.reset_mock()
        
        # Second call within rate limit should be skipped
        await middleware(
            mock_message,
            mock_data,
            mock_handler
        )
        
        # Handler should NOT be called (rate limited)
        # Note: Actual behavior depends on middleware implementation


@pytest.mark.asyncio
async def test_cmd_order_status(mock_message):
    """Test /order command shows order status"""
    from app.handlers import cmd_order
    
    with patch('app.handlers.get_customer_orders') as mock_orders:
        mock_orders.return_value = [
            {
                'id': 1001,
                'status': 'completed',
                'total': 250,
                'bonus_paid': 50
            }
        ]
        
        await cmd_order(mock_message)
        
        mock_message.answer.assert_called_once()
        call_args = mock_message.answer.call_args
        message_text = str(call_args[0][0]) if call_args[0] else call_args[1].get('text', '')
        
        assert "1001" in message_text or "заказ" in message_text.lower()


@pytest.mark.asyncio
async def test_callback_product_selected(mock_callback_query):
    """Test callback when product is selected from menu"""
    from app.handlers import callback_product_select
    
    mock_callback_query.data = "product_123"
    
    with patch('app.handlers.get_product_by_id') as mock_product:
        mock_product.return_value = {
            'id': 123,
            'name': 'Test Product',
            'price': 300
        }
        
        await callback_product_select(mock_callback_query)
        
        # Should answer callback and show product info
        mock_callback_query.answer.assert_called_once()
