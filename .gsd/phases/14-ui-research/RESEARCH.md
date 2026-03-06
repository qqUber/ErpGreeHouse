# UI/UX Research for ErpGreeHouse CRM

## Research Date
2026-03-06

## Project Overview
ErpGreeHouse is a CRM system for coffee/grocery business with Telegram, VK, and ERPNext integrations. Currently has 693 tests and implements role-based dashboards (Operator, Manager, Admin).

## Current State

### Tech Stack
- **Frontend:** React 19, Vite 7, TypeScript, ECharts
- **Backend:** FastAPI, Python 3.14, SQLite/PostgreSQL, Redis
- **Auth:** JWT + refresh tokens
- **Channels:** Telegram, VK, ERPNext

### Current UI Components
- Role-based dashboards: OperatorDashboard, ManagerDashboard, AdminDashboard
- Widgets: Customers, Products, Marketing, Operational, Integrations
- Views: AnalyticsView, ComplianceView, LoyaltyTmaView, MarketingView

## CRM UI/UX Best Practices Research

### 1. Dashboard Design Principles

**Key Findings from Research:**

1. **Three Dashboard Types:**
   - **Operational:** Real-time data, day-to-day monitoring
   - **Analytical:** In-depth data exploration, slicing/dicing
   - **Strategic:** High-level KPIs, long-term decision making

2. **Card-Based Layout:**
   - Modular approach with each widget as a card
   - Allows flexibility and responsiveness
   - Top row: KPIs and critical metrics
   - Middle row: Trends and lists
   - Bottom row: Detailed tables or less critical data

3. **Visual Hierarchy:**
   - Most critical data in top-left (F-pattern scanning)
   - Use color to direct attention
   - Clear visual hierarchy with size and placement

