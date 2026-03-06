# Stack Research for v2.2 UI/UX Refactor

## Overview
This document outlines stack additions/changes for the v2.2 UI/UX Refactor milestone, focusing on role-based dashboards, Full HD optimization, E2E test standardization, accessibility, and localization.

## Current Stack Context
- **Backend:** FastAPI, Python 3.14, Redis
- **Frontend:** React 19, Vite 7, TypeScript
- **Database:** SQLite (dev), PostgreSQL (prod)
- **Auth:** JWT + refresh tokens
- **Channels:** Telegram, VK, ERPNext

## New Capabilities & Recommended Tools

### 1. Role-Based UI Components

#### Need
- Render different UI components based on user roles (Operator, Manager, Admin)
- Control access to features and data at the component level
- Minimal, modular approach that integrates with existing JWT auth

#### Recommended Library: `@permify/react-role` (v0.1.17)
- **Why:** Lightweight, TypeScript-friendly, minimal API
- **Key Features:**
  - `PermifyProvider` for wrapping app with role context
  - `HasAccess` component for conditional rendering
  - `usePermify` hook with `isAuthorized()` helper
  - Supports roles and permissions checks
- **Integration:** Syncs with existing JWT role claims from backend
- **Not Using:** react-rbac-ui-manager (too heavy, MUI-specific), react-aclify (over-engineered)

#### Installation:
```bash
npm install @permify/react-role
```

#### Usage Example:
```typescript
import { PermifyProvider, HasAccess, usePermify } from '@permify/react-role';

// Wrap app
<PermifyProvider>
  <App />
</PermifyProvider>

// In component
const { setUser } = usePermify();
setUser({ 
  id: '1', 
  roles: ['admin'], 
  permissions: ['user:delete'] 
});

// Conditional rendering
<HasAccess roles={['admin', 'manager']} permissions="user:delete">
  <DeleteButton />
</HasAccess>
```

---

### 2. Full HD Responsive Design

#### Need
- Optimize for 1920x1080 screens (Full HD)
- Responsive behavior across device sizes (mobile → tablet → desktop → HD)
- Breakpoint system tailored to business management use cases

#### Recommended Library: `react-responsive` (v10.0.1)
- **Why:** Simple media query hooks, SSR support, active maintenance
- **Key Features:**
  - `useMediaQuery` hook for responsive checks
  - MediaQuery component for render props
  - Custom breakpoint definitions
  - Device orientation and resolution detection
- **Integration:** Define HD-specific breakpoints (1920px+)
- **Not Using:** @blocz/react-responsive (Bootstrap-centric, less flexible)

#### Installation:
```bash
npm install react-responsive
```

#### Usage Example:
```typescript
import { useMediaQuery } from 'react-responsive';

const Dashboard = () => {
  const isHD = useMediaQuery({ minWidth: 1920 });
  const isDesktop = useMediaQuery({ minWidth: 1280, maxWidth: 1919 });

  return (
    <div className={isHD ? 'hd-layout' : 'desktop-layout'}>
      {isHD && <HDWidgetGrid />}
      {isDesktop && <DesktopWidgetGrid />}
    </div>
  );
};
```

---

### 3. E2E Test Standardization

#### Need
- Universal test identifiers following `role_component_action_language` pattern
- Type-safe test ID management
- Integration with Playwright for E2E testing
- Test ID consistency across components

#### Recommended Approach: Type-Safe Test ID System
- **Core Files:** `src/utils/e2e.ts` (centralized test ID management)
- **Pattern:** `role_component_action_language` (e.g., `admin_dashboard_widget_refresh_en`)
- **Why:** Simple, scalable, type-safe, no external library dependency

#### Implementation:
```typescript
// src/utils/e2e.ts
const dataAttribute = 'data-testid' as const;

class Attribute<T extends string> {
  [dataAttribute]: T;
  constructor(value: T) {
    this[dataAttribute] = value;
  }
  get id() {
    return this[dataAttribute];
  }
}

type Role = 'admin' | 'manager' | 'operator';
type Component = 'dashboard' | 'widget' | 'table' | 'button';
type Action = 'refresh' | 'export' | 'add' | 'delete';
type Language = 'en' | 'ru' | 'sr';

export const TestIds = {
  admin: {
    dashboard: {
      widget: {
        refresh: new Attribute('admin_dashboard_widget_refresh'),
        export: new Attribute('admin_dashboard_widget_export'),
      },
    },
  },
  // Add manager and operator test IDs
};

// Usage in component
import { TestIds } from '@/utils/e2e';

const RefreshButton = () => (
  <button {...TestIds.admin.dashboard.widget.refresh}>
    Refresh
  </button>
);

// Usage in Playwright test
import { test, expect } from '@playwright/test';
import { TestIds } from '../src/utils/e2e';

test('admin can refresh dashboard', async ({ page }) => {
  await page.getByTestId(TestIds.admin.dashboard.widget.refresh.id).click();
  await expect(page.locator('.widget-data')).toBeVisible();
});
```

---

### 4. Accessibility (WCAG 2.1 AA)

#### Need
- WCAG 2.1 AA compliance
- Static and dynamic accessibility checks
- ESLint integration for early error detection
- Screen reader support

