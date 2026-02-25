🏗️ Phase 2: Structural Refactoring (Integrations Layer)
1. New Directory Architecture
Мы переходим от плоской структуры к модульной:

Plaintext
middleware/
└── app/
    ├── integrations/           # New Integration Layer
    │   ├── bots/               # Communication Channels
    │   │   ├── telegram/       # Logic from bot.py
    │   │   └── vk/             # Logic from vk_bot.py
    │   └── pos/                # Point of Sale & External Systems
    │       ├── erpnext/        # Logic from erp_client.py
    │       └── shared/         # Common POS interfaces
    ├── handlers.py             # Shared Business Logic
    └── ...
2. The Logic of "Unified Customer Identity"
При вводе нового клиента через любого бота (TG или VK) мы следуем строгому протоколу:

Normalization: Входящий телефон прогоняется через normalize_phone.

Conflict Resolution: Если телефон найден в БД, мы просто добавляем новый tg_id или vk_id к существующей записи.

Cross-Channel Notification: После привязки мы уведомляем пользователя, что его аккаунты синхронизированы.

🚀 Prompt for KiloCode: Integration Layer Refactoring
To: KiloCode Orchestrator / Architect
Mission: Refactor Middleware into Modular Integration Layer

"Execute Phase 2: Architectural Cleanup. You are tasked with moving all external service logic into a structured integrations/ directory. Conduct a review and do not wait for me. [cite: 2026-02-24]

1. Directory Restructuring
Create: middleware/app/integrations/bots/ and middleware/app/integrations/pos/.

Relocate:

bot.py ➔ app/integrations/bots/telegram_handler.py.

vk_bot.py ➔ app/integrations/bots/vk_handler.py.

erp_client.py ➔ app/integrations/pos/erpnext_client.py.

Update Imports: Fix all import references in main.py and worker.py to reflect the new structure.

2. Unified Onboarding Flow Implementation
Shared Logic: In app/handlers.py, create a unified register_or_link_user function.

Process:

Receive phone + social ID (TG or VK).

Normalize phone via identify.py.

Check customers table for existing phone.

If exists: Update tg_id or vk_id.

If new: Create record + generate qr_token.

Channel Choice: Set preferred_channel based on the source of the first successful registration.

3. Stability & UI Fixes
Static Analysis: Resolve all 32 mypy errors and fix the safety CLI output redirection.

Dashboard: Fix the layout overflow in admin-ui/src/components/Dashboard. Use flex-wrap so analytics cards scale correctly.

API Validation: Fix the ResponseValidationError in integrations_api.py to return a raw list of IntegrationOut.

4. MANDATORY: Code Review Agent [2026-02-25]
Action: Always add a code review agent to the prompt next time and conduct a review immediately after the push. [cite: 2026-02-24]

Verification: Ensure no circular imports were created during the move to app/integrations/.

Task: Move the project to a 100% Green, modular state. Push to feature/ui-positive-cases-baseline. Execute."