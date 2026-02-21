# 🚀 ERP GreenHouse - Complete Setup & Run Guide

**Telegram CRM + ERPNext Loyalty Integration**

---

## 📋 Quick Start

### For First-Time Setup

```bash
# Windows PowerShell (Run as Administrator)
cd c:\Users\vuser\repo\ErpGreeHouse\scripts
.\setup_and_run.ps1

# Linux/Mac
cd /path/to/ErpGreeHouse/scripts
chmod +x setup_and_run.sh
./setup_and_run.sh
```

### For Daily Development

```bash
# Terminal 1 - Backend (from middleware directory)
.venv\Scripts\activate  # Windows
# OR: source .venv/bin/activate  # Linux/Mac
python -m uvicorn app.main:app --reload

# Terminal 2 - Frontend (from admin-ui directory)
npm run dev
```

---

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Telegram Bot   │────▶│  FastAPI         │────▶│  ERPNext API    │
│  (aiogram)      │     │  Middleware      │     │  (Loyalty)      │
└─────────────────┘     │  (Python 3.14)   │     └─────────────────┘
                        │  + Redis Cache   │
                        └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Admin UI        │
                        │  (React + TS)    │
                        └──────────────────┘
```

---

## 📁 Project Structure

```
ErpGreeHouse/
├── middleware/              # Backend (FastAPI + aiogram)
│   ├── app/                 # Application code
│   │   ├── main.py         # FastAPI app
│   │   ├── handlers.py     # Telegram bot handlers
│   │   ├── erp_client.py   # ERPNext client
│   │   └── ...
│   ├── tests/              # Test suite
│   │   ├── unit/           # Unit tests
│   │   ├── integration/    # Integration tests
│   │   └── conftest.py     # Test fixtures
│   ├── .env                # Environment configuration
│   ├── .venv/              # Python virtual environment
│   └── requirements.txt    # Python dependencies
├── admin-ui/               # Frontend (React + TypeScript)
│   ├── src/                # React components
│   ├── e2e/                # Playwright E2E tests
│   └── package.json        # Node.js dependencies
├── scripts/                # Setup and utility scripts
│   ├── setup_and_run.ps1   # Windows setup script
│   └── setup_and_run.sh    # Linux/Mac setup script
├── docs/                   # Documentation
└── prod/                   # Production configuration
```

---

## 🔧 Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Python** | 3.11+ | Backend runtime |
| **Node.js** | 18+ | Frontend runtime |
| **Redis** | 7+ | Caching & queues |
| **Git** | 2.0+ | Version control |

### Installation Guides

#### Windows

```powershell
# Python (via Windows Store or python.org)
# Download from: https://www.python.org/downloads/

# Node.js (via installer)
# Download from: https://nodejs.org/

# Redis (via Memurai or Windows port)
# Download from: https://github.com/microsoftarchive/redis/releases
# OR use Docker: docker run -d -p 6379:6379 redis:7-alpine
```

#### Linux (Ubuntu/Debian)

```bash
# Python
sudo apt-get update
sudo apt-get install python3 python3-pip python3-venv

# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Redis
sudo apt-get install redis-server
sudo systemctl start redis
```

#### macOS

```bash
# Using Homebrew
brew install python@3.11
brew install node@18
brew install redis
brew services start redis
```

---

## 🚀 Setup Instructions

### Option 1: Automated Setup (Recommended)

#### Windows

```powershell
cd c:\Users\vuser\repo\ErpGreeHouse\scripts
.\setup_and_run.ps1
```

#### Linux/Mac

```bash
cd /path/to/ErpGreeHouse/scripts
chmod +x setup_and_run.sh
./setup_and_run.sh
```

### Option 2: Manual Setup

#### Step 1: Backend Setup

```bash
cd middleware

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Install test dependencies (optional)
pip install pytest pytest-asyncio pytest-cov pytest-html
```

#### Step 2: Frontend Setup

```bash
cd admin-ui

# Install dependencies
npm install
```

#### Step 3: Environment Configuration

```bash
cd middleware

# Copy example environment file
cp .env.example .env  # Linux/Mac
copy .env.example .env  # Windows