#### Recommended Tools:

1. **`eslint-plugin-jsx-a11y` (v6.10.2)**
   - Static AST checker for accessibility rules on JSX elements
   - Catches issues like missing alt text, invalid ARIA attributes
   - Integrates with ESLint for development-time checks
   - **Setup:**
     ```bash
     npm install --save-dev eslint-plugin-jsx-a11y @types/eslint-plugin-jsx-a11y
     ```

2. **`@axe-core/react` (v4.10.0)**
   - Dynamic accessibility testing of rendered DOM
   - Tests color contrast, ARIA relationships, keyboard navigation
   - Runs in browser console during development
   - **Setup:**
     ```bash
     npm install --save-dev @axe-core/react
     ```

#### ESLint Configuration:
```json
// .eslintrc.json
{
  "plugins": ["jsx-a11y"],
  "extends": [
    "plugin:jsx-a11y/recommended"
  ],
  "rules": {
    "jsx-a11y/label-has-associated-control": "error",
    "jsx-a11y/alt-text": "error",
    "jsx-a11y/role-has-required-aria-props": "error"
  }
}
```

#### Usage Example:
```typescript
// src/main.tsx (development only)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

if (process.env.NODE_ENV !== 'production') {
  import('@axe-core/react').then(({ default: axe }) => {
    axe(React, ReactDOM, 1000);
  });
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
```

---

### 5. Localization Management

#### Need
- Support for RU, EN, SR languages
- Fallback mechanism (e.g., RU → EN → SR)
- Component-level translation with hooks
- Language detection and switching

#### Recommended Library: `react-i18next` (v14.1.0) + `i18next-browser-languagedetector` (v7.2.0)
- **Why:** Most widely adopted React i18n library, flexible, production-ready
- **Key Features:**
  - Hooks: `useTranslation()` for component translation
  - Fallback language support
  - Language detector (browser settings, local storage, cookies)
  - Namespaces for modular translation files
  - Interpolation, pluralization, formatting
- **Not Using:** react-intl (overly complex for our needs), linguiJS (steeper learning curve)

#### Installation:
```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

#### Configuration:
```typescript
// src/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enCommon from './locales/en/common.json';
import ruCommon from './locales/ru/common.json';
import srCommon from './locales/sr/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      ru: { common: ruCommon },
      sr: { common: srCommon },
    },
    lng: 'ru', // Default language
    fallbackLng: ['ru', 'en', 'sr'], // Fallback chain
    defaultNS: 'common',
    interpolation: { escapeValue: false }, // React handles escaping
    detection: {
      order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
    },
  });

export default i18n;
```

#### Usage Example:
```typescript
// src/components/Header.tsx
import { useTranslation } from 'react-i18next';

const Header = () => {
  const { t, i18n } = useTranslation('common');

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <header>
      <h1>{t('dashboard.title')}</h1>
      <div className="language-switcher">
        <button onClick={() => changeLanguage('ru')}>RU</button>
        <button onClick={() => changeLanguage('en')}>EN</button>
        <button onClick={() => changeLanguage('sr')}>SR</button>
      </div>
    </header>
  );
};

// src/i18n/locales/ru/common.json
{
  "dashboard": {
    "title": "Панель управления",
    "widget": {
      "refresh": "Обновить",
      "export": "Экспорт"
    }
  }
}
```

---

## Stack Changes Summary

| Category | Current | New/Change | Reason |
|----------|---------|------------|--------|
| Role-Based UI | None | `@permify/react-role` | Lightweight, TypeScript-friendly |
| Responsive Design | None | `react-responsive` | Simple hooks, SSR support |
| E2E Testing | Playwright (ad-hoc) | Type-safe test ID system | Standardized, scalable |
| Accessibility | None | `eslint-plugin-jsx-a11y`, `@axe-core/react` | WCAG 2.1 AA compliance |
| Localization | None | `react-i18next`, `i18next-browser-languagedetector` | Mature, flexible, production-ready |

---

## Integration Points with Existing Stack

### Frontend
- All libraries support React 19 and TypeScript
- `@permify/react-role` integrates with existing JWT role claims
- `react-responsive` works with existing CSS modules/Tailwind
- `react-i18next` supports existing environment variables

### Backend
- No direct backend changes needed for UI stack additions
- Roles and permissions served via existing JWT endpoints
- Translation files managed via frontend build process

---

## What NOT to Add

### 1. Heavy UI Component Libraries (MUI, Chakra UI)
- **Why:** Existing app uses custom CSS modules/Tailwind; adding a full library would bloat bundle size

### 2. State Management Libraries (Redux Toolkit, Zustand)
- **Why:** Role-based state can be managed with React Context + `@permify/react-role`; no need for additional state management

### 3. Complex Form Libraries (Formik, React Hook Form)
- **Why:** Current form handling is simple; no need for complex libraries

### 4. Animation Libraries (Framer Motion)
- **Why:** Business management app prioritizes functionality over animations

---

## Quality Gate Check

- [x] Versions are current (verified via npm and Context7)
- [x] Rationale explains WHY, not just WHAT
- [x] Integration with existing stack considered
- [x] Localization and E2E testing tools recommended