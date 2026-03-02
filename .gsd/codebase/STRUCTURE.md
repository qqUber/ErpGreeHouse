# STRUCTURE.md

## Project Root Structure

```
ErpGreeHouse/
├── admin-ui/                 # Frontend application (React + TypeScript)
├── middleware/              # Backend application (FastAPI + aiogram)
├── prod/                    # Production configuration (Docker)
├── docs/                    # Documentation
├── tests/                   # Test files and reports
├── scripts/                 # Helper scripts
├── unit-report-2/           # Unit test reports
├── crm.db                   # SQLite database (development)
├── .venv/                   # Python virtual environment
├── .gsd/                    # GSD framework configuration
├── .github/                 # GitHub workflows
└── [Configuration files]    # .gitignore, .pre-commit-config.yaml, etc.
```

## 1. admin-ui/ (Frontend)

```
admin-ui/
├── src/                     # Source code
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Entry point
│   ├── api.ts              # API client layer
│   ├── authWorker.ts       # Token refresh logic
│   ├── i18n.ts             # Internationalization setup
│   ├── styles.css          # Global styles
│   ├── vite-env.d.ts       # Vite environment declarations
│   ├── stores/             # State management
│   │   └── auth.tsx        # Auth state store
│   ├── components/         # Reusable components
│   │   ├── AnalyticsCharts.tsx       # Data visualization
│   │   ├── IntegrationSettings.tsx   # ERP integration config
│   │   ├── LanguageSwitcher.tsx      # Multi-language support
│   │   └── ProductImport.tsx         # Product management
│   ├── locales/            # Translation files
│   │   ├── en.json         # English
│   │   ├── ru.json         # Russian
│   │   └── srb.json        # Serbian
│   ├── LoyaltyTmaView.tsx  # Loyalty program management
│   └── MarketingView.tsx   # Marketing campaigns
├── dist/                   # Build output
├── node_modules/           # NPM dependencies
├── e2e/                    # Playwright E2E tests
├── playwright-report/      # Test reports
├── test-results/           # Test artifacts
├── package.json            # NPM dependencies
├── package-lock.json       # Dependency lock file
├── tsconfig.json           # TypeScript configuration
├── biome.json              # Code formatter config
├── vite.config.ts          # Vite configuration
├── playwright.config.ts     # Playwright configuration
└── index.html              # HTML entry point
```

**Key Files:**
- `src/App.tsx` - Handles routing, layout, and main application flow
- `src/api.ts` - All API endpoints and HTTP request/response handling
- `src/authWorker.ts` - Background worker for token refresh logic
- `src/stores/auth.tsx` - Auth state management with MobX

## 2. middleware/ (Backend)

```
middleware/
├── app/                    # Application source code
│   ├── __init__.py         # Package marker
│   ├── main.py             # FastAPI application entry point
│   ├── config.py           # Configuration management
│   ├── db.py               # Database session management
│   ├── auth.py             # JWT token and authentication logic
│   ├── handlers.py         # Telegram bot message handlers
│   ├── loyalty.py          # Loyalty program logic
│   ├── worker.py           # Celery task worker
│   ├── middlewares.py      # FastAPI middleware
│   ├── request_context.py  # Request context management
│   ├── security.py         # Security utilities
│   ├── storage.py          # Storage helpers
│   ├── identify.py         # User identification
│   ├── menu.py             # Telegram bot menu configuration
│   ├── pdfgen.py           # PDF generation (placeholder)
│   ├── pos_templates.py    # POS templates
│   ├── runtime.py          # Runtime configuration
│   ├── trigger_engine.py   # Event trigger engine
│   ├── integration_events.py # Integration event handlers
│   ├── admin_api.py        # Admin API endpoints
│   ├── admin_auth_api.py   # Auth API endpoints (login, refresh, logout)
│   ├── integrations_api.py # Integration configuration API
│   ├── marketing_api.py    # Marketing API endpoints
│   ├── products_api.py     # Product management API
│   ├── tma_api.py          # Telegram Mini App API
│   ├── test_api.py         # Test endpoints
│   ├── integrations/       # External integrations
│   │   ├── __init__.py
│   │   ├── erpnext.py      # ERPNext API client
│   │   └── [other integrations]
│   └── schemas/            # Pydantic data schemas
│       ├── __init__.py
│       └── [schema files]
├── tests/                  # Test files (pytest)
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── .venv/                  # Python virtual environment
├── requirements.txt        # Python dependencies
├── requirements-dev.txt    # Development dependencies
└── [Environment files]     # .env.example, .env (local)
```