4. **5-9 Widget Rule (Miller's Law):**
   - Aim for 5-9 key widgets per dashboard
   - Average person can hold ~7 items in working memory

### 2. Modern CRM UI Patterns

**Essential Components:**

1. **Customizable Dashboards:**
   - Different roles have different priorities
   - Allow users to personalize by adding/removing widgets
   - Provide role-based default layouts

2. **Navigation:**
   - Consistent sidebar navigation
   - Clear labels with icons
   - Breadcrumb trails
   - Search functionality

3. **Data Visualization:**
   - Bar charts for comparisons
   - Line charts for trends
   - Pie/donut charts for composition (use sparingly)
   - Tables for precise numbers

4. **List Views:**
   - Striped rows for readability
   - Sticky headers
   - Inline actions
   - Bulk operations
   - Filters and sorting

5. **Forms:**
   - Grouped fields with visual hierarchy
   - Real-time validation
   - Clear error messages
   - Auto-save functionality

### 3. UX Best Practices

1. **Minimalist Design:**
   - Remove unnecessary elements
   - Focus on clarity and purpose
   - Use white space effectively

2. **Accessibility (WCAG 2.1):**
   - Focus states for all interactive elements
   - Screen reader support
   - ARIA attributes
   - Color contrast ratios (4.5:1 minimum)

3. **Responsive Design:**
   - Mobile-first approach
   - Breakpoint-specific layouts
   - Touch-friendly controls (44px minimum tap targets)

4. **Micro-interactions:**
   - Loading spinners
   - Toast notifications
   - Subtle animations
   - Hover effects
   - Success/error feedback

5. **Empty States:**
   - Engaging illustrations
   - Clear guidance text
   - Call-to-action buttons

### 4. Role-Based Dashboard Recommendations

**Operator (Operational Focus):**
- Today's tasks and pending actions
- Quick action buttons
- Recent customer interactions
- Simple metrics (not complex charts)
- Minimal navigation, focused interface

**Manager (Analytical Focus):**
- Team performance metrics
- Sales pipeline overview
- Marketing campaign stats
- Trend charts
- Filterable lists

**Admin (Strategic + Management):**
- Full navigation access
- System health metrics
- User management
- Integration status
- Collapsible sections for organization

## Implementation Recommendations

### Immediate Improvements (Phase 1)

1. **Typography System:**
   - Define H1-H6 hierarchy
   - Body: 14px minimum
   - Clear font weight distinctions

2. **Color Palette:**
   - Primary: Professional blue/green
   - Secondary: Neutral grays
   - Accent: Highlight colors
   - Semantic: Error (red), Warning (yellow), Success (green), Info (blue)
   - WCAG 2.1 AA compliant contrast

3. **Card Design:**
   - Standard shadows and borders
   - Hover/active states
   - 16px/24px padding
   - 8px/16px gap between cards

4. **Table Enhancements:**
   - Zebra striping
   - Sticky headers
   - Status badges
   - Action buttons

### Medium-term Improvements (Phase 2)

1. **Form Improvements:**
   - Field grouping
   - Inline validation
   - Tooltips
   - Auto-save indicators

2. **Empty States:**
   - Custom illustrations
   - Action buttons
   - Helpful text

3. **Micro-interactions:**
   - Loading states
   - Toast notifications
   - Transitions

### Long-term Improvements (Phase 3)

1. **Dashboard Customization:**
   - Drag-and-drop widgets
   - Save custom layouts
   - Widget settings

2. **Advanced Visualizations:**
   - More chart types
   - Drill-down capabilities
   - Export functionality

3. **Accessibility:**
   - Full ARIA support
   - Keyboard navigation
   - Screen reader testing

## Docker Local Development

### Solution to lxml Installation Issue

The backend has a dependency on `lxml` which requires Microsoft Visual C++ 14.0 on Windows. **Solution: Use Docker for local development.**

### Local Docker Setup

**File: docker-compose.local.yml**

```yaml
version: '3.8'

services:
  redis:
    image: redis:8.0-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]

  backend:
    build:
      context: ./middleware
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=sqlite:///app/data/dev.db
      - ENVIRONMENT=development
    volumes:
      - ./middleware/app:/app/app
      - ./middleware/data:/app/data
    depends_on:
      redis:
        condition: service_healthy

  frontend:
    build:
      context: ./admin-ui
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    environment:
      - VITE_API_BASE_URL=http://localhost:8000
    volumes:
      - ./admin-ui/src:/app/src
      - ./admin-ui/public:/app/public
    depends_on:
      - backend
    command: npm run dev -- --host
```

### Commands

```bash
# Start local development
docker-compose -f docker-compose.local.yml up --build

# Stop
docker-compose -f docker-compose.local.yml down

# View logs
docker-compose -f docker-compose.local.yml logs -f
```

## Files Structure Reference

### Frontend (`admin-ui/src/`)
```
src/
├── App.tsx              # Main app with role routing
├── main.tsx            # Entry point
├── api.ts              # API client
├── authWorker.ts       # Auth web worker
├── theme.ts            # Design tokens
├── styles.css          # Global styles
├── i18n.ts            # i18n config
├── AnalyticsView.tsx   # Analytics page
├── ComplianceView.tsx  # Compliance page
├── LoyaltyTmaView.tsx # Loyalty/TMA page
├── MarketingView.tsx   # Marketing page
├── components/
│   ├── dashboard/
│   │   ├── AdminDashboard.tsx
│   │   ├── ManagerDashboard.tsx
│   │   ├── OperatorDashboard.tsx
│   │   ├── CustomersWidget.tsx
│   │   ├── ProductsWidget.tsx
│   │   ├── MarketingWidget.tsx
│   │   ├── OperationalWidget.tsx
│   │   └── IntegrationsWidget.tsx
│   ├── AnalyticsCharts.tsx
│   ├── ConsentTable.tsx
│   ├── IntegrationSettings.tsx
│   ├── LanguageSwitcher.tsx
│   ├── ProductImport.tsx
│   └── ProfileDeletion.tsx
├── hooks/              # Custom React hooks
├── locales/           # i18n translations
└── stores/            # State management
```

### Backend (`middleware/`)
```
middleware/
├── app/
│   ├── main.py         # FastAPI app
│   ├── api/            # API routes
│   ├── models/         # Pydantic models
│   ├── services/       # Business logic
│   └── db/             # Database
├── requirements.txt    # Python dependencies
└── Dockerfile         # Container build
```

## Confidence Levels

| Finding | Confidence |
|---------|------------|
| CRM UI patterns | HIGH - Based on multiple industry sources |
| Role-based dashboards | HIGH - Matches current implementation |
| Docker solution | HIGH - Dockerfile already has lxml deps |
| Tech stack | HIGH - Verified in project files |

## Next Steps

1. Create docker-compose.local.yml
2. Implement typography system in theme.ts
3. Enhance tables with striped rows and sticky headers
4. Add empty states with illustrations
5. Implement micro-interactions
