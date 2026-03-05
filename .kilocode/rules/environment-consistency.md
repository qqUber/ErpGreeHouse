# Environment Consistency Rule

## The Golden Rule

**NEVER rely on cookies working across different ports in localhost.**

```
❌ WRONG: Cookies set on localhost:8000, read from localhost:5173
✅ RIGHT:  Everything on same origin (either both on :8000 or use proxy)
```

---

## Three Approved Patterns

### Pattern 1: Vite Dev Proxy (Development)

Use when running `npm run dev` locally.

**Prerequisites:**
- Backend running on port 8000
- Frontend Vite dev server with proxy config

**How it works:**
- Browser talks to `localhost:5173` only
- Vite proxies `/api/*` to `localhost:8000`
- Cookies flow through proxy transparently
- No CORS issues

**Quick Start:**
```bash
# Terminal 1
cd middleware && python -m uvicorn app.main:app --port 8000

# Terminal 2  
cd admin-ui && npm run dev

# Access: http://localhost:5173
# API calls automatically proxied to :8000
```

**Verify proxy is working:**
```bash
curl http://localhost:5173/api/v1/public/status
# Should return backend status (proxied)
```

---

### Pattern 2: Production Build (E2E/Screenshots)

Use for E2E tests, screenshots, or when cookies don't work in dev mode.

**Prerequisites:**
- Frontend built (`npm run build`)
- Backend serves static files from `admin-ui/dist`

**How it works:**
- Backend serves frontend at `/admin/`
- Everything on `localhost:8000`
- Cookies work natively (same origin)
- No proxy complexity

**Quick Start:**
```bash
cd admin-ui && npm run build
cd ../middleware && python -m uvicorn app.main:app --port 8000

# Access: http://localhost:8000/admin/
```

**For screenshots:**
```javascript
// In Playwright script:
// 1. Login via API to set cookies on :8000
await page.request.post('http://localhost:8000/api/v1/public/auth/login', {
  data: { username: 'admin', password: 'admin' }
});

// 2. Navigate to production app (same port)
await page.goto('http://localhost:8000/admin/');

// 3. Cookies work! Data loads automatically.
```

---

### Pattern 3: Docker Compose (CI/Team)

Use for automated testing, CI/CD, or team-wide consistency.

**Prerequisites:**
- Docker and Docker Compose installed
- `docker-compose.e2e.yml` configured

**How it works:**
- All services in isolated network
- Consistent environment everywhere
- Automatic health checks
- Database seeded on startup

**Quick Start:**
```bash
# Start everything
docker-compose -f docker-compose.e2e.yml up -d

# Wait for health checks (usually 10-15 seconds)
docker-compose -f docker-compose.e2e.yml ps

# Access: http://localhost:8000/admin/

# Run E2E tests
cd admin-ui && npm run test:e2e

# Stop
docker-compose -f docker-compose.e2e.yml down
```

---

## Decision Matrix

| Scenario | Use Pattern | Why |
|----------|-------------|-----|
| Daily development | Pattern 1 (Vite Proxy) | Hot reload, fast iteration |
| Taking screenshots | Pattern 2 (Production) | Guaranteed cookie auth |
| E2E tests locally | Pattern 2 or 3 | Reliable, reproducible |
| CI/CD pipeline | Pattern 3 (Docker) | Isolated, consistent |
| Team onboarding | Pattern 3 (Docker) | One command, works everywhere |
| Debugging auth issues | Pattern 2 (Production) | Simplifies cookie tracing |

---

## Database Seeding Checklist

Before running E2E tests or taking screenshots:

- [ ] Backend has `E2E_TEST_MODE=true` (enables test API)
- [ ] Database is initialized with schema
- [ ] Seed data is loaded (customers, products, transactions)
- [ ] Test users exist (admin/admin, operator/operator, manager/manager)

**Manual seeding:**
```bash
curl -X POST http://localhost:8000/api/v1/test/seed \
  -H "x-admin-secret: test-secret-key"
```

