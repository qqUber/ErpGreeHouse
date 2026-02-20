# Telegram Integration Configuration

## Overview

This document describes how to configure the Telegram bot integration for the ERP GreenHouse system.

## Configuration Files

### 1. Environment Variables (`middleware/.env`)

Create or update `middleware/.env` with the following settings:

```env
# ===========================================
# Telegram Bot Configuration
# ===========================================

# Bot token from @BotFather (required)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Webhook URL for receiving updates (optional for polling mode)
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/v1/telegram/webhook

# Channel/Group ID for notifications (optional)
TELEGRAM_CHANNEL_ID=@your_channel_username
# Or use numeric ID: -1001234567890

# ===========================================
# Redis Configuration (for caching & rate limiting)
# ===========================================

REDIS_URL=redis://localhost:6379/0
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# ===========================================
# ERPNext Configuration
# ===========================================

# Mock mode for development (no real ERPNext connection)
ERP_MOCK_MODE=true

# Real ERPNext configuration (for production)
ERP_API_BASE_URL=https://erp.your-company.com
ERP_API_KEY=your_api_key_here
ERP_API_SECRET=your_api_secret_here

# ===========================================
# Application Settings
# ===========================================

# Admin UI authentication
ADMIN_DEFAULT_USERNAME=admin
ADMIN_DEFAULT_PASSWORD=admin

# Database (SQLite for development)
DATABASE_URL=sqlite:///./local/crm.db

# Web server
HOST=127.0.0.1
PORT=8000
```

## Bot Setup Steps

### Step 1: Create Bot via @BotFather

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the instructions:
   - Choose a name for your bot (e.g., "ERP GreenHouse Bot")
   - Choose a username for your bot (e.g., "erp_greenhouse_bot")
4. Save the token provided by BotFather
5. Add token to `middleware/.env` as `TELEGRAM_BOT_TOKEN`

### Step 2: Configure Bot Commands

Send these commands to @BotFather to set up the command list:

```
/start - Запустить бота
/register - Зарегистрироваться как клиент
/balance - Проверить баланс бонусов
/menu - Показать меню товаров
/order - Статус заказа
/help - Помощь
```

To set command list:
1. Send `/setcommands` to @BotFather
2. Select your bot
3. Paste the command list above

### Step 3: Configure Webhook (Production Only)

For production deployment, set up webhook:

```bash
# Replace YOUR_TOKEN and YOUR_DOMAIN
curl -X POST "https://api.telegram.org/botYOUR_TOKEN/setWebhook" \
  -d "url=https://YOUR_DOMAIN.com/api/v1/telegram/webhook"
```

Verify webhook:
```bash
curl "https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo"
```

### Step 4: Test Bot Connection

1. Search for your bot in Telegram by username
2. Send `/start`
3. You should receive a welcome message

## Bot Commands Implementation

### `/start` - Welcome Command

**Handler:** `app/handlers.py::cmd_start`

**Response:**
```
👋 Добро пожаловать в ERP GreenHouse!

Я ваш помощник для:
- Проверки баланса бонусов
- Просмотра товаров
- Оформления заказов

Нажмите /help для получения помощи.
```

### `/register` - Customer Registration

**Handler:** `app/handlers.py::cmd_register`

**Flow:**
1. Bot asks for full name
2. Bot asks for phone number
3. Bot asks for consent to data processing (152-FZ compliant)
4. Data sent to API for customer creation

**Response:**
```
✅ Вы успешно зарегистрированы!

Ваш ID клиента: 12345
Текущий баланс: 0 ₽

Используйте /menu для просмотра товаров.
```

### `/balance` - Check Bonus Balance

**Handler:** `app/handlers.py::cmd_balance`

**Response:**
```
💰 Ваш баланс бонусов

Доступно: 500 ₽
Начислено: 1000 ₽
Списано: 500 ₽

Используйте бонусы при оплате через /order
```

### `/menu` - Product Catalog

**Handler:** `app/handlers.py::cmd_menu`

**Response:**
```
🛒 Каталог товаров

1. Кофе Латте - 250 ₽
2. Кофе Капучино - 200 ₽
3. Кофе Эспрессо - 150 ₽

Выберите товар для заказа.
```

### `/order` - Order Status

**Handler:** `app/handlers.py::cmd_order`

**Response:**
```
📦 Ваши заказы

Заказ #1001
Статус: ✅ Выполнен
Сумма: 250 ₽
Бонусами оплачено: 50 ₽

Заказ #1002
Статус: ⏳ В обработке
Сумма: 300 ₽
```

