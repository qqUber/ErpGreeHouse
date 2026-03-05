# ErpGreeHouse - Project Overview

## Core Value
Saves 50-100k ₽/month for coffee shops by replacing expensive third-party CRM and loyalty solutions with open-source alternative.

## Current State
**v1.1 Security shipped (March 4, 2026)** - All 29 plans complete

| Milestone | Status | Date |
|-----------|--------|------|
| v1.0 MVP | ✅ | 2026-03-03 |
| v1.1 Security | ✅ | 2026-03-04 |
| v2.0 Redesign | 📋 | - |

## Key Features
- Loyalty program (points, tiers, redemption)
- Messaging (Telegram, VK, triggers)
- Compliance (152-FZ consent)
- ERP integration (ERPNext)
- Analytics dashboards
- Security hardening

## Tech Stack
- Backend: FastAPI, Python 3.14, Redis
- Frontend: React 19, Vite 7, TypeScript
- Database: SQLite (dev), PostgreSQL (prod)
- Auth: JWT + refresh tokens

## Tests
- 561 pytest (backend)
- 132 Playwright E2E
- **Total: 693 tests**

## Security
- HIGH: 0
- MEDIUM: 0 (B608 skipped)
- LOW: 5

## Documentation
- 31 docs files
- Architecture, compliance, integrations, security, testing
