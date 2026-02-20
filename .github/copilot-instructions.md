## Purpose

Short, actionable guidance to help AI coding agents (and contributors) be productive in this repository.

## Big picture (quick)
- Middleware (Telegram CRM): `middleware/` — FastAPI + aiogram handling Telegram webhooks and API logic. Background processing via Celery (see `middleware/app/worker` and `docker-compose.yml` service `worker`).
- Admin UI: `admin-ui/` — React + Vite app. E2E tests use Playwright (see `admin-ui/package.json` and `admin-ui/e2e`).
- ERPNext: run as `erpnext` service in `docker-compose.yml` (Frappe/ERPNext stack). The middleware talks to it via `ERP_API_BASE_URL`.
- Orchestration: `docker-compose.yml` and `docker-compose.infrastructure.yml` define full and partial stacks used for local integration tests.

## Essential files to check first
- `README.md` (root) — Quick start, env vars, health endpoints.
- `ARCHITECTURE.md` and `docs/` — rationale, deployment and security guidance.
- `docker-compose.yml` — how services are wired (Redis, erpnext, middleware, worker).
- `middleware/.env.example` — the env vars the middleware expects; use `ERP_MOCK_MODE=true` to avoid touching real ERPNext.
- `admin-ui/package.json` — scripts for dev, build and Playwright e2e runs.

## Developer workflows / common commands (copyable examples)
- Bring full local stack (integration):
  docker-compose up -d
- Bring only infrastructure services (no ERPNext UI):
  docker-compose -f docker-compose.infrastructure.yml up -d
- Run middleware locally (fast loop, after `setup_test_env.sh`):
  cd middleware
  bash setup_test_env.sh
  python -m app.main
- Run worker locally:
  cd middleware
  celery -A app.worker worker -l info
- Run backend tests (cross-platform scripts exist):
  bash run_tests.sh   # Linux/mac
  powershell -ExecutionPolicy Bypass -File run_tests.ps1   # Windows
- Admin UI dev / build / e2e:
  cd admin-ui
  npm install
  npm run dev        # local dev server
  npm run build      # production build
  npm run test:e2e   # Playwright E2E

## Project-specific conventions / patterns
- Single logical Middleware entrypoint: middleware is the single point for Telegram interactions — do not bypass it to call ERPNext directly from other clients. (See `ARCHITECTURE.md`.)
- Mocking ERPNext: prefer `ERP_MOCK_MODE=true` during development when you do not need the real ERP. This prevents accidental changes to production-like ERP data.
- Background jobs: use Celery with Redis (broker in `docker-compose.yml` named `redis-queue`). Worker tasks live under `middleware/app/worker` (search for `@celery.task`/`@shared_task`).
- Health endpoints used by monitoring: `/health`, `/health/db`, `/health/redis`, `/health/erp` — reference these in CI and health checks.
- Documentation must be edited via `docs/` and submitted as PRs to the `dev` branch (see `docs/README.md`).

## Linting, formatting and tests
- Python: PEP8 + Black formatting expected; pre-commit hooks are used. Run `pre-commit run --all-files` before PRs.
- JS/TS: Admin UI uses Vite and TypeScript; tests use Playwright.
- CI: PRs should run linters and the test suite; follow `docs/ci-cd.md` for pipeline details.

## Integration points / external dependencies
- ERPNext (Frappe) — REST API used by middleware (`ERP_API_BASE_URL`). See `docker-compose.yml` for the local image.
- Redis — used for caching and Celery broker (`redis-queue`).
- Celery — asynchronous job processing; worker launched via `celery -A app.worker worker -l info`.

## Quick examples for common AI tasks
- Add a new middleware endpoint: put FastAPI router in `middleware/app/api/v1/` and add tests under `middleware/tests` (follow existing tests for style). Update `docs/api` if public.
- Add a new background task: create a task in `middleware/app/tasks.py` and call with `delay()` from endpoint; ensure worker coverage in integration tests.

## When in doubt
- Read `docs/architecture/system_architecture.md` and `ARCHITECTURE.md` for rationale.
- Start the local stack with `docker-compose up -d` to reproduce integration scenarios.
- Use `ERP_MOCK_MODE=true` to avoid hitting real ERP during exploratory changes.

---
If you'd like, I can iterate on tone/length or include more precise command flags and file examples (e.g. exact router and test file paths) — tell me which area you'd like expanded.