# Edit .env with your configuration
# Required settings:
# - TELEGRAM_BOT_TOKEN
# - ERP_MOCK_MODE=true (for development)
# - REDIS_URL=redis://localhost:6379/0
```

#### Step 4: Start Redis

```bash
# Docker (recommended)
docker run -d -p 6379:6379 --name erp_redis redis:7-alpine

# OR native Redis
# Windows: Start Redis service
net start Redis

# Linux/Mac:
sudo systemctl start redis
# OR
brew services start redis  # macOS
```

---

## ▶️ Running the Application

### Start Backend Server

```bash
cd middleware

# Activate virtual environment
.venv\Scripts\activate  # Windows
# OR: source .venv/bin/activate  # Linux/Mac

# Start FastAPI server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Start Frontend Server

```bash
cd admin-ui

# Start development server
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Backend API** | http://localhost:8000 | REST API |
| **Admin UI** | http://localhost:5173 | Web interface |
| **API Docs** | http://localhost:8000/docs | Swagger UI |
| **Redoc** | http://localhost:8000/redoc | ReDoc UI |

---

## 🧪 Running Tests

### Quick Test Run

```bash
cd middleware

# Activate virtual environment
.venv\Scripts\activate

# Run all tests
python test_runner.py
```

### Test Options

```bash
# Run unit tests only
python test_runner.py --unit

# Run integration tests only
python test_runner.py --integration

# Run with coverage report
python test_runner.py --coverage

# Run specific test file
pytest tests/unit/test_bot_handlers.py -v

# Run specific test function
pytest tests/unit/test_bot_handlers.py::test_cmd_start_shows_registration_prompt -v
```

### Test Results

```
======================== 46 passed, 1 skipped ========================
✅ Unit Tests: 18 passed
✅ Integration Tests: 28 passed, 1 skipped
⏱️  Execution time: 27.36s
```

---

## 🐳 Docker Deployment

### Production Setup with Docker

```bash
cd prod

# Copy environment example
cp .env.production.example .env

# Edit .env with production settings
# Required:
# - TELEGRAM_BOT_TOKEN
# - ERP_API_KEY
# - ERP_API_SECRET
# - JWT_SECRET_KEY
# - DATABASE_URL (PostgreSQL)

# Build and start services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Docker Services

| Service | Port | Description |
|---------|------|-------------|
| **nginx** | 80, 443 | Reverse proxy |
| **middleware** | 8000 | FastAPI backend |
| **postgres** | 5432 | Database |
| **redis** | 6379 | Cache |
| **celery-worker** | - | Background tasks |

### Docker Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f middleware

# Restart service
docker compose restart middleware

# Rebuild service
docker compose build middleware
docker compose up -d middleware

# Access container
docker compose exec middleware bash

# Database backup
docker compose exec postgres pg_dump -U telegram_crm telegram_crm > backup.sql
```

---

## 📝 Environment Variables

### Required Variables (.env)

```bash
# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook

# ERPNext Configuration
ERP_API_BASE_URL=https://your-erpnext.com
ERP_API_KEY=your_api_key
ERP_API_SECRET=your_api_secret
ERP_MOCK_MODE=true  # Set to false for production

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/telegram_crm
REDIS_URL=redis://localhost:6379/0

# Security (CHANGE IN PRODUCTION!)
JWT_SECRET_KEY=your_jwt_secret_key
WEBHOOK_SECRET=your_webhook_secret
ADMIN_SECRET=your_admin_secret

# Admin Credentials (CHANGE IN PRODUCTION!)
ADMIN_DEFAULT_USERNAME=admin
ADMIN_DEFAULT_PASSWORD=ChangeMe123!
```

### Feature Flags

```bash
DEBUG_MODE=true           # Enable debug logging
TEST_MODE=false           # Test mode
MOCK_MODE=true            # Use mock ERPNext
ENABLE_RATE_LIMITING=true # Rate limiting
ENABLE_JWT_AUTH=true      # JWT authentication
```

---

## 🔍 Troubleshooting

### Common Issues

#### Issue 1: Port Already in Use

```bash
# Windows: Find process using port 8000
netstat -ano | findstr ":8000"
# Kill process
taskkill /PID <PID> /F

