# Plan 16-04 Summary: Refactor Tests to Use data-testid

## Objective
Refactor E2E tests to use data-testid selectors instead of getByText for language-independent, stable tests.

## Tasks Completed

### Task 1: Create test utilities for data-testid ✓
**Files:** admin-ui/e2e/_shared.ts

**Created utility functions:**
- `getTestId(prefix, element, lang)` - Generate data-testid strings
- `getByTestId(page, testId)` - Wrapper for Playwright's getByTestId
- `getNavTestId(page, navItem, lang)` - Navigation element locators
- `getButtonTestId(page, prefix, buttonName, lang)` - Button element locators  
- `getInputTestId(page, prefix, inputName, lang)` - Input element locators
- `getViewTestId(page, viewName, lang)` - View/container locators

**Created TestIds constant with pre-defined patterns for:**
- Navigation (admin_nav_dashboard_en, admin_nav_customers_en, etc.)
- Common buttons and inputs
- Operator buttons and POS elements
- View/container elements
- Dashboard widgets
- Customer and Product management elements

### Task 2: Refactor smoke tests to use data-testid ✓
**Files:** 
- admin-ui/e2e/smoke/smoke.spec.ts
- admin-ui/e2e/smoke/roles.spec.ts
- admin-ui/e2e/smoke/analytics.spec.ts

**Tests refactored:**
- smoke.spec.ts: 1 test (POS functionality)
- roles.spec.ts: 3 tests (owner/operator/manager visibility)
- analytics.spec.ts: 2 tests (recent sales, dashboard metrics)

**Total: 6 tests refactored**

### Task 3: Run refactored tests ✓
**Verification:** All 14 smoke tests pass

## Key Changes

1. **Before:** Tests used hardcoded Russian text like 'Новая продажа', 'Идентифицировать клиента'
2. **After:** Tests use data-testid like `TestIds.operator.btnNewSale`, `TestIds.nav.dashboard`

## Benefits

- **Language-independent:** Tests work regardless of UI language
- **More stable:** Less fragile against UI text changes
- **Better maintainability:** Centralized test ID definitions in TestIds constant

## Test Results

```
14 passed (3.1m)
```

All smoke tests now use data-testid selectors successfully.

## Commits

- `285b0ee` feat(16-04): add data-testid helper utilities for stable E2E selectors
- `928e0a1` feat(16-04): refactor smoke tests to use data-testid selectors  
- `2e4e235` fix(16-04): update analytics tests to handle conditional widget rendering
