# Directory Structure

## Root Level
```
ErpGreeHouse/
├── admin-ui/                 # Frontend application (React + TypeScript)
├── middleware/               # Backend API (FastAPI + Python)
├── docs/                     # Documentation files
├── tests/                    # E2E and integration tests
├── scripts/                  # Helper scripts
├── screenshots/              # Test screenshots
├── prod/                     # Production configuration
├── .gsd/                     # GSD framework files
├── docker-compose*.yml       # Docker Compose configurations
└── README.md                 # Project overview
```

## Frontend Structure (admin-ui/)

```
admin-ui/
├── src/                      # Source code
│   ├── components/          # Reusable React components
│   │   ├── dashboard/      # Dashboard widgets and views
│   │   ├── EmptyState.tsx  # Empty state component
│   │   ├── Pagination.tsx  # Pagination component
│   │   ├── Toast.tsx       # Notification component
│   │   └── ...             # Other components
│   ├── hooks/              # Custom React hooks
│   │   ├── useAppTranslation.ts
│   │   ├── useDashboard.ts
│   │   ├── usePermission.ts
│   │   └── ...
│   ├── stores/             # Global state management
│   │   └── auth.tsx        # Authentication context
│   ├── types/              # TypeScript type definitions
│   │   ├── roles.ts
│   │   ├── language.ts
│   │   └── ...
│   ├── utils/              # Utility functions
│   │   ├── keyboardNavigation.ts
│   │   ├── translationHelpers.ts
│   │   └── ...
│   ├── api.ts              # API client with authentication
│   ├── authWorker.ts       # Web worker for auth flow
│   ├── i18n.ts             # Internationalization config
│   ├── theme.ts            # Theme and styling
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Entry point
│   ├── AnalyticsView.tsx   # Analytics dashboard
│   ├── ComplianceView.tsx  # Compliance management
│   ├── LoyaltyTmaView.tsx  # TMA loyalty program
│   ├── MarketingView.tsx   # Marketing campaigns
│   └── styles.css          # Global styles
├── e2e/                     # Playwright E2E tests
│   ├── auth/              # Authentication tests
│   ├── critical/          # Critical flow tests
│   ├── functional/        # Functional tests
│   ├── roles/             # Role-specific tests
│   ├── smoke/             # Smoke tests
│   └── _shared.ts         # Shared test utilities
├── public/                 # Static assets
├── dist/                   # Build output
├── screenshots/            # Test screenshots
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite config
└── playwright.config.ts    # Playwright config
```

## Backend Structure (middleware/)

```
middleware/
├── app/                     # FastAPI application
│   ├── __init__.py
│   ├── main.py             # Application entry point
│   ├── config.py           # Configuration management
│   ├── db.py               # Database connection
│   ├── auth.py             # JWT token handling
│   ├── security.py         # Security utilities
│   ├── storage.py          # Storage utilities
│   ├── runtime.py          # Runtime environment detection
│   ├── request_context.py  # Request context management
│   ├── rate_limiter.py     # Rate limiting
│   ├── middlewares.py      # Custom middlewares
│   ├── handlers.py         # Request handlers
│   ├── pos_templates.py    # POS receipt templates
│   ├── pdfgen.py           # PDF generation
│   ├── menu.py             # Menu management
│   ├── loyalty.py          # Loyalty program
│   ├── identify.py         # Customer identification
│   ├── url_shortener.py    # URL shortening
│   ├── worker.py           # Background job processing
│   ├── erp_scheduler.py    # ERP sync scheduler
│   ├── trigger_engine.py   # Marketing trigger engine
│   ├── integration_events.py # Integration event handling
│   ├── admin_auth_api.py   # Admin authentication endpoints
│   ├── admin_api.py        # Admin user management
│   ├── customers_api.py    # Customer management
│   ├── products_api.py     # Product management
│   ├── pos_api.py          # Point of sale
│   ├── marketing_api.py    # Marketing campaigns
│   ├── analytics_api.py    # Analytics endpoints
│   ├── dashboard_api.py    # Dashboard data
│   ├── integrations_api.py # Integration management
│   ├── integration_settings_api.py # Integration settings
│   ├── tma_api.py          # TMA (Telegram Mini App) endpoints
│   └── test_api.py         # Test endpoints
├── app/integrations/       # Third-party integrations
│   ├── __init__.py
│   ├── webhooks.py         # Webhook handlers
│   ├── erp_sync.py         # ERP system synchronization
│   ├── erpnext.py          # ERPNext integration
│   └── bots/              # Messaging bots
│       ├── telegram_handler.py
│       ├── vk_handler.py
│       └── shared/        # Shared bot utilities
├── app/integrations/pos/   # POS integration
│   ├── __init__.py
│   └── erpnext_client.py   # ERPNext POS client
├── app/models/             # Data models
│   └── erp_sync.py         # ERP sync models
├── data/                   # Data files
├── receipts/               # Generated receipts
├── reports/                # Analytics reports
├── scripts/                # Helper scripts
├── tests/                  # Python tests
├── venv/                   # Virtual environment
├── .env                    # Environment variables
├── requirements.txt        # Dependencies
└── mypy.ini                # Type checking config
```

