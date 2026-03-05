# Environment Consistency Guide

## Problem Statement

### The Cookie/Port Nightmare

We discovered during screenshot capture that authentication cookies set on `localhost:8000` (backend) are NOT accessible from `localhost:5173` (frontend dev server). This is because browsers treat different ports as different origins for cookie security purposes.

**Symptoms:**
- Login API succeeds (sets cookies)
- Navigate to dashboard (cookies not sent)
- API returns 401, data doesn't load
- Works on production build (same port 8000)

### Root Causes

1. **Port-Specific Cookies:** Cookies with `Domain=localhost` are scoped to the specific port
2. **CORS Complexity:** Cross-origin requests need proper credential handling
3. **Environment Drift:** Different setups for dev, test, and production
4. **Manual Database Seeding:** No automated test data initialization

---

## Solutions

### Solution 1: Vite Dev Proxy (Recommended for Development)

The Vite dev server can proxy API requests to the backend, making them same-origin.

**How it works:**
- Frontend runs on `localhost:5173`
- API calls to `/api` are proxied to `localhost:8000`
- Cookies are forwarded through the proxy
- Browser sees everything as `localhost:5173`

**Configuration (already in `vite.config.ts`):**
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq, req) => {
          const cookie = req.headers.cookie;
          if (cookie) proxyReq.setHeader('cookie', cookie);
        });
      },
    },
  },
}
```

**Usage:**
```bash
# Terminal 1: Start backend
cd middleware
python -m uvicorn app.main:app --port 8000

# Terminal 2: Start frontend dev server
cd admin-ui
npm run dev

# Access at http://localhost:5173
# API calls automatically proxied to :8000
```

---

### Solution 2: Single-Port Production Build (Recommended for E2E/Screenshots)

Serve the production build from the backend at the same port.

**How it works:**
- Build frontend: `npm run build`
- Backend serves static files from `admin-ui/dist` at `/admin/`
- Everything on `localhost:8000`
- No CORS, no cookie issues

**Usage:**
```bash
# Build frontend
cd admin-ui
npm run build

# Start backend (serves frontend at /admin/)
cd ../middleware
python -m uvicorn app.main:app --port 8000

# Access at http://localhost:8000/admin/
```

**Backend configuration:**
```python
# Already configured in main.py
admin_dist = Path(__file__).resolve().parents[2] / "admin-ui" / "dist"
if admin_dist.exists():
    # Serve static files and handle SPA routing
```

---

### Solution 3: Docker Compose (Recommended for CI/Automated Testing)

Use Docker Compose to orchestrate all services with consistent networking.

**Benefits:**
- Identical environments everywhere
- Automatic service dependencies
- Health checks ensure readiness
- Isolated databases per test run

**File: `docker-compose.e2e.yml`** (already exists)

**Usage:**
```bash
# Start all services
docker-compose -f docker-compose.e2e.yml up --abort-on-container-exit

# Or run in background
docker-compose -f docker-compose.e2e.yml up -d

# Run E2E tests
docker-compose -f docker-compose.e2e.yml exec e2e-runner npm run test:e2e

# Stop
docker-compose -f docker-compose.e2e.yml down
```

---

### Solution 4: Database Seeding Strategy

**Automated seeding on container startup:**

```yaml
# docker-compose.e2e.yml
services:
  backend-e2e:
    volumes:
      - ./middleware/app:/app/app
      - ./scripts/seed-data.sh:/app/seed-data.sh
    command: >
      bash -c "
        python -c 'from app.db import init_db; init_db()' &&
        python -c 'from app.seed import seed_demo_data; seed_demo_data()' &&
        uvicorn app.main:app --host 0.0.0.0 --port 8000
      "
```

**Or use test API endpoint:**
```python
# middleware/app/test_api.py
@router.post("/seed")
def seed_test_data():
    """Seed database with demo data for testing"""
    seed_customers(200)
    seed_products(48)
    seed_transactions(1500)
    return {"status": "seeded"}
```

---

## Environment Variable Standardization

Create `.env` files for each environment:

### `.env.development`
```bash
# Frontend
VITE_API_BASE_URL=/api

# Backend
DATABASE_URL=sqlite:///./crm.db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=dev-secret
ENVIRONMENT=development
```

### `.env.test`
```bash
# E2E Testing
E2E_TEST_MODE=true
E2E_ADMIN_SECRET=test-secret-key
E2E_BASE_URL=http://localhost:8000/admin
E2E_API_BASE_URL=http://localhost:8000

# Backend
DATABASE_URL=sqlite:///./test.db
REDIS_URL=redis://localhost:6379/1
ENVIRONMENT=test
```

### `.env.production`
```bash
# Production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=${JWT_SECRET}
ENVIRONMENT=production
```

---

## Quick Reference: Run Modes

### Development Mode
```bash
# Backend
cd middleware && python -m uvicorn app.main:app --reload --port 8000

# Frontend (uses Vite proxy)
cd admin-ui && npm run dev

# Access: http://localhost:5173
```

### Production Build Mode
```bash
# Build frontend
cd admin-ui && npm run build

# Backend (serves frontend)
cd middleware && python -m uvicorn app.main:app --port 8000

# Access: http://localhost:8000/admin/
```

### Docker E2E Mode
```bash
# Start everything
docker-compose -f docker-compose.e2e.yml up -d

# Wait for health checks...
# Access: http://localhost:8000/admin/

# Run tests
npm run test:e2e
```

---

## Best Practices

### 1. Always Use Same-Origin for E2E Tests
Either:
- Run production build on backend port
- Use Docker Compose with internal networking
- Configure proxy properly

### 2. Never Rely on Port-Sharing for Cookies
```javascript
// ❌ Bad: Different ports
cookies set on localhost:8000  // Not visible to
requests from localhost:5173   // Different origin!

// ✅ Good: Same origin
localhost:8000/api/login       // Cookies visible to
localhost:8000/admin/dashboard // Same origin!
```

### 3. Automate Database Seeding
- Seed on container startup
- Use migrations for schema
- Reset between test suites
- Keep test data realistic

### 4. Use Health Checks
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
  interval: 5s
  timeout: 3s
  retries: 5
```

### 5. Consistent Environment Variables
- Use `.env` files
- Document all variables
- Fail fast on missing vars
- No hardcoded secrets

---

## Troubleshooting

### Cookies Not Working
```bash
# Check cookie domain
curl -I http://localhost:8000/api/v1/public/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# Look for Set-Cookie header
# Should be: Domain=localhost (not port-specific)
```

### CORS Errors
```bash
# Check backend CORS settings
# Should allow credentials and specific origins
```

### Database Empty
```bash
# Check if seeding ran
curl http://localhost:8000/api/v1/test/seed \
  -H "x-admin-secret: test-secret-key"
```

---

## Migration Checklist

Moving from manual setup to automated:

- [ ] Create `.env.test` with all required variables
- [ ] Update `docker-compose.e2e.yml` with health checks
- [ ] Add seeding script to container startup
- [ ] Update Playwright config to use port 8000
- [ ] Test: `docker-compose -f docker-compose.e2e.yml up`
- [ ] Verify: Screenshots show data
- [ ] Document: Add to README.md

---

## Resources

- [Same-Origin Policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
- [Vite Server Proxy](https://vitejs.dev/config/server-options.html#server-proxy)
- [Docker Compose for E2E](https://docs.docker.com/compose/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
