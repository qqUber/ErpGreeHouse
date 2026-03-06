# Plan 17-03: Refactor Dashboard to Use Role-Based Widgets

## Overview
Created a role-specific widget system and refactored the dashboard to use role-based rendering.

## Tasks Completed

### Task 1: DashboardWrapper Component
- **File:** `admin-ui/src/components/dashboard/DashboardWrapper.tsx`
- **Created:** DashboardWrapper component that renders role-specific dashboards
- **Features:**
  - Uses `useAuth` hook to get user role
  - Supports operator, manager, and admin roles
  - Includes fallback for unknown roles (renders operator dashboard)
  - Helper functions: `getUserRole()`, `canAccessWidget()`

### Task 2: Widget Registry
- **File:** `admin-ui/src/components/dashboard/widgetRegistry.ts`
- **Created:** Comprehensive widget registry with role/permission mapping
- **Features:**
  - 20+ widgets defined across categories (kpi, analytics, operations, marketing, security, system)
  - Widget metadata includes: id, name, description, requiredPermissions, requiredRoles, category
  - Helper functions:
    - `getWidgetsForRole(role)` - Get all widgets for a role
    - `getWidgetsForPermissions(permissions)` - Get widgets based on permissions
    - `isWidgetAccessible(widgetId, role, permissions)` - Check widget access
    - `getWidgetsByCategory(role)` - Group widgets by category
  - `ROLE_DASHBOARD_CONFIG` - Default dashboard layouts per role

### Task 3: App.tsx Integration
- **File:** `admin-ui/src/App.tsx`
- **Updated:** DashboardView component to use DashboardWrapper
- **Changes:**
  - Added import for DashboardWrapper
  - Replaced ~200 lines of inline role-based rendering with single DashboardWrapper component
  - Removed duplicate user role checking logic
  - Simplified component to delegate role-based rendering

## Implementation Details

### Role Hierarchy
- **owner (ADMIN)** - Full system access with all admin widgets
- **marketer (MANAGER)** - Business analytics, marketing, and integrations
- **operator (OPERATOR)** - Basic POS, customer lookup, product catalog

### Widget Categories
| Category | Description |
|----------|-------------|
| kpi | Key performance indicators |
| analytics | Charts and data analysis |
| operations | POS, customers, products |
| marketing | Campaigns and events |
| security | Access control |
| system | Health and performance |

## Verification
- Build succeeds: `npm run build` completes without errors
- TypeScript compilation passes
- No breaking changes to existing functionality

## Commits
- `feat(17-03): create DashboardWrapper component`
- `feat(17-03): create role-specific widget registry`
- `feat(17-03): update App.tsx to use DashboardWrapper`

## Next Steps
- Extend widget registry with additional custom widgets
- Implement dynamic widget loading based on permissions
- Add widget configuration UI for admins
