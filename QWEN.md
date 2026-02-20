# 📚 ErpGreeHouse Project Context Guide

This document provides comprehensive context about the ErpGreeHouse project for future interactions with Qwen Code.

## 🏗️ Project Overview

**Telegram CRM MVP + ERPNext Loyalty Integration** is a modern Customer Relationship Management system that integrates Telegram messaging with ERPNext through a comprehensive loyalty program.

### Core Purpose
- Provide seamless customer registration, order processing, and loyalty point management
- Integrate Telegram bot functionality with ERPNext backend system
- Ensure compliance with Russian data protection law (152-FZ)
- Support high-performance operations (1000+ concurrent users)

### Technology Stack
| Component | Technology | Version |
|-----------|------------|---------|
| **Backend** | Python, FastAPI, aiogram | 3.14+, 0.129.0, 3.25.0 |
| **Frontend** | React, TypeScript, Vite | 18.3.1, 5.9.3, 5.4.21 |
| **Database** | SQLite (dev), PostgreSQL (prod) | 15+ |
| **Cache/Queue** | Redis | 7+ |
| **Worker** | Celery, Redis | 5.4.0, 5.0.8 |
| **Integration** | httpx, REST API | 0.27.2 |

## 📁 Directory Structure

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
├── scripts/             # Вспомогательные скрипты
├── .gitignore
├── .pre-commit-config.yaml
├── ARCHITECTURE.md
├── CHANGELOG.md
├── CI_REPORT.md
├── LICENSE
├── README.md
├── SECURITY.md
└── QWEN.md              # This file
```

## 🚀 Development Environment Setup

### Prerequisites
- Python 3.11+ (recommended 3.14)
- Node.js 18+
- Redis / Memurai (Windows)
- SQLite (built into Python)

### Backend Setup (middleware)
```bash
cd middleware
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
python -m app.main
```

### Frontend Setup (admin-ui)
```bash
cd admin-ui
npm install
npm run dev
```

### Testing Environment
Cross-platform test setup scripts:
- `setup_test_env.sh` (Linux/Mac)
- `setup_test_env.ps1` (Windows)
- `run_tests.sh` (Linux/Mac)
- `run_tests.ps1` (Windows)

## 🧪 Testing Framework

### Test Categories
- **Unit Tests**: Core business logic testing (`pytest`)
- **Integration Tests**: API endpoints testing
- **E2E Tests**: Critical user journeys testing (`Playwright`)
- **Load Tests**: Concurrent users support
- **Security Tests**: OWASP compliance (`bandit`, `safety`)

### Test Execution
```bash
# Setup environment (cross-platform)
bash setup_test_env.sh  # Linux/Mac
powershell -ExecutionPolicy Bypass -File setup_test_env.ps1  # Windows

# Run full test suite
bash run_tests.sh  # Linux/Mac
powershell -ExecutionPolicy Bypass -File run_tests.ps1  # Windows
```

## 🔧 Configuration & Environment Variables

### Key Environment Variables
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
DEBUG_MODE=true             # Enable debug logging
TEST_MODE=false             # Enable test mode features
MOCK_MODE=true              # Use mock responses
ENABLE_RATE_LIMITING=true   # Enable rate limiting
ENABLE_JWT_AUTH=true        # Enable JWT authentication
LOG_REQUESTS=true          # Log all requests
```

## 🛡️ Security Practices

### Current Security Features
- **152-FZ Compliance**: Russian data protection law compliance
- **Rate Limiting**: Protection against abuse
- **Input Validation**: SQL injection and XSS prevention
- **JWT Authentication**: Secure API access
- **Webhook Validation**: Telegram webhook verification
- **Mock Mode**: Safe development without real ERPNext

### Security Scanning
```bash
# From middleware directory
cd middleware
bandit -r app/      # Security vulnerability scanning
safety check        # Dependency vulnerability checking
```

### Pre-commit Hooks
The project uses pre-commit hooks for code quality:
- Trailing whitespace removal
- End-of-file fixer
- YAML/JSON/TOML validation
- Black formatting (Python)
- isort imports (Python)
- flake8 linting (Python)
- bandit security scanning (Python)

## 📈 Architecture Overview

### System Architecture
```mermaid
graph TD
    A[Telegram Bot] --> B[FastAPI Middleware]
    B --> C[Redis Cache]
    B --> D[ERPNext API]
    B --> E[Celery Worker]
    E --> F[PostgreSQL Database]
```

### Development vs Production
- **Development**: `middleware/` + `admin-ui/` (native execution, SQLite, Redis)
- **Production**: `prod/` (Docker, PostgreSQL, Nginx, SSL)

## 📚 Documentation Structure

```
docs/
├── architecture/          # System architecture and design
├── plans/                # Development plans and roadmaps
├── testing/              # Testing strategies and reports
└── pre-commit-checklist.md # Code review checklist
```

### Key Documents
- **System Architecture**: `docs/architecture/system_architecture.md`
- **Development Plan**: `docs/plans/development_plan.md`
- **MVP Scope**: `docs/plans/mvp_scope.md`
- **Testing Strategy**: `docs/plans/testing_strategy.md`
- **Test Report**: `docs/testing/test_report.html`

## 🚀 Deployment Options

### Development Deployment
```bash
# Backend
cd middleware
python -m app.main

# Frontend
cd admin-ui
npm run dev
```

### Production Deployment (Docker)
```bash
cd prod
cp .env.production.example .env
# Edit .env with secrets
docker compose up -d
```

### Health Checks
- Application: `GET /health`
- Database: `GET /health/db`
- Redis: `GET /health/redis`
- ERPNext: `GET /health/erp`

## 🤝 Contribution Guidelines

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes following coding standards
4. Run tests: Ensure all tests pass
5. Submit PR with descriptive title and description

### Code Standards
- **Python**: PEP 8 compliance, Black formatting, isort imports
- **Testing**: Minimum 80% coverage, pytest for async code
- **Documentation**: Update relevant docs in `/docs`
- **Pre-commit**: All hooks must pass before commit

### Definition of Done
- [Definition of Done](docs/definition-of-done.md) must be followed
- CI/CD workflows in [GitHub Actions](docs/ci-cd.md)

## 📞 Support & Troubleshooting

### Common Issues
| Issue | Solution |
|-------|----------|
| Bot not responding | Check TELEGRAM_BOT_TOKEN and webhook configuration |
| Database connection failed | Verify DATABASE_URL and PostgreSQL service |
| Redis connection error | Check REDIS_URL and Redis service status |
| ERPNext API errors | Verify ERP credentials or enable ERP_MOCK_MODE |
| Tests failing | Run setup scripts and check dependencies |

### Getting Help
- **Documentation**: Check `/docs` directory first
- **Issues**: Create GitHub issue with detailed description
- **Discussions**: Use GitHub Discussions for questions

## 📄 License
MIT License - see [LICENSE](LICENSE) file for details

## 📅 Project Status
- **Version**: 1.0.0
- **Status**: Development Ready
- **Last Updated**: February 17, 2026

---
*This QWEN.md file was generated on February 20, 2026, to provide contextual information for future interactions with the ErpGreeHouse project.*