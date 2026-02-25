# Technical Structure Documentation

> **Source of Truth** - This document defines the canonical project structure for ErpGreeHouse ERP system.

---

## Phase 2 Stability Improvements (2026-02-25)

This section documents the key stability improvements added in Phase 2.

### 1. API Schema Changes - integrations_api.py

The `/api/v1/integrations` endpoint now returns a direct list instead of an object with an `items` key:

| Endpoint | Previous Response | New Response |
|----------|------------------|--------------|
| `GET /api/v1/integrations` | `{"items": [...]}` | `list[IntegrationOut]` |

**Code Reference**: [`list_integrations()`](middleware/app/integrations_api.py:50) returns `list[IntegrationOut]` (line 53).

### 2. Redis 8 Sorted Set Operations - loyalty.py

Advanced tier calculation using Redis 8 sorted sets for high-load scenarios:

| Function | Purpose | Complexity |
|---------|---------|------------|
| [`update_user_spent_score()`](middleware/app/loyalty.py:104) | Set user's total spent amount | O(log N) |
| [`increment_user_spent_score()`](middleware/app/loyalty.py:120) | Atomic increment using ZINCRBY | O(log N) |
| [`get_user_rank()`](middleware/app/loyalty.py:140) | Get user's leaderboard rank | O(log N) |
| [`get_user_percentile()`](middleware/app/loyalty.py:150) | Calculate percentile rank | O(log N) |
| [`get_top_spenders()`](middleware/app/loyalty.py:165) | Get top N spenders | O(log N + M) |
| [`get_users_in_tier()`](middleware/app/loyalty.py:196) | Get users by tier threshold | O(log N + M) |
| [`calculate_user_tier()`](middleware/app/loyalty.py:272) | Determine tier from score | O(log N) |
| [`bulk_increment_scores()`](middleware/app/loyalty.py:354) | Batch update with pipeline | O(log N * M) |

**Redis Keys**:
- `crm:leaderboard:spent` - Main sorted set for spent amounts
- `crm:tier:membership` - Tier membership tracking
- `crm:user:scores` - User score cache

### 3. Python 3.14 Task Groups - bot.py

Concurrent user session management using Python 3.14 Task Groups:

| Component | Description |
|-----------|-------------|
| [`run_bot()`](middleware/app/bot.py:51) | Context manager with TaskGroup support |
| [`ConcurrentUserSessions`](middleware/app/bot.py:101) | Per-user task isolation class |
| [`start_user_session_with_group()`](middleware/app/bot.py:152) | TaskGroup-based session management |

**Key Features**:
- Uses `asyncio.TaskGroup` for structured concurrency (Python 3.14+)
- `handle_as_task_group=True` parameter for better error handling
- Fallback to standard `create_task` for Python < 3.14
- Per-user task cancellation and proper cleanup

---

## Core Directories

| Directory | Purpose | Technology |
|-----------|---------|-------------|
| [`admin-ui/`](admin-ui) | Frontend SPA application | React 18, TypeScript, Vite |
| [`middleware/`](middleware) | Backend Python API | FastAPI, Pydantic, SQLAlchemy |
| [`docs/`](docs) | Project documentation | Markdown |
| [`prod/`](prod) | Production deployment configs | Docker Compose, Nginx |
| [`.github/workflows/`](.github/workflows) | CI/CD pipelines | GitHub Actions |

### Directory Tree

```
ErpGreeHouse/
├── admin-ui/              # Frontend application
│   ├── e2e/              # Playwright E2E tests
│   ├── src/              # React source code
│   │   ├── components/  # UI components
│   │   ├── stores/      # State management
│   │   └── locales/     # i18n translations
│   ├── playwright.config.ts
│   ├── package.json
│   └── vite.config.ts
│
├── middleware/            # Backend Python application
│   ├── app/              # FastAPI application modules
│   │   ├── admin_api.py
│   │   ├── admin_auth_api.py
│   │   ├── auth.py
│   │   ├── bot.py                 # Telegram bot with Python 3.14 Task Groups
│   │   ├── db.py
│   │   ├── handlers.py
│   │   ├── integrations_api.py    # API returns list[IntegrationOut]
│   │   ├── loyalty.py             # Redis 8 sorted set operations
│   │   └── ...
│   ├── tests/            # Python tests
│   │   ├── unit/        # Unit tests
│   │   └── integration/ # Integration tests
│   ├── test-reports/    # Generated test reports
│   ├── requirements.txt
│   └── pytest.ini
│
├── docs/                  # Project documentation
│   ├── architecture/     # Architecture docs
│   ├── integrations/    # Integration guides
│   ├── plans/           # Project plans
│   ├── security/        # Security docs
│   └── testing/         # Testing docs
│
├── prod/                  # Production deployment
│   ├── docker-compose.yml
│   ├── nginx/nginx.conf
│   └── middleware/Dockerfile
│
├── scripts/               # Build and deployment scripts
│   ├── run-e2e-tests.ps1
│   └── ...
│
├── tests/                 # Cross-cutting tests
│   ├── fixtures/         # Test fixtures
│   └── FINAL_TEST_REPORT.md
│
├── .github/
│   └── workflows/        # CI/CD pipelines
│
└── unit-report-2/         # ⚠️ Generated HTML reports (cleanup candidate)
```

---

## Core Files

### Root Level

| File | Description |
|------|-------------|
| [`README.md`](README.md) | Project overview and quick start |
| [`SETUP_GUIDE.md`](SETUP_GUIDE.md) | Detailed setup instructions |
| [`SECURITY.md`](SECURITY.md) | Security policy and contacts |
| [`.gitignore`](.gitignore) | Git ignore patterns |
| [`LICENSE`](LICENSE) | Project license |

### Configuration Files

| File | Purpose |
|------|---------|
| [`admin-ui/package.json`](admin-ui/package.json) | Frontend dependencies |
| [`admin-ui/tsconfig.json`](admin-ui/tsconfig.json) | TypeScript config |
| [`admin-ui/vite.config.ts`](admin-ui/vite.config.ts) | Vite bundler config |
| [`admin-ui/playwright.config.ts`](admin-ui/playwright.config.ts) | E2E test config |
| [`middleware/requirements.txt`](middleware/requirements.txt) | Python dependencies |
| [`middleware/pytest.ini`](middleware/pytest.ini) | Pytest configuration |

---

## Test Directories

### E2E Tests: `admin-ui/e2e/`

Playwright-based end-to-end tests organized by category:

```
admin-ui/e2e/
├── auth/                 # Authentication flow tests
│   ├── admin-bypass.spec.ts
│   ├── auth-fix-verification.spec.ts
│   ├── login-flow-test.spec.ts
│   └── simple-auth-test.spec.ts
├── critical/             # Critical path tests
│   └── critical-flow.spec.ts
├── functional/           # Functional tests
│   ├── auth-timing.spec.ts
│   ├── i18n-format.spec.ts
│   ├── manual-entry.spec.ts
│   ├── mvp-core.spec.ts
│   ├── mvp-requirements.spec.ts
│   ├── performance.spec.ts
│   └── role-config.spec.ts
├── roles/                # Role-based access tests
│   ├── admin-full-flow.spec.ts
│   ├── manager-marketing-flow.spec.ts
│   ├── operator-pos-flow.spec.ts
│   └── permission-boundaries.spec.ts
└── smoke/                # Smoke tests
    ├── analytics.spec.ts
    ├── roles.spec.ts
    └── smoke.spec.ts
```

### Python Tests: `middleware/tests/`

Pytest-based backend tests:

```
middleware/tests/
├── conftest.py           # Pytest fixtures
├── init_db.py            # Database initialization
├── test_jwt_master_suite.py
├── unit/                 # Unit tests
│   ├── test_analytics.py
│   ├── test_bot_handlers.py
│   └── test_foreign_key_constraints.py
└── integration/          # Integration tests
    ├── test_admin_api.py
    ├── test_admin_auth.py
    ├── test_erp_client.py
    ├── test_erp_client_integration.py
    ├── test_integrations.py
    ├── test_jwt_comprehensive_e2e.py
    ├── test_jwt_integration.py
    ├── test_jwt_roles_e2e.py
    ├── test_products_import.py
    ├── test_role_access.py
    └── test_security_masking.py
```

---

## Scripts

Build and deployment automation scripts:

| Script | Purpose |
|--------|---------|
| [`scripts/run-e2e-tests.ps1`](scripts/run-e2e-tests.ps1) | Run E2E tests |
| [`scripts/run-e2e-tests.bat`](scripts/run-e2e-tests.bat) | Run E2E tests (Windows batch) |
| [`scripts/test_auth_e2e.py`](scripts/test_auth_e2e.py) | Auth E2E tests |
| [`scripts/stop-dev.ps1`](scripts/stop-dev.ps1) | Stop development servers |
| [`middleware/run_tests.ps1`](middleware/run_tests.ps1) | Run Python tests |
| [`middleware/run_tests.sh`](middleware/run_tests.sh) | Run Python tests (Unix) |

---

## Cleanup Candidates

The following directories/files are generated artifacts and should be excluded from version control:

### Already in `.gitignore` ✅

| Pattern | Covers |
|---------|--------|
| `node_modules/` | Frontend dependencies |
| `__pycache__/` | Python bytecode |
| `*.pyc` | Python compiled files |
| `.venv/` | Python virtual environment |
| `*.log` | Log files |
| `admin-ui/test-results/` | Playwright test results |
| `admin-ui/playwright-report/` | Playwright HTML reports |
| `middleware/reports/` | Test reports directory |
| `.coverage` | Coverage data |

### Not yet in `.gitignore` ⚠️

| Path | Type | Recommendation |
|------|------|----------------|
| `unit-report-2/` | Generated HTML report | **Add to .gitignore** |
| `middleware/test-reports/*.txt` | Test report txt files | Already covered by `.gitignore` |
| `admin-ui/login-page.png` | Screenshot artifact | Should be in `.gitignore` |

### Suggested `.gitignore` Additions

```gitignore
# Test artifacts (add if not present)
unit-report-2/

# Screenshots (if generated during tests)
*.png
!admin-ui/login-page.png  # Keep if needed as reference
```

## Environment

| Component | Version | Notes |
|-----------|---------|-------|
| Python | 3.14-slim | Backend runtime |
| Redis | 8.0-alpine | Cache and session storage |
| Node.js | 18+ | Frontend build tools |

---

## CI/CD Pipeline

GitHub Actions workflows in [`.github/workflows/`](.github/workflows):

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `tests.yml` | Push/PR | Run test suite |
| (other workflows) | - | Deployment, linting, etc. |

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│   admin-ui      │     │   Middleware    │
│   (Frontend)    │────▶│   (FastAPI)     │
│   React/Vite    │     │   Python        │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │  Redis   │ │   ERP    │ │  Telegram│
              │ (Cache)  │ │  System  │ │   Bot    │
              └──────────┘ └──────────┘ └──────────┘
```

---

## Last Updated

- **Date**: 2026-02-25
- **Version**: 1.1.0
- **Phase**: 2 - Stability Improvements
- **Maintainer**: Development Team
