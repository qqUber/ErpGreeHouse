# State

## Project Reference

See: .gsd/PROJECT.md (updated 2026-03-08)

**Core value:** Saves 50-100k ₽/month for coffee shops by replacing expensive third-party CRM and loyalty solutions with open-source alternative.

**Current focus:** Planning next milestone (UI/UX improvements and bug fixes based on user feedback)

## Current Position

Phase: Not started
Plan: Not started
Status: Ready to plan
Last activity: 2026-03-08 — v2.2 UI/UX Refactor milestone complete

## Codebase Analysis Complete

- **Coding Conventions**: Documented in `.gsd/codebase/CONVENTIONS.md`
- **Testing Patterns**: Documented in `.gsd/codebase/TESTING.md`

## Key Findings

### Backend (Python/FastAPI)
- **Language**: Python 3.11
- **Formatter**: Black (23.3.0)
- **Imports**: isort (5.12.0)
- **Linting**: flake8 (6.0.0)
- **Type Checking**: mypy (1.8.0)
- **Security**: Bandit (1.7.5)
- **Testing**: pytest with coverage

### Frontend (React/TypeScript/Vite)
- **Language**: TypeScript
- **Framework**: React 19
- **Formatter**: Biome (2.4.4)
- **Testing**: Playwright (1.58.2)
- **Reporter**: Allure

### CI/CD
- GitHub Actions workflows
- Pre-commit hooks
- Dockerized E2E environment
