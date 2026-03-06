---
version: v2.2
milestone: UI/UX Refactor
created: 2026-03-06
updated: 2026-03-06
---

# ErpGreeHouse v2.2 UI/UX Refactor Requirements

## Overview
This document lists all requirements for the v2.2 UI/UX Refactor milestone, organized by category with phase traceability.

## Role-Based Dashboards

### Operator Role
- **RQ101:** Operator dashboard with client identification (search by phone/QR scan)
- **RQ102:** Display current user data (name, loyalty tier, points balance)
- **RQ103:** Show linked transactions (recent purchases, transaction history)
- **RQ104:** Quick actions for accrual/deduction of loyalty points
- **RQ105:** Minimal, focused interface with large buttons for quick access
- **RQ106:** Real-time updates for transaction status

**Phase:** 17

### Manager Role
- **RQ201:** Analytics dashboard with sales trends, customer visit patterns
- **RQ202:** Marketing events management (promotions, discounts, special offers)
- **RQ203:** Loyalty programs configuration (tiers, points rules, redemption)
- **RQ204:** CRM artifacts (customer segmentation, feedback management)
- **RQ205:** Telegram/VK integration for social media campaign management
- **RQ206:** Campaign visualization (charts, graphs for performance tracking)

**Phase:** 17

### Admin Role
- **RQ301:** Full system access (all Operator and Manager features)
- **RQ302:** Modular collapsible panels for organized system areas
- **RQ303:** System configuration (POS, CRM, loyalty, integrations)
- **RQ304:** User management (add/remove users, manage roles/permissions)
- **RQ305:** Data management (import/export, backup, data cleaning)
- **RQ306:** Security settings (access control, audit logs, compliance)
- **RQ307:** ERP integration (ERPNext connection, data synchronization)

**Phase:** 17

## UI/UX Improvements

### Visual and Layout
- **RQ401:** Optimized for Full HD (1920x1080) monitors
- **RQ402:** Consistent typography (font sizes, line heights)
- **RQ403:** Spacing tokens in 8px multiples for consistency
- **RQ404:** Card-based layouts with clear visual hierarchy
- **RQ405:** Fixed text alignment to prevent floating elements
- **RQ406:** No horizontal scroll at 1920px width

**Phase:** 16, 19

### Data Presentation
- **RQ410:** Filters, sorting, and search for large datasets
- **RQ411:** Expandable views for tables (limit default output)
- **RQ412:** Responsive grid system with 12-column layout for Full HD

**Phase:** 16, 21

## Technical Features

### Testability
- **RQ501:** Universal role enum {OPERATOR, MANAGER, ADMIN}
- **RQ502:** Structured UI identifiers: `role_component_action_language`
- **RQ503:** Stable `data-testid` attributes for E2E testing
- **RQ504:** Role-based test utilities for Playwright
- **RQ505:** Full HD viewport testing in E2E suite

**Phase:** 16, 21

### Localization
- **RQ601:** Multi-language support: Russian (RU), English (EN), Serbian (SR)
- **RQ602:** Fallback logic: RU → EN → SR
- **RQ603:** Type-safe translation keys with TypeScript interfaces
- **RQ604:** Centralized dictionary for localization strings
- **RQ605:** Role-specific terminology translations

**Phase:** 18

### Accessibility
- **RQ701:** WCAG 2.1 AA compliance
- **RQ702:** Keyboard navigation (tab order, focus states)
- **RQ703:** ARIA labels and roles for interactive elements
- **RQ704:** Screen reader support
- **RQ705:** Accessibility testing with axe-core

**Phase:** 20

## Pre-Refactor Requirements
- **RQ801:** Run all existing E2E tests to establish baseline
- **RQ802:** Conduct codebase audit to identify UI/UX pain points
- **RQ803:** Document current features and business logic
- **RQ804:** Verify test infrastructure for role-based testing

**Phase:** 15

## Requirements Coverage
- **Total requirements:** 38
- **Phase coverage:** 100% (each requirement mapped to exactly one phase)
- **Must have requirements:** 23 (61%)
- **Should have requirements:** 15 (39%)
