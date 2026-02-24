Action Plan: Authentication System Recovery & Optimization (v2)
Goal: Resolve the JWT/Legacy Secret conflict, eliminate 500/401 errors, and establish a production-ready "Source of Truth" for authentication by clearly separating modern and legacy flows.

Phase 0: Test Logic Audit & Environment Prep
Objective: Prevent old tests from misguiding the implementation.

Test Suite Audit: Identify E2E tests using legacy Authorization: Bearer <secret> logic.

Explicit Test Tagging: Mark or update tests to explicitly distinguish between JWT-based tests (using cookies) and Legacy-based tests (using x-admin-secret).

Mandatory Instruction: During this phase, any test that expects a static secret to work inside a Bearer token must be marked as "Obsolete" or updated to use the x-admin-secret header.

Phase 1: Research & Conflict Audit
Codebase Scan: Locate all fetch/axios calls in admin-ui.

Middleware Trace: Analyze middleware/app/admin_auth_api.py for unhandled exceptions during JWT parsing.

Documentation Update: Reflect the "as-is" state in AUTH_FLOW_SOURCE_OF_TRUTH.md.

Phase 2: Design & Flow Visualization
Sequence Diagram: Generate a Mermaid.js diagram showing the dual-path logic:

Path A: JWT (Cookie) -> Validated as JWT.

Path B: x-admin-secret (Header) -> Validated as static string.

Error Path: Invalid JWT -> 401 Unauthorized (No fallback to legacy from a malformed JWT).

Documentation Update: Save diagram to docs/architecture/auth_flow_v2.md.

Phase 3: Implementation (Backend & Frontend)
Backend: Implement "Safe Check" (check for 2 dots in JWT) and try-except blocks in admin_auth_api.py.

Frontend: Update global interceptors to use conditional headers based on token format.

Documentation Update: Add inline code comments referencing auth_flow_v2.md.

Phase 4: Testing Workflow Directives (CRITICAL)
Objective: Rapid iteration and strict adherence to the new logic.

JWT-Specific Testing: Ensure all E2E tests for the Dashboard/Customers explicitly use the JWT Flow.

Test Failure Handling:

Upon Failure: Immediately inspect stack traces to pinpoint the cause.

Fix & Verify: After a fix, run ONLY the failed test case to minimize execution time.

Playwright Verification: Run the updated manual-entry.spec.ts and login-flow-test.spec.ts.

Phase 5: Finalization & Documentation Sync
Document Update: Update AUTH_FLOW_SOURCE_OF_TRUTH.md and .kilocode_rules with the "to-be" state.

Cleanup: Remove any leftover legacy fallback code that violates the new security policy.

System Instructions for the Agent:
Refuse Insecure Patterns: If a test or a task suggests putting a static secret in a Bearer token, you MUST reject it and reference the .kilocode_rules.

Phase Gate: You cannot start Phase 3 until Phase 2's Mermaid diagram is committed to the repository.

DOD (Definition of Done): All tests pass using ONLY the transport methods defined in the new architecture.