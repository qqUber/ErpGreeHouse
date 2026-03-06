# ErpGreeHouse Docker Development Commands
# Rule: Always use Docker for development - no local dependencies

## Quick Start

```powershell
# Start development environment
docker-compose -f docker-compose.local.yml up -d

# View logs
docker-compose -f docker-compose.local.yml logs -f

# Stop
docker-compose -f docker-compose.local.yml down
```

## Development Commands

### Frontend Development
```powershell
# Frontend runs on http://localhost:5173
# Changes to admin-ui/src are hot-reloaded via volume mount
```

### Backend Development
```powershell
# Backend runs on http://localhost:8000
# Backend auto-reloads on code changes via volume mount
# API docs at http://localhost:8000/docs
```

### Running Tests

```powershell
# E2E Tests
docker-compose -f docker-compose.e2e.yml up --abort-on-container-exit

# Run specific E2E test
docker exec erp_e2e_runner npx playwright test e2e/smoke.spec.ts

# Backend pytest
docker exec erp_local_backend pytest
```

### Debugging

```powershell
# Backend shell
docker exec -it erp_local_backend /bin/bash

# Frontend shell
docker exec -it erp_local_frontend /bin/sh

# Backend logs
docker logs erp_local_backend -f

# Frontend logs
docker logs erp_local_frontend -f
```

### Database Operations

```powershell
# Access SQLite database
docker exec erp_local_backend ls -la /app/data/

# Seed database
docker exec erp_local_backend python -m app.scripts.seed

# Reset database
docker exec erp_local_backend rm /app/data/dev.db
docker-compose -f docker-compose.local.yml restart backend
```

## Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Backend Docs | http://localhost:8000/docs |
| Redis | localhost:6379 |

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin |
| Manager | manager | manager |
| Operator | operator | operator |

## Troubleshooting

### Container won't start
```powershell
# Rebuild from scratch
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up --build
```

### Port already in use
```powershell
# Find and kill process
netstat -ano | findstr :8000
netstat -ano | findstr :5173
```

### Clear all Docker data
```powershell
docker-compose -f docker-compose.local.yml down -v
docker system prune -a
```
