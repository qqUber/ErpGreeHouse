# 🚀 Telegram CRM MVP + ERPNext Loyalty Integration

> **Modern Customer Relationship Management System with Telegram Integration and ERPNext Loyalty Program**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com/)
[![aiogram](https://img.shields.io/badge/aiogram-3.13+-blue.svg)](https://docs.aiogram.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

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
| **Middleware** | Python 3.11, FastAPI, aiogram | Async Telegram bot and API |
| **Worker** | Celery, Redis | Background task processing |
| **Integration** | Python, httpx, REST API | ERPNext integration with mock mode |
| **Database** | PostgreSQL | Primary data storage |
| **Cache** | Redis | Session management, caching |
| **Testing** | pytest, pytest-asyncio | Unit and integration tests |

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Redis 6.0+
- PostgreSQL 12+
- Telegram Bot Token
- ERPNext Instance (optional, mock mode available)
- Telegram Bot Token
- ERPNext Instance (optional, mock mode available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/qqUber/ErpGreeHouse.git
   cd ErpGreeHouse
   ```

2. **Set up Python environment**
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # Linux/Mac
   # or
   venv\Scripts\activate  # Windows
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```
   # Cross-platform setup
   bash setup_test_env.sh  # Linux/Mac
   # or
   powershell -ExecutionPolicy Bypass -File setup_test_env.ps1  # Windows
   
   # Run tests
   bash run_tests.sh  # Linux/Mac
   # or
   powershell -ExecutionPolicy Bypass -File run_tests.ps1  # Windows
5. **Run tests**
   ```bash
   # Cross-platform setup
   bash setup_test_env.sh  # Linux/Mac
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
