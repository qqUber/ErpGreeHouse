---
milestone: v2.2 UI/UX Refactor
start_date: 2026-03-06
status: in-progress
phases_completed: 4/7
plans_completed: 7/7
---

# ErpGreeHouse v2.2 UI/UX Refactor Roadmap

## Overview
v2.2 focuses on role-based dashboards optimized for Full HD screens (1920x1080) with enhanced testability, accessibility, and localization.

**Total phases:** 7 (15-21)
**Starting phase:** 15 (continues from v2.1 which ended at phase 14)

## Phases

### Phase 15: Refactor Preparation & Audit
**Goal:** Understand existing codebase before making changes
**Delivers:** Codebase audit, existing test running, documentation of current features

**Success criteria:**
- All existing E2E tests pass in current state
- Codebase audit report identifies UI/UX pain points
- Current features and business logic documented
- Test infrastructure verified for role-based testing

**Requirements covered:**
- Test existing functionality before refactor
- Understand current implementation
- Identify breaking change risks

---

### Phase 16: Foundation
**Goal:** Set up core infrastructure for refactor
**Delivers:** 3xl breakpoint, enhanced grid system, data-testid attributes, Full HD viewport testing

**Success criteria:**
- 3xl (1920px) breakpoint implemented
- Enhanced grid system with 12-column layout for Full HD
- Consistent data-testid attributes following `role_component_action_language` pattern
- Full HD viewport testing configured in Playwright

**Requirements covered:**
- Fixed text alignment
- Responsive resizing for Full HD
- Consistent spacing/tokens
- Universal identifiers for E2E testing

---

### Phase 17: Role-Based UI System
**Goal:** Implement role-based content rendering
**Delivers:** Role-based content renderer, permission-based wrapper, role-specific widget system, role-based test utilities

**Success criteria:**
- Role enum {OPERATOR, MANAGER, ADMIN} implemented
- Role-based content renderer with `@permify/react-role`
- Permission-based wrapper components for secure rendering
- Role-specific widget system for modular dashboards
- Role-based test utilities available

**Requirements covered:**
- Role-based dashboards (Operator, Manager, Admin)
- Minimal interface for Operator
- Analytics/marketing for Manager
- Modular panels for Admin

---

### Phase 18: Enhanced Localization
**Goal:** Improve localization management
**Delivers:** TypeScript interfaces for translation keys, type-safe translation hook, centralized string management

**Success criteria:**
- TypeScript interfaces for translation keys
- Type-safe translation hook using `react-i18next`
- Centralized dictionary for localization strings
- Fallback logic (RU → EN → SR) implemented
- All user-visible text wrapped in translation functions

**Requirements covered:**
- Localization: RU, EN, SR with fallback logic
- Central dictionary for localization strings

---

### Phase 19: Full HD Optimization
**Goal:** Optimize UI for Full HD screens
**Delivers:** Dashboard layout optimization, widget sizing enhancements, responsive grid component

**Success criteria:**
- Dashboard layouts optimized for 1920x1080 resolution
- Widget sizing and spacing adjusted for Full HD
- Responsive grid component with Full HD support
- No horizontal scroll at 1920px width
- Consistent visual hierarchy across roles

**Requirements covered:**
- Visual and layout improvements for Full HD
- Responsive resizing
- Consistent spacing/tokens
- Fixed text alignment

---

### Phase 20: Accessibility Improvements
**Goal:** Ensure WCAG 2.1 AA compliance
**Delivers:** Accessibility attributes, ARIA labels and roles, keyboard navigation, accessibility testing

**Success criteria:**
- All interactive elements have appropriate ARIA attributes
- Keyboard navigation implemented (tab order, focus states)
- WCAG 2.1 AA compliance verified with axe-core
- ESLint accessibility rules passing
- Screen reader support tested

**Requirements covered:**
- WCAG compliance
- Keyboard navigation
- ARIA labels
- Success/error messages

---

### Phase 21: E2E Test Coverage
**Goal:** Add comprehensive E2E test coverage
**Delivers:** Role-based E2E tests, Full HD viewport test scenarios, accessibility testing

**Success criteria:**
- Role-based E2E tests for each user type
- Full HD viewport test scenarios in Playwright
- Accessibility testing integrated into E2E suite
- All existing and new tests passing
- Test coverage report generated

**Requirements covered:**
- E2E test standardization
- Universal identifiers (role_component_action_language)
- data-testid attributes
- Filters, sorting, search for large datasets
- Expandable views for tables

---

## Requirements Coverage Matrix

| Requirement | Phase(s) |
|-------------|----------|
| Role-based dashboards (Operator/Manager/Admin) | 17 |
| Visual and layout improvements for Full HD | 16, 19 |
| Filters, sorting, search for large datasets | 21 |
| Expandable views for tables | 21 |
| E2E test standardization | 16, 21 |
| WCAG compliance | 20 |
| Keyboard navigation | 20 |
| ARIA labels | 20 |
| Success/error messages | 20 |
| Localization: RU, EN, SR with fallback | 18 |
| Central dictionary for localization strings | 18 |

## Progress Tracking

```
Progress: █████████████████░░ 57% (Phase 18 complete, Phase 19 complete)
```

**Legend:**
- █ Completed
- ░ In progress
- ▒ Planned
