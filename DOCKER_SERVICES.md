# Docker Services Documentation

> **Complete guide to Docker services, configurations, and deployment for ErpGreeHouse**

---

## Overview

The ErpGreeHouse project uses a multi-stage Docker setup with environment-specific configurations. The Docker infrastructure supports development, testing, and production deployments with consistent service orchestration.

## Docker Compose Files

### File Structure

```
ErpGreeHouse/
├── docker-compose.yml                    # Main development configuration
├── docker-compose.test.yml              # Testing environment override
├── docker-compose.telegram-test.yml     # Telegram integration testing
├── prod/
│   ├── docker-compose.yml               # Production base configuration
│   ├── docker-compose.prod.yml          # Production overrides
│   └── docker-compose.infrastructure.yml # Infrastructure services
└── middleware/
    └── docker-compose.test.yml          # Middleware-specific testing
```

---

## Development Services

### docker-compose.yml

| Service | Image | Port | Purpose | Health Check |
|---------|-------|------|---------|--------------|
| **redis** | `redis:8.0-alpine` | 6379 | Caching & session storage | ✅ `redis-cli ping` |
| **backend** | Custom build | 8000 | FastAPI middleware | ✅ `/health` |
| **frontend** | Custom build | 5173 | React admin UI | ❌ (depends on backend) |

#### Service Details

**Redis Service**
```yaml
redis:
  image: redis:8.0-alpine
  container_name: erp_redis
  ports:
    - "6379:6379"
  command: redis-server --appendonly yes
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 5s
    timeout: 3s
    retries: 3
  volumes:
    - redis_data:/data
```

**Backend Service**
```yaml
backend:
  build:
    context: ./middleware
    dockerfile: Dockerfile
    target: development
  container_name: erp_backend
  ports:
    - "8000:8000"
  env_file:
    - .env
  volumes:
    - ./middleware:/app
  depends_on:
    redis:
      condition: service_healthy
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 10s
```

**Frontend Service**
```yaml
frontend:
  build:
    context: ./admin-ui
    dockerfile: Dockerfile
    target: development
  container_name: erp_frontend
  ports:
    - "5173:5173"
  env_file:
    - .env
  environment:
    - E2E_API_BASE_URL=http://backend:8000
  volumes:
    - ./admin-ui:/app
    - /app/node_modules
  depends_on:
    backend:
      condition: service_healthy
```

---

## Testing Services

### docker-compose.test.yml

| Service | Image | Port | Purpose | Health Check |
|---------|-------|------|---------|--------------|
| **redis** | `redis:8.0-alpine` | - | Test caching | ✅ `redis-cli ping` |
| **backend-test-unit** | Custom build | - | Unit tests | ❌ (test runner) |
| **backend-test-integration** | Custom build | - | Integration tests | ❌ (test runner) |
| **backend-e2e** | Custom build | 8000 | E2E backend | ✅ `/health` |
| **frontend-e2e** | Custom build | 5173 | E2E frontend | ✅ HTTP check |
| **e2e-runner** | `playwright:v1.58.2` | - | E2E test runner | ❌ (test runner) |

#### Test Environment Variables

All test services use consistent test configuration:

```yaml
environment:
  PYTHONPATH: /app
  TEST_MODE: "true"
  ERP_MOCK_MODE: "true"
  DEBUG_MODE: "false"
  REDIS_URL: redis://redis:6379/1
  DATABASE_URL: sqlite:///test_telegram_crm.db
  CRM_DB_PATH: test_telegram_crm.db
  JWT_SECRET_KEY: test-jwt-secret-key-ci
  E2E_TEST_MODE: "true"
  ADMIN_SECRET: test-secret-key
  TELEGRAM_BOT_TOKEN: test_token_123456789:AABBccDDeeFFggHHiiJJkkLLmmNNooP
  TELEGRAM_CHANNEL_ID: "-100123456789"
```

#### Test Services Details

**Unit Test Service**
```yaml
backend-test-unit:
  build:
    context: ./middleware
    dockerfile: Dockerfile
    target: test
  command: >
    sh -c "pytest tests/unit -v --tb=short --tb=line
    --cov=app
    --cov-report=term-missing
    --cov-report=xml:reports/coverage.xml
    --html=reports/unit_report.html
    --self-contained-html"
```

**Integration Test Service**
```yaml
backend-test-integration:
  build:
    context: ./middleware
    dockerfile: Dockerfile
    target: test
  command: >
    sh -c "pytest tests/integration -v --tb=short --tb=line
    --html=reports/integration_report.html
    --self-contained-html"
```

