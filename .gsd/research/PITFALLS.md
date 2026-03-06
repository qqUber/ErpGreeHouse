# Pitfalls Research

**Domain:** UI/UX Refactor for Role-Based Dashboards & Full HD Optimization
**Researched:** 2026-03-06
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Role-Based View Leakage

**What goes wrong:**
Users see data or functionality not intended for their role. For example, an Operator might see Admin-only configuration panels, or a Manager might access sensitive system settings.

**Why it happens:**
- Conditional rendering based on fragile checks (e.g., checking `user.role === 'admin'` in multiple components)
- Missing role checks in API endpoints
- Shared components that don't respect role boundaries
- Incomplete testing of role transitions

**How to avoid:**
- Centralize role-based access control (RBAC) logic in a single auth context
- Use wrapper components for role-specific views (e.g., `<AdminOnly>`, `<ManagerOnly>`)
- Validate permissions at both frontend and backend
- Write E2E tests that verify each role sees only their intended content

**Warning signs:**
- Role checks scattered across components
- Shared pages with conditional sections for different roles
- Missing permissions validation in API routes
- No E2E tests for role-based views

**Phase to address:**
Phase 1: Role-Based Dashboard Architecture

---

### Pitfall 2: Brittle E2E Tests from Language-Specific Selectors

**What goes wrong:**
E2E tests break after UI refactor because they use language-specific text selectors (e.g., `getByText('Клиенты')`). When localization is added or text changes, all tests fail.

**Why it happens:**
- Tests use visible text for element selection
- No centralized test ID strategy
- Text content embedded directly in component JSX
- Lack of separation between test selectors and UI content

**How to avoid:**
- Implement data-testid attributes following a standard pattern: `{role}_{component}_{action}_{language}`
- Centralize test IDs in a shared constants file
- Use role-based selectors (getByRole) as fallback when test IDs aren't feasible
- Write tests that don't depend on visible text content

**Warning signs:**
- Tests use getByText extensively for selection
- No data-testid attributes in components
- Text strings hardcoded in component files
- Tests fail when language is changed

**Phase to address:**
Phase 2: E2E Test Standardization

---

### Pitfall 3: Inconsistent Responsive Behavior Across Screen Sizes

**What goes wrong:**
UI breaks on Full HD screens (1920x1080) even though it works on smaller resolutions. Elements may overflow, text may be too small, or layouts may become misaligned.

**Why it happens:**
- Designing for mobile first but not testing on larger screens
- Using fixed-width containers that don't scale
- Ignoring aspect ratio differences between screen sizes
- Overly complex media query logic

**How to avoid:**
- Test on actual Full HD devices or accurate simulators
- Use responsive units (rem, em, %) instead of fixed pixels
- Implement a flexible grid system
- Keep media query logic simple and consistent
- Use CSS variables for breakpoints

**Warning signs:**
- Fixed-width containers (e.g., width: 1200px)
- Media queries with arbitrary values
- Lack of testing on Full HD screens
- Elements that overflow their containers on large screens

**Phase to address:**
Phase 3: Full HD Responsive Design

---

### Pitfall 4: Accessibility Regression from UI Refactor

**What goes wrong:**
Refactor improves visual design but breaks accessibility. Keyboard navigation stops working, screen readers can't interpret content, or color contrast fails WCAG guidelines.

**Why it happens:**
- Focusing on visual design over accessibility
- Removing semantic HTML elements in favor of styled divs
- Ignoring ARIA labels and roles
- Not testing with screen readers or accessibility tools

**How to avoid:**
- Follow WCAG 2.1 guidelines (AA standard)
- Use semantic HTML elements (button, input, table) instead of divs with click handlers
- Add appropriate ARIA labels and roles
- Test with accessibility tools (Axe, Lighthouse)
- Ensure keyboard navigation works for all interactive elements

**Warning signs:**
- divs with onClick handlers instead of buttons
- Missing alt text for images
- Low color contrast (less than 4.5:1 for normal text)
- No keyboard focus indicators

**Phase to address:**
Phase 4: Accessibility Improvements

---

### Pitfall 5: Localization Debt from Hardcoded Strings

**What goes wrong:**
Adding localization becomes extremely time-consuming because strings are hardcoded in components. Each new language requires modifying every component file.

**Why it happens:**
- Strings embedded directly in JSX
- No centralized localization system
- Lack of planning for multi-language support
- Components that concatenate strings dynamically

**How to avoid:**
- Use a localization library (e.g., react-i18next)
- Create a centralized dictionary of all UI strings
- Wrap all user-visible text in translation functions
- Avoid string concatenation that breaks translation
- Test localization fallback logic

**Warning signs:**
- User-visible strings in JSX without translation wrappers
- No localization library in package.json
- Strings built dynamically with template literals
- No fallback language configuration

**Phase to address:**
Phase 5: Localization Management

---

### Pitfall 6: Ignoring Existing Business Logic During Refactor

**What goes wrong:**
Refactor breaks existing functionality because developers focus on UI changes without understanding the underlying business logic.

