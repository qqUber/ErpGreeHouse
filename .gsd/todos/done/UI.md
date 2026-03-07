Design and implement E2E smoke tests for the Control Panel UI/UX with Playwright in Docker, covering minimal but critical flows for each role:

1. Admin role:
   - Verify login and full access to all modules (Dashboard, Clients, Sales, Products, Marketing, Analytics, Compliance).
   - Confirm dashboard metrics load correctly (Sales Today, Revenue Today, Net Balance).
   - Check Analytics page access and data rendering.
   - Validate System Health is shown in System Overview as compact pill format.
   - Ensure widgets are flexible and moveable.
   - Capture screenshots after each module verification.

2. Operator role:
   - Verify login and restricted access to operational tasks only.
   - Identify customer by phone or QR code.
   - Perform a sale operation: add items from catalog to cart, apply loyalty points, complete transaction.
   - Confirm receipt is saved to PDF and notification is sent if Telegram ID exists.
   - Validate that operator sees only current client data and linked transactions.
   - Capture screenshots after sale completion and client identification.

3. Manager role:
   - Verify login and access to Clients, Products, Marketing, and Analytics modules.
   - Manage campaigns: create, update, and view marketing events.
   - Observe loyalty program data and CRM artifacts.
   - Validate integrations with Telegram and VK are online and functional.
   - Check Customers table is compact with pagination (2 columns).
   - Capture screenshots after campaign creation and client/product management actions.

4. Common smoke test requirements:
   - All tests must start with login and verification that data is loaded.
   - Screenshots must be captured at the end of each critical scenario.
   - Tests must run inside Docker containers for reproducibility.
   - No manual *.mjs scripts or ad-hoc checks; only Playwright, unit tests, and integration tests are allowed.
   - Use stable `data-testid` attributes with structured naming:
     `role_component_action_language`
     Example: `OPERATOR_DASHBOARD_IDENTIFYCLIENT_RU`.

5. Localization:
   - Ensure tests validate UI in RU, EN, SR languages.
   - Use nested translation keys grouped by feature.
   - Fallback order: EN → RU → SR.
   - Enforce strict TypeScript type safety for translation keys.

6. Pending tasks integration:
   - Fix dashboard metrics not showing data.
   - Fix Analytics page access for Admin.
   - Enhance Performance widget with more analytics data.
   - Improve Recent Activity to be more useful.
   - Add pagination to all tables instead of scroll.
   - Optimize for mouse-less operation.
   - Run E2E tests after fixes to validate changes.

Outcome:
A clean, role-specific smoke test suite that validates critical flows for Admin, Operator, and Manager, ensures multilingual support, captures screenshots, and runs reproducibly in Docker with Playwright.
