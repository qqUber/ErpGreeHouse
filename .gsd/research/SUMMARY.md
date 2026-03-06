# Project Research Summary

**Project:** ErpGreeHouse v2.2 UI/UX Refactor
**Domain:** Role-Based Dashboards & Full HD Optimization
**Researched:** 2026-03-06
**Confidence:** HIGH

## Executive Summary

This research focuses on the v2.2 UI/UX refactor for ErpGreeHouse, a coffee shop CRM + loyalty system. The goal is to create tailored dashboards for three key roles (Operator, Manager, Admin) with optimized layouts for Full HD screens (1920x1080). 

The research identifies the specific needs of each role: Operators require a minimal, focused interface for daily operations, Managers need analytics and campaign management tools, and Admins need full system access with organized, modular components. The refactor includes Full HD optimization, E2E test standardization, accessibility improvements, and localization support for RU, EN, and SR languages.

Key recommendations include using lightweight libraries for role-based UI (`@permify/react-role`), responsive design (`react-responsive`), and localization (`react-i18next`), along with a type-safe test ID system for E2E testing. The architecture follows a phased implementation approach, starting with foundational improvements and progressing to role-specific and viewport-specific optimizations.

## Key Findings

### Recommended Stack

**Core technologies:**

- `@permify/react-role` (v0.1.17): Lightweight, TypeScript-friendly role-based UI component for conditional rendering based on user roles and permissions
- `react-responsive` (v10.0.1): Simple media query hooks for responsive design, including Full HD (1920px+) support
- `react-i18next` (v14.1.0) + `i18next-browser-languagedetector` (v7.2.0): Mature, flexible localization library with multi-language support and fallback mechanisms
- Type-safe test ID system: Centralized test ID management following `role_component_action_language` pattern for consistent E2E testing
- `eslint-plugin-jsx-a11y` (v6.10.2) + `@axe-core/react` (v4.10.0): Accessibility tools for WCAG 2.1 AA compliance

### Expected Features

**Must have (table stakes):**

- Operator dashboard with client identification (phone search/QR scan), current user data, linked transactions, and accrual/deduction actions
- Manager dashboard with analytics, marketing events, loyalty programs, CRM artifacts, and Telegram/VK integration
- Admin dashboard with full system access, modular collapsible panels, system configuration, user management, and ERP integration
- Full HD responsive design with optimized typography, spacing, and grid layouts
- Consistent `data-testid` attributes for E2E testing
- Multi-language support (RU, EN, SR) with type-safe translation keys

**Should have (competitive):**

- QR code client identification for quick check-in
- Real-time loyalty point management from Operator dashboard
- Visual campaign performance tracking for Managers
- Modular, collapsible admin interface for complex system management
- Integrated ERPNext connectivity for seamless data synchronization
- Telegram and VK social media campaign management tools

**Defer (v2+):**

- Advanced data visualization for Admin role
- Complex navigation for Operator role
- Non-essential animations that impact performance

### Architecture Approach

The refactor enhances the existing React 19 + TypeScript architecture with role-based UI rendering, Full HD optimization, and improved testability. Key architectural decisions include:

1. **Role-based content rendering:** Implementing a modular role-based render prop component for centralized access control
2. **Full HD grid system:** Extending existing CSS grid with 1920px (3xl) breakpoint and 12-column layouts
3. **Type-safe localization:** Creating TypeScript interfaces for translation keys with validation
4. **Enhanced testing architecture:** Adding role-based test utilities, Full HD viewport test scenarios, and accessibility testing
5. **Phased implementation:** Following a 6-phase approach starting with foundational improvements and progressing to role-specific optimizations

### Critical Pitfalls

1. **Role-Based View Leakage:** Users see data/functionality not intended for their role. Avoid by centralizing RBAC logic, using wrapper components, and validating permissions at both frontend and backend.
2. **Brittle E2E Tests from Language-Specific Selectors:** Tests break when text changes or localization is added. Avoid by using data-testid attributes with a standard pattern.
3. **Inconsistent Responsive Behavior Across Screen Sizes:** UI breaks on Full HD screens. Avoid by testing on actual devices, using responsive units, and implementing a flexible grid system.
4. **Accessibility Regression from UI Refactor:** Refactor improves visual design but breaks accessibility. Avoid by following WCAG guidelines, using semantic HTML, and testing with accessibility tools.
5. **Localization Debt from Hardcoded Strings:** Adding localization becomes time-consuming. Avoid by using a localization library, centralizing strings, and wrapping all user-visible text in translation functions.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 0: Refactor Preparation & Audit

