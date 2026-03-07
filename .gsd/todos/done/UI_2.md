📄 CRM One‑Page UI/UX & E2E Smoke Tests (Draft.md)
1. UI/UX One‑Page Requirements
Single‑page layout: все ключевые виджеты и таблицы должны быть доступны без вертикального скролла на Full HD экране.

Card‑based design: метрики (выручка, продажи, клиенты, лояльность) вынесены в компактные карточки.

Collapsible panels: для второстепенных данных (например, маркетинговые события, интеграции).

Pagination instead of scroll: таблицы (клиенты, товары, транзакции) должны иметь пагинацию и фильтры.

Consistent typography & spacing: 8px grid, единый шрифт, фиксированные размеры заголовков.

Responsive resizing: адаптация под Full HD без «прыгающего» текста.

2. E2E Smoke Test Scenarios
Admin
✅ Login → verify full access to all modules.

✅ Dashboard metrics load (Sales Today, Revenue Today, Net Balance).

✅ Access Analytics page and confirm data rendering.

✅ System Health visible in System Overview (pill format).

✅ Widgets flexible and moveable.

📸 Screenshot after each module check.

Operator
✅ Login → restricted access.

✅ Identify customer by phone/QR.

✅ Perform sale: add items from catalog, apply loyalty points, complete transaction.

✅ Verify receipt saved to PDF + Telegram notification.

✅ Operator sees only current client data and linked transactions.

📸 Screenshot after sale completion.

Manager
✅ Login → access Clients, Products, Marketing, Analytics.

✅ Manage campaigns: create/update/view marketing events.

✅ Observe loyalty program data and CRM artifacts.

✅ Validate integrations with Telegram/VK online.

✅ Customers table compact with pagination.

📸 Screenshot after campaign creation and client/product management.

3. Logic & Analytics Checks
Data consistency: метрики на дашборде должны совпадать с таблицами транзакций.

Role separation: оператор не видит маркетинг, менеджер не видит системные настройки, админ видит всё.

Localization: RU/EN/SR проверяются через Playwright тесты, fallback EN → RU → SR.

Performance widget: расширить аналитикой (по скриншотам видно, что данных мало).

Recent Activity: сделать полезным (связать с транзакциями и клиентами).

Mouse‑less operation: горячие клавиши для операторов (быстрая идентификация клиента, добавление товара).

4. Testing Infrastructure
All tests run in Docker.

Only Playwright for E2E + screenshots.

No manual *.mjs scripts.

Stable data-testid attributes with format:
role_component_action_language  
Example: OPERATOR_DASHBOARD_IDENTIFYCLIENT_RU.