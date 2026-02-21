# 🧪 E2E Testing Guide - ERP GreenHouse

**Version:** 2.0.0  
**Date:** February 21, 2026  
**Status:** Active Implementation

---

## 🔒 Security Principles

### Test Data Isolation

**CRITICAL:** Test data NEVER goes to production!

1. **Test API disabled by default** - Only enabled with `E2E_TEST_MODE=true`
2. **Environment variables set explicitly** - No .env files for tests
3. **Credentials fetched from DB** - Tests query database, don't hardcode
4. **Separate from production** - Test database, not production DB

---

## 🚀 Quick Start

### Run E2E Tests

```bash
# Windows
cd scripts
.\run-e2e-tests.bat

# The script will:
# 1. Kill existing processes on ports 8000/5173
# 2. Set E2E environment variables explicitly
# 3. Start backend with E2E_TEST_MODE=true
# 4. Start frontend dev server
# 5. Run Playwright E2E tests
# 6. Clean up processes
```

### Manual Setup

**1. Start Backend (with explicit env vars):**

```bash
cd middleware
.\.venv\Scripts\activate

# Set E2E variables EXPLICITLY (no .env files!)
set E2E_TEST_MODE=true
set E2E_ADMIN_SECRET=test-secret-key

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**2. Start Frontend:**

```bash
cd admin-ui
npm run dev
```

**3. Run Tests:**

```bash
cd admin-ui
npm run test:e2e:smoke
```

---

## 📁 File Structure

```
ErpGreeHouse/
├── .env                        # Single env file for dev/docker (NOT for tests!)
├── middleware/
│   ├── app/
│   │   ├── main.py            # No .env loading (vars set explicitly)
│   │   └── test_api.py        # Test API endpoints
│   └── ...
├── admin-ui/
│   └── e2e/
│       ├── _shared.ts         # Test utilities (fetches credentials from DB)
│       ├── global-setup.ts    # Runs once before all tests
│       └── smoke/
│           ├── roles.spec.ts  # Role-based tests
│           └── smoke.spec.ts  # Smoke tests
└── scripts/
    └── run-e2e-tests.bat      # Automated test runner
```

---

## 🔧 Test API Endpoints

### Bootstrap Test Data

```bash
POST /api/v1/test/bootstrap
Headers: x-admin-secret: test-secret-key

Response:
{
  "success": true,
  "users_updated": 3,
  "message": "Test users created/updated with known credentials"
}
```

### Get Credentials from DB

```bash
GET /api/v1/test/credentials
Headers: x-admin-secret: test-secret-key

Response:
{
  "credentials": {
    "admin": { "username": "admin", "password": "TestPass123!", "role": "owner" },
    "operator": { "username": "operator", "password": "TestPass123!", "role": "operator" },
    "manager": { "username": "manager", "password": "TestPass123!", "role": "marketer" }
  }
}
```

### Reset Database

```bash
POST /api/v1/test/reset
Headers: x-admin-secret: test-secret-key

Response:
{
  "success": true,
  "deleted_rows": { ... },
  "message": "Test database reset to clean state"
}
```

---

## 🧪 Writing Tests

### Use Dynamic Credentials

```typescript
import { login, initTestCredentials, TEST_CREDENTIALS } from './_shared'

test.beforeAll(async ({ page }) => {
  // Fetch credentials from DB before tests
  await initTestCredentials(page)
})

test('my test', async ({ page }) => {
  // ✅ CORRECT: Use login helper with dynamic credentials
  await login(page, 'admin')
  
  // ❌ WRONG: Don't hardcode passwords
  await page.fill('input[placeholder="Пароль"]', 'admin')
})
```

### Test Isolation

```typescript
test.beforeEach(async ({ page }) => {
  // Reset database before each test for isolation
  await resetTestDatabase(page)
})
```

---

## 📊 Test Credentials

| User | Password | Role | Source |
|------|----------|------|--------|
| `admin` | TestPass123! | owner | Set by `/api/v1/test/bootstrap` |
| `operator` | TestPass123! | operator | Set by `/api/v1/test/bootstrap` |
| `manager` | TestPass123! | marketer | Set by `/api/v1/test/bootstrap` |

**⚠️ WARNING:** These credentials ONLY work when:
- `E2E_TEST_MODE=true` in backend
- Test API is enabled
- **NEVER use in production!**

---

## 🔍 Debugging

### Enable Debug Logging

```bash
# Set environment variable
set DEBUG=true

# Run tests with verbose output
npm run test:e2e:smoke -- --reporter=list
```

### View Test Reports

```bash
# HTML report
open playwright-report/index.html

# Trace viewer
npx playwright show-trace test-results/trace.zip
```

### Common Issues

**Issue: Test API returns 404**

```bash
# Solution: Set E2E_TEST_MODE explicitly
set E2E_TEST_MODE=true
# Restart backend
```

**Issue: Test API returns 401 Unauthorized**

```bash
# Solution: Set E2E_ADMIN_SECRET explicitly
set E2E_ADMIN_SECRET=test-secret-key
# Restart backend
```

**Issue: Login fails with "Invalid credentials"**

```bash
# Solution: Bootstrap test data first
curl -X POST http://localhost:8000/api/v1/test/bootstrap \
  -H "x-admin-secret: test-secret-key"

# Or re-run global setup
npm run test:e2e:smoke
```

---

## ✅ Checklist for New Tests

- [ ] Call `initTestCredentials()` before tests
- [ ] Use `login()` helper from `_shared.ts`
- [ ] Don't hardcode passwords
- [ ] Fetch credentials from DB via Test API
- [ ] Add proper error handling
- [ ] Use `TEST_CREDENTIALS` object
- [ ] Add debug logging
- [ ] Test runs in isolation
- [ ] Test cleans up after itself

---

## 🎯 Best Practices

### DO ✅

- Use `login()` helper
- Fetch credentials from DB
- Use `TEST_CREDENTIALS` object
- Add proper timeouts
- Log test actions
- Handle errors gracefully
- Set env vars explicitly for tests
- Clean up test data

### DON'T ❌

- Hardcode passwords
- Use production credentials
- Rely on .env files for tests
- Skip error handling
- Use short timeouts
- Leave test data behind
- Test without `E2E_TEST_MODE=true`

---

## 📚 Related Documentation

- **Test Automation Plan:** `docs/plans/test_automation_plan.md`
- **Test Execution Rules:** `docs/plans/test_execution_rules.md`
- **Testing Strategy:** `docs/plans/testing_strategy.md`
- **Development Environment:** `.env` (project root)

---

**Last Updated:** February 21, 2026  
**Version:** 2.0.0  
**Status:** Active Implementation
