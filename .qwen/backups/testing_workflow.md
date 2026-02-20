# Testing Workflow Directives

## 1. Test Failure Handling
- **Upon Failure:** If a test fails, immediately inspect the failure details (stack trace, error message) to pinpoint the exact location and cause.
- **Fix & Verify:** After applying a fix, run **ONLY** the specific test case that failed to verify the fix.
- **Goal:** Minimize test execution time by avoiding full suite runs during the fix cycle.
