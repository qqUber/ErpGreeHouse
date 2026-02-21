"""
Unit tests for Telegram bot handlers

Tests cover:
- /start command - welcome message and registration prompt
- /balance command - bonus balance check  
- /register command - customer registration flow
- Consent callback handling

Note: These tests verify the handler logic with mocked dependencies.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock
from aiogram import types
from aiogram.enums import ParseMode


@pytest.mark.asyncio
async def test_cmd_start_shows_registration_prompt(mock_message):
    """Test /start command shows registration prompt for new users"""
    from app.handlers import cmd_start
    
    # Mock ERP client to return no customer (new user)
    with patch('app.handlers.ERPClient') as MockClient:
        mock_client_instance = MockClient.return_value
        mock_client_instance.get_customer_by_telegram_id = AsyncMock(return_value=None)
        
        with patch('app.handlers.get_redis') as mock_redis:
            mock_redis.return_value = MagicMock()
            
            await cmd_start(mock_message)
    
    # Verify response was sent
    mock_message.answer.assert_called_once()
    call_args = mock_message.answer.call_args
    message_text = str(call_args[0][0]) if call_args[0] else call_args[1].get('text', '')
    
    # Should prompt for registration
    assert "зарегистрируемся" in message_text.lower() or "регистрац" in message_text.lower()


@pytest.mark.asyncio
async def test_cmd_start_shows_balance_for_registered_user(mock_message):
    """Test /start command shows balance for registered users"""
    from app.handlers import cmd_start
    
    # Mock ERP client to return existing customer
    with patch('app.handlers.ERPClient') as MockClient:
        mock_client_instance = MockClient.return_value
        mock_client_instance.get_customer_by_telegram_id = AsyncMock(return_value={
            'name': 'CRM-CUST-00001',
            'first_name': 'Test User'
        })
        mock_client_instance.get_balance = AsyncMock(return_value=500)
        
        with patch('app.handlers.get_redis') as mock_redis:
            mock_redis.return_value = MagicMock()
            
            await cmd_start(mock_message)
    
    # Verify response with balance
    mock_message.answer.assert_called_once()
    call_args = mock_message.answer.call_args
    message_text = str(call_args[0][0]) if call_args[0] else call_args[1].get('text', '')
    
    # Should show balance
    assert "баланс" in message_text.lower() or "500" in message_text


@pytest.mark.asyncio
async def test_cmd_register_invalid_format(mock_message):
    """Test /register command with invalid format"""
    from app.handlers import cmd_register
    
    # Set message text with invalid format (missing phone)
    mock_message.text = "/register TestName"
    mock_message.answer.reset_mock()
    
    await cmd_register(mock_message)
    
    # Should show error about format
    mock_message.answer.assert_called_once()
    call_args = mock_message.answer.call_args
    message_text = str(call_args[0][0]) if call_args[0] else call_args[1].get('text', '')
    
    assert "формат" in message_text.lower() or "Формат" in message_text


@pytest.mark.asyncio
async def test_cmd_register_invalid_phone(mock_message):
    """Test /register command with invalid phone format"""
    from app.handlers import cmd_register
    
    # Set message text with invalid phone
    mock_message.text = "/register TestName 12345"
    mock_message.answer.reset_mock()
    
    await cmd_register(mock_message)
    
    # Should show error about phone format
    mock_message.answer.assert_called_once()
    call_args = mock_message.answer.call_args
    message_text = str(call_args[0][0]) if call_args[0] else call_args[1].get('text', '')
    
    assert "телефон" in message_text.lower() or "формат" in message_text.lower()


@pytest.mark.asyncio
async def test_cmd_register_valid(mock_message):
    """Test /register command with valid data"""
    from app.handlers import cmd_register
    
    # Set message text with valid data
    mock_message.text = "/register TestUser +79991234567"
    mock_message.answer.reset_mock()
    
    with patch('app.handlers.get_redis') as mock_redis:
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance
        
        await cmd_register(mock_message)
    
    # Should show consent request with keyboard
    mock_message.answer.assert_called_once()
    call_args = mock_message.answer.call_args
    
    # Verify consent text was sent
    message_text = str(call_args[0][0]) if call_args[0] else call_args[1].get('text', '')
    assert "соглашаюсь" in message_text.lower() or "согласие" in message_text.lower()


@pytest.mark.asyncio
async def test_cb_consent_declined(mock_callback_query):
    """Test consent callback when user declines"""
    from app.handlers import cb_consent
    
    # Setup callback data for decline
    mock_callback_query.data = "consent:no"
    
    with patch('app.handlers.delete') as mock_delete:
        await cb_consent(mock_callback_query)
    
    # Should edit message to show cancellation
    mock_callback_query.message.edit_text.assert_called_once()
    call_args = mock_callback_query.message.edit_text.call_args
    message_text = str(call_args[0][0]) if call_args[0] else call_args[1].get('text', '')
    
    assert "отменена" in message_text.lower()
    # Should delete consent data
    mock_delete.assert_called_once()


@pytest.mark.asyncio
async def test_cb_consent_no_pending_data(mock_callback_query):
    """Test consent callback when no pending registration data"""
    from app.handlers import cb_consent
    
    # Setup callback data for accept
    mock_callback_query.data = "consent:yes"
    
    with patch('app.handlers.get_redis') as mock_redis:
        mock_redis_instance = MagicMock()
        mock_redis_instance.hgetall = MagicMock(return_value=None)  # No pending data
        mock_redis.return_value = mock_redis_instance
        
        await cb_consent(mock_callback_query)
    
    # Should just answer without error
    mock_callback_query.answer.assert_called_once()


@pytest.mark.asyncio
async def test_cb_consent_success(mock_callback_query):
    """Test consent callback with successful registration"""
    from app.handlers import cb_consent
    
    # Setup callback data for accept
    mock_callback_query.data = "consent:yes"
    
    with patch('app.handlers.get_redis') as mock_redis:
        mock_redis_instance = MagicMock()
        mock_redis_instance.hgetall = MagicMock(return_value={
            'name': 'Test User',
            'phone': '+79991234567'
        })
        mock_redis.return_value = mock_redis_instance
        
        with patch('app.handlers.ERPClient') as MockClient:
            mock_client_instance = MockClient.return_value
            mock_client_instance.create_customer = AsyncMock(return_value={
                'name': 'CRM-CUST-00001'
            })
            
            with patch('app.handlers._upsert_local_customer') as mock_upsert:
                mock_upsert.return_value = 1
                with patch('app.handlers._store_consent') as mock_store:
                    with patch('app.handlers.delete') as mock_delete:
                        await cb_consent(mock_callback_query)
    
    # Should show success message
    mock_callback_query.message.edit_text.assert_called_once()
    call_args = mock_callback_query.message.edit_text.call_args
    message_text = str(call_args[0][0]) if call_args[0] else call_args[1].get('text', '')
    
    assert "баллов" in message_text.lower() or "готово" in message_text.lower()


@pytest.mark.asyncio
async def test_cmd_balance_not_registered(mock_message):
    """Test /balance command when user not registered"""
    from app.handlers import cmd_balance
    
    # Mock ERP client to return no customer
    with patch('app.handlers.ERPClient') as MockClient:
        mock_client_instance = MockClient.return_value
        mock_client_instance.get_customer_by_telegram_id = AsyncMock(return_value=None)
        
        await cmd_balance(mock_message)
    
    # Should prompt to register
    mock_message.answer.assert_called_once()
    call_args = mock_message.answer.call_args
    message_text = str(call_args[0][0]) if call_args[0] else call_args[1].get('text', '')
    
    assert "не зарегистрирован" in message_text.lower() or "/start" in message_text


@pytest.mark.asyncio
async def test_cmd_balance_registered(mock_message):
    """Test /balance command for registered user"""
    from app.handlers import cmd_balance
    
    # Mock ERP client to return customer with balance
    with patch('app.handlers.ERPClient') as MockClient:
        mock_client_instance = MockClient.return_value
        mock_client_instance.get_customer_by_telegram_id = AsyncMock(return_value={
            'name': 'CRM-CUST-00001',
            'first_name': 'Test User'
        })
        mock_client_instance.get_balance = AsyncMock(return_value=750)
        mock_client_instance.get_transactions = AsyncMock(return_value=[])
        
        await cmd_balance(mock_message)
    
    # Should show balance
    mock_message.answer.assert_called_once()
    call_args = mock_message.answer.call_args
    message_text = str(call_args[0][0]) if call_args[0] else call_args[1].get('text', '')
    
    assert "750" in message_text or "баланс" in message_text.lower()


@pytest.mark.asyncio
async def test_cmd_help(mock_message):
    """Test /help command"""
    from app.handlers import cmd_help
    
    await cmd_help(mock_message)
    
    # Should show help information
    mock_message.answer.assert_called_once()


@pytest.mark.asyncio
async def test_cmd_menu(mock_message):
    """Test /menu command"""
    from app.handlers import cmd_menu
    
    await cmd_menu(mock_message)
    
    # Should show menu
    mock_message.answer.assert_called_once()
