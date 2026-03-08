# STRUCTURE.md - Codebase Structure and Organization

## Overview

ErpGreeHouse is organized into several main directories, each serving a specific purpose. The codebase follows a modular architecture with clear separation between backend (middleware), frontend (admin-ui), production configuration (prod), and tests.

## Root Directory Structure

```
ErpGreeHouse/
├── .github/                     # GitHub Actions workflows and CI/CD
├── .gsd/                        # Project planning and management
├── .kilocode/                   # Kilocode automation configuration
├── admin-ui/                    # Frontend (React + TypeScript)
├── audit/                       # Audit reports
├── docs/                        # Documentation
├── middleware/                  # Backend (FastAPI + aiogram)
├── prod/                        # Production configuration
├── scripts/                     # Utility scripts
├── tests/                       # Tests (unit, integration, E2E)
├── .gitignore                   # Git ignore rules
├── .pre-commit-config.yaml      # Pre-commit hooks configuration
├── LICENSE                      # MIT License
├── README.md                    # Project README
├── SECURITY.md                  # Security guidelines
├── SETUP_GUIDE.md               # Setup instructions
├── docker-compose.e2e.yml       # E2E test Docker Compose
├── docker-compose.local.yml     # Local development Docker Compose
├── docker-compose.verify.yml    # Verification Docker Compose
└── run-e2e-docker.sh           # E2E test runner script
```

## Backend Structure (middleware/)

```
middleware/
├── app/                        # Application code
│   ├── __pycache__/            # Python bytecode cache
│   ├── integrations/          # External API integrations
│   │   ├── erpnext/           # ERPNext integration
│   │   └── __init__.py        # Integrations package
│   ├── models/                # Database models and schemas
│   ├── schemas/               # Pydantic schemas for API requests/responses
│   ├── admin_api.py           # Admin UI API endpoints
│   ├── admin_auth_api.py      # Authentication and authorization
│   ├── analytics_api.py       # Analytics and reporting
│   ├── auth.py                # JWT token management
│   ├── config.py              # Configuration management
│   ├── dashboard_api.py       # Dashboard and metrics
│   ├── db.py                  # Database connection and queries
│   ├── erp_scheduler.py       # ERP integration scheduler
│   ├── handlers.py            # Telegram bot handlers
│   ├── identify.py            # User identification
│   ├── integration_events.py  # Integration event handling
│   ├── integration_settings_api.py  # Integration settings
│   ├── integrations_api.py    # Integrations API endpoints
│   ├── loyalty.py             # Loyalty points management
│   ├── main.py                # Application entry point
│   ├── marketing_api.py       # Marketing and campaigns
│   ├── menu.py                # Telegram menu configuration
│   ├── middlewares.py         # FastAPI middleware
│   ├── pdfgen.py              # PDF generation
│   ├── pos_templates.py       # POS receipt templates
│   ├── products_api.py        # Product catalog management
│   ├── rate_limiter.py        # Rate limiting implementation
│   ├── request_context.py     # Request context management
│   ├── runtime.py             # Runtime configuration
│   ├── security.py            # Security utilities
│   ├── storage.py             # Storage management
│   ├── test_api.py            # Testing endpoints
│   ├── tma_api.py             # Telegram Mini App endpoints
│   ├── trigger_engine.py      # Trigger engine for automations
│   ├── url_shortener.py       # URL shortener
│   └── worker.py              # Celery worker configuration
├── data/                      # Data files (Excel, CSV for seeding)
├── receipts/                  # Generated receipt files
├── reports/                   # Test and audit reports
├── scripts/                   # Backend utility scripts
├── tests/                     # Backend tests
│   ├── unit/                  # Unit tests
│   ├── integration/          # Integration tests
│   ├── conftest.py          # Pytest configuration
│   └── test_runner.py       # Test runner
├── tools/                     # Development tools
├── .env                       # Environment variables
├── .env.example              # Environment variables example
├── .venv/                    # Virtual environment (Windows)
├── venv/                     # Virtual environment (Linux/Mac)
├── crm.db                    # SQLite database (development)
├── DEPLOYMENT.md            # Deployment guide
├── Dockerfile               # Dockerfile for backend
├── mypy.ini                 # Mypy configuration
├── pytest.ini               # Pytest configuration
├── requirements.txt         # Python dependencies
├── run_tests.sh             # Test runner (Linux/Mac)
├── run_tests.ps1           # Test runner (Windows)
└── setup_test_env.sh       # Test environment setup (Linux/Mac)
```

## Frontend Structure (admin-ui/)

```
admin-ui/
├── dist/                     # Production build
├── e2e/                      # E2E tests
│   ├── smoke/               # Smoke tests
│   ├── critical/            # Critical path tests
│   ├── functional/          # Functional tests
│   ├── roles/               # Role-based access tests
│   ├── auth/                # Authentication tests
│   ├── accessibility/       # Accessibility tests
│   └── global-setup.ts      # Global test setup
├── public/                   # Static assets
├── screenshots/             # Test screenshots
├── src/                     # Source code
│   ├── components/          # React components
│   │   ├── layout/          # Layout components (Header, Sidebar, etc.)
│   │   ├── common/          # Common components (Button, Input, etc.)
│   │   ├── features/        # Feature-specific components
│   │   └── __tests__/       # Component tests
│   ├── pages/              # Page components
│   │   ├── Dashboard/       # Dashboard page
│   │   ├── Customers/      # Customers page
│   │   ├── Orders/         # Orders page
│   │   ├── Products/       # Products page
│   │   ├── Marketing/      # Marketing page
│   │   ├── Integrations/   # Integrations page
│   │   ├── Settings/       # Settings page
│   │   ├── Login/          # Login page
│   │   └── __tests__/      # Page tests
│   ├── services/           # API and data services
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── constants/          # Constants
│   ├── types/              # TypeScript type definitions
│   ├── i18n/               # Localization
│   ├── App.tsx             # Root component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── tests/                  # Unit tests (Vitest)
├── allure-report/         # Allure test report
├── playwright-report/     # Playwright test report
├── test-report/           # Test report
├── test-results/          # Test results
├── .env.test              # Test environment variables
├── Dockerfile             # Dockerfile for frontend
├── RESPONSIVE_VERIFICATION.md  # Responsive design verification
├── UI_VERIFICATION_REPORT.md  # UI verification report
├── biome.json             # Biome configuration
├── package.json           # npm dependencies
├── pnpm-lock.yaml         # pnpm lock file
├── playwright.config.ts    # Playwright configuration
├── tsconfig.json          # TypeScript configuration
├── tsconfig.tsbuildinfo   # TypeScript build info
├── vite.config.ts         # Vite configuration
└── vite.config.test.ts    # Vitest configuration
```

## Production Configuration (prod/)

```
prod/
├── middleware/            # Backend production configuration
├── nginx/                # Nginx configuration
├── .env.production.example  # Production environment variables example
├── README.md             # Production deployment guide
├── docker-compose.yml    # Production Docker Compose
├── docker-compose.infrastructure.yml  # Infrastructure-only Docker Compose
└── requirements.txt      # Production Python dependencies
```

## Tests Directory (tests/)

```
tests/
├── unit/                 # Unit tests
├── integrations/        # Integration tests
├── fixtures/            # Test fixtures
├── artifacts/           # Test artifacts
├── FINAL_TEST_REPORT.md  # Final test report
├── PHASE_3_401_REFRESH_LOOP_TEST_PLAN.md  # Refresh token loop test plan
└── TEST_REPORT.md       # Test report
```

## Documentation (docs/)

```
docs/
├── architecture/         # System architecture
├── plans/               # Development plans and roadmaps
├── testing/             # Testing strategies and reports
└── pre-commit-checklist.md  # Code review checklist
```

## Scripts Directory (scripts/)

```
scripts/
├── setup_test_env.sh    # Test environment setup (Linux/Mac)
├── setup_test_env.ps1  # Test environment setup (Windows)
├── run_tests.sh        # Test runner (Linux/Mac)
├── run_tests.ps1       # Test runner (Windows)
└── collect_metrics.sh  # Metrics collection
```

## Key Files and Their Purpose

### Backend Key Files

- `middleware/app/main.py` - Application entry point
- `middleware/app/config.py` - Configuration management
- `middleware/app/db.py` - Database connection and queries
- `middleware/app/auth.py` - JWT token management
- `middleware/app/admin_api.py` - Admin UI API endpoints
- `middleware/app/handlers.py` - Telegram bot handlers
- `middleware/app/worker.py` - Celery worker configuration
- `middleware/requirements.txt` - Python dependencies

### Frontend Key Files

- `admin-ui/src/main.tsx` - Entry point
- `admin-ui/src/App.tsx` - Root component
- `admin-ui/package.json` - npm dependencies
- `admin-ui/playwright.config.ts` - Playwright configuration
- `admin-ui/vite.config.ts` - Vite configuration

### Configuration Files

- `.env` - Environment variables
- `docker-compose.yml` - Docker Compose configuration
- `pytest.ini` - Pytest configuration
- `mypy.ini` - Mypy configuration

## Development Workflow

1. **Setup**: Run `setup_test_env.sh` (Linux/Mac) or `setup_test_env.ps1` (Windows)
2. **Development**: Run backend with `python -m uvicorn app.main:app --reload` and frontend with `npm run dev`
3. **Testing**: Run `run_tests.sh` (Linux/Mac) or `run_tests.ps1` (Windows)
4. **Building**: Build frontend with `npm run build`
5. **Production**: Use `prod/` directory for production deployment

## Code Organization Principles

- **Separation of concerns**: Each file and directory has a single responsibility
- **Modularity**: Code is organized into modules (admin_api, analytics_api, etc.)
- **Testability**: Tests are colocated with source code
- **Documentation**: README files and comments explain purpose and usage