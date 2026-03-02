# VK (VKontakte) Integration Configuration

## Overview

This document describes how to configure the VK (VKontakte) community bot integration for the ERP GreenHouse system. The VK integration provides the same functionality as Telegram but uses VK's Long Poll API for receiving messages.

## Configuration Files

### 1. Environment Variables (`middleware/.env`)

Create or update `middleware/.env` with the following settings:

```env
# ===========================================
# VK Bot Configuration
# ===========================================

# VK Community Access Token (required)
# Get it from your VK Community settings
VK_ACCESS_TOKEN=your_vk_access_token_here

# VK Community ID (required)
# Numeric ID of your VK community
VK_GROUP_ID=123456789

# VK API Version (optional, default: 5.131)
VK_API_VERSION=5.131

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

## Prerequisites

1. A VK account
2. A VK Community (group/page) to use as the bot
3. Access to VK API (community must have messages enabled)

## Bot Setup Steps

### Step 1: Create VK Community

1. Go to [VK](https://vk.com) and log in
2. Click "Create Community" or go to "Communities" → "Create"
3. Choose "Group" or "Public page" based on your needs
4. Fill in the community name and settings
5. Enable "Messages" in the community settings (required for bot functionality)

### Step 2: Get Community Access Token

To get the access token for your community:

1. Go to your Community → Settings → Community Management
2. Navigate to **API Usage** → **Community Tokens**
3. Create a new token with the following permissions:
   - `messages` - to send and receive messages
4. Copy the access token and add it to `middleware/.env` as `VK_ACCESS_TOKEN`

### Step 3: Get Community ID

1. Go to your Community settings
2. The Community ID is shown in the URL or community settings
3. The ID is a numeric value (e.g., `123456789`)
4. Add it to `middleware/.env` as `VK_GROUP_ID`

### Step 4: Configure VK Bot in Admin UI

1. Start the middleware server
2. Navigate to Admin UI → Integrations
3. Enable VK integration
4. Save the configuration

### Step 5: Test Bot Connection

1. Open your VK community in a browser
2. Send a message to the community
3. You should receive a welcome message in response

## Bot Commands Implementation

### `/start` - Welcome and Registration

**Handler:** `app/integrations/bots/vk_handler.py::VKBot::_handle_start`

**Flow:**
1. If user is already registered → shows balance
2. If new user → shows welcome message with 152-ФЗ consent keyboard

**Response (new user):**
```
Добро пожаловать в GreenHouse! 🏠☕