## Documentation Structure (docs/)

```
docs/
├── architecture/           # Architecture documents
│   └── auth_flow.md        # Authentication flow details
├── compliance/             # Data compliance
│   └── data_storage_compliance.md
├── deployment/             # Deployment guides
│   └── development.md      # Local development setup
├── integrations/           # Integration documentation
│   └── frontend_backend.md # Frontend-backend communication
├── security/               # Security guidelines
│   └── production_security.md
└── plans/                  # Project plans
    └── mvp_scope.md        # MVP requirements
```

## Key Files by Functionality

### Authentication
```
Frontend:
- src/stores/auth.tsx        # Auth context and state
- src/api.ts                  # Auth API calls
- src/authWorker.ts          # Auth flow web worker

Backend:
- app/admin_auth_api.py      # Auth endpoints
- app/auth.py                # JWT handling
- app/security.py            # Password hashing
```

### Customer Management
```
Frontend:
- src/App.tsx (customers tab)
- src/components/CustomersTable.tsx
- src/api.ts (customers endpoints)

Backend:
- app/admin_api.py           # Customer endpoints
- app/db.py (customers table)
```

### Product Management
```
Frontend:
- src/App.tsx (products tab)
- src/components/ProductsTable.tsx
- src/components/ProductImport.tsx

Backend:
- app/products_api.py        # Product endpoints
- app/db.py (products table)
```

### Point of Sale
```
Frontend:
- src/App.tsx (POS tab)
- src/api.ts (POS endpoints)

Backend:
- app/pos_api.py             # POS endpoints
- app/pos_templates.py       # Receipt templates
- app/pdfgen.py              # PDF generation
```

### Marketing
```
Frontend:
- src/MarketingView.tsx
- src/api.ts (marketing endpoints)

Backend:
- app/marketing_api.py       # Campaign endpoints
- app/trigger_engine.py      # Trigger engine
- app/db.py (campaigns, triggers)
```

### Analytics
```
Frontend:
- src/AnalyticsView.tsx
- src/components/AnalyticsCharts.tsx
- src/api.ts (analytics endpoints)

Backend:
- app/analytics_api.py       # Analytics endpoints
- app/db.py (analytics tables)
```

### Integrations
```
Frontend:
- src/App.tsx (integrations tab)
- src/components/IntegrationSettings.tsx

Backend:
- app/integrations_api.py    # Integration endpoints
- app/integration_settings_api.py
- app/integrations/bots/    # Bot handlers
```

### Testing
```
Frontend:
- admin-ui/e2e/             # Playwright E2E tests
- admin-ui/tests/           # Unit tests

Backend:
- middleware/tests/         # Python tests
- tests/                    # E2E tests
```

## Configuration Files

### Frontend
```
- admin-ui/package.json      # Dependencies and scripts
- admin-ui/tsconfig.json     # TypeScript configuration
- admin-ui/vite.config.ts    # Vite build configuration
- admin-ui/playwright.config.ts # E2E test config
- admin-ui/.env.test         # Test environment variables
```

### Backend
```
- middleware/requirements.txt # Python dependencies
- middleware/.env            # Environment variables
- middleware/.env.example    # Example config
- middleware/mypy.ini        # Type checking
- middleware/pytest.ini      # Test configuration
```

### Docker
```
- docker-compose.e2e.yml     # E2E test environment
- docker-compose.local.yml   # Local development
- docker-compose.verify.yml  # Verification environment
- admin-ui/Dockerfile        # Frontend Dockerfile
- middleware/Dockerfile      # Backend Dockerfile
```

### GSD Framework
```
.gsd/
├── codebase/
│   ├── ARCHITECTURE.md      # This file
│   └── STRUCTURE.md         # Directory structure
├── rules/                   # GSD rules
└── config.json              # GSD configuration