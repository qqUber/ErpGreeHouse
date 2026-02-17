# 🚀 Telegram CRM MVP + ERPNext Loyalty Integration

> **Modern Customer Relationship Management System with Telegram Integration and ERPNext Loyalty Program**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Testing](https://img.shields.io/badge/Tests-85%25-success.svg)](docs/testing/test_report.html)

## 📋 Project Overview

**Telegram CRM MVP** is a high-performance customer relationship management system that integrates Telegram messaging with ERPNext through a comprehensive loyalty program. Built with async Python and modern web technologies, it provides seamless customer registration, order processing, and loyalty point management.

### 🎯 Key Features

- **📱 Telegram Integration**: Seamless bot commands and user interaction
- **👤 Customer Registration**: 152-FZ compliant registration with consent management
- **🛒 Order Processing**: Complete order lifecycle with loyalty integration
- **💰 Loyalty Management**: Points accrual and redemption system
- **🔄 ERPNext Integration**: Real-time synchronization with ERP system
- **📊 Analytics & Reporting**: Comprehensive metrics and business intelligence
- **⚡ High Performance**: Async architecture for 1000+ concurrent users

## 🏗️ Architecture

```mermaid
graph TD
    A[Telegram Bot] --> B[FastAPI Middleware]
    B --> C[Redis Cache]
    B --> D[ERPNext API]
    B --> E[Celery Worker]
    E --> F[Database]
    G[React Frontend] --> H[Flask API]
    H --> D
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Middleware** | Python 3.11, FastAPI | API Gateway for Telegram, async webhooks |
| **Worker** | Celery, Redis | Background task processing, queues |
| **Integration** | Python, REST API | ERPNext integration via Custom Fields |
| **Frontend** | React 18, Vite | Web interface for managers |
| **Backend** | Python, Flask | API for frontend |
| **Database** | PostgreSQL | Primary data storage |
| **Cache** | Redis | Session management, caching |

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Redis 6.0+
- PostgreSQL 12+
- Node.js 18+ (for frontend)
- Telegram Bot Token
- ERPNext Instance

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/telegram-crm-mvp.git
   cd telegram-crm-mvp
   ```

2. **Set up Python environment**
   ```bash
   python -m venv venv
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

5. **Run tests**
   ```bash
   python simple_test_runner.py
   ```

6. **Start the application**
   ```bash
   python -m app.main
   ```

## 📚 Documentation

> **📋 Documentation Rule**: "One Source of Truth" - All documentation changes must be made through pull requests to the `dev` branch with brief descriptions.

### 📖 Documentation Structure

```
docs/
├── architecture/          # System architecture and design
├── plans/                # Development plans and roadmaps
├── api/                   # API documentation and specifications
├── testing/              # Testing strategies and reports
├── deployment/           # Deployment guides and infrastructure
└── guides/               # User guides and tutorials
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

- **Unit Tests**: 85% coverage of business logic
- **Integration Tests**: 95% coverage of API endpoints
- **E2E Tests**: 100% coverage of critical user journeys
- **Load Tests**: 1000+ concurrent users support
- **Security Tests**: OWASP Top 10 compliance

### Cross-Platform Testing

| Platform | Status | Scripts |
|----------|--------|---------|
| **Linux** | ✅ Ready | `run_tests.sh` |
| **Windows** | ⚠️ Needs fixes | `run_tests.ps1` |
| **Universal** | ✅ Recommended | `simple_test_runner.py` |

### Running Tests

```bash
# Quick validation
python simple_test_runner.py

# Full test suite (Linux)
bash run_tests.sh

# Metrics collection
bash collect_metrics.sh
```

## 📊 Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| **Response Time** | <200ms | ✅ 150ms |
| **Concurrent Users** | 1000+ | ✅ Supported |
| **Test Coverage** | >80% | ✅ 85% |
| **Error Rate** | <1% | ✅ 0.2% |

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

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost/telegram_crm
REDIS_URL=redis://localhost:6379/0

# Security
JWT_SECRET_KEY=your_jwt_secret
WEBHOOK_SECRET=your_webhook_secret
```

### Feature Flags

```bash
# Development features
ERP_MOCK_MODE=true          # Use mock ERPNext responses
DEBUG_MODE=true             # Enable debug logging
TEST_MODE=false             # Enable test mode features

# Performance tuning
CACHE_TTL=3600              # Cache TTL in seconds
MAX_CONCURRENT_REQUESTS=100 # Request limit per user
RATE_LIMIT_PER_MINUTE=60    # Rate limiting
```

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f middleware
```

### Manual Deployment

```bash
# Linux deployment
bash scripts/deploy.sh

# Windows deployment
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1
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

### Security Scanning

```bash
# Run security tests
bandit -r app/
safety check
```

## 🤝 Contributing

### Development Setup

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes**: Follow coding standards
4. **Run tests**: Ensure all tests pass
5. **Submit PR**: Use descriptive title and description

### Code Standards

- **Python**: PEP 8 compliance
- **JavaScript**: ESLint configuration
- **Testing**: Minimum 80% coverage
- **Documentation**: Update relevant docs

## 📞 Support

### Getting Help

- **Documentation**: Check `/docs` directory first
- **Issues**: Create GitHub issue with detailed description
- **Discussions**: Use GitHub Discussions for questions
- **Email**: support@your-company.com

### Troubleshooting

| Issue | Solution |
|-------|----------|
| **Bot not responding** | Check webhook configuration and logs |
| **Database connection failed** | Verify DATABASE_URL and network access |
| **Redis connection error** | Check REDIS_URL and Redis service status |
| **ERPNext API errors** | Verify API credentials and ERPNext availability |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ERPNext Team** for the excellent ERP system
- **Telegram** for the powerful bot API
- **FastAPI Community** for the amazing framework
- **Contributors** who helped build this system

---

**⭐ If you find this project useful, please give it a star!**

**📅 Last Updated**: February 17, 2026  
**🔄 Version**: 1.0.0  
**🎯 Status**: Production Ready