Phase 2: Omnichannel Stability & Unified Identity
1. Vision & Architectural Goals
Phase 2 focuses on scaling the Telegram CRM MVP into a multi-channel platform.

Core Stack: Python 3.14-slim (utilizing Task Groups), Redis 8.0-Alpine (using RESP3 for high-speed state management), and FastAPI.

Identity Logic: Every user, regardless of whether they message via Telegram or VK, is mapped to a single customer_id via their verified phone number.

Preferred Channel: Users can choose their notification channel (TG, VK, or SMS), stored as preferred_channel in the database.

🔄 Detailed Customer Onboarding Flow (The "Link-by-Phone" Protocol)
To prevent data duplication and ensure the analytics dashboard displays accurate growth, the bots must follow this strict sequence:

Initial Interaction:

User sends /start or a greeting to the Telegram or VK bot.

Backend Check: The bot immediately checks for an existing tg_id or vk_id in the customers table.

Identity Request (The Gate):

If no ID is found, the bot asks for a phone number.

Telegram: Uses request_contact=True keyboard button for one-tap verification.

VK: Uses a text input + regex validation via normalize_phone.

Cross-Channel Database Lookup:

The system queries the database using the normalized phone number.

Case A (Existing Customer): If the phone exists but the tg_id/vk_id is empty, the system updates the record, linking the new social ID to the old profile.

Case B (New Customer): If the phone is new, a new record is created, and a unique qr_token is generated for in-store loyalty scans.

Welcome & Loyalty Injection:

A welcome bonus is credited to the balance_points field.

The user is notified in their current channel, which is set as their preferred_channel by default.

Dashboard Sync:

The transaction is immediately visible on the Control Panel under "Latest Sales" or "New Clients".

Prompt for KiloCode: Phase 2 Execution Directive
To: KiloCode Orchestrator / Architect
Mission: Omnichannel Identity & Infrastructure Lockdown

"Initiate Phase 2: Operational Scalability. You are authorized to operate autonomously to achieve a 100% Green Build. Conduct a review of every fix and do not wait for user input.

1. Unified Identity Implementation
Action: Centralize registration logic in middleware/app/handlers.py. Both bot.py and vk_bot.py must call a shared link_customer_profile function.

Database: Ensure the customers table handles tg_id and vk_id as BigInts. Add a preferred_channel field.

Fix: Resolve the ResponseValidationError in integrations_api.py. The endpoint must return list[IntegrationOut] directly to match the Pydantic schema.

2. UI/UX & Webhook Hardening
Dashboard Fix: Modify admin-ui/src/components/Dashboard CSS. Use flex-wrap and min-width on all analytics cards to stop text from spilling over borders.

Security: Fix the 403 Forbidden error on set_webhook. Ensure the ADMIN_SECRET environment variable is correctly read and compared during the webhook registration flow.

3. CI/CD & Static Analysis (Zero Tolerance)
Mypy: Resolve all 32 type errors (e.g., handling Optional types in products_api.py).

Safety: Fix syntax in tests.yml: safety check --json > reports/safety_report.json.

Lxml: Maintain libxml2-dev and libxslt-dev in the system dependencies step to ensure compilation on Python 3.14.

4. MANDATORY: Code Review Agent [2026-02-25]
Requirement: You MUST add a Code Review Agent to the prompt for the next iteration.

Verification: The agent must confirm the responsive layout of the dashboard and the integrity of the omnichannel linking logic before the task is considered 'Done'.

Task: Deploy fixes to the feature/ui-positive-cases-baseline branch. Report back only when the pipeline is GREEN and the UI is fixed. Execute."