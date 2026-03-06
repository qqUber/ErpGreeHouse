---
phase: 17
name: Role-Based UI System
milestone: v2.2 UI/UX Refactor
type: standard
---

<objective>
Implement role-based content rendering with a unified role enum, permission-based wrapper components, and role-specific widget system for modular dashboards.

Purpose: Provide role-based dashboards (Operator, Manager, Admin) with appropriate content visibility.
Output: Role enum, permission-based components, role-specific widgets, test utilities.
</objective>

<context>
@.gsd/PROJECT.md
@.gsd/ROADMAP.md
@.gsd/phases/15-refactor-preparation/15-RESEARCH.md
@.gsd/phases/16-foundation/16-PLAN.md
</context>

<plans>

<plan id="01" name="Create Role Enum and Types">

<tasks>
  <task type="auto">
    <name>Define role enum</name>
    <files>admin-ui/src/</files>
    <action>Create TypeScript role enum: {OPERATOR, MANAGER, ADMIN} matching backend roles (operator, manager, owner)</action>
    <verify>Role enum exported and used consistently</verify>
    <done>Role enum created</done>
  </task>

  <task type="auto">
    <name>Create permission types</name>
    <files>admin-ui/src/</files>
    <action>Define TypeScript types for permissions and role-based access control</action>
    <verify>Types exported and used</verify>
    <done>Permission types created</done>
  </task>
</tasks>

<verification>
Build succeeds, no TypeScript errors
</verification>

<success_criteria>
- Role enum {OPERATOR, MANAGER, ADMIN} implemented
- TypeScript types for permissions defined
</success_criteria>

<output>
After completion, create SUMMARY.md with role enum and types
</output>

</plan>

<plan id="02" name="Create Permission-Based Wrapper Components">

<tasks>
  <task type="auto">
    <name>Create PermissionGuard component</name>
    <files>admin-ui/src/components/</files>
    <action>Create reusable PermissionGuard component that conditionally renders content based on permissions</action>
    <verify>Component accepts permission prop and renders children only if user has permission</verify>
    <done>PermissionGuard component created</done>
  </task>

  <task type="auto">
    <name>Create RoleGuard component</name>
    <files>admin-ui/src/components/</files>
    <action>Create RoleGuard component for role-specific content rendering</action>
    <verify>Component accepts role prop and renders children only for specified role</verify>
    <done>RoleGuard component created</done>
  </task>

  <task type="auto">
    <name>Create usePermission hook</name>
    <files>admin-ui/src/hooks/</files>
    <action>Create usePermission hook for programmatic permission checking in components</action>
    <verify>Hook returns hasPermission function</verify>
    <done>usePermission hook created</done>
  </task>
</tasks>

<verification>
Build succeeds, components usable in existing code
</verification>

<success_criteria>
- PermissionGuard component implemented
- RoleGuard component implemented
- usePermission hook implemented
</success_criteria>

<output>
After completion, create SUMMARY.md with wrapper components
</output>

</plan>

<plan id="03" name="Refactor Dashboard to Use Role-Based Widgets">

<tasks>
  <task type="auto">
    <name>Create DashboardWrapper component</name>
    <files>admin-ui/src/components/dashboard/</files>
    <action>Create DashboardWrapper that renders role-specific dashboard based on user role</action>
    <verify>Wrapper renders correct dashboard for each role</verify>
    <done>DashboardWrapper created</done>
  </task>

  <task type="auto">
    <name>Create role-specific widget registry</name>
    <files>admin-ui/src/components/dashboard/</files>
    <action>Create widget registry mapping widgets to roles/permissions</action>
    <verify>Registry defines which widgets each role can see</verify>
    <done>Widget registry created</done>
  </task>

  <task type="auto">
    <name>Update App.tsx to use DashboardWrapper</name>
    <files>admin-ui/src/App.tsx</files>
    <action>Refactor App.tsx to use DashboardWrapper instead of inline role checks</action>
    <verify>Build succeeds, role-based dashboards work</verify>
    <done>App.tsx updated</done>
  </task>
</tasks>

<verification>
Build succeeds, smoke tests pass
</verification>

<success_criteria>
- DashboardWrapper component implemented
- Widget registry with role/permission mapping
- App.tsx uses role-based rendering
</success_criteria>

<output>
After completion, create SUMMARY.md with dashboard refactoring
</output>

</plan>

<plan id="04" name="Create Role-Based Test Utilities">

<tasks>
  <task type="auto">
    <name>Create role fixtures</name>
    <files>admin-ui/e2e/_shared.ts</files>
    <action>Add Playwright fixtures for each role (admin, manager, operator) with proper login</action>
    <verify>Fixtures available for testing</verify>
    <done>Role fixtures created</done>
  </task>

  <task type="auto">
    <name>Create permission test helpers</name>
  <files>admin-ui/e2e/_shared.ts</files>
  <action>Add helper functions to verify element visibility based on role</action>
  <verify>Helpers work correctly</verify>
  <done>Permission helpers created</done>
  </task>

  <task type="auto">
    <name>Run role-based tests</task>
  <files>admin-ui/e2e/roles/</files>
  <action>Run existing role tests to verify refactoring works</action>
  <verify>All role tests pass</verify>
  <done>Tests verified</done>
  </task>
</tasks>

<verification>
All role-based tests pass
</verification>

<success_criteria>
- Role fixtures available
- Permission helpers created
- Role tests pass
</success_criteria>

<output>
After completion, create SUMMARY.md with test utilities
</output>

</plan>

</plans>

<verification>
All plans executed, build succeeds, tests pass
</verification>

<success_criteria>
- Role enum {OPERATOR, MANAGER, ADMIN} implemented
- Permission-based wrapper components created
- Role-specific widget system implemented
- Role-based test utilities available
</success_criteria>

<output>
After completion, create SUMMARY.md with:
- Phase completion status
- Role enum and types
- Wrapper components created
- Dashboard refactoring results
- Test utilities
</output>
