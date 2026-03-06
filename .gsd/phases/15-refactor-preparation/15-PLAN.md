---
phase: 15
name: Refactor Preparation & Audit
milestone: v2.2 UI/UX Refactor
type: standard
---

<objective>
Run existing tests, conduct audit, and document current implementation to prepare for Phase 16 UI/UX refactor. This phase ensures we understand the current state before making changes and identifies any existing issues that need to be addressed.

Purpose: Provide a baseline for the refactor, ensuring we don't break existing functionality and have a clear understanding of what needs to be improved.
Output: Codebase audit, test baseline, feature documentation, accessibility assessment.
</objective>

<context>
@.gsd/PROJECT.md
@.gsd/ROADMAP.md
@.gsd/phases/15-refactor-preparation/15-RESEARCH.md
@.gsd/phases/15-refactor-preparation/15-CONTEXT.md
</context>

<plans>

<plan id="01" name="Codebase Audit & Test Infrastructure Verification">

<tasks>
  <task type="auto">
    <name>Install dependencies</name>
    <files>package.json, admin-ui/package.json</files>
    <action>Run npm install in both root and admin-ui directories</action>
    <verify>node_modules directory exists, package-lock.json updated</verify>
    <done>Dependencies installed successfully</done>
  </task>

  <task type="auto">
    <name>Run TypeScript compilation</name>
    <files>admin-ui/tsconfig.json</files>
    <action>Run tsc --noEmit in admin-ui directory</action>
    <verify>No TypeScript errors in output</verify>
    <done>TypeScript compilation completed successfully</done>
  </task>

  <task type="auto">
    <name>Run ESLint check</name>
    <files>admin-ui/.eslintrc.json, admin-ui/src/</files>
    <action>Run npm run lint in admin-ui directory</action>
    <verify>No ESLint errors, warnings reported</verify>
    <done>ESLint check completed successfully</done>
  </task>

  <task type="auto">
    <name>Run Stylelint check</name>
    <files>admin-ui/.stylelintrc.json, admin-ui/src/</files>
    <action>Run npm run stylelint in admin-ui directory</action>
    <verify>No Stylelint errors, warnings reported</verify>
    <done>Stylelint check completed successfully</done>
  </task>

  <task type="auto">
    <name>Check Playwright configuration</name>
    <files>admin-ui/playwright.config.ts</files>
    <action>Verify Playwright test setup, check if dependencies are installed</action>
    <verify>playwright.config.ts exists, dependencies installed</verify>
    <done>Playwright configuration verified</done>
  </task>
</tasks>

<verification>
npm run build in admin-ui directory completes successfully
</verification>

<success_criteria>
- Dependencies installed
- TypeScript compilation passes
- ESLint and Stylelint checks pass
- Playwright configuration verified
- Build completes successfully
</success_criteria>

<output>
After completion, create SUMMARY.md with:
- Dependencies installed and build status
- TypeScript compilation results
- ESLint and Stylelint findings
- Playwright configuration details
</output>

</plan>

<plan id="02" name="Run Existing E2E Tests for Baseline">

<tasks>
  <task type="auto">
    <name>Start backend server</name>
    <files>docker-compose.e2e.yml</files>
    <action>Start backend service using Docker Compose</action>
    <verify>Backend server responds to health check</verify>
    <done>Backend server running</done>
  </task>

  <task type="auto">
    <name>Build frontend</name>
    <files>admin-ui/package.json</files>
    <action>Build production version of admin-ui</action>
    <verify>dist directory created, contains index.html</verify>
    <done>Frontend built successfully</done>
  </task>

  <task type="auto">
    <name>Run Playwright E2E tests</name>
    <files>admin-ui/playwright.config.ts, admin-ui/e2e/</files>
    <action>Run npx playwright test in admin-ui directory</action>
    <verify>All tests pass, test results captured</verify>
    <done>Playwright E2E tests completed</done>
  </task>

  <task type="auto">
    <name>Stop backend server</name>
    <action>Stop Docker Compose services</action>
    <verify>All containers stopped</verify>
    <done>Backend server stopped</done>
  </task>
</tasks>

<verification>
All 132 Playwright E2E tests pass, test report generated
</verification>

<success_criteria>
- Backend server starts and stops correctly
- Frontend builds successfully
- All Playwright E2E tests pass
- Test report generated with baseline results
</success_criteria>

<output>
After completion, create SUMMARY.md with:
- Test execution duration
- Number of tests passed/failed
- Test report location
- Any failing tests and their potential causes
</output>

</plan>

<plan id="03" name="Documentation & Component Inventory">

