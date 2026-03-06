---
phase: 16
name: Foundation
milestone: v2.2 UI/UX Refactor
type: standard
---

<objective>
Set up core infrastructure for the UI/UX refactor: 3xl breakpoint, enhanced grid system, data-testid attributes, and Full HD viewport testing configuration.

Purpose: Provide stable foundation for subsequent phases (role-based UI, localization, accessibility).
Output: 3xl breakpoint configured, data-testid attributes added to key UI elements, Playwright Full HD viewport configured.
</objective>

<context>
@.gsd/PROJECT.md
@.gsd/ROADMAP.md
@.gsd/phases/15-refactor-preparation/15-RESEARCH.md
@.gsd/phases/15-refactor-preparation/15-04-SUMMARY.md
@.gsd/phases/15-refactor-preparation/15-05-SUMMARY.md
</context>

<plans>

<plan id="01" name="3xl Breakpoint & Grid System Enhancement">

<tasks>
  <task type="auto">
    <name>Verify existing 3xl breakpoint</name>
    <files>admin-ui/src/styles.css</files>
    <action>Check existing @media (min-width: 1920px) breakpoint in styles.css</action>
    <verify>1920px breakpoint exists and has proper styles</verify>
    <done>3xl breakpoint verified</done>
  </task>

  <task type="auto">
    <name>Enhance grid system for Full HD</name>
    <files>admin-ui/src/styles.css</files>
    <action>Add 12-column grid system optimized for 1920px with consistent spacing tokens</action>
    <verify>Grid system with 12 columns available at 1920px</verify>
    <done>Enhanced grid system added</done>
  </task>

  <task type="auto">
    <name>Add consistent spacing tokens</name>
    <files>admin-ui/src/styles.css</files>
    <action>Define CSS custom properties for consistent spacing across all breakpoints</action>
    <verify>Spacing tokens defined and used consistently</verify>
    <done>Spacing tokens added</done>
  </task>
</tasks>

<verification>
Build succeeds, no CSS errors
</verification>

<success_criteria>
- 3xl (1920px) breakpoint verified/enhanced
- 12-column grid system available
- Consistent spacing tokens defined
</success_criteria>

<output>
After completion, create SUMMARY.md with breakpoint configuration details
</output>

</plan>

<plan id="02" name="Data-Testid Attributes Implementation">

<tasks>
  <task type="auto">
    <name>Add data-testid to navigation tabs</name>
    <files>admin-ui/src/App.tsx</files>
    <action>Add data-testid attributes to all navigation tabs following pattern: {role}_nav_{tab}_{lang}</action>
    <verify>All 8 navigation tabs have data-testid attributes</verify>
    <done>Navigation tabs have data-testid</done>
  </task>

  <task type="auto">
    <name>Add data-testid to dashboard widgets</name>
    <files>admin-ui/src/components/dashboard/*.tsx</files>
    <action>Add data-testid to AdminDashboard, ManagerDashboard, OperatorDashboard widget sections</action>
    <verify>All dashboard widgets have data-testid</verify>
    <done>Dashboard widgets have data-testid</done>
  </task>

  <task type="auto">
    <name>Add data-testid to common buttons</name>
    <files>admin-ui/src/App.tsx</files>
    <action>Add data-testid to common action buttons: New Sale, Identify Client, Catalog, etc.</action>
    <verify>All common buttons have data-testid</verify>
    <done>Common buttons have data-testid</done>
  </task>

  <task type="auto">
    <name>Add data-testid to form elements</name>
    <files>admin-ui/src/components/*.tsx</files>
    <action>Add data-testid to form inputs, selects, and key form actions</action>
    <verify>Key form elements have data-testid</verify>
    <done>Form elements have data-testid</done>
  </task>
</tasks>

<verification>
Build succeeds, no TypeScript errors
</verification>

<success_criteria>
- Navigation tabs have data-testid
- Dashboard widgets have data-testid
- Common buttons have data-testid
- Form elements have data-testid
- Pattern: role_component_element_language (e.g., admin_nav_dashboard_en)
</success_criteria>

<output>
After completion, create SUMMARY.md with data-testid coverage report
</output>

</plan>

<plan id="03" name="Playwright Full HD Viewport Configuration">

<tasks>
  <task type="auto">
    <name>Add Full HD viewport to Playwright</name>
    <files>admin-ui/playwright.config.ts</files>
    <action>Add Full HD (1920x1080) viewport configuration to Playwright projects</action>
    <verify>Playwright config includes 1920x1080 viewport</verify>
    <done>Full HD viewport added to Playwright</done>
  </task>

  <task type="auto">
    <name>Create Full HD test project</name>
    <files>admin-ui/playwright.config.ts</files>
    <action>Create dedicated 'fullhd' project in Playwright config for Full HD testing</action>
    <verify>'fullhd' project exists and configured</verify>
    <done>Full HD test project created</done>
  </task>

  <task type="auto">
    <name>Test viewport configuration</name>
    <files>admin-ui/e2e/</files>
    <action>Run simple test with Full HD viewport to verify configuration works</action>
    <verify>Test runs successfully at 1920x1080</verify>
    <done>Viewport configuration verified</done>
  </task>
</tasks>

<verification>
Playwright tests run at Full HD viewport
</verification>

<success_criteria>
- Full HD (1920x1080) viewport configured
- Dedicated 'fullhd' project exists
- Tests can run at 1920x1080 resolution
</success_criteria>

<output>
After completion, create SUMMARY.md with viewport configuration details
</output>

</plan>

<plan id="04" name="Refactor Tests to Use data-testid">

<tasks>
  <task type="auto">
    <name>Create test utilities for data-testid</name>
    <files>admin-ui/e2e/_shared.ts</files>
    <action>Add helper functions in _shared.ts to use data-testid selectors</action>
    <verify>Helper functions available for data-testid selection</verify>
    <done>Test utilities created</done>
  </task>

  <task type="auto">
    <name>Refactor smoke tests to use data-testid</name>
    <files>admin-ui/e2e/smoke/*.spec.ts</files>
    <action>Update smoke tests to use data-testid selectors instead of getByText</action>
    <verify>Smoke tests use data-testid selectors</verify>
    <done>Smoke tests refactored</done>
  </task>

  <task type="auto">
    <name>Run refactored tests</name>
    <files>admin-ui/e2e/smoke/</files>
    <action>Run smoke tests to verify refactored selectors work</action>
    <verify>All smoke tests pass with data-testid</verify>
    <done>Tests verified</done>
  </task>
</tasks>

<verification>
All refactored tests pass
</verification>

<success_criteria>
- Test utilities created
- Smoke tests refactored to use data-testid
- Tests pass with new selectors
</success_criteria>

<output>
After completion, create SUMMARY.md with refactoring results
</output>

</plan>

</plans>

<verification>
All plans executed, build succeeds, tests pass
</verification>

<success_criteria>
- 3xl (1920px) breakpoint configured
- Grid system enhanced for Full HD
- data-testid attributes added to key UI elements
- Full HD viewport configured in Playwright
- Tests refactored to use data-testid
</success_criteria>

<output>
After completion, create SUMMARY.md with:
- Phase completion status
- data-testid coverage statistics
- Playwright Full HD configuration
- Test refactoring results
</output>