**E2E Backend Service**
```yaml
backend-e2e:
  build:
    context: ./middleware
    dockerfile: Dockerfile
    target: development
  command: >
    sh -c "python tests/init_db.py &&
    uvicorn app.main:app --host 0.0.0.0 --port 8000"
```

**E2E Frontend Service**
```yaml
frontend-e2e:
  build:
    context: ./admin-ui
    dockerfile: Dockerfile
    target: development
  environment:
    VITE_API_BASE_URL: http://backend-e2e:8000
    E2E_API_BASE_URL: http://backend-e2e:8000
    E2E_BASE_URL: http://frontend-e2e:5173
  command: npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

**E2E Runner Service**
```yaml
e2e-runner:
  image: mcr.microsoft.com/playwright:v1.58.2-noble
  environment:
    CI: "true"
    E2E_RETRIES: "2"
    E2E_RETRY_BASE_MS: "750"
    E2E_BASE_URL: http://frontend-e2e:5173
    E2E_API_BASE_URL: http://backend-e2e:8000
    E2E_TEST_MODE: "true"
    ADMIN_SECRET: test-secret-key
    E2E_ARGS: ${E2E_ARGS:-}
  command: >
    sh -c "npm ci &&
    npm run test:e2e -- --reporter=list ${E2E_ARGS}"
```

---

## Production Services

### prod/docker-compose.prod.yml

| Service | Image | Port | Purpose | Health Check |
|---------|-------|------|---------|--------------|
| **redis** | `redis:8.0-alpine` | 6379 | Production caching | ✅ `redis-cli ping` |
| **backend** | Custom build | 8000 | Production API | ✅ `/health` |
| **frontend** | `nginx:alpine` | 80 | Production UI | ❌ (nginx health) |

#### Production Overrides

**Redis Production**
```yaml
redis:
  container_name: erp_prod_redis
  command: redis-server --save 60 1 --loglevel warning
  volumes:
    - redis_prod_data:/data
```

**Backend Production**
```yaml
backend:
  build:
    target: production
  container_name: erp_prod_backend
  ports:
    - "8000:8000"
  env_file:
    - .env.prod
  volumes:
    - prod_data:/app/data
```

**Frontend Production**
```yaml
frontend:
  build:
    target: production
  container_name: erp_prod_frontend
  ports:
    - "80:80"
  env_file:
    - .env.prod
  volumes: []
```

---

## Dockerfiles

### Backend Dockerfile (middleware/Dockerfile)

Multi-stage build with development, test, and production targets:

```dockerfile
# --- Base Stage ---
FROM python:3.14-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libxml2-dev \
    libxslt1-dev \
    libz-dev \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Development Stage ---
FROM base AS development
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# --- Test Stage ---
FROM base AS test
COPY . .
CMD ["pytest"]

# --- Production Stage ---
FROM base AS production
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Dockerfile (admin-ui/Dockerfile)

Multi-stage build with development, build, and production stages:

```dockerfile
# --- Base Stage ---
FROM node:24-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# --- Development Stage ---
FROM base AS development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# --- Build Stage (for Production) ---
FROM base AS build
COPY . .
RUN npm run build

# --- Production Stage ---
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Docker Commands

### Development Commands

```bash
# Start development environment
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down

# Rebuild specific service
docker-compose build backend
docker-compose up -d backend
```

### Testing Commands

```bash
# Run unit tests
docker-compose -f docker-compose.yml -f docker-compose.test.yml \
  run --rm backend-test-unit

# Run integration tests
docker-compose -f docker-compose.yml -f docker-compose.test.yml \
  run --rm backend-test-integration

# Run E2E tests
docker compose -f docker-compose.yml -f docker-compose.test.yml \
  up --build --exit-code-from e2e-runner e2e-runner

# Run specific E2E tests
E2E_ARGS="--grep 'Dashboard'" docker compose \
  -f docker-compose.yml -f docker-compose.test.yml \
  up --build --exit-code-from e2e-runner e2e-runner
```

### Production Commands

```bash
# Deploy to production
cd prod
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View production logs
docker-compose logs -f

# Backup production data
docker-compose exec postgres pg_dump -U telegram_crm telegram_crm > backup.sql

