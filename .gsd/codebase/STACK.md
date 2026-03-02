# 📚 Technology Stack

## Project Overview
Telegram CRM MVP + ERPNext Loyalty Integration is a modern customer relationship management system that combines Telegram bot integration with ERPNext for loyalty program management. The system features async architecture for high performance and supports 1000+ concurrent users.

---

## 🐍 Backend (Middleware)

### Core Framework & Language
- **Language**: Python 3.11+ (recommended 3.14)
- **Web Framework**: FastAPI 0.129.0
  - Modern async framework with automatic API docs
  - High performance for concurrent requests
- **Application Server**: Uvicorn 0.41.0
  - ASGI server for FastAPI
- **Async HTTP Client**: httpx 0.28.1, aiohttp 3.13.3

### Telegram Bot Integration
- **aiogram**: 3.25.0
  - Modern async Telegram bot framework
  - Supports both long polling and webhook modes
  - Message handlers and inline queries

### Task Queue & Background Processing
- **Celery**: 5.6.2
  - Distributed task queue for background processing
- **Redis**: ≥7.2.0
  - Broker for Celery tasks
  - Cache for session management
  - Rate limiting storage

### Database
- **Development**: SQLite (built-in)
  - File-based database for local development
- **Production**: PostgreSQL 15
  - Relational database with JSONB support
  - Connection pooling and async support

### Authentication & Security
- **JWT**: PyJWT 2.8.0
  - Access tokens (30min expiry) + refresh tokens (30 days expiry)
  - Token blacklisting for logout
  - Cookie-based storage with HTTP-only flags
- **Password Hashing**: passlib[bcrypt] 1.7.4, bcrypt 4.2.0
- **Email Validation**: email-validator 2.2.0
- **CORS**: FastAPI CORSMiddleware
- **Rate Limiting**: Custom sliding window algorithm with Redis

### Data Validation
- **Pydantic**: 2.10.6
  - Data validation using Python type annotations
- **Pydantic Settings**: 2.7.1
  - Environment variable validation

### ERP Integration
- **ERPNext API**: Custom integration
  - REST API for ERPNext version 15
  - Mock mode for development without real ERPNext

### PDF Generation
- **ReportLab**: 4.3.1
  - PDF generation for receipts and documents

### Logging & Monitoring
- **Structlog**: 25.1.0
  - Structured logging for JSON output
- **Python JSON Logger**: 3.2.1
  - JSON-formatted logging
- **Sentry SDK**: 2.20.0 (for FastAPI)
  - Error tracking and performance monitoring

### Development & Testing
- **pytest**: Test runner
- **pytest-asyncio**: Async test support
- **pytest-cov**: Coverage reporting
- **pytest-html**: HTML reports
- **pytest-mock**: Mocking framework
- **fakeredis**: In-memory Redis for testing

### Code Quality
- **Black**: Code formatter
- **isort**: Import sorter
- **mypy**: Static type checker
- **bandit**: Security linter
- **safety**: Dependency vulnerability scanner
- **pre-commit**: Git hooks

---

## 🖥️ Frontend (Admin UI)

### Framework & Language
- **Language**: TypeScript 5.9.3
- **Framework**: React 19.2.4
- **Build Tool**: Vite 7.3.1
  - Fast development server
  - Optimized production builds

### UI Components & Libraries
- **React DOM**: 19.2.4
- **Telegram Web Apps SDK**: @twa-dev/sdk 8.0.2
  - Integration with Telegram Mini Apps
- **Charts**: Apache ECharts 6.0.0 + echarts-for-react 3.0.6
  - Data visualization
- **QR Codes**: react-qr-code 2.0.18
- **Internationalization**: i18next 25.8.13 + react-i18next 16.5.4
- **Language Detection**: i18next-browser-languagedetector 8.2.1

### Code Quality
- **Biome**: 2.4.4
  - Linting, formatting, and type checking
- **TypeScript**: Type safety and intellisense

### Testing
- **Playwright**: 1.58.2
  - E2E testing with multiple browsers
  - Smoke testing and critical path testing
- **Allure Reports**: allure-playwright 3.4.5
  - Test reporting and visualization

---

## 📦 DevOps & Deployment

### Containerization
- **Docker**: Containerization platform
- **Docker Compose**: 2.0+
  - Multi-container orchestration
- **Images**:
  - FastAPI middleware (custom Dockerfile)
  - ERPNext: frappe/erpnext:version-15
  - PostgreSQL: postgres:15-alpine
  - Redis: redis:8.0-alpine
  - Nginx: nginx:alpine

### Production Web Server
- **Gunicorn**: 23.0.0
  - WSGI server for production
- **Nginx**: Reverse proxy and load balancer

### Configuration
- **Environment Variables**: python-dotenv 1.2.1
  - Local development: `middleware/.env`
  - Production: `prod/.env`

### CI/CD
- **GitHub Actions**: Workflows for testing and deployment
- **Pre-commit Hooks**: Automate code quality checks

---

## 🛠️ Development Tools

### Database Tools
- **SQLite Browser**: Local DB exploration
- **PostgreSQL CLI**: `psql` for production

### Code Editors
- **VS Code**: Recommended editor with Python extension
- **PyCharm**: Professional IDE for Python

### Testing Utilities
- **Playwright Inspector**: Debug E2E tests
- **Allure Dashboard**: Visualize test results

---

## 📊 Testing Stack

### Test Categories
1. **Unit Tests**: pytest with asyncio
2. **Integration Tests**: API endpoint testing
3. **E2E Tests**: Playwright for user flows
4. **Load Tests**: Concurrent user simulation
5. **Security Tests**: OWASP compliance checks

### Test Reports
- **HTML Reports**: pytest-html
- **Allure Reports**: Interactive dashboards
- **Coverage Reports**: pytest-cov

---

## 🚀 Performance Features

- **Async Architecture**: Non-blocking request handling
- **Caching**: Redis for frequently accessed data
- **Rate Limiting**: Sliding window algorithm
- **Gzip Compression**: FastAPI GZipMiddleware
- **Static File Optimization**: Vite build process

---

## 🔒 Security Features

- **152-FZ Compliance**: Russian data protection law
- **Input Validation**: Pydantic schemas
- **SQL Injection Prevention**: Parameterized queries
- **XSS Prevention**: HTTP-only cookies, CSP headers
- **Webhook Validation**: Secret-based verification
- **Mock Mode**: Safe development without real ERPNext

---

## 📈 Metrics & Monitoring

### Health Checks
- **Application**: `/health` endpoint
- **Database**: `/health/db`
- **Redis**: `/health/redis`
- **ERPNext**: `/health/erp`

### Metrics Collection
- **collect_metrics.sh**: Bash script for system metrics
- **Dashboard**: HTML reports in `reports/` directory

---

## Project Structure

```
ErpGreeHouse/
├── middleware/          # Backend (FastAPI + aiogram)
├── admin-ui/            # Frontend (React + TypeScript)
├── prod/                # Production configuration (Docker)
├── docs/                # Documentation
├── tests/               # Test files
└── scripts/             # Helper scripts
```

---

## Key Files

- **`middleware/requirements.txt`**: Backend dependencies
- **`middleware/.env.example`**: Environment variable template
- **`admin-ui/package.json`**: Frontend dependencies
- **`prod/docker-compose.yml`**: Production Docker configuration
- **`prod/.env.production.example`**: Production environment variables
