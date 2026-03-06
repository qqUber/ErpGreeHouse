# ErpGreeHouse - Project Overview

## Core Value
Saves 50-100k ₽/month for coffee shops by replacing expensive third-party CRM and loyalty solutions with open-source alternative.

## Current Milestone: v2.2 UI/UX Refactor

**Goal:** Refactor the UI/UX of this business management system for Full HD screens with role-based dashboards and standardized testability.

**Target features:**

- **Role-based dashboards:** Operator (minimal interface), Manager (analytics/marketing), Admin (modular panels)
- **Visual and layout improvements:** Fixed text alignment, responsive resizing for Full HD, consistent spacing/tokens
- **Data presentation:** Filters, sorting, search for large datasets; limited default output with expandable views
- **E2E test standardization:** Universal identifiers (role_component_action_language), data-testid attributes
- **Accessibility and feedback:** WCAG compliance, keyboard navigation, ARIA labels, success/error messages
- **Localization:** RU, EN, SR with fallback logic; central dictionary for localization strings

## Current State
**v2.1 UI Enhancement shipped (March 6, 2026)** - All 34 plans complete

| Milestone | Status | Date |
|-----------|--------|------|
| v1.0 MVP | ✅ | 2026-03-03 |
| v1.1 Security | ✅ | 2026-03-04 |
| v2.0 UI Experience & Responsive Design | ✅ | 2026-03-05 |
| v2.1 Professional UI Design Patterns | ✅ | 2026-03-06 |
| v2.2 UI/UX Refactor | 🚧 | - |

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
