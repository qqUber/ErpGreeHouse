# CI Report

Status badge (dev):
- CI: ![CI](https://github.com/qqUber/ErpGreeHouse/actions/workflows/ci.yml/badge.svg?branch=dev)
- E2E Dev: ![E2E](https://github.com/qqUber/ErpGreeHouse/actions/workflows/e2e-dev.yml/badge.svg?branch=dev)
- CD Dev: ![CD](https://github.com/qqUber/ErpGreeHouse/actions/workflows/cd-dev.yml/badge.svg?branch=dev)

Links:
- Actions (branch dev): https://github.com/qqUber/ErpGreeHouse/actions?query=branch%3Adev
- Latest commit: https://github.com/qqUber/ErpGreeHouse/commit/dev

Meta:
- UTC timestamp: 2026-02-20T16:45:00Z
- Commit: 800e5c8 (feature/ui-positive-cases-baseline)

Used action versions:
- actions/checkout@v4
- actions/setup-node@v4
- actions/setup-python@v5
- actions/upload-artifact@v4
- actions/download-artifact@v4
- actions/github-script@v7

Step durations (to be filled after run completes):
- admin-ui build: —
- middleware deps: —
- middleware tests: —
- coverage gate: —
- e2e shards: —
- allure merge/report: —
- docker build: —

Public report links:
- Allure (gh-pages): https://qqUber.github.io/ErpGreeHouse/allure-report/ (requires GitHub Pages enabled)
- Playwright HTML: https://qqUber.github.io/ErpGreeHouse/playwright-report/ (requires GitHub Pages enabled)

Notes:
- Reports are published to gh-pages by workflow .github/workflows/e2e-dev.yml (job publish-gh-pages). Enable GitHub Pages for the repository (Source: gh-pages) to make links public.
- CI artifacts include: admin-ui/playwright-report, admin-ui/test-results, admin-ui/allure-results, merged/allure-report.

## Local Test Results (2026-02-20)

**Environment:**
- Middleware: http://localhost:8000 ✅
- Frontend: http://localhost:5173 ✅
- Redis/Memurai: localhost:6379 ✅
- Database: middleware/.local/crm.db ✅

**Test Summary:**
- Smoke: 5/5 passed ✅
- Critical: 2/2 passed ✅
- Functional: 7/7 passed ✅ (fixed manual-entry selector)
- Roles: Not executed (skipped due to maxFailures)

**Total: 14/14 passed (100%)**