**Rationale:** Understand existing codebase and business logic before making changes
**Delivers:** Codebase audit, existing test running, documentation of current features
**Addresses:** Pitfall 6 (Ignoring existing business logic)

### Phase 1: Foundation

**Rationale:** Set up core infrastructure for refactor
**Delivers:** 3xl breakpoint, enhanced grid system, data-testid attributes, Full HD viewport testing
**Uses:** CSS variables, grid system enhancements
**Addresses:** Pitfall 3 (Inconsistent responsive behavior)

### Phase 2: Role-Based UI System

**Rationale:** Implement role-based content rendering
**Delivers:** Role-based content renderer, permission-based wrapper, role-specific widget system, role-based test utilities
**Uses:** @permify/react-role
**Addresses:** Pitfall 1 (Role-based view leakage)

### Phase 3: Enhanced Localization

**Rationale:** Improve localization management
**Delivers:** TypeScript interfaces for translation keys, type-safe translation hook, centralized string management
**Uses:** react-i18next, i18next-browser-languagedetector
**Addresses:** Pitfall 5 (Localization debt)

### Phase 4: Full HD Optimization

**Rationale:** Optimize UI for Full HD screens
**Delivers:** Dashboard layout optimization, widget sizing enhancements, responsive grid component
**Uses:** react-responsive, enhanced grid system
**Addresses:** Pitfall 3 (Inconsistent responsive behavior)

### Phase 5: Accessibility Improvements

**Rationale:** Ensure WCAG 2.1 AA compliance
**Delivers:** Accessibility attributes, ARIA labels and roles, keyboard navigation, accessibility testing
**Uses:** eslint-plugin-jsx-a11y, @axe-core/react
**Addresses:** Pitfall 4 (Accessibility regression)

### Phase 6: E2E Test Coverage

**Rationale:** Add comprehensive E2E test coverage
**Delivers:** Role-based E2E tests, Full HD viewport test scenarios, accessibility testing
**Uses:** Playwright, type-safe test ID system
**Addresses:** Pitfall 2 (Brittle E2E tests)

### Phase Ordering Rationale

- **Phase 0 first:** Prevents breaking existing business logic
- **Foundational phases early:** Ensures core infrastructure is in place for subsequent changes
- **Role-based UI before optimizations:** Focuses on functionality before aesthetics
- **Localization early:** Prevents localization debt later in the project
- **Accessibility as a separate phase:** Ensures proper attention to WCAG compliance
- **E2E tests last:** Tests the complete, integrated system

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 6: E2E Test Coverage:** Complex integration testing, needs API research
- **Phase 4: Full HD Optimization:** Niche domain, sparse documentation on Full HD dashboard design

Phases with standard patterns (skip research-phase):

- **Phase 2: Role-Based UI System:** Well-documented library (@permify/react-role), established patterns
- **Phase 3: Enhanced Localization:** Mature library (react-i18next), standard localization patterns

## Confidence Assessment

| Area         | Confidence        | Notes    |
| ------------ | ----------------- | -------- |
| Stack        | HIGH              | All libraries are widely used and well-documented |
| Features     | HIGH              | Role-specific needs identified through business analysis |
| Architecture | MEDIUM            | Some aspects (Full HD optimization) need deeper validation |
| Pitfalls     | HIGH              | Pitfalls identified through industry research and best practices |

**Overall confidence:** HIGH

### Gaps to Address

- **Full HD dashboard design:** Need to validate layout choices with actual users on Full HD screens
- **API integration testing:** Need to research API mocking strategies for complex role-based scenarios
- **Localization fallback logic:** Need to test fallback chain (RU → EN → SR) in various scenarios

## Sources

### Primary (HIGH confidence)

- `/react/react-responsive` — Responsive design patterns and implementation
- `/react/react-i18next` — Localization library documentation
- `/testing/playwright` — E2E testing best practices
- WCAG 2.1 AA guidelines — Accessibility standards

### Secondary (MEDIUM confidence)

- Replay Blog: 7 Fatal Mistakes to Avoid When Modernizing Large-Scale Legacy UI
- Edwin Choate UX: Roles & Permissions Redesign
- Dev.to: Common Mistakes in React Admin Dashboards

### Tertiary (LOW confidence)

- Medium: Responsive Web Design Challenges You Can’t Ignore in 2026 — Needs validation with actual Full HD devices

---

_Research completed: 2026-03-06_
_Ready for roadmap: yes_