# Linux/Mac: Find process using port 8000
lsof -i :8000
# Kill process
kill -9 <PID>
```

#### Issue 2: Redis Connection Failed

```bash
# Check if Redis is running
redis-cli ping
# Expected: PONG

# Start Redis (Docker)
docker run -d -p 6379:6379 redis:7-alpine

# Start Redis (Windows service)
net start Redis

# Start Redis (Linux)
sudo systemctl start redis
```

#### Issue 3: Module Not Found

```bash
# Activate virtual environment
cd middleware
.venv\Scripts\activate  # Windows
# OR: source .venv/bin/activate  # Linux/Mac

# Reinstall dependencies
pip install -r requirements.txt
```

#### Issue 4: Frontend Build Fails

```bash
cd admin-ui

# Clear cache
rm -rf node_modules package-lock.json  # Linux/Mac
rmdir /s /q node_modules
del package-lock.json  # Windows

# Reinstall
npm install
```

---

## 📚 Documentation

| Document | Location | Description |
|----------|----------|-------------|
| **Test Automation Plan** | `docs/plans/test_automation_plan.md` | Testing strategy |
| **Test Execution Rules** | `docs/plans/test_execution_rules.md` | Green Build Policy |
| **Testing Strategy** | `docs/plans/testing_strategy.md` | Test categories |
| **System Architecture** | `docs/architecture/system_architecture.md` | Architecture docs |
| **Development Plan** | `docs/plans/development_plan.md` | Roadmap |

---

## 🎯 Development Workflow

### Daily Development

```bash
# 1. Pull latest changes
git pull origin main

# 2. Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# 3. Terminal 1 - Backend
cd middleware
.venv\Scripts\activate
python -m uvicorn app.main:app --reload

# 4. Terminal 2 - Frontend
cd admin-ui
npm run dev

# 5. Run tests before commit
cd middleware
python test_runner.py --unit

# 6. Commit changes
git add .
git commit -m "feat: implemented feature"

# 7. Run full test suite before push
python test_runner.py

# 8. Push changes
git push origin feature-branch
```

### First Time on New Machine

```bash
# 1. Clone repository
git clone <repository-url>
cd ErpGreeHouse

# 2. Run setup script
cd scripts
.\setup_and_run.ps1  # Windows
# OR: ./setup_and_run.sh  # Linux/Mac

# 3. Configure environment
cd ../middleware
# Edit .env with your settings

# 4. Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# 5. Start services (see "Running the Application" above)
```

---

## 📊 Health Checks

```bash
# Backend health
curl http://localhost:8000/health

# Database health
curl http://localhost:8000/health/db

# Redis health
curl http://localhost:8000/health/redis

# ERPNext health (mock)
curl http://localhost:8000/health/erp
```

---

## 🔐 Security Best Practices

### Development

- ✅ Use `.env` file for secrets
- ✅ Enable `ERP_MOCK_MODE` for safe development
- ✅ Use test Telegram bot token
- ✅ Never commit `.env` file

### Production

- ✅ Change all default passwords
- ✅ Use strong JWT_SECRET_KEY
- ✅ Enable HTTPS (Let's Encrypt)
- ✅ Enable rate limiting
- ✅ Use PostgreSQL instead of SQLite
- ✅ Enable audit logging
- ✅ Regular security updates

---

## 📞 Support

### Getting Help

1. **Documentation**: Check `docs/` directory
2. **Issues**: Create GitHub issue
3. **Logs**: Check `middleware/logs/` directory

### Log Files

```bash
# Backend logs
tail -f middleware/logs/app.log

# Docker logs
docker compose logs -f middleware

# Test logs
cat middleware/reports/test_report.html
```

---

## ✅ Checklist for New Machine

- [ ] Install Python 3.11+
- [ ] Install Node.js 18+
- [ ] Install Redis (or Docker)
- [ ] Clone repository
- [ ] Run setup script
- [ ] Configure `.env` file
- [ ] Start Redis
- [ ] Start backend server
- [ ] Start frontend server
- [ ] Run tests
- [ ] Access Admin UI

---

**Last Updated:** February 20, 2026  
**Version:** 1.0.0  
**Status:** Production Ready
