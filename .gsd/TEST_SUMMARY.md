# Test Summary Report

**Generated:** 2026-03-04

---

## Test Counts

| Type | Count | Files |
|------|-------|-------|
| pytest (backend) | 561 | 39 |
| ├─ Unit | ~400+ | 25 |
| └─ Integration | ~150+ | 14 |
| Playwright E2E | 132 | 16 |
| ├─ Smoke | 3 | |
| ├─ Critical | 1 | |
| ├─ Functional | 8 | |
| └─ Roles | 4 | |
| **Total** | **693** | |

---

## Coverage (Backend)

| Module | Coverage |
|--------|----------|
| app/db.py | 93% |
| app/config.py | 61% |
| app/identify.py | 55% |
| app/admin_auth_api.py | 45% |
| app/analytics_api.py | 43% |
| app/auth.py | 39% |
| app/admin_api.py | 26% |
| app/handlers.py | 17% |
| **TOTAL** | **39%** |

---

## Run Commands

```bash
# Backend
pytest                           # All 561 tests
pytest -m unit                   # Unit only
pytest -m integration            # Integration only

# Frontend E2E (132 tests)
npm run test:e2e                # All E2E
npm run test:e2e:smoke         # Smoke (3)
npm run test:e2e:critical      # Critical (1)
```

---

## Test Categories

| Category | Count | Purpose |
|----------|-------|---------|
| unit | ~400+ | Core business logic |
| integration | ~150+ | API endpoints, DB |
| smoke | 3 | Quick sanity |
| critical | 1 | Key flows |
| functional | 8 | Features |
| roles | 4 | RBAC |

---

## Files

- Test config: `middleware/pytest.ini`
- E2E config: `admin-ui/playwright.config.ts`
- Test runner: `middleware/test_runner.py`