## Unit Tests for Telegram Integration

### Test File: `middleware/tests/unit/test_bot_handlers.py`

```python
"""
Unit tests for Telegram bot handlers
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from aiogram import types
from app.handlers import cmd_start, cmd_balance, cmd_register


@pytest.fixture
def mock_message():
    """Create a mock Telegram message"""
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
    return message


@pytest.mark.asyncio
async def test_cmd_start(mock_message):
    """Test /start command response"""
    await cmd_start(mock_message)
    
    # Verify answer was called
    mock_message.answer.assert_called_once()
    
    # Check welcome message contains expected text
    call_args = mock_message.answer.call_args
    assert "Добро пожаловать" in str(call_args)
    assert "ERP GreenHouse" in str(call_args)


@pytest.mark.asyncio
async def test_cmd_balance(mock_message):
    """Test /balance command with mock API"""
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
        assert "баланс" in str(call_args).lower()
        assert "500" in str(call_args)


@pytest.mark.asyncio
async def test_cmd_register_start(mock_message):
    """Test /register command starts registration flow"""
    await cmd_register(mock_message)
    
    mock_message.answer.assert_called_once()
    call_args = mock_message.answer.call_args
    assert "регистра" in str(call_args).lower() or "register" in str(call_args).lower()


@pytest.mark.asyncio
async def test_cmd_start_parse_mode(mock_message):
    """Test that /start uses HTML parse mode"""
    await cmd_start(mock_message)
    
    # Check if parse_mode was set
    call_kwargs = mock_message.answer.call_args.kwargs
    assert call_kwargs.get('parse_mode') == 'HTML'
```

### Test File: `middleware/tests/integration/test_telegram_bot.py`

```python
"""
Integration tests for Telegram bot
"""
import pytest
import os
from aiogram import Bot
from app.bot import create_bot
from app.config import get_settings


@pytest.mark.skipif(
    not os.getenv('TELEGRAM_BOT_TOKEN'),
    reason="No Telegram bot token configured"
)
class TestTelegramBotIntegration:
    """Integration tests requiring real Telegram bot"""
    
    @pytest.fixture
    def bot(self):
        """Create real bot instance"""
        return create_bot()
    
    @pytest.mark.asyncio
    async def test_bot_get_me(self, bot: Bot):
        """Test bot can get its own info"""
        me = await bot.get_me()
        
        assert me is not None
        assert me.is_bot is True
        assert me.username is not None
    
    @pytest.mark.asyncio
    async def test_bot_can_send_message(self, bot: Bot):
        """Test bot can send message to test chat"""
        test_chat_id = os.getenv('TELEGRAM_TEST_CHAT_ID')
        if not test_chat_id:
            pytest.skip("No test chat ID configured")
        
        message = await bot.send_message(
            chat_id=test_chat_id,
            text="🧪 Integration test message"
        )
        
        assert message is not None
        assert message.message_id is not None
```

## Running Tests

### Unit Tests

```bash
cd middleware
pytest tests/unit/test_bot_handlers.py -v
```

### Integration Tests

First, configure test environment:

```bash
# middleware/.env.test
TELEGRAM_BOT_TOKEN=your_test_bot_token
TELEGRAM_TEST_CHAT_ID=your_test_chat_id
```

Then run:

```bash
pytest tests/integration/test_telegram_bot.py -v
```

## Troubleshooting

### Bot doesn't respond

1. Check bot token is correct in `.env`
2. Verify bot is not blocked by Telegram
3. Check webhook status: `getWebhookInfo`
4. Review logs for errors

### Webhook not working

1. Ensure HTTPS is configured
2. Check firewall allows Telegram IPs
3. Verify SSL certificate is valid
4. Use `setWebhook` to reconfigure

### Rate limiting issues

1. Check Redis is running
2. Verify `REDIS_URL` is correct
3. Adjust rate limits in `ThrottleMiddleware`

## Security Considerations

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Rotate tokens regularly** - Especially if compromised
3. **Validate all input** - Bot commands can be manipulated
4. **Use HTTPS for webhook** - Encrypt data in transit
5. **Implement proper auth** - Verify chat_id before sensitive operations

## Next Steps

1. ✅ Configure bot token in `.env`
2. ✅ Set up bot commands via @BotFather
3. ✅ Run unit tests for handlers
4. ⏳ Implement registration flow
5. ⏳ Add loyalty points integration
6. ⏳ Deploy to production with webhook

---

**Last Updated:** 2026-02-20  
**Status:** Ready for configuration
