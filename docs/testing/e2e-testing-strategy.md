# 🧪 E2E Testing Strategy - ERP GreenHouse

**Version:** 1.0.0  
**Date:** February 21, 2026  
**Status:** Active Implementation

---

## 🔒 Security First

### ⚠️ CRITICAL: Test Data Isolation

**Test data NEVER goes to production:**

1. **Test API disabled by default** - Only enabled with `E2E_TEST_MODE=true`
2. **Separate environment** - Use test database, not production
3. **Environment variables** - Control via `.env.test`, not production `.env`
4. **Authentication required** - Test API requires `x-admin-secret` header

### Security Checklist

- [x] Test API returns 404 unless `E2E_TEST_MODE=true`
- [x] Test endpoints require owner role authentication
- [x] Test credentials only work in test mode
- [x] Production database never modified by tests
- [x] Test data cleaned up after tests

---

## 📋 Test Data Strategy

### Test Credentials

| User | Password | Role | Purpose |
|------|----------|------|---------|
| `admin` | `TestPass123!` | owner | Full access tests |
| `operator` | `TestPass123!` | operator | POS workflow tests |
| `manager` | `TestPass123!` | marketer | Marketing tests |

**⚠️ WARNING:** These credentials ONLY work when:
- `E2E_TEST_MODE=true` in backend
- Test API is enabled
- **NEVER use in production!**

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Playwright     │
│  E2E Tests      │
└────────┬────────┘
         │
         │ HTTP Requests
         ▼
┌─────────────────┐
│  Global Setup   │  ← Runs ONCE before all tests
│  (bootstrap)    │     Creates test users
└────────┬────────┘
         │
         │ API Calls to /api/v1/test/*
         ▼
┌─────────────────┐
│  Backend        │  ← Only responds when
│  Test API       │     E2E_TEST_MODE=true
└────────┬────────┘
         │
         │ Database
         ▼
┌─────────────────┐
│  Test DB        │  ← Separate from production
│  (crm.db)       │
└─────────────────┘
```

---

## 🚀 Quick Start

### Run E2E Tests

```bash
# Windows
cd scripts
run-e2e-tests.bat

# Linux/Mac
export E2E_TEST_MODE=true
cd middleware
.\.venv\Scripts\activate  # or source .venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &

cd ../admin-ui
npm run dev &

npm run test:e2e:smoke
```

### Manual Setup

**1. Start Backend (with test mode):**

```bash
cd middleware
.\.venv\Scripts\activate
set E2E_TEST_MODE=true
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
admin-ui/e2e/
├── _shared.ts              # Shared utilities, test credentials
├── global-setup.ts         # Runs once before all tests
├── playwright.config.ts    # Playwright configuration
└── smoke/
    ├── roles.spec.ts       # Role-based access tests
    └── smoke.spec.ts       # Smoke tests
```

```
middleware/app/
├── test_api.py             # Test API endpoints
└── ...
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
  "message": "Test users created/updated with known credentials",
  "warning": "TEST MODE - DO NOT USE IN PRODUCTION"
}
```

### Reset Database

```bash
POST /api/v1/test/reset
Headers: x-admin-secret: test-secret-key

Response:
{
  "success": true,
  "deleted_rows": {
    "customers": 5,
    "products": 3,
    ...
  },
  "message": "Test database reset to clean state"
}
```

### Health Check

```bash
GET /api/v1/test/ping
Headers: x-admin-secret: test-secret-key

Response:
{
  "ok": true
}
```

---

## 🧪 Writing Tests

### Use Test Credentials

```typescript
import { login, TEST_CREDENTIALS } from './_shared'

test('my test', async ({ page }) => {
  // ✅ CORRECT: Use login helper
  await login(page, 'admin')
  
  // ❌ WRONG: Don't hardcode passwords
  await page.goto('/')
  await page.fill('input[placeholder="Логин"]', 'admin')
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

### Error Handling

```typescript
import { login } from './_shared'

test('login test', async ({ page }) => {
  try {
    await login(page, 'admin')
  } catch (error) {
    console.error('Login failed:', error)
    throw error
  }
})
```

---

## 📊 Test Categories

| Category | Location | Tests | Purpose |
|----------|----------|-------|---------|
| **Smoke** | `e2e/smoke/` | 5 | Basic functionality |
| **Critical** | `e2e/critical/` | 1 | Critical user journeys |
| **Functional** | `e2e/functional/` | 6 | Feature tests |
| **Roles** | `e2e/roles/` | 4 | Role-based access |

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
# Solution: Enable E2E_TEST_MODE
set E2E_TEST_MODE=true
# Restart backend
```

**Issue: Login fails with "Invalid credentials"**

```bash
# Solution: Bootstrap test data
curl -X POST http://localhost:8000/api/v1/test/bootstrap \
  -H "x-admin-secret: test-secret-key"
```

**Issue: Tests timeout**

```bash
# Solution: Increase timeout in playwright.config.ts
export default defineConfig({
  timeout: 90_000,
  expect: { timeout: 20_000 }
})
```

---

## ✅ Checklist for New Tests

- [ ] Use `login()` helper from `_shared.ts`
- [ ] Don't hardcode passwords
- [ ] Add proper error handling
- [ ] Use `TEST_CREDENTIALS` object
- [ ] Add debug logging
- [ ] Test runs in isolation
- [ ] Test cleans up after itself
- [ ] Test works with `E2E_TEST_MODE=true`

---

## 🎯 Best Practices

### DO ✅

- Use `login()` helper
- Use `TEST_CREDENTIALS`
- Add proper timeouts
- Log test actions
- Handle errors gracefully
- Clean up test data

### DON'T ❌

- Hardcode passwords
- Use production credentials
- Skip error handling
- Use short timeouts
- Leave test data behind
- Test without `E2E_TEST_MODE=true`

---

## 📚 Related Documentation

- **Test Automation Plan:** `docs/plans/test_automation_plan.md`
- **Test Execution Rules:** `docs/plans/test_execution_rules.md`
- **Testing Strategy:** `docs/plans/testing_strategy.md`

---

**Last Updated:** February 21, 2026  
**Version:** 1.0.0  
**Status:** Active Implementation
