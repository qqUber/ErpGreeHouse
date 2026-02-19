# Testing Strategy & Debugging Guide

## 1. Core Philosophy: "Critical First"
- **Focus:** Cover only the "Happy Path" and critical business flows.
- **Anti-Pattern:** Do not create tests for every minor UI element or edge case in E2E. Use Unit Tests for that.
- **Goal:** Tests should give confidence that the main application functions work (Login, Create Order, View Reports).

## 2. Debugging E2E Failures
To ensure painless debugging when a test fails:

### A. Artifacts (Automatic)
Playwright is configured to capture the following **only on failure**:
1.  **Screenshots:** Visual state at the moment of failure.
2.  **Video:** Replay of the session leading to the crash.
3.  **Trace:** Full execution trace (network, console, actions).

### B. Manual Debugging
If artifacts aren't enough:
1.  **Run with UI Mode:**
    ```bash
    npx playwright test --ui
    ```
    This opens an interactive debugger where you can step through the test.

2.  **Run Specific Test (Headful):**
    ```bash
    npx playwright test e2e/smoke/login.spec.ts --headed --debug
    ```

## 3. Recommended Smoke Suite (Must Have)
1.  **Authentication:** Login successfully.
2.  **Navigation:** Access main dashboard.
3.  **Critical Read:** Load a list of items (e.g., Orders).
4.  **Critical Write:** Create a simple item (if applicable).

## 4. Environment Check
Before debugging, always ensure:
- Backend is running (`localhost:8000`).
- Frontend is running (`localhost:5173`).
- Database/Redis are healthy.
