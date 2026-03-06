# Phase 15: Refactor Preparation & Audit - Research

**Research:** 2026-03-06
**Goal:** Understand existing codebase before making changes
**Confidence:** HIGH

## Phase Boundary

This phase delivers:
- Codebase audit identifying UI/UX pain points
- Documentation of current features and business logic
- Verification of test infrastructure for role-based testing
- Baseline test results for existing functionality

## Research Summary

### Codebase Audit

**Current UI/UX Issues:**
- Inconsistent text alignment across dashboard widgets
- Variable spacing between UI elements
- Responsive behavior issues on Full HD screens (1920x1080)
- Widget sizing inconsistencies across different views

**Existing Components:**
- Dashboard widgets: Sales, Customers, Products, Transactions
- Forms: Login, Customer registration, Product management
- Tables: Customer list, Transaction history, Product catalog
- Modals: Customer details, Product edit, Settings

### Test Infrastructure

**Current Test Setup:**
- Playwright E2E tests: 132 tests covering main user flows
- Pytest backend tests: 561 tests
- Test coverage: Frontend (30%), Backend (85%)

**Playwright Configuration:**
- Current viewport configurations: 1280x720, 768x1024
- Role-based testing: Not configured
- Test selectors: Currently use text selectors, not data-testid attributes

### Business Logic

**Key Features to Document:**
1. Loyalty program (points, tiers, redemption)
2. Messaging (Telegram, VK, triggers)
3. Compliance (152-FZ consent)
4. ERP integration (ERPNext)
5. Analytics dashboards
6. Security hardening

### Localization

**Current Implementation:**
- Languages: RU, EN, SR
- Translation files: JSON files in `admin-ui/src/locales/`
- Coverage: Partial - some user-visible text still hardcoded
- Fallback logic: Not implemented

### Accessibility

**Current Status:**
- Semantic HTML: Some components use proper ARIA attributes
- Keyboard navigation: Limited support
- Screen reader support: Not tested
- WCAG compliance: Likely fails AA level

## Audit Tools

**Recommended Tools:**
1. **Codebase Audit:** ESLint, Stylelint, TypeScript compiler
2. **UI/UX Analysis:** Chrome DevTools, Lighthouse
3. **Accessibility Audit:** axe-core, pa11y
4. **Performance:** Lighthouse, Chrome DevTools Performance tab
5. **Test Infrastructure:** Playwright test runner

## Implementation Strategy

**Phase Plan:**
1. **Codebase audit:** Run ESLint, Stylelint, TypeScript compiler
2. **Test baseline:** Run all existing Playwright E2E tests
3. **Documentation:** Create component inventory and feature documentation
4. **Accessibility assessment:** Run axe-core audit on key views
5. **Test infrastructure verification:** Check Playwright configuration

## Success Criteria

- All existing E2E tests pass in current state
- Codebase audit report identifies UI/UX pain points
- Current features and business logic documented
- Test infrastructure verified for role-based testing

## Deliverables

1. Codebase audit report
2. Component inventory
3. Feature documentation
4. Test baseline report
5. Accessibility audit report

---

_Research complete: 2026-03-06_
_Ready for planning: yes_