[Consent keyboard with buttons]
```

**Response (registered user):**
Shows current balance with name

### `/register` - Customer Registration (Quick Command)

**Handler:** `app/integrations/bots/vk_handler.py::VKBot::_handle_register`

**Usage:** `/register Имя Телефон`

**Example:**
```
/register Иван +79991234567
```

**Response:**
```
✅ Регистрация успешна! Начислено 100 приветственных баллов.
```

### `/balance` - Check Bonus Balance

**Handler:** `app/integrations/bots/vk_handler.py::VKBot::_handle_balance`

**Response:**
```
Привет, Иван.
Баланс: 100 баллов.
```

### `/help` - Help

**Handler:** `app/integrations/bots/vk_handler.py::VKBot::_get_help_text`

**Response:**
```
/start — начать
/register Имя Телефон — регистрация
/balance — баланс и последние операции
/help — справка
```

### `/revoke_consent` - Unsubscribe from Marketing

**Handler:** `app/integrations/bots/vk_handler.py::VKBot::_handle_revoke_consent`

**Response:**
```
Вы отписаны от рассылки.
Для повторной подписки используйте /subscribe
```

### `/subscribe` - Subscribe to Marketing

**Handler:** `app/integrations/bots/vk_handler.py::VKBot::_handle_subscribe`

**Response:**
```
Вы подписаны на рассылку!
Отписаться: /revoke_consent
```

## Registration Flow (152-ФЗ Compliant)

The full registration flow via `/start` command follows 152-ФЗ requirements:

### Step 1: User sends `/start`
- Bot shows welcome message with consent keyboard
- User must accept 152-ФЗ consent before proceeding

### Step 2: Consent Keyboard
The bot presents three options:
- "Пользовательское соглашение ✅" - Accept terms
- "152-ФЗ обработка персональных данных ✅" - Accept data processing
- "Отказ ❌" - Refuse registration

### Step 3: If consent given
- Bot asks for name
- Bot asks for phone number
- Bot asks about marketing consent (optional)

### Step 4: Registration Complete
- 100 welcome bonus points are credited
- Customer record created with VK ID linkage
- Consent records stored for 152-ФЗ compliance

### Step 5: If consent refused
- All user data is deleted
- User receives confirmation message
- Can restart registration with `/start`

## 152-ФЗ Compliance

### Consent Required Before Registration

The VK bot implements strict 152-ФЗ compliance:
- **No registration without explicit consent**
- Consent is captured via interactive keyboard buttons
- Both data processing and marketing consent are tracked

### Data Storage and Retention

- **VK ID**: Stored in `customers.vk_id` field
- **Consent records**: Stored in `consents` table with source="vk"
- **Policy version**: Tracked for compliance audits
- **Marketing consent**: Stored in `customers.marketing_allowed`
- **Data processing consent**: Stored in `customers.data_processing_allowed`

### User Rights

Users can exercise their rights via bot commands:

1. **Access to data**: Via `/balance` command
2. **Deletion of data**: Via `/revoke_consent` or by refusing consent during registration
3. **Opt-out of marketing**: Via `/revoke_consent`
4. **Opt-in to marketing**: Via `/subscribe`

### Consent Audit Trail

All consent actions are logged:
```python
# From vk_handler.py
_store_vk_consent(customer_id, consent_text, consent_version, consent_type)
```

Consent types:
- `data_processing` - Main 152-ФЗ consent
- `marketing` - Marketing communications consent

## Running the VK Bot

### Start with the Middleware

The VK bot runs as part of the main application. It starts automatically when the middleware starts if credentials are configured.

### Manual Start (Development)

```python
from app.integrations.bots.vk_handler import create_vk_bot
import asyncio

async def start_vk():
    bot = create_vk_bot(
        access_token="your_token",
        group_id=123456789,
        api_version="5.131"
    )
    await bot.run()

asyncio.run(start_vk())
```

## Troubleshooting

### Bot doesn't respond to messages

1. Check `VK_ACCESS_TOKEN` is correct in `.env`
2. Verify the community has messages enabled
3. Check the token has required permissions (`messages`)
4. Review logs for authentication errors
5. Ensure VK_GROUP_ID is correct

### Long Poll errors

1. Check internet connectivity
2. Verify access token hasn't expired
3. Check group ID is correct
4. Review VK API rate limits

### Registration issues

1. Verify Redis is running (`REDIS_URL` in `.env`)
2. Check database is accessible
3. Review logs for specific error messages
4. Ensure phone number format is correct (with + prefix)

### Debug Logging

Enable detailed logging in `middleware/.env`:

```env
DEBUG=true
```

Logs will show:
- VK API requests and responses
- User registration flow
- Consent handling
- Errors and exceptions

### Common Error Messages

| Error | Solution |
|-------|----------|
| "Invalid access token" | Regenerate token in VK community settings |
| "Group not found" | Check VK_GROUP_ID is correct |
| "Messages are disabled" | Enable messages in community settings |
| "Rate limit exceeded" | Wait and retry, check VK API limits |

## Security Considerations

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Rotate tokens regularly** - Especially if compromised
3. **Validate all input** - User messages can contain malicious content
4. **HTTPS recommended** - For production deployments
5. **Verify user identity** - VK user IDs are used for authentication

## Next Steps

1. ✅ Configure VK credentials in `.env`
2. ✅ Enable messages in VK community
3. ✅ Get access token with proper permissions
4. ⏳ Test bot commands
5. ⏳ Configure 152-ФЗ consent messages
6. ⏳ Deploy to production

---

**Last Updated:** 2026-02-26  
**Status:** Ready for configuration
