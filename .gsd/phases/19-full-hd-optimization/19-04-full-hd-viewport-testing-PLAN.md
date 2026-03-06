---
phase: 19-full-hd-optimization
plan: 04
type: auto
---

<objective>
Add Full HD viewport testing to E2E suite
Purpose: Ensure the UI is tested at 1920x1080 resolution to catch responsive issues
Output: Full HD viewport test scenarios in Playwright
</objective>

<context>
@.gsd/phases/16-foundation/16-PLAN.md
@admin-ui/e2e/dashboard.test.ts
@admin-ui/e2e/_shared.ts
</context>

<tasks>
  <task type="auto">
    <name>Add Full HD test scenarios</name>
    <files>admin-ui/e2e/dashboard.test.ts, admin-ui/e2e/_shared.ts</files>
    <action>Add test scenarios for Full HD viewport (1920x1080)</action>
    <verify>Check that test scenarios include all dashboard types</verify>
    <done>Full HD test scenarios added</done>
  </task>

  <task type="auto">
    <name>Run Full HD tests</name>
    <action>Run the new Full HD test scenarios</action>
    <verify>Check that all tests pass at 1920x1080 resolution</verify>
    <done>Full HD tests passed</done>
  </task>
</tasks>

<verification>
Run the following commands to verify:
1. npm run test:e2e - Run all E2E tests including Full HD scenarios
2. Check test results for failures
</verification>

<success_criteria>
- Full HD viewport test scenarios exist
- All tests pass at 1920x1080 resolution
- Test coverage includes all dashboard types and widgets
</success_criteria>

<output>
After completion, create SUMMARY.md with:
- Test scenarios added
- Test results
- Any issues found and fixed
</output>
