# AGENTS.md — Coffee Shop CRM

## Project Structure
- **Backend (middleware/)**: FastAPI + aiogram (Telegram) + Celery worker + SQLite
- **Frontend (admin-ui/)**: React 19 + Vite + TypeScript + Playwright E2E
- **Infra**: Docker Compose (Redis, backend, worker, frontend, ngrok)

## Build / Lint / Test Commands

### Backend (middleware/)
```bash
cd middleware

# Run ALL tests
pytest

# Run a SINGLE test file
pytest tests/unit/test_specific.py

# Run a SINGLE test function
pytest tests/unit/test_specific.py::test_function_name -v

# Run only unit tests (skip integration)
pytest tests/unit/ -q

# Run only integration tests
pytest tests/integrations/ -q

# Run with coverage
pytest --cov=app --cov-report=term-missing

# Lint (flake8, max 120 chars)
python -m flake8 app/ --max-line-length=120 --ignore=E501,W503,E203,E722

# Format (Black)
python -m black app/

# Type check (mypy)
mypy --config-file=mypy.ini app/

# Pre-commit (all hooks)
pre-commit run --all-files
```

### Frontend (admin-ui/)
```bash
cd admin-ui

# Dev server
npm run dev

# Type check
npm run type-check          # tsc --noEmit

# Lint + Format (Biome)
npm run check               # biome check --write .
npm run lint                # biome lint .
npm run format              # biome format . --write

# Unit tests (Vitest)
npm run test:unit           # run all
npm run test:unit -- -t "test name"  # run single test

# E2E tests (Playwright)
npm run test:e2e            # all projects
npm run test:e2e:smoke      # smoke only
npm run test:e2e:critical   # critical path only

# Build
npm run build               # tsc -b && vite build
```

### Docker
```bash
# Full stack
docker compose up -d

# Rebuild from scratch
docker compose build --no-cache && docker compose up -d

# Clean everything
docker compose down -v --remove-orphans

# Check health
docker compose ps
curl http://localhost:8000/health
```

## Code Style

### Python (Backend)
- **Formatting**: Black (line length 120 in dev, 88 in pre-commit)
- **Imports**: isort with `--profile black`; stdlib → third-party → local
- **Types**: mypy with `disallow_untyped_defs=False`; use type hints where practical
- **Naming**: `snake_case` for functions/vars, `PascalCase` for classes, `UPPER_SNAKE` for constants
- **Error handling**: Raise `HTTPException` with status code + detail dict; use `try/finally` for DB connections
- **API responses**: Always return consistent `{items: [...], pagination: {...}}` for list endpoints — never plain arrays
- **DB**: SQLite via `sqlite3`; always close connections in `finally` blocks
- **Security**: No `eval()`/`exec()`/`pickle`; protect lxml from XXE; use JWT auth with HTTP-only cookies
- **Balance points**: Loyalty points are integers — do NOT divide by 100 (they are not currency)

### TypeScript/React (Frontend)
- **Formatting**: Biome — 2-space indent, single quotes, trailing commas (ES5), line width 100
- **Types**: `strict: true`; avoid `any` where possible (biome rule is off but prefer explicit types)
- **Naming**: `camelCase` for vars/functions, `PascalCase` for components/types, `kebab-case` for files
- **Components**: Functional components with hooks; export named functions (not default)
- **API calls**: All HTTP goes through `src/api.ts` — never raw `fetch` in components
- **State**: Local `useState` for component state; avoid global state unless necessary
- **i18n**: All user-facing strings use `useTranslation()` — no hardcoded text
- **Error handling**: `try/catch` with `setError()` state; show user-friendly messages via i18n keys

### General
- **Commits**: Descriptive messages focused on "why" not "what"
- **PRs**: Run linters + tests before pushing; update docs if API changes
- **Env vars**: Use `.env.example` as reference; never commit secrets
- **Mocking**: Set `ERP_MOCK_MODE=true` to avoid hitting real ERPNext during dev

## Architecture Notes
- Middleware is the single entrypoint for Telegram — do not bypass it
- Celery worker handles async tasks (broker: Redis)
- All list endpoints return `{items, pagination}` — frontend expects this format
- Health endpoints: `/health`, `/health/db`, `/health/redis`
