Testing Workflow Directives
Targeted JWT Validation: Run E2E tests specifically for the Dashboard and Login flows. Ensure they utilize the JWT Cookie Flow and not the legacy secret.

Failure Handling: If a test fails, do not run the entire suite. Inspect the stack trace, fix the specific cause, and run ONLY that failing test case to verify.

Negative Testing: Manually verify that a malformed JWT (e.g., a random string with 2 dots) returns a 401 Unauthorized and does NOT accidentally leak into the legacy validation logic.

Documentation Sync: After successful tests, update AUTH_FLOW_SOURCE_OF_TRUTH.md and the Mermaid diagrams in /docs to reflect the final code state (including the new cookie security logs and dynamic secrets).

Report back with the test results and confirmation of the documentation update."