**Auto-seeding in Docker:**
```yaml
# Already in docker-compose.e2e.yml
backend-e2e:
  environment:
    - E2E_TEST_MODE=true
  volumes:
    - ./scripts/seed.sh:/app/seed.sh
  command: bash -c "/app/seed.sh && uvicorn app.main:app"
```

---

## Common Mistakes

### Mistake 1: Dev Server for Screenshots
```javascript
// ❌ WRONG
await page.goto('http://localhost:5173/');  // Dev server
// Cookies from API login won't work here!
```

### Mistake 2: Forgetting to Build
```bash
# ❌ WRONG
cd middleware && python -m uvicorn app.main:app
# Visit http://localhost:8000/admin/ → 404
# Forgot to build frontend first!
```

### Mistake 3: Wrong Login Method
```javascript
// ❌ WRONG: UI login in headless mode
await page.fill('input[name="username"]', 'admin');
await page.click('button[type="submit"]');
// Flaky, slow, may fail on auth state issues

// ✅ RIGHT: API login
await page.request.post('http://localhost:8000/api/v1/public/auth/login', {
  data: { username: 'admin', password: 'admin' }
});
// Reliable, fast, sets cookies properly
```

### Mistake 4: Not Waiting for Data
```javascript
// ❌ WRONG
await page.click('text=Клиенты');
await page.screenshot({ path: 'customers.png' });
// Table still loading!

// ✅ RIGHT
await page.click('text=Клиенты');
await page.waitForTimeout(3000);
await page.getByText('Обновить').click();
await page.waitForTimeout(3000);
await page.screenshot({ path: 'customers.png' });
```

---

## Environment Variables Reference

| Variable | Development | E2E Test | Production |
|----------|-------------|----------|------------|
| `DATABASE_URL` | `sqlite:///./crm.db` | `sqlite:///./test.db` | `postgresql://...` |
| `REDIS_URL` | `redis://localhost:6379/0` | `redis://redis-e2e:6379/0` | `redis://prod:6379/0` |
| `E2E_TEST_MODE` | `false` | `true` | `false` |
| `E2E_ADMIN_SECRET` | - | `test-secret-key` | - |
| `ENVIRONMENT` | `development` | `test` | `production` |
| `JWT_SECRET` | `dev-secret` | `test-secret` | `${JWT_SECRET}` |

---

## Debugging Auth Issues

### Step 1: Check Cookie Domain
```bash
curl -I http://localhost:8000/api/v1/public/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  2>&1 | grep -i set-cookie

# Should show: Domain=localhost (NOT port-specific)
```

### Step 2: Verify Proxy Working
```bash
# In Vite dev mode:
curl http://localhost:5173/api/v1/public/status
# Should return backend status

# If 404, proxy isn't configured correctly
```

### Step 3: Check Data Exists
```bash
curl http://localhost:8000/api/v1/customers \
  -H "Cookie: $(cat cookie.txt)"
# Should return customer list, not empty array
```

### Step 4: Verify Frontend Build
```bash
ls -la admin-ui/dist/
# Should show index.html and assets/
```

---

## File Locations

- **Guide:** `docs/development/ENVIRONMENT_CONSISTENCY.md`
- **Docker Compose:** `docker-compose.e2e.yml`
- **Vite Config:** `admin-ui/vite.config.ts`
- **Test Shared:** `admin-ui/e2e/_shared.ts`
- **Backend Auth:** `middleware/app/admin_auth_api.py`

---

## Quick Commands Reference

```bash
# Development (Pattern 1)
cd middleware && python -m uvicorn app.main:app --port 8000
cd admin-ui && npm run dev

# Production/Screenshots (Pattern 2)
cd admin-ui && npm run build
cd ../middleware && python -m uvicorn app.main:app --port 8000
node admin-ui/screenshots/capture-working.mjs

# Docker E2E (Pattern 3)
docker-compose -f docker-compose.e2e.yml up -d
npm run test:e2e
docker-compose -f docker-compose.e2e.yml down
```
