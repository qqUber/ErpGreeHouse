# 🚀 Telegram CRM MVP + ERPNext Loyalty Integration

> **Modern Customer Relationship Management System with Telegram Integration and Loyalty Program**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.129+-green.svg)](https://fastapi.tiangolo.com/)
[![aiogram](https://img.shields.io/badge/aiogram-3.25+-blue.svg)](https://docs.aiogram.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ⚡ Быстрый старт (Разработка)

### 1. Подготовка

```bash
# Backend
cd middleware
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt

# Frontend
cd ../admin-ui
npm install
```

### 2. Запуск

```bash
# Terminal 1 - Backend (порт 8000)
cd middleware
.\.venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend (сборка)
cd admin-ui
npm run build
# Frontend будет доступен на http://localhost:8000/admin/
```

### 3. Доступ

- **Admin UI**: http://localhost:8000/admin/
- **API Docs**: http://localhost:8000/docs
- **Login**: admin / admin

### 4. Тесты

```bash
cd middleware
.\.venv\Scripts\activate
pip install pytest pytest-asyncio pytest-cov
python -m pytest tests/unit/ -v
```

---

## 📁 Структура проекта

```
ErpGreeHouse/
├── middleware/          # Backend (FastAPI + aiogram) - разработка
├── admin-ui/            # Frontend (React + TypeScript) - разработка
├── prod/                # Production конфигурация
│   ├── docker-compose.yml
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.production.example
├── docs/                # Документация
└── scripts/             # Вспомогательные скрипты
```

**Разработка vs Production:**
- **`middleware/` + `admin-ui/`** — для локальной разработки (без Docker, нативный запуск)
- **`prod/`** — для production развёртывания (Docker, PostgreSQL, Nginx, SSL)

## 📋 Project Overview

**Telegram CRM MVP** is a high-performance customer relationship management system that integrates Telegram messaging with ERPNext through a comprehensive loyalty program. Built with async Python and modern web technologies, it provides seamless customer registration, order processing, and loyalty point management.

### 🎯 Key Features

- **📱 Telegram Integration**: Seamless bot commands and user interaction
- **👤 Customer Registration**: 152-FZ compliant registration with consent management
- **🛒 Order Processing**: Complete order lifecycle with loyalty integration
- **💰 Loyalty Management**: Points accrual and redemption system
- **🔄 ERPNext Integration**: Real-time synchronization with ERP system (with mock mode)
- **⚡ High Performance**: Async architecture for 1000+ concurrent users
- **🛡️ Security**: Rate limiting, input validation, JWT authentication

## 🏗️ Architecture

```mermaid
graph TD
    A[Telegram Bot] --> B[FastAPI Middleware]
    B --> C[Redis Cache]
    B --> D[ERPNext API]
    B --> E[Celery Worker]
    E --> F[PostgreSQL Database]
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Middleware (Dev)** | Python 3.14, FastAPI, aiogram | Async Telegram bot and API |
| **Worker** | Celery, Redis | Background task processing |
| **Integration** | Python, httpx, REST API | ERPNext integration with mock mode |
| **Database (Dev)** | SQLite | Local development |
| **Database (Prod)** | PostgreSQL 15 | Production data storage |
| **Cache** | Redis 7 | Session management, caching |
| **Frontend** | React 18, TypeScript, Vite | Admin UI |
| **Testing** | pytest, Playwright | Unit, integration, E2E tests |

## 🚀 Quick Start

### 🔧 Разработка (локально, без Docker)

**Предварительные требования:**
- Python 3.11+ (рекомендуется 3.14)
- Redis / Memurai (Windows)
- Node.js 18+
- SQLite (встроен в Python)

**Быстрый старт:**

```bash
# 1. Backend (middleware)
cd middleware
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
python -m app.main

# 2. Frontend (admin-ui)
cd admin-ui
npm install
npm run dev

# 3. Проверка
# Backend: http://localhost:8000/health
# Frontend: http://localhost:5173
```

📖 **Подробная инструкция**: [middleware/DEPLOYMENT.md](middleware/DEPLOYMENT.md)

---

### 🚀 Production (Docker)

**Предварительные требования:**
- Docker 20.10+
- Docker Compose 2.0+
- Linux server (Ubuntu 20.04+)

**Быстрый старт:**

```bash
cd prod

# 1. Создать .env файл
cp .env.production.example .env

# 2. Отредактировать секреты
nano .env

# 3. Запустить стек
docker compose up -d

# 4. Проверить статус
docker compose ps
```

📖 **Подробная инструкция**: [prod/README.md](prod/README.md)

---

## 🔐 JWT Authentication Configuration

This section covers JWT authentication setup, environment variables, and troubleshooting for the Admin UI and API.

### Environment Variables

Configure the following environment variables in your `.env` file (see [`middleware/.env.example`](middleware/.env.example)):

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET_KEY` | Main secret key for signing tokens | Required (auto-generated in dev) |
| `JWT_ALGORITHM` | Signing algorithm | `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime | `30` minutes |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime | `30` days |

Example `.env` configuration:
```bash
# JWT Authentication
JWT_SECRET_KEY=your-secure-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

# Development mode (auto-generates JWT_SECRET_KEY if not set)
ENVIRONMENT=development
```

### Quick Start for Development

#### Option 1: Using start_dev.ps1 Script (Recommended for Windows)

```powershell
# From project root
cd middleware
.\start_dev.ps1
```

This script automatically:
- Creates `.env` file if missing
- Sets `ENVIRONMENT=development`
- Installs dependencies
- Starts the backend server

#### Option 2: Manual Setup

```bash
# Set environment variable
# Windows (PowerShell)
$env:ENVIRONMENT="development"

# Windows (CMD)
set ENVIRONMENT=development

# Linux/Mac
export ENVIRONMENT=development

# Start the server
cd middleware
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

In development mode (`ENVIRONMENT=development`):
- JWT secret key is auto-generated if not provided
- Debug logging is enabled
- CORS is more permissive

### Troubleshooting

#### Common 401 Errors and Causes

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Token expired | Wait for auto-refresh or re-login |
| `401 Invalid token` | Malformed JWT | Clear cookies and re-login |
| `401 Signature verification failed` | JWT_SECRET mismatch | See below |
| `401 Token has been revoked` | Logged out elsewhere | Re-login |

#### How to Clear Cookies/Cache

**Browser:**
1. Open DevTools (F12)
2. Go to Application → Cookies
3. Delete `access_token` and `refresh_token` cookies
4. Refresh the page

**Programmatically (API):**
```bash
# Call logout to clear tokens
curl -X POST http://localhost:8000/api/v1/auth/logout
```

#### JWT_SECRET Mismatch Issue

**Problem:** You get `401 Signature verification failed` errors after:
- Restarting the server
- Switching between branches
- Deploying to a new environment

**Causes:**
1. Server restarted without preserving the secret key
2. Different `JWT_SECRET_KEY` values across instances
3. Browser has old token from previous server instance

**Solutions:**

```bash
# Option 1: Set a consistent JWT_SECRET_KEY in .env
JWT_SECRET_KEY=my-consistent-secret-key-do-not-change

# Option 2: Clear tokens and re-login
# 1. Clear browser cookies
# 2. Restart the server with the same JWT_SECRET_KEY
# 3. Re-login

# Option 3: For development, use ENVIRONMENT=development
# This provides a consistent deterministic secret based on a seed
```

### Token Flow

```
┌─────────┐    ┌──────────────┐    ┌─────────────────┐
│  Login  │───▶│ Generate     │───▶│ Set cookies:    │
│ /login  │    │ Tokens       │    │ - access_token  │
└─────────┘    └──────────────┘    │ - refresh_token │
                                   └─────────────────┘
                                         │
                                         ▼
┌─────────┐    ┌──────────────┐    ┌─────────────────┐
│  API    │◀───│ Validate     │◀───│ Include token   │
│ Request │    │ JWT          │    │ in Authorization│
└─────────┘    └──────────────┘    └─────────────────┘
      │
      │ (if expired)
      ▼
┌─────────┐    ┌──────────────┐    ┌─────────────────┐
│ Refresh │───▶│ Validate     │───▶│ Generate new    │
│ /refresh│    │ Refresh      │    │ Access token    │
└─────────┘    └──────────────┘    └─────────────────┘
      │
      │ (on logout or invalid)
      ▼
┌─────────┐    ┌──────────────┐    ┌─────────────────┐
│ Logout  │───▶│ Blacklist    │───▶│ Clear cookies   │
│ /logout │    │ Tokens       │    │ (access/refresh)│
└─────────┘    └──────────────┘    └─────────────────┘
```

**Flow Steps:**
1. **Login**: User authenticates → Server generates access + refresh tokens → Tokens stored in HTTP-only cookies
2. **Token Generation**: Access token (short-lived, 30min) + Refresh token (long-lived, 30 days)
3. **Refresh**: When access token expires, client uses refresh token to get new access token (automatic)
4. **Logout**: Tokens are blacklisted and cookies are cleared

---

### 🧪 Тестирование

```bash
# Cross-platform setup
bash setup_test_env.sh  # Linux/Mac
powershell -ExecutionPolicy Bypass -File setup_test_env.ps1  # Windows

# Run tests
bash run_tests.sh  # Linux/Mac
powershell -ExecutionPolicy Bypass -File run_tests.ps1  # Windows
```

### Admin UI (dev)

1. **Build Admin UI**
   ```bash
   cd admin-ui
   npm install
   npm run build
   ```

2. **Open**
   - http://localhost:8000/

3. **Login options**
   - **Login/password (dev bootstrap)**: values are taken from `middleware/.env` (see `middleware/.env.example`)
     - `ADMIN_DEFAULT_USERNAME` (default: `admin`)
     - `ADMIN_DEFAULT_PASSWORD` (default in example: `ChangeMe123!`)
   - **Key-based**: send `x-admin-secret` equal to `ADMIN_SECRET`

4. **Password recovery (dev)**
   - Call `POST /api/v1/public/auth/recover` with header `x-admin-recovery: ADMIN_RECOVERY_SECRET`

## 📚 Documentation

> **📋 Documentation Rule**: "One Source of Truth" - All documentation changes must be made through pull requests to the `dev` branch with brief descriptions.

### 📖 Documentation Structure

```
docs/
├── architecture/          # System architecture and design
├── plans/                # Development plans and roadmaps
├── testing/              # Testing strategies and reports
└── pre-commit-checklist.md # Code review checklist
```

### 🎯 Key Documents

- **[📐 System Architecture](docs/architecture/system_architecture.md)** - Core system design and architecture
- **[📊 Development Plan](docs/plans/development_plan.md)** - Comprehensive development roadmap
- **[🎯 MVP Scope](docs/plans/mvp_scope.md)** - MVP features and requirements
- **[🧪 Testing Strategy](docs/plans/testing_strategy.md)** - Testing approach and validation
- **[📈 Test Report](docs/testing/test_report.html)** - Latest testing results

### 🔀 Documentation Workflow

1. **Create feature branch**: `git checkout -b docs/update-api-endpoints`
2. **Make changes**: Edit files in `/docs/` directory only
3. **Submit PR**: Use title `docs: brief description of changes`
4. **Review & merge**: Changes merged to `dev` branch

**🚫 Prohibited:**
- Direct commits to `main` branch
- Editing without PR to `dev` branch
- Creating duplicate documents
- Storing local drafts in repository

## 🧪 Testing

### Test Categories

- **Unit Tests**: Core business logic testing
- **Integration Tests**: API endpoints testing
- **E2E Tests**: Critical user journeys testing
- **Load Tests**: Concurrent users support
- **Security Tests**: OWASP compliance

### Cross-Platform Testing

| Platform | Status | Scripts |
|----------|--------|---------|
| **Linux** | ✅ Ready | `setup_test_env.sh`, `run_tests.sh` |
| **Windows** | ✅ Ready | `setup_test_env.ps1`, `run_tests.ps1` |
| **Metrics** | ✅ Ready | `collect_metrics.sh` |

### Running Tests

```bash
# Setup environment (cross-platform)
bash setup_test_env.sh  # Linux/Mac
powershell -ExecutionPolicy Bypass -File setup_test_env.ps1  # Windows

# Run full test suite
bash run_tests.sh  # Linux/Mac
powershell -ExecutionPolicy Bypass -File run_tests.ps1  # Windows

# Collect metrics
bash collect_metrics.sh  # Linux/Mac
```

## 📊 Performance Metrics

| Metric | Target | Status |
|--------|--------|---------|
| **Response Time** | <200ms | ✅ Implemented |
| **Concurrent Users** | 1000+ | ✅ Supported |
| **Async Processing** | Non-blocking | ✅ With Celery |
| **Error Rate** | <1% | ✅ Target set |

## 🔧 Configuration

### Environment Variables

```bash
# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook

# ERPNext Configuration
ERP_API_BASE_URL=https://your-erpnext.com
ERP_API_KEY=your_api_key
ERP_API_SECRET=your_api_secret
ERP_MOCK_MODE=true          # Use mock ERPNext responses for development

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost/telegram_crm
REDIS_URL=redis://localhost:6379/0

# Security
JWT_SECRET_KEY=your_jwt_secret
WEBHOOK_SECRET=your_webhook_secret

# Performance tuning
CACHE_TTL=3600              # Cache TTL in seconds
MAX_CONCURRENT_REQUESTS=100 # Request limit per user
RATE_LIMIT_PER_MINUTE=60    # Rate limiting
```

### Feature Flags

```bash
# Development features
DEBUG_MODE=true             # Enable debug logging
TEST_MODE=false             # Enable test mode features
MOCK_MODE=true              # Use mock responses

# Security features
ENABLE_RATE_LIMITING=true   # Enable rate limiting
ENABLE_JWT_AUTH=true        # Enable JWT authentication
LOG_REQUESTS=true          # Log all requests
```

## 🚀 Deployment

### Docker Deployment (Full Stack)

```bash
# Start complete infrastructure (includes ERPNext)
docker-compose up -d

# Start only middleware services
docker-compose -f docker-compose.infrastructure.yml up -d

# View logs
docker-compose logs -f middleware
```

### Manual Deployment (Middleware Only)

```bash
# Linux/Mac deployment
cd middleware
bash setup_test_env.sh
bash run_tests.sh
python -m app.main

# Windows deployment
cd middleware
powershell -ExecutionPolicy Bypass -File setup_test_env.ps1
powershell -ExecutionPolicy Bypass -File run_tests.ps1
python -m app.main
```

## 📈 Monitoring

### Health Checks

- **Application**: `GET /health`
- **Database**: `GET /health/db`
- **Redis**: `GET /health/redis`
- **ERPNext**: `GET /health/erp`

### Metrics Collection

```bash
# Collect system metrics
bash collect_metrics.sh

# View dashboard
open reports/$(date +%Y%m%d)/dashboard.html
```

## 🔒 Security

### Security Features

- **152-FZ Compliance**: Russian data protection law compliance
- **Rate Limiting**: Protection against abuse
- **Input Validation**: SQL injection and XSS prevention
- **JWT Authentication**: Secure API access
- **Webhook Validation**: Telegram webhook verification
- **Mock Mode**: Safe development without real ERPNext

### Security Scanning

```bash
# Run security tests (from middleware directory)
cd middleware
bandit -r app/
safety check
```

## 🤝 Contributing

Обязательное правило завершения задачи: [Definition of Done](docs/definition-of-done.md).
CI/CD: [GitHub Actions workflows](docs/ci-cd.md).

### Development Setup

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes**: Follow coding standards and pre-commit hooks
4. **Run tests**: Ensure all tests pass
5. **Submit PR**: Use descriptive title and description

### Code Standards

- **Python**: PEP 8 compliance, Black formatting, isort imports
- **Testing**: Minimum 80% coverage, pytest for async code
- **Documentation**: Update relevant docs in `/docs`
- **Pre-commit**: All hooks must pass before commit

### Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit
pre-commit install

# Run all hooks
pre-commit run --all-files
```

## 📞 Support

### Getting Help

- **Documentation**: Check `/docs` directory first
- **Issues**: Create GitHub issue with detailed description
- **Discussions**: Use GitHub Discussions for questions

### Troubleshooting

| Issue | Solution |
|-------|----------|
| **Bot not responding** | Check TELEGRAM_BOT_TOKEN and webhook configuration |
| **Database connection failed** | Verify DATABASE_URL and PostgreSQL service |
| **Redis connection error** | Check REDIS_URL and Redis service status |
| **ERPNext API errors** | Verify ERP credentials or enable ERP_MOCK_MODE |
| **Tests failing** | Run setup scripts and check dependencies |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ERPNext Team** for the excellent ERP system
- **Telegram** for the powerful bot API
- **FastAPI Community** for the amazing async framework
- **aiogram Team** for the modern Telegram bot framework

---

**⭐ If you find this project useful, please give it a star!**

**📅 Last Updated**: February 17, 2026  
**🔄 Version**: 1.0.0  
**🎯 Status**: Development Ready
6. **Start the application**
   ```bash
   python -m app.main
   ```

### Admin UI (dev)

1. **Build Admin UI**
   ```bash
   cd admin-ui
   npm install
   npm run build
   ```

2. **Open**
   - http://localhost:8000/

3. **Login options**
   - **Login/password (dev bootstrap)**: values are taken from `middleware/.env` (see `middleware/.env.example`)
     - `ADMIN_DEFAULT_USERNAME` (default: `admin`)
     - `ADMIN_DEFAULT_PASSWORD` (default in example: `ChangeMe123!`)
   - **Key-based**: send `x-admin-secret` equal to `ADMIN_SECRET`

4. **Password recovery (dev)**
   - Call `POST /api/v1/public/auth/recover` with header `x-admin-recovery: ADMIN_RECOVERY_SECRET`

## 📚 Documentation

> **📋 Documentation Rule**: "One Source of Truth" - All documentation changes must be made through pull requests to the `dev` branch with brief descriptions.

### 📖 Documentation Structure

```
docs/
├── architecture/          # System architecture and design
├── plans/                # Development plans and roadmaps
├── testing/              # Testing strategies and reports
└── pre-commit-checklist.md # Code review checklist
```

### 🎯 Key Documents

- **[📐 System Architecture](docs/architecture/system_architecture.md)** - Core system design and architecture
- **[📊 Development Plan](docs/plans/development_plan.md)** - Comprehensive development roadmap
- **[🎯 MVP Scope](docs/plans/mvp_scope.md)** - MVP features and requirements
- **[🧪 Testing Strategy](docs/plans/testing_strategy.md)** - Testing approach and validation
- **[📈 Test Report](docs/testing/test_report.html)** - Latest testing results

### 🔀 Documentation Workflow

1. **Create feature branch**: `git checkout -b docs/update-api-endpoints`
2. **Make changes**: Edit files in `/docs/` directory only
3. **Submit PR**: Use title `docs: brief description of changes`
4. **Review & merge**: Changes merged to `dev` branch

**🚫 Prohibited:**
- Direct commits to `main` branch
- Editing without PR to `dev` branch
- Creating duplicate documents
- Storing local drafts in repository

## 🧪 Testing

### Test Categories

- **Unit Tests**: Core business logic testing
- **Integration Tests**: API endpoints testing
- **E2E Tests**: Critical user journeys testing
- **Load Tests**: Concurrent users support
- **Security Tests**: OWASP compliance

### Cross-Platform Testing

| Platform | Status | Scripts |
|----------|--------|---------|
| **Linux** | ✅ Ready | `setup_test_env.sh`, `run_tests.sh` |
| **Windows** | ✅ Ready | `setup_test_env.ps1`, `run_tests.ps1` |
| **Metrics** | ✅ Ready | `collect_metrics.sh` |

### Running Tests

```bash
# Setup environment (cross-platform)
bash setup_test_env.sh  # Linux/Mac
powershell -ExecutionPolicy Bypass -File setup_test_env.ps1  # Windows

# Run full test suite
bash run_tests.sh  # Linux/Mac
powershell -ExecutionPolicy Bypass -File run_tests.ps1  # Windows

# Collect metrics
bash collect_metrics.sh  # Linux/Mac
```

## 📊 Performance Metrics

| Metric | Target | Status |
|--------|--------|---------|
| **Response Time** | <200ms | ✅ Implemented |
| **Concurrent Users** | 1000+ | ✅ Supported |
| **Async Processing** | Non-blocking | ✅ With Celery |
| **Error Rate** | <1% | ✅ Target set |

## 🔧 Configuration

### Environment Variables

```bash
# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook

# ERPNext Configuration
ERP_API_BASE_URL=https://your-erpnext.com
ERP_API_KEY=your_api_key
ERP_API_SECRET=your_api_secret
ERP_MOCK_MODE=true          # Use mock ERPNext responses for development

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost/telegram_crm
REDIS_URL=redis://localhost:6379/0

# Security
JWT_SECRET_KEY=your_jwt_secret
WEBHOOK_SECRET=your_webhook_secret

# Performance tuning
CACHE_TTL=3600              # Cache TTL in seconds
MAX_CONCURRENT_REQUESTS=100 # Request limit per user
RATE_LIMIT_PER_MINUTE=60    # Rate limiting
```

### Feature Flags

```bash
# Development features
DEBUG_MODE=true             # Enable debug logging
TEST_MODE=false             # Enable test mode features
MOCK_MODE=true              # Use mock responses

# Security features
ENABLE_RATE_LIMITING=true   # Enable rate limiting
ENABLE_JWT_AUTH=true        # Enable JWT authentication
LOG_REQUESTS=true          # Log all requests
```

## 🚀 Deployment

### Docker Deployment (Full Stack)

```bash
# Start complete infrastructure (includes ERPNext)
docker-compose up -d

# Start only middleware services
docker-compose -f docker-compose.infrastructure.yml up -d

# View logs
docker-compose logs -f middleware
```

### Manual Deployment (Middleware Only)

```bash
# Linux/Mac deployment
cd middleware
bash setup_test_env.sh
bash run_tests.sh
python -m app.main

# Windows deployment
cd middleware
powershell -ExecutionPolicy Bypass -File setup_test_env.ps1
powershell -ExecutionPolicy Bypass -File run_tests.ps1
python -m app.main
```

## 📈 Monitoring

### Health Checks

- **Application**: `GET /health`
- **Database**: `GET /health/db`
- **Redis**: `GET /health/redis`
- **ERPNext**: `GET /health/erp`

### Metrics Collection

```bash
# Collect system metrics
bash collect_metrics.sh

# View dashboard
open reports/$(date +%Y%m%d)/dashboard.html
```

## 🔒 Security

### Security Features

- **152-FZ Compliance**: Russian data protection law compliance
- **Rate Limiting**: Protection against abuse
- **Input Validation**: SQL injection and XSS prevention
- **JWT Authentication**: Secure API access
- **Webhook Validation**: Telegram webhook verification
- **Mock Mode**: Safe development without real ERPNext

### Security Scanning

```bash
# Run security tests (from middleware directory)
cd middleware
bandit -r app/
safety check
```

## 🤝 Contributing

Обязательное правило завершения задачи: [Definition of Done](docs/definition-of-done.md).
CI/CD: [GitHub Actions workflows](docs/ci-cd.md).

### Development Setup

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes**: Follow coding standards and pre-commit hooks
4. **Run tests**: Ensure all tests pass
5. **Submit PR**: Use descriptive title and description

### Code Standards

- **Python**: PEP 8 compliance, Black formatting, isort imports
- **Testing**: Minimum 80% coverage, pytest for async code
- **Documentation**: Update relevant docs in `/docs`
- **Pre-commit**: All hooks must pass before commit

### Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit
pre-commit install

# Run all hooks
pre-commit run --all-files
```

## 📞 Support

### Getting Help

- **Documentation**: Check `/docs` directory first
- **Issues**: Create GitHub issue with detailed description
- **Discussions**: Use GitHub Discussions for questions

### Troubleshooting

| Issue | Solution |
|-------|----------|
| **Bot not responding** | Check TELEGRAM_BOT_TOKEN and webhook configuration |
| **Database connection failed** | Verify DATABASE_URL and PostgreSQL service |
| **Redis connection error** | Check REDIS_URL and Redis service status |
| **ERPNext API errors** | Verify ERP credentials or enable ERP_MOCK_MODE |
| **Tests failing** | Run setup scripts and check dependencies |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ERPNext Team** for the excellent ERP system
- **Telegram** for the powerful bot API
- **FastAPI Community** for the amazing async framework
- **aiogram Team** for the modern Telegram bot framework

---

**⭐ If you find this project useful, please give it a star!**

**📅 Last Updated**: February 17, 2026  
**🔄 Version**: 1.0.0  
**🎯 Status**: Development Ready