# Update production
docker-compose pull
docker-compose up -d
```

---

## Volumes

### Development Volumes

| Volume | Purpose | Path |
|--------|---------|------|
| `redis_data` | Redis persistence | Docker managed |
| `./middleware:/app` | Live code mounting | Local development |
| `./admin-ui:/app` | Live code mounting | Local development |

### Production Volumes

| Volume | Purpose | Path |
|--------|---------|------|
| `redis_prod_data` | Redis persistence | Docker managed |
| `prod_data` | Application data | Docker managed |

### Test Volumes

| Volume | Purpose | Path |
|--------|---------|------|
| `test_data` | Test database | Docker managed |
| `./middleware/reports:/app/reports` | Test reports | Local reports |

---

## Health Checks

### Backend Health Check

```bash
# Check health endpoint
curl http://localhost:8000/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2026-03-13T10:00:00Z",
  "version": "1.0.0"
}
```

### Redis Health Check

```bash
# Check Redis
docker-compose exec redis redis-cli ping

# Expected response
PONG
```

### Frontend Health Check

```bash
# Check frontend
curl http://localhost:5173/

# Expected response: HTML content
```

---

## Environment Configuration

### Development Environment (.env)

```bash
# Core configuration
ENVIRONMENT=development
DEBUG_MODE=true

# Database
DATABASE_URL=sqlite:///app/data/dev.db
REDIS_URL=redis://localhost:6379/0

# Authentication
JWT_SECRET_KEY=dev-jwt-secret-key-change-in-production
ADMIN_SECRET=dev-admin-secret

# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCDEF-DEV-TOKEN
ERP_MOCK_MODE=true
```

### Production Environment (.env.prod)

```bash
# Core configuration
ENVIRONMENT=production
DEBUG_MODE=false

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:pass@postgres:5432/telegram_crm
REDIS_URL=redis://redis:6379/0

# Authentication (CHANGE IN PRODUCTION)
JWT_SECRET_KEY=your-production-secret-key
ADMIN_SECRET=your-production-admin-secret

# Telegram (CHANGE IN PRODUCTION)
TELEGRAM_BOT_TOKEN=your-production-bot-token
ERP_MOCK_MODE=false
```

---

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check port usage
netstat -ano | findstr ":8000"
lsof -i :8000

# Kill process
taskkill /PID <PID> /F
kill -9 <PID>
```

#### Build Failures
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Rebuild specific service
docker-compose build --no-cache backend
```

#### Volume Issues
```bash
# List volumes
docker volume ls

# Remove volumes
docker-compose down -v

# Inspect volume
docker volume inspect erpgeenhouse_redis_data
```

#### Service Not Starting
```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs backend

# Debug service
docker-compose run --rm backend bash
```

### Performance Issues

#### Memory Usage
```bash
# Check container resource usage
docker stats

# Limit memory usage
docker-compose up -d --memory=2g backend
```

#### Disk Space
```bash
# Check Docker disk usage
docker system df

# Clean up unused images
docker image prune
```

---

## Security Considerations

### Production Security

1. **Use production images**: Avoid `latest` tags
2. **Secure secrets**: Use Docker secrets or environment files
3. **Network isolation**: Use custom networks
4. **Resource limits**: Set memory and CPU limits
5. **Regular updates**: Keep base images updated

### Docker Security Best Practices

```bash
# Scan images for vulnerabilities
docker scan erpgreehouse-middleware:latest

# Use non-root user (in Dockerfile)
RUN adduser --disabled-password --gecos '' appuser
USER appuser
```

---

## Monitoring

### Container Monitoring

```bash
# Real-time stats
docker stats

# Container events
docker events

# Resource usage history
docker stats --no-stream
```

### Log Management

```bash
# Configure logging driver
docker-compose up --log-driver=json-file --log-opt max-size=10m

# Centralized logging
docker-compose up --log-driver=syslog
```

---

## Backup and Recovery

### Data Backup

```bash
# Backup Redis data
docker-compose exec redis redis-cli BGSAVE
docker cp erp_redis:/data/dump.rdb ./redis-backup.rdb

# Backup application data
docker cp erp_backend:/app/data ./app-data-backup
```

### Disaster Recovery

```bash
# Restore Redis
docker cp ./redis-backup.rdb erp_redis:/data/dump.rdb
docker-compose restart redis

# Restore application data
docker cp ./app-data-backup erp_backend:/app/data
docker-compose restart backend
```

---

**Last Updated**: March 13, 2026  
**Docker Version**: Latest  
**Compose Version**: Latest
