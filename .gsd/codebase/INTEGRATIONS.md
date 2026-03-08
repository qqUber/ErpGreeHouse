# INTEGRATIONS.md - External Dependencies and Integrations

## Overview

ErpGreeHouse integrates with several external services and APIs to provide its core functionality. This document describes the key integrations, how they're configured, and how they interact with the system.

## Core Integrations

### 1. Telegram Bot API

**Purpose**: Provide seamless user interaction through Telegram messaging.

**Integration Point**: `middleware/app/handlers.py`

**Key Features**:
- Telegram bot commands handling
- User registration and authentication via Telegram
- Order processing and status updates
- Loyalty points management
- Webhook integration for real-time updates

**Configuration**:
```bash
# .env file
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook
```

**Technology**: aiogram 3.25.0

### 2. ERPNext

**Purpose**: Enterprise Resource Planning integration for order management and loyalty programs.

**Integration Point**: `middleware/app/integrations/`

**Key Features**:
- Customer synchronization
- Order creation and management
- Loyalty points integration
- Product catalog synchronization
- Mock mode for development without real ERPNext instance

**Configuration**:
```bash
# .env file
ERP_API_BASE_URL=https://your-erpnext.com
ERP_API_KEY=your_api_key
ERP_API_SECRET=your_api_secret
ERP_MOCK_MODE=true  # Use mock responses for development
```

**Technology**: frappe-client (ERPNext Python client)

**API Endpoints**:
- `/api/method/frappe.client.get_list` - Get documents list
- `/api/method/frappe.client.get` - Get single document
- `/api/method/frappe.client.insert` - Create document
- `/api/method/frappe.client.update` - Update document

### 3. PostgreSQL Database

**Purpose**: Production data storage for customer information, orders, and loyalty data.

**Integration Point**: `middleware/app/db.py`

**Key Features**:
- Customer profile storage
- Order history tracking
- Loyalty points management
- Transaction logging

**Configuration**:
```bash
# .env file
DATABASE_URL=postgresql://user:pass@localhost/telegram_crm
```

**Technology**: psycopg2 (PostgreSQL adapter for Python)

### 4. Redis

**Purpose**: Cache and session management, task queue for Celery.

**Integration Point**: `middleware/app/config.py`, `middleware/app/worker.py`

**Key Features**:
- Session management
- Cache for frequently accessed data
- Task queue for background processing
- Rate limiting

**Configuration**:
```bash
# .env file
REDIS_URL=redis://localhost:6379/0
```

**Technology**: redis-py ≥7.2.0

### 5. Celery

**Purpose**: Background task processing.

**Integration Point**: `middleware/app/worker.py`

**Key Features**:
- Asynchronous task execution
- Periodic tasks via Celery Beat
- Task retry and error handling

**Configuration**:
```bash
# .env file
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/1
```

**Technology**: Celery 5.6.2

### 6. Prometheus

**Purpose**: Metrics collection and monitoring.

**Integration Point**: `middleware/app/main.py`

**Key Features**:
- Application metrics (request count, response time)
- Database connection pool metrics
- Redis connection metrics
- Task queue metrics

**Configuration**:
```bash
# .env file
PROMETHEUS_ENABLED=true
```

**Technology**: prometheus-client 0.20.0

## Development Integrations

### SQLite

**Purpose**: Local development database.

**Integration Point**: `middleware/app/db.py`

**Configuration**:
```bash
# .env file
DATABASE_URL=sqlite:///./crm.db
```

### Memurai (Windows)

**Purpose**: Redis-compatible cache for Windows development.

**Configuration**:
```bash
# .env file
REDIS_URL=redis://localhost:6379/0
```

## External APIs and Services

### 1. Telegram Webhook

**URL**: `/webhook`

**Purpose**: Receive real-time updates from Telegram.

**Security**: Webhook secret verification.

### 2. ERPNext API

**Base URL**: `https://your-erpnext.com/api/method/`

**Endpoints Used**:
- `frappe.client.get_list` - Get document list
- `frappe.client.get` - Get single document
- `frappe.client.insert` - Create document
- `frappe.client.update` - Update document
- `frappe.client.delete` - Delete document

### 3. Health Check Endpoints

**URLs**:
- `/health` - Application health check
- `/health/db` - Database health check
- `/health/redis` - Redis health check
- `/health/erp` - ERPNext health check

**Purpose**: Monitoring and readiness probes.

## Integration Modes

### Mock Mode

**Purpose**: Development without real external services.

**Configuration**:
```bash
# .env file
ERP_MOCK_MODE=true
MOCK_MODE=true
```

**Features**:
- Mock ERPNext responses
- In-memory data storage
- No external API calls

### Production Mode

**Purpose**: Live environment with real external services.

**Configuration**:
```bash
# .env file
ERP_MOCK_MODE=false
MOCK_MODE=false
DEBUG_MODE=false
```

**Features**:
- Real ERPNext API calls
- PostgreSQL database
- Redis cache
- Production logging

## Security Considerations

### API Keys and Secrets

All API keys and secrets are stored in environment variables:
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `ERP_API_KEY` - ERPNext API key
- `ERP_API_SECRET` - ERPNext API secret
- `JWT_SECRET_KEY` - JWT token signing secret
- `WEBHOOK_SECRET` - Telegram webhook secret

### Rate Limiting

**Configuration**:
```bash
# .env file
MAX_CONCURRENT_REQUESTS=100
RATE_LIMIT_PER_MINUTE=60
```

### Input Validation

All API endpoints validate inputs using Pydantic models.

### CORS

**Configuration**:
```bash
# .env file
CORS_ORIGINS=http://localhost:5173,https://your-domain.com
```

## Error Handling

### Circuit Breaker

**Purpose**: Prevent cascading failures from external services.

**Configuration**:
```bash
# .env file
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=300  # 5 minutes
```

**Technology**: circuitbreaker 2.1.3

### Retry Logic

All external API calls have configurable retry logic.

## Monitoring and Logging

### Logging

**Configuration**:
```bash
# .env file
LOG_LEVEL=INFO
LOG_FILE=backend.log
```

**Log Rotation**: Daily log rotation with 7-day retention.

### Metrics

**Prometheus Metrics**:
- `http_request_duration_seconds` - Request duration histogram
- `http_requests_total` - Request count by method and status
- `db_connections_total` - Database connection count
- `redis_connections_total` - Redis connection count
- `celery_tasks_total` - Celery task count by state