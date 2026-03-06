# Component and Feature Inventory

## Phase 15: Refactor Preparation & Audit
## Plan 15-03: Documentation & Component Inventory

**Created:** March 2026
**Purpose:** Document existing features, business logic, and create component inventory before refactoring

---

## 1. Pages/Views Inventory

### Main Application Views (in admin-ui/src/)

| File | Description | Role-based |
|------|-------------|------------|
| `App.tsx` | Main application shell with routing, auth, and tab navigation | All |
| `AnalyticsView.tsx` | Analytics dashboard with charts and metrics | Owner/Marketing |
| `ComplianceView.tsx` | GDPR compliance: consent management and profile deletion | Owner |
| `LoyaltyTmaView.tsx` | Telegram Mini App for loyalty program (QR codes, balance) | Customer |
| `MarketingView.tsx` | Marketing campaigns and automation triggers | Owner/Marketing |

### Dashboard Components (in admin-ui/src/components/dashboard/)

| File | Description |
|------|-------------|
| `AdminDashboard.tsx` | Full dashboard for owners - all widgets |
| `ManagerDashboard.tsx` | Dashboard for marketers - marketing, customers, products |
| `OperatorDashboard.tsx` | Dashboard for operators - simplified POS-focused |
| `CustomersWidget.tsx` | Customer statistics and recent customers |
| `IntegrationsWidget.tsx` | Integration status and delivery stats |
| `MarketingWidget.tsx` | Marketing campaigns and trigger events |
| `OperationalWidget.tsx` | Operational metrics: hourly breakdown, top products |
| `ProductsWidget.tsx` | Product performance and trending products |

### Tab Definitions (from App.tsx)

```
- dashboard  - Main dashboard
- customers  - Customer list and details
- pos        - Point of sale
- integrations - Bot integrations
- products   - Product management
- settings   - Password change, permissions
- marketing  - Marketing campaigns
- compliance - GDPR compliance
- analytics  - Analytics (owner/marketing only)
```

---

## 2. Components Inventory

### UI Components (admin-ui/src/components/)

| Component | File | Description |
|-----------|------|-------------|
| AnalyticsCharts | `AnalyticsCharts.tsx` | Chart components for analytics visualization |
| ConsentTable | `ConsentTable.tsx` | Table for managing customer consent records |
| EmptyState | `EmptyState.tsx` | Empty state placeholder component |
| IntegrationSettings | `IntegrationSettings.tsx` | Bot integration configuration |
| LanguageSwitcher | `LanguageSwitcher.tsx` | i18n language selector |
| ProductImport | `ProductImport.tsx` | CSV import for products |
| ProfileDeletion | `ProfileDeletion.tsx` | GDPR profile deletion interface |
| Toast | `Toast.tsx` | Toast notification component |

### Dashboard Widgets

| Component | File | Description |
|-----------|------|-------------|
| AdminDashboard | `dashboard/AdminDashboard.tsx` | Full access dashboard |
| ManagerDashboard | `dashboard/ManagerDashboard.tsx` | Marketing-focused dashboard |
| OperatorDashboard | `dashboard/OperatorDashboard.tsx` | POS-focused dashboard |
| CustomersWidget | `dashboard/CustomersWidget.tsx` | Customer metrics widget |
| IntegrationsWidget | `dashboard/IntegrationsWidget.tsx` | Integration status widget |
| MarketingWidget | `dashboard/MarketingWidget.tsx` | Marketing campaigns widget |
| OperationalWidget | `dashboard/OperationalWidget.tsx` | Operational metrics widget |
| ProductsWidget | `dashboard/ProductsWidget.tsx` | Product performance widget |

---

## 3. Business Logic Documentation

### Authentication & Authorization (stores/auth.tsx)

**Auth Context Features:**
- JWT token management via httpOnly cookies
- Token validation and refresh
- Role-based access control (RBAC)
- Password change flow
- Session management

**Roles:**
- `owner` - Full access (admin)
- `operator` - POS sales only
- `marketer` - Marketing and analytics

**Permissions System:**
- `dashboard.read` - View dashboard
- `customer.list/customer.read` - Customer management
- `pos.sale` - Make sales
- `integration.read` - View integrations
- `product.read/product.create` - Product management
- `marketing.campaign` - Marketing campaigns
- `customer.delete/customer.read` - Compliance
- `*` - All permissions

### Loyalty Program (hooks/useDashboard.ts)

**Loyalty Data Structure:**
- Points balance tracking
- Tier system (Bronze, Silver, Gold, Platinum)
- Points earning on purchases
- Points redemption
- Tier progress tracking

**Dashboard Integration:**
- `DashboardData.loyalty` - Loyalty metrics
- `DashboardData.customers.loyalty_tiers` - Tier distribution

### Messaging & Marketing (components/dashboard/MarketingWidget.tsx)

**Marketing Features:**
- Campaign management
- Trigger-based automation
- Event tracking (24h stats)
- Campaign performance metrics
- Upcoming campaigns

### Compliance (ComplianceView.tsx, components/ConsentTable.tsx, components/ProfileDeletion.tsx)

**GDPR Compliance Features:**
- Consent registration and tracking
- Profile deletion (right to be forgotten)
- Consent history per customer

### ERP Integration (components/IntegrationSettings.tsx, components/dashboard/IntegrationsWidget.tsx)

**Integration Features:**
- Bot integrations (Telegram, etc.)
- Webhook delivery system
- Delivery status tracking
- Integration templates
- Secret rotation

---

## 4. Localization (i18n)

### Setup (admin-ui/src/i18n.ts)

**Configuration:**
- i18next with react-i18next
- Browser language detection
- LocalStorage caching
- Fallback: English

### Supported Languages

| Code | Language | Coverage |
|------|----------|----------|
| `ru` | Russian | Primary |
| `en` | English | Secondary |
| `srb` | Serbian | Tertiary |

### Translation Files (admin-ui/src/locales/)

- `ru.json` - Russian translations (~5052 bytes)
- `en.json` - English translations
- `srb.json` - Serbian translations

### Detection Order
1. localStorage (key: 'language')
2. Browser navigator language

---

## 5. API Integration

### API Client (admin-ui/src/api.ts)

**Main API Functions:**

**Authentication:**
- `Api.me()` - Get current user
- `Api.login()` - Login by password
- `Api.logout()` - Logout
- `Api.changePassword()` - Change password
- `Api.recoverPassword()` - Password recovery

**Dashboard:**
- `Api.dashboard()` - Main dashboard data
- `Api.dashboardOperational()` - Operational metrics
- `Api.dashboardMarketing()` - Marketing metrics
- `Api.dashboardCustomers()` - Customer metrics
- `Api.dashboardProducts()` - Product metrics
- `Api.dashboardIntegrations()` - Integration metrics

**Customers:**
- `Api.customers()` - List customers
- `Api.customer(id)` - Customer details
- `Api.transactions()` - Customer transactions

**Products:**
- `Api.products()` - List products
- `Api.createProduct()` - Create product

**Integrations:**
- `Api.integrations()` - List integrations
- `Api.integrationDeliveries()` - Webhook deliveries
- `Api.integrationTemplates()` - Integration templates
- `Api.createIntegration()` - Create integration
- `Api.updateIntegration()` - Update integration
- `Api.rotateIntegrationSecret()` - Rotate secret

**Analytics:**
- `Api.analyticsOverview()` - Dashboard overview
- `Api.analyticsCharts()` - Chart data
- `Api.loyaltyReport()` - Loyalty report

---

## 6. Summary Statistics

| Category | Count |
|----------|-------|
| Main Views | 5 |
| Dashboard Components | 8 |
| UI Components | 8 |
| Hooks | 1 |
| Stores | 1 |
| Locale Files | 3 |
| Supported Languages | 3 |
| Roles | 3 |
| Permission Types | 10+ |

---

## 7. Key Observations for Refactoring

### Current Architecture Patterns
1. **Single App.tsx** - Large monolithic component with all views inline
2. **Inline Views** - DashboardView, CustomersView, PosView, etc. defined inside App.tsx
3. **Mixed Components** - Some in components/, some at src/ root
4. **Centralized State** - Most state in App.tsx, minimal local component state

### Refactoring Opportunities
1. **Extract Views** - Move inline views to separate files in pages/
2. **Component Organization** - Group related components better
3. **State Management** - Consider more granular state (Redux/Zustand)
4. **API Layer** - Already well-structured in api.ts
5. **i18n** - Already configured, good for expansion

### Dependencies
- React 18
- react-i18next
- @twa-dev/sdk (Telegram)
- react-qr-code

---

*Generated as part of Phase 15-03: Documentation & Component Inventory*