<tasks>
  <task type="auto">
    <name>Document existing features</name>
    <files>admin-ui/src/pages/, admin-ui/src/components/</files>
    <action>Create inventory of existing pages and components</action>
    <verify>Document contains all main pages and components</verify>
    <done>Existing features documented</done>
  </task>

  <task type="auto">
    <name>Document business logic</name>
    <files>admin-ui/src/hooks/, admin-ui/src/services/</files>
    <action>Document key business logic: loyalty program, messaging, compliance, ERP integration</action>
    <verify>Document covers all key business features</verify>
    <done>Business logic documented</done>
  </task>

  <task type="auto">
    <name>Document localization</name>
    <files>admin-ui/src/locales/</files>
    <action>Document current localization setup, coverage, and fallback logic</action>
    <verify>Document contains language support details</verify>
    <done>Localization documented</done>
  </task>

  <task type="auto">
    <name>Create component inventory</name>
    <files>admin-ui/src/components/</files>
    <action>Create inventory of existing components with documentation</action>
    <verify>Inventory contains all main components with descriptions</verify>
    <done>Component inventory created</done>
  </task>
</tasks>

<verification>
Documentation files created, component inventory complete
</verification>

<success_criteria>
- Features documented: loyalty, messaging, compliance, ERP integration
- Components inventory created
- Localization setup documented
- Business logic documented
</success_criteria>

<output>
After completion, create SUMMARY.md with:
- Documentation files created
- Number of pages/components documented
- Key business features documented
- Localization coverage details
</output>

</plan>

<plan id="04" name="Accessibility & Performance Audit">

<tasks>
  <task type="auto">
    <name>Run Lighthouse audit</name>
    <files>admin-ui/dist/</files>
    <action>Run Lighthouse audit on production build</action>
    <verify>Lighthouse report generated with performance, accessibility, best practices scores</verify>
    <done>Lighthouse audit completed</done>
  </task>

  <task type="auto">
    <name>Run accessibility audit</name>
    <files>admin-ui/src/</files>
    <action>Run axe-core accessibility audit on key views</action>
    <verify>Accessibility report generated with violations</verify>
    <done>Accessibility audit completed</done>
  </task>

  <task type="auto">
    <name>Check for hardcoded text</name>
    <files>admin-ui/src/</files>
    <action>Search for hardcoded text that should be localized</action>
    <verify>Report of hardcoded text locations</verify>
    <done>Hardcoded text search completed</done>
  </task>
</tasks>

<verification>
Audit reports generated, violations documented
</verification>

<success_criteria>
- Lighthouse audit report created
- Accessibility audit report created
- Hardcoded text report created
- Audit findings documented
</success_criteria>

<output>
After completion, create SUMMARY.md with:
- Lighthouse scores (performance, accessibility, best practices)
- Accessibility violations and severity
- Hardcoded text locations
- Audit recommendations
</output>

</plan>

<plan id="05" name="Test Infrastructure Enhancement">

<tasks>
  <task type="auto">
    <name>Check role-based testing configuration</name>
    <files>admin-ui/playwright.config.ts, admin-ui/e2e/</files>
    <action>Check if Playwright has role-based testing configured</action>
    <verify>Report of current role-based testing setup</verify>
    <done>Role-based testing configuration checked</done>
  </task>

  <task type="auto">
    <name>Check test selectors</name>
    <files>admin-ui/src/components/, admin-ui/e2e/</files>
    <action>Check if components use data-testid attributes for testing</action>
    <verify>Report of test selector usage</verify>
    <done>Test selectors checked</done>
  </task>

  <task type="auto">
    <name>Check viewport configurations</name>
    <files>admin-ui/playwright.config.ts</files>
    <action>Check if Playwright has Full HD (1920x1080) viewport configured</action>
    <verify>Report of current viewport configurations</verify>
    <done>Viewport configurations checked</done>
  </task>
</tasks>

<verification>
Test infrastructure report created
</verification>

<success_criteria>
- Role-based testing configuration checked
- Test selectors usage reported
- Viewport configurations checked
- Test infrastructure recommendations documented
</success_criteria>

<output>
After completion, create SUMMARY.md with:
- Current role-based testing setup
- Test selector usage (text vs data-testid)
- Viewport configurations
- Recommendations for test infrastructure improvements
</output>

</plan>

</plans>

<verification>
All plans executed, audit completed, documentation created
</verification>

<success_criteria>
- All existing E2E tests pass in current state
- Codebase audit report identifies UI/UX pain points
- Current features and business logic documented
- Test infrastructure verified for role-based testing
</success_criteria>

<output>
After completion, create SUMMARY.md with:
- Phase completion status
- All audit reports generated
- Test baseline results
- Documentation created
- Recommendations for Phase 16 refactor
</output>
