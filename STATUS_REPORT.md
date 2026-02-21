# 📊 ERP GreenHouse - Service Status Report

**Date:** February 20, 2026  
**Time:** 23:30 MSK  
**Report Type:** Infrastructure Status

---

## ✅ Current Status

### Services Running

| Service | Status | Port | PID | Notes |
|---------|--------|------|-----|-------|
| **Redis** | ✅ Running | 6379 | 2988 | Native Windows (Memurai) |
| **Frontend (Vite)** | ✅ Running | 5173 | 4800 | Admin UI |
| **Backend (FastAPI)** | ⏳ Starting | 8000 | - | Virtual environment recreated |
| **Node.js** | ✅ Running | - | 6484 | Build process |

### Recent Changes

1. ✅ **Virtual Environment Recreated**
   - Old venv was broken (referenced non-existent Python 3.13)
   - New venv created with Python 3.14
   - All dependencies reinstalled

2. ✅ **Frontend Dependencies Updated**
   - `npm install` completed successfully
   - 80 packages audited, 0 vulnerabilities

3. ✅ **Backend Dependencies Updated**
   - All requirements installed
   - FastAPI 0.129.0
   - Uvicorn 0.41.0
   - aiogram 3.25.0

---

## 🚀 How to Start Services

### Quick Start (All Services)

```powershell
# Windows PowerShell (Run as Administrator)
cd c:\Users\vuser\repo\ErpGreeHouse\scripts
.\setup_and_run.ps1
```

### Manual Start (Individual Services)

#### Terminal 1: Backend Server

```powershell
cd c:\Users\vuser\repo\ErpGreeHouse\middleware

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Start FastAPI server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

#### Terminal 2: Frontend Server

```powershell
cd c:\Users\vuser\repo\ErpGreeHouse\admin-ui

# Start Vite dev server
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

#### Redis (Already Running)

Redis is already running on port 6379 (Memurai service).

To verify:
```powershell
redis-cli ping
# Expected: PONG
```

---

## 📋 Access Points

| Service | URL | Status |
|---------|-----|--------|
| **Backend API** | http://localhost:8000 | ⏳ Starting |
| **Admin UI** | http://localhost:5173 | ✅ Running |
| **API Docs (Swagger)** | http://localhost:8000/docs | ⏳ Starting |
| **API Docs (ReDoc)** | http://localhost:8000/redoc | ⏳ Starting |
| **Redis** | localhost:6379 | ✅ Running |

---

## 🧪 Testing

### Run All Tests

```powershell
cd middleware
.\.venv\Scripts\Activate.ps1
python test_runner.py
```

### Test Results (Last Run)

```
✅ 46 tests passed (97.9%)
⏭️  1 test skipped
❌ 0 tests failed
⏱️  Execution time: 27.36s
```

---

## 🔧 Troubleshooting

### Issue: Backend Won't Start

**Symptom:** Port 8000 not binding

**Solution:**
```powershell
# 1. Check if port is in use
netstat -ano | findstr ":8000"

# 2. Kill process if exists
taskkill /F /PID <PID>

# 3. Recreate virtual environment
cd middleware
Remove-Item -Recurse -Force .venv
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 4. Start server
python -m uvicorn app.main:app --reload
```

### Issue: Frontend Won't Start

**Symptom:** Port 5173 not binding

**Solution:**
```powershell
# 1. Check if port is in use
netstat -ano | findstr ":5173"

# 2. Kill process if exists
taskkill /F /PID <PID>

# 3. Clear node modules
cd admin-ui
Remove-Item -Recurse -Force node_modules
npm install

# 4. Start server
npm run dev
```

### Issue: Redis Connection Failed

**Symptom:** `redis-cli ping` doesn't return PONG

**Solution:**
```powershell
# Windows (Memurai/Redis service)
net start Redis

# OR use Docker
docker run -d -p 6379:6379 --name erp_redis redis:7-alpine
```

---

## 📦 Setup on New Machine

### Step-by-Step Guide

#### 1. Install Prerequisites

```powershell
# Python 3.11+
# Download from: https://www.python.org/downloads/

# Node.js 18+
# Download from: https://nodejs.org/

# Redis (Windows)
# Download from: https://github.com/microsoftarchive/redis/releases
# OR use Docker
```

#### 2. Clone Repository

```powershell
git clone <repository-url>
cd ErpGreeHouse
```

#### 3. Run Setup Script

```powershell
cd scripts
.\setup_and_run.ps1
```

#### 4. Configure Environment

```powershell
cd ..\middleware
copy .env.example .env
# Edit .env with your settings
```

#### 5. Start Services

```powershell
# Terminal 1 - Backend
cd ..\middleware
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd ..\admin-ui
npm run dev

# Redis (if not running)
net start Redis
```

#### 6. Verify

```powershell
# Check backend
curl http://localhost:8000/health

# Check frontend
# Open browser: http://localhost:5173

# Check Redis
redis-cli ping
```

---

## 🐳 Production Deployment (Docker)

### Quick Deploy

```powershell
cd prod

# Copy environment file
copy .env.production.example .env

# Edit .env with production settings
# Required: TELEGRAM_BOT_TOKEN, ERP_API_KEY, ERP_API_SECRET, etc.

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Docker Services

| Service | Container Name | Port | Purpose |
|---------|---------------|------|---------|
| **nginx** | erp_nginx | 80, 443 | Reverse proxy |
| **middleware** | erp_middleware | 8000 | FastAPI backend |
| **postgres** | erp_postgres | 5432 | Database |
| **redis** | erp_redis | 6379 | Cache |
| **celery-worker** | erp_celery | - | Background tasks |

### Docker Commands

```powershell
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

# Database restore
docker compose exec -T postgres psql -U telegram_crm telegram_crm < backup.sql
```

---

## 📝 Environment Configuration

### Development (.env)

```bash
# Telegram
TELEGRAM_BOT_TOKEN=your_test_token
TELEGRAM_WEBHOOK_URL=http://localhost:8000/webhook

# ERPNext (Mock Mode)
ERP_MOCK_MODE=true
ERP_API_BASE_URL=http://localhost:8000
ERP_API_KEY=test_key
ERP_API_SECRET=test_secret

# Database
DATABASE_URL=sqlite:///crm.db
REDIS_URL=redis://localhost:6379/0

# Security (Development Only!)
JWT_SECRET_KEY=dev-secret-key-change-in-production
ADMIN_DEFAULT_USERNAME=admin
ADMIN_DEFAULT_PASSWORD=admin
```

### Production (.env.production)

```bash
# Telegram
TELEGRAM_BOT_TOKEN=your_production_token

# ERPNext (Real Mode)
ERP_MOCK_MODE=false
ERP_API_BASE_URL=https://your-erpnext.com
ERP_API_KEY=your_production_key
ERP_API_SECRET=your_production_secret

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:pass@postgres:5432/telegram_crm
REDIS_URL=redis://redis:6379/0

# Security (CHANGE THESE!)
JWT_SECRET_KEY=generate-a-strong-random-key-here
WEBHOOK_SECRET=generate-a-strong-random-key-here
ADMIN_SECRET=generate-a-strong-random-key-here
ADMIN_DEFAULT_USERNAME=ChangeMe
ADMIN_DEFAULT_PASSWORD=ChangeMe123!
```

---

## ✅ Health Checks

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

## 📊 Service Monitoring

### Check Service Status

```powershell
# Windows PowerShell

# Check ports
netstat -ano | findstr ":8000 :5173 :6379"

# Check processes
tasklist | findstr "python.exe node.exe"

# Check Redis
redis-cli ping

# Check backend
curl http://localhost:8000/health

# Check frontend
# Open browser: http://localhost:5173
```

### Logs

```powershell
# Backend logs (if running in terminal)
# Check the terminal window where backend is running

# Frontend logs (if running in terminal)
# Check the terminal window where frontend is running

# Docker logs
docker compose logs -f middleware
docker compose logs -f nginx

# Redis logs (Windows Event Viewer or Docker)
docker logs erp_redis
```

---

## 🎯 Daily Development Workflow

### Morning Startup

```powershell
# 1. Start Redis (if not running as service)
net start Redis
# OR
docker start erp_redis

# 2. Terminal 1 - Backend
cd c:\Users\vuser\repo\ErpGreeHouse\middleware
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload

# 3. Terminal 2 - Frontend
cd c:\Users\vuser\repo\ErpGreeHouse\admin-ui
npm run dev

# 4. Verify
# Open browser: http://localhost:5173
# Open browser: http://localhost:8000/docs
```

### Before Commit

```powershell
cd middleware
.\.venv\Scripts\Activate.ps1
python test_runner.py --unit
```

### Before Push

```powershell
cd middleware
.\.venv\Scripts\Activate.ps1
python test_runner.py
```

### Evening Shutdown

```powershell
# Stop services (if running manually)
# Press CTRL+C in each terminal

# Stop Docker services (if using Docker)
cd prod
docker compose stop

# Stop Redis (if not a service)
net stop Redis
```

---

## 📚 Documentation Links

- **Setup Guide:** `SETUP_GUIDE.md`
- **Test Automation:** `docs/testing/test_automation_report_20260220.md`
- **Test Plan:** `docs/plans/test_automation_plan.md`
- **Test Rules:** `docs/plans/test_execution_rules.md`
- **Architecture:** `docs/architecture/system_architecture.md`

---

## 🆘 Getting Help

### Check Logs

```powershell
# Backend terminal output
# Frontend terminal output
# Docker logs: docker compose logs -f
```

### Run Diagnostics

```powershell
# Check all services
netstat -ano | findstr ":8000 :5173 :6379"

# Test Redis
redis-cli ping

# Test Backend
curl http://localhost:8000/health

# Test Frontend
# Browser: http://localhost:5173
```

### Create Issue

If problems persist:
1. Check logs for errors
2. Run diagnostics
3. Create GitHub issue with:
   - Error messages
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Python version, etc.)

---

**Last Updated:** February 20, 2026 23:30 MSK  
**Status:** Services Starting  
**Next Check:** Verify backend binds to port 8000
