# CI Report

Status badge (dev):
- CI: ![CI](https://github.com/qqUber/ErpGreeHouse/actions/workflows/ci.yml/badge.svg?branch=dev)
- E2E Dev: ![E2E](https://github.com/qqUber/ErpGreeHouse/actions/workflows/e2e-dev.yml/badge.svg?branch=dev)
- CD Dev: ![CD](https://github.com/qqUber/ErpGreeHouse/actions/workflows/cd-dev.yml/badge.svg?branch=dev)

Links:
- Actions (branch dev): https://github.com/qqUber/ErpGreeHouse/actions?query=branch%3Adev
- Latest commit: https://github.com/qqUber/ErpGreeHouse/commit/f26b802

Meta:
- UTC timestamp: 2026-02-19T00:00:00Z
- Commit: f26b802

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