**Why it happens:**
- Lack of documentation for existing features
- Not running existing tests before and after changes
- Refactoring without understanding how components interact
- Overly aggressive "cleanup" of code that seems unused

**How to avoid:**
- Run all existing tests before starting refactor
- Document existing functionality before making changes
- Use incremental refactor instead of big bang approach
- Test each change with existing E2E tests
- Consult with stakeholders about business logic

**Warning signs:**
- No existing tests for the UI being refactored
- Lack of documentation for features
- Making large, sweeping changes without incremental testing
- Removing code that seems "unused" without verification

**Phase to address:**
Phase 0: Refactor Preparation & Audit

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding test IDs in components | Faster test writing | Brittle tests when UI changes | Only for simple, stable components |
| Using CSS classes for selection | Familiar syntax | Tests break when class names change | Never - use data-testid instead |
| Conditional rendering in shared components | Reuses code | Role leakage, harder maintenance | Only with strict RBAC validation |
| Hardcoding strings in JSX | Faster development | Extremely expensive localization | Never - wrap all strings |
| Fixed-width containers | Predictable layout | Breaks on different screen sizes | Never - use responsive units |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| React Router | Role-based routes implemented in components | Implement routes in a centralized router with RBAC validation |
| State Management | Storing role info in local state | Use a context or state management library with persistence |
| API Calls | Not validating permissions on frontend | Validate permissions both frontend and backend |
| Localization | Loading all languages at once | Load language packs dynamically based on user preference |
| E2E Tests | Running tests sequentially | Run tests in parallel with isolated data |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unoptimized images | Slow load times on Full HD | Use responsive images, lazy loading | 10+ images per page |
| Overly complex CSS | Layout jank, slow rendering | Keep CSS simple, use CSS variables | Complex dashboards with many components |
| Excessive re-renders | Slow responsiveness | Use React.memo, useMemo, useCallback | Dashboards with real-time data |
| Large language packs | Slow initial load | Split language packs by feature | 5+ languages with large content |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Role checks only on frontend | Users can access restricted content via API | Validate permissions on every API endpoint |
| Exposed test IDs in production | Information leakage about internal structure | Remove data-testid attributes in production build |
| Hardcoded API keys in UI | Credential theft | Store secrets in environment variables |
| Missing CSRF protection | Cross-site request forgery | Implement CSRF tokens |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|----------------|
| Overloaded dashboards | Users can't find important info | Role-based views with only relevant data |
| Inconsistent navigation | Confusion, longer task times | Standardized navigation across all roles |
| Missing feedback | Users unsure if actions succeeded | Add loading states, success/error messages |
| Poor mobile experience | Frustration for mobile users | Ensure responsive design works on all screen sizes |

## "Looks Done But Isn't" Checklist

- [ ] **Role-based dashboards:** Verify all roles see only their intended content
- [ ] **Responsive design:** Test on Full HD, tablet, and mobile screens
- [ ] **Localization:** Verify all strings are wrapped in translation functions
- [ ] **Accessibility:** Run Axe and Lighthouse tests, check keyboard navigation
- [ ] **E2E tests:** Run all tests to ensure no regression
- [ ] **API permissions:** Validate permissions on all endpoints
- [ ] **Performance:** Check load times and rendering performance
- [ ] **Visual consistency:** Ensure spacing, fonts, and colors are consistent

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Role-based view leakage | HIGH | Audit all components, centralize RBAC logic, add tests |
| Brittle E2E tests | MEDIUM | Replace text selectors with data-testid, update tests |
| Accessibility regression | HIGH | Run accessibility tools, fix semantic HTML, add ARIA |
| Localization debt | HIGH | Extract all strings to centralized dictionary, wrap with i18n |
| Responsive design issues | MEDIUM | Test on Full HD, adjust container widths, fix media queries |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Role-based view leakage | Phase 1: Role-Based Dashboard Architecture | E2E tests for each role |
| Brittle E2E tests | Phase 2: E2E Test Standardization | Run tests before/after changes |
| Inconsistent responsive behavior | Phase 3: Full HD Responsive Design | Test on Full HD screen sizes |
| Accessibility regression | Phase 4: Accessibility Improvements | Axe and Lighthouse audits |
| Localization debt | Phase 5: Localization Management | Verify all strings are translated |
| Ignoring business logic | Phase 0: Refactor Preparation & Audit | Run existing tests before/after |

## Sources

- Replay Blog: 7 Fatal Mistakes to Avoid When Modernizing Large-Scale Legacy UI
- Edwin Choate UX: Roles & Permissions Redesign
- Dev.to: Common Mistakes in React Admin Dashboards
- VERSIONS®: The Most Common UX Errors in Enterprise Dashboards
- Medium: Responsive Web Design Challenges You Can’t Ignore in 2026
- Playwright Documentation: Best Practices for Reliable E2E Tests

---

_Pitfalls research for: UI/UX Refactor for Role-Based Dashboards & Full HD Optimization_
_Researched: 2026-03-06_