**Key Files:**
- `app/main.py` - FastAPI app creation, middleware setup, CORS config
- `app/admin_auth_api.py` - Auth endpoints with JWT token generation
- `app/admin_api.py` - Admin operations (customers, orders, products)
- `app/integrations/erpnext.py` - ERPNext integration client
- `app/loyalty.py` - Loyalty points calculation and redemption
- `app/worker.py` - Celery tasks for background processing

## 3. prod/ (Production Configuration)

```
prod/
├── docker-compose.yml              # Main Docker Compose file
├── docker-compose.infrastructure.yml # Infrastructure (Postgres, Redis)
├── Dockerfile                      # Middleware Docker image
├── requirements.txt                # Production dependencies
├── .env.production.example         # Example production environment
└── README.md                       # Deployment instructions
```

**Production Stack:**
- Nginx - Reverse proxy
- PostgreSQL 15 - Database
- Redis 7 - Cache and Celery broker
- Middleware (FastAPI + aiogram)
- Admin UI (static files)

## 4. docs/ (Documentation)

```
docs/
├── architecture/                 # System architecture
│   ├── system_architecture.md    # Core architecture diagram
│   └── auth_flow.md              # Authentication flow
├── plans/                        # Development plans
│   ├── development_plan.md       # Comprehensive roadmap
│   ├── mvp_scope.md              # MVP features
│   └── testing_strategy.md       # Testing approach
├── testing/                      # Test documentation
│   ├── test_report.html          # Test report
│   └── [other test docs]
└── [other docs]                  # pre-commit-checklist.md, etc.
```

## 5. tests/ (Test Files)

```
tests/
├── fixtures/                     # Test fixtures
├── artifacts/                    # Test artifacts (screenshots, logs)
├── FINAL_TEST_REPORT.md          # Complete test report
├── TEST_REPORT.md                # Intermediate test report
└── PHASE_3_401_REFRESH_LOOP_TEST_PLAN.md # Refresh token test plan
```

## 6. scripts/ (Helper Scripts)

```
scripts/
├── logs/                         # Log files
├── run-built.ps1                 # Run built application (Windows)
├── run-e2e-new.ps1              # Run E2E tests (Windows)
├── run-e2e-tests.ps1            # Run Playwright tests (Windows)
├── run-e2e-tests.bat            # Run E2E tests (Windows CMD)
├── stop-dev.ps1                 # Stop dev servers (Windows)
├── test_auth_e2e.py             # E2E auth test
├── verify_task.ps1              # Verify task completion (Windows)
└── verify_task.sh               # Verify task completion (Linux/Mac)
```

## 7. Configuration Files

**Root Level:**
- `.gitignore` - Git ignore rules
- `.pre-commit-config.yaml` - Pre-commit hooks configuration
- `.kilocodeignore` - KiloCode ignore rules
- `.pytest_cache/` - pytest cache directory
- `.mypy_cache/` - mypy type checker cache
- `crm.db` - SQLite database (development)
- `README.md` - Project documentation
- `SETUP_GUIDE.md` - Setup instructions
- `SECURITY.md` - Security information
- `LICENSE` - MIT License

## Key Interactions

**Frontend → Backend:**
```
admin-ui/src/api.ts → middleware/app/admin_api.py
admin-ui/src/api.ts → middleware/app/admin_auth_api.py
admin-ui/src/api.ts → middleware/app/products_api.py
```

**Backend → External Services:**
```
middleware/app/integrations/erpnext.py → ERPNext API
middleware/app/handlers.py → Telegram Bot API
middleware/app/worker.py → Celery tasks via Redis
```

**Data Flow:**
```
Telegram Bot → handlers.py → business logic → db.py → SQLite/PostgreSQL
Admin UI → API endpoints → business logic → db.py → SQLite/PostgreSQL
```

## Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| **Backend** | Uvicorn dev server | Docker container |
| **Frontend** | Vite dev server | Nginx static files |
| **Database** | SQLite (crm.db) | PostgreSQL 15 |
| **Cache** | Redis/Memurai | Redis 7 |
| **ERP Integration** | Mock mode (ERP_MOCK_MODE=true) | Real ERPNext |