# ErpGreeHouse Project Quick Reference

## Project Overview

ErpGreeHouse is a CRM system for coffee/grocery business with:
- **Frontend:** React 19, Vite 7, TypeScript
- **Backend:** FastAPI, Python 3.14
- **Database:** SQLite (dev) / PostgreSQL (prod)
- **Cache:** Redis
- **Integrations:** Telegram, VK, ERPNext

## Quick Start

### Option 1: Docker (Recommended for Windows)

```powershell
# Start all services
.\start-dev.ps1

# Stop services
docker-compose -f docker-compose.local.yml down
```

### Option 2: Manual

```bash
# Backend
cd middleware
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000

# Frontend (new terminal)
cd admin-ui
npm install
npm run dev
```

## Key Files

### Configuration
- `docker-compose.local.yml` - Local Docker setup
- `middleware/.env` - Backend environment variables
- `admin-ui/.env.test` - Frontend environment

### Frontend (`admin-ui/src/`)
| File | Purpose |
|------|---------|
| `App.tsx` | Main app with role routing |
| `theme.ts` | Design tokens |
| `styles.css` | Global styles |
| `api.ts` | API client |

### Dashboard Components
| Component | Role |
|-----------|------|
| `OperatorDashboard.tsx` | Operational tasks |
| `ManagerDashboard.tsx` | Analytics & marketing |
| `AdminDashboard.tsx` | Full access |

## Common Issues

### lxml Installation Fails on Windows
**Solution:** Use Docker (docker-compose.local.yml)

The backend requires `lxml` which needs Microsoft Visual C++ 14.0 on Windows. Docker handles this automatically.

### Port Already in Use
```bash
# Find process using port
netstat -ano | findstr :8000

# Kill process
taskkill /PID <PID> /F
```

### Clear Docker Cache
```bash
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up --build
```

## Development Commands

```bash
# Frontend
cd admin-ui
npm run dev          # Start dev server
npm run build       # Production build
npm run type-check  # TypeScript check

# Backend
cd middleware
python -m uvicorn app.main:app --reload --port 8000

# Tests
cd admin-ui && npm run test:e2e           # Run E2E tests
cd middleware && pytest                   # Run pytest
```

## Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Backend Docs | http://localhost:8000/docs |
| Redis | localhost:6379 |

## Default Test Users

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin |
| Manager | manager | manager |
| Operator | operator | operator |

## Project Structure

```
ErpGreeHouse/
├── .gsd/                    # GSD planning artifacts
├── admin-ui/                # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── views/           # Page views
│   │   ├── hooks/          # Custom hooks
│   │   └── stores/         # State management
│   ├── e2e/                # E2E tests
│   └── Dockerfile
├── middleware/              # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── models/         # Pydantic models
│   │   └── services/      # Business logic
│   ├── tests/             # Pytest tests
│   └── Dockerfile
├── docker-compose.local.yml # Local dev setup
├── docker-compose.e2e.yml   # E2E test setup
└── start-dev.ps1           # Windows startup script
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│                   (React + Vite)                            │
│              http://localhost:5173                          │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP + JWT
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                        Backend                              │
│                  (FastAPI + Python)                         │
│              http://localhost:8000                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Telegram   │  │      VK      │  │   ERPNext    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────┬───────────────────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
┌─────────────────┐               ┌─────────────────┐
│     SQLite      │               │     Redis       │
│   (Database)    │               │     (Cache)     │
└─────────────────┘               └─────────────────┘
```

## Last Updated
2026-03-06
