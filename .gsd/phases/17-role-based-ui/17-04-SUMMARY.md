# Plan 17-04: Create Role-Based Test Utilities

## Status: Complete ✓

**Date:** 2026-03-06

## Tasks Completed

### Task 1: Role Fixtures ✓
- Added `RoleTestFixtures` interface with typed helpers
- Added `createRoleFixtures()` for Playwright `test.extend()` usage
- Added `getAvailableRoles()` and `getCredentials()` helpers

### Task 2: Permission Test Helpers ✓
- Added `RolePermissions` constant with role-based access maps
- Added `expectNavVisible(page, navItem, role, shouldBeVisible)` helper
- Added `expectAllTabsVisible(page, role)` - verifies all allowed tabs visible
- Added `expectNoUnauthorizedTabs(page, role)` - verifies unauthorized tabs hidden
- Added `expectApiAccess()` - verifies API permission enforcement
- Added `hasPermission(role, feature)` - quick permission check

### Task 3: Role Tests Verified ✓
- All 6 role tests pass
- `owner sees all tabs` - PASS
- `operator cannot see integrations` - PASS
- `manager cannot see pos operations` - PASS

## Role Permission Maps

| Role | Tabs | API Access |
|------|------|------------|
| owner (admin) | dashboard, customers, pos, products, marketing, integrations, settings, compliance, analytics | All |
| marketer (manager) | dashboard, customers, products, marketing, integrations | No pos, no settings |
| operator | customers, pos | customers, pos only |

## Files Modified

- `admin-ui/e2e/_shared.ts` - Added 202 lines of role fixtures and helpers

## Test Results

```
6 passed (1.2m)
- smoke/fullhd: owner sees all tabs ✓
- smoke/fullhd: operator cannot see integrations ✓
- smoke/fullhd: manager cannot see pos operations ✓
- smoke/fullhd: owner sees all tabs ✓
- smoke/fullhd: operator cannot see integrations ✓
- smoke/fullhd: manager cannot see pos operations ✓
```

## Usage Examples

```typescript
import { createRoleFixtures, expectNavVisible, expectApiAccess } from './e2e/_shared';

const roleFixtures = createRoleFixtures();
const test = base.extend(roleFixtures);

// Using fixtures in tests
test('admin can access settings', async ({ page, asAdmin }) => {
  await asAdmin(page);
  await expectNavVisible(page, 'settings', 'admin', true);
});

// Using permission helpers
test('operator cannot see settings', async ({ page }) => {
  await login(page, 'operator');
  await expectNavVisible(page, 'settings', 'operator', false);
});
```

## Notes

- Role fixtures integrate with existing `login()` function
- Permission helpers use data-testid selectors for stability
- Helpers work with both English and Russian language tests
- All helpers are async and use Playwright's expect for assertions
