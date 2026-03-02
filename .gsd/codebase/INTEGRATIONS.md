# 🚀 External Integrations

## Project Overview
Telegram CRM MVP + ERPNext Loyalty Integration connects multiple external services to provide a comprehensive customer relationship management system with loyalty program capabilities.

---

## 📱 Messaging Platforms

### Telegram
- **Description**: Customer-facing bot for loyalty program, menu browsing, and order placement
- **SDK/Client**: aiogram 3.25.0 (async Telegram Bot API framework)
- **Authentication**: Bot token via `TELEGRAM_BOT_TOKEN` environment variable
- **Implementation**: `middleware/app/integrations/bots/telegram_handler.py`
- **Webhook**: POST to `/webhook/telegram`
- **Features**:
  - Bot commands for customer registration
  - Loyalty points management
  - Order placement and tracking
  - Marketing campaigns via broadcast messages

### VK (VKontakte)
- **Description**: Russian social network bot integration
- **SDK/Client**: Custom VK API integration
- **Authentication**: VK access token via `VK_ACCESS_TOKEN` environment variable
- **Implementation**: `middleware/app/integrations/bots/vk_handler.py`
- **Webhook**: POST to `/webhook/vk`
- **Features**:
  - Similar functionality to Telegram bot
  - VK Callback API for updates
  - Customer communication via VK messages

---

## 🏪 ERP & POS Integration

### ERPNext
- **Description**: Enterprise resource planning system for orders, inventory, and loyalty management
- **Version**: ERPNext 15
- **Client**: Custom HTTP client in `middleware/app/integrations/pos/erpnext_client.py`
- **Authentication**: API key/secret via `ERP_API_KEY` and `ERP_API_SECRET` environment variables
- **Base URL**: `ERP_API_BASE_URL` (e.g., `https://erp.example.com`)
- **Key Endpoints**:
  - `/api/method/loyalty` - Loyalty program management
  - `/api/resource/Item` - Product catalog
  - `/api/resource/Sales Order` - Order processing
- **Mock Mode**: Available via `ERP_MOCK_MODE` environment variable for development
- **Features**:
  - Real-time order synchronization
  - Loyalty points accrual and redemption
  - Inventory management
  - Customer data synchronization

---

## 📊 Data Storage & Caching

### Database
- **Development**: SQLite (file-based, built-in)
  - Connection: File path via `CRM_DB_PATH` environment variable
  - Location: `middleware/crm.db` (dev), `middleware/test_crm.db` (tests)
  - Schema: Auto-migrations on startup
- **Production**: PostgreSQL 15
  - Connection: `DATABASE_URL` environment variable
  - Features: JSONB support, connection pooling, async operations

### Caching & Task Queue
- **Redis**: ≥7.2.0
  - Connection: `REDIS_URL` environment variable
  - Usage:
    - Celery task broker for background processing
    - Session caching
    - Rate limiting counters
    - Temporary data storage

---

## 🔐 Authentication & Security

### JWT Authentication
- **Implementation**: `middleware/app/auth.py`
- **Token Type**: JWT with HS256 algorithm
- **Access Tokens**: 30-minute expiry
- **Refresh Tokens**: 30-day expiry with sliding window
- **Secret Key**: `JWT_SECRET_KEY` environment variable (required in production)
- **Token Storage**: HTTP-only cookies with secure flags

### Admin Authentication
- **API**: `middleware/app/admin_auth_api.py`
- **Roles**: `admin`, `operator`, `manager` (role-based access control)
- **Bypass Key**: `ADMIN_BYPASS_KEY` for development purposes
- **Bootstrap**: Default admin user created on first run if `ADMIN_BOOTSTRAP_DEFAULT=true`

---

## 📈 Monitoring & Observability

### Health Checks
- **Application**: `GET /health` - Overall system health
- **Database**: `GET /health/db` - Database connection check
- **Redis**: `GET /health/redis` - Redis connection check
- **ERPNext**: `GET /health/erp` - ERPNext API connectivity check

### Logging
- **Framework**: Python `logging` module
- **Formatters**: Structlog 25.1.0 for structured JSON logging
- **Output**: Console (development), JSON files (production)
- **Levels**: DEBUG, INFO, WARNING, ERROR

### Error Tracking
- **Sentry**: Sentry SDK 2.20.0 (for FastAPI)
  - Error tracking and performance monitoring
  - Environment variable: `SENTRY_DSN`

---

## 🚀 CI/CD & Deployment

### Containerization
- **Docker**: Multi-container orchestration via Docker Compose 2.0+
- **Services**:
  - Middleware: Custom FastAPI image
  - ERPNext: frappe/erpnext:version-15
  - PostgreSQL: postgres:15-alpine
  - Redis: redis:8.0-alpine
  - Nginx: nginx:alpine (reverse proxy)

### Configuration
- **Docker Compose**: `prod/docker-compose.yml`
- **Environment Variables**: `prod/.env` (template in `prod/.env.production.example`)
- **Nginx**: `prod/nginx/nginx.conf` - Reverse proxy configuration

### CI Pipeline
- **GitHub Actions**: Workflows in `.github/workflows/`
- **Pre-commit Hooks**: `.pre-commit-config.yaml` - Code quality checks
- **Testing**: pytest for backend, Playwright for E2E tests

---

## ⚙️ Environment Configuration

### Required Environment Variables

**Database & Caching:**
- `CRM_DB_PATH` - SQLite database file path (development)
- `DATABASE_URL` - PostgreSQL connection string (production)
- `REDIS_URL` - Redis connection URL (default: `redis://localhost:6379/0`)

**Messaging Platforms:**
- `TELEGRAM_BOT_TOKEN` - Telegram bot API token
- `TELEGRAM_WEBHOOK_URL` - Webhook URL for Telegram updates
- `TELEGRAM_CHANNEL_ID` - Telegram channel ID for broadcasts
- `VK_ACCESS_TOKEN` - VK API access token
- `VK_GROUP_ID` - VK group ID
- `VK_API_VERSION` - VK API version (default: 5.131)

**ERP Integration:**
- `ERP_API_BASE_URL` - ERPNext instance URL
- `ERP_API_KEY` - ERPNext API key
- `ERP_API_SECRET` - ERPNext API secret
- `ERP_MOCK_MODE` - Enable/disable ERPNext mock mode (default: true)

**Authentication:**
- `JWT_SECRET_KEY` - JWT signing secret (required in production)
- `JWT_ALGORITHM` - JWT algorithm (default: HS256)
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` - Access token lifetime (default: 30)
- `JWT_REFRESH_TOKEN_EXPIRE_DAYS` - Refresh token lifetime (default: 30)
- `ADMIN_SECRET` - Admin secret key
- `ADMIN_BOOTSTRAP_DEFAULT` - Create default admin user (default: true)
- `ADMIN_DEFAULT_USERNAME` - Default admin username (default: admin)
- `ADMIN_DEFAULT_PASSWORD` - Default admin password
- `ADMIN_RECOVERY_SECRET` - Password recovery secret

**Security:**
- `WEBHOOK_SECRET` - Webhook validation secret
- `CORS_ORIGINS` - Allowed CORS origins (default: `http://localhost:5173`)

**Rate Limiting:**
- `RATE_LIMIT_REQUESTS` - Max requests per IP per window (default: 100)
- `RATE_LIMIT_WINDOW_SECONDS` - Rate limit window in seconds (default: 60)
- `RECOVERY_RATE_LIMIT_ATTEMPTS` - Password recovery attempts per window (default: 5)
- `RECOVERY_RATE_LIMIT_WINDOW_SECONDS` - Recovery rate limit window (default: 60)

**Environment:**
- `ENVIRONMENT` - Environment type (development/demo/production)
- `DEBUG_MODE` - Enable debug logging (default: true in development)
- `BASE_WEB_URL` - Base URL for web application (default: `http://localhost:8000`)

---

## 🔗 Webhooks & Callbacks

### Incoming Webhooks

1. **Telegram Webhook**
   - URL: `/webhook/telegram`
   - Method: POST
   - Description: Receives updates from Telegram Bot API
   - Verification: Webhook secret validation

2. **VK Webhook**
   - URL: `/webhook/vk`
   - Method: POST
   - Description: Receives callbacks from VK Callback API
   - Verification: VK signature validation

3. **ERPNext Webhook**
   - URL: `/webhook/pos`
   - Method: POST
   - Description: Receives order webhooks from ERPNext

### Outgoing API Calls

1. **ERPNext API**
   - Purpose: Order synchronization, inventory management
   - Endpoints: `/api/method/loyalty`, `/api/resource/Item`, `/api/resource/Sales Order`

2. **Telegram Bot API**
   - Purpose: Sending messages, media, and updates to users
   - Endpoints: Various (via aiogram library)

3. **VK API**
   - Purpose: Sending messages and updates to VK users
   - Endpoints: Various (via VK API library)

---

## 📄 File Storage

### Local Storage
- **Receipts**: Generated PDFs stored in `middleware/receipts/` directory
- **Reports**: Test and metrics reports in `middleware/reports/` directory
- **Logs**: Application logs in `middleware/logs/` directory (production)

### Volumes (Docker)
- **Middleware Receipts**: `middleware-receipts` Docker volume
- **Middleware Logs**: `middleware-logs` Docker volume
- **ERPNext Sites**: `sites` Docker volume for ERPNext site data

---

## 🧪 Testing Integrations

### Test Databases
- **SQLite**: Test database at `middleware/test_crm.db`
- **Redis**: fakeredis for in-memory Redis testing

### Mock Services
- **ERPNext Mock**: `ERP_MOCK_MODE=true` provides mock responses
- **Telegram Mock**: Custom mock for Telegram Bot API
- **VK Mock**: Custom mock for VK API

---

## 📞 Support & Troubleshooting

### Common Integration Issues

1. **Telegram Bot Not Responding**
   - Check `TELEGRAM_BOT_TOKEN` validity
   - Verify webhook configuration
   - Check Redis connection

2. **ERPNext Sync Failures**
   - Verify ERP credentials (`ERP_API_KEY`, `ERP_API_SECRET`)
   - Check ERPNext instance accessibility
   - Enable `ERP_MOCK_MODE` for debugging

3. **VK Integration Errors**
   - Check `VK_ACCESS_TOKEN` validity
   - Verify VK group permissions
   - Check callback URL configuration

4. **Database Connection Issues**
   - Verify `CRM_DB_PATH` or `DATABASE_URL`
   - Check file permissions for SQLite
   - Verify PostgreSQL service status

---

_Integration audit: 2026-03-02_
