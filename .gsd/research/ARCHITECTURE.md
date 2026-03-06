# ErpGreeHouse v2.2 UI/UX Refactor Architecture

## 1. Current Architecture Overview

### Frontend Stack
- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite 7
- **Styling:** Tailwind CSS with custom CSS variables
- **State Management:** Context API (auth, data)
- **Localization:** i18next with JSON files (ru.json, en.json, srb.json)
- **Testing:** Playwright E2E
- **Environment:** Docker for E2E, Vite dev server for local development

### Current Directory Structure
```
admin-ui/
├── src/
│   ├── components/           # Reusable UI components
│   │   └── dashboard/       # Role-specific dashboards
│   ├── stores/              # Context API implementations
│   ├── hooks/               # Custom React hooks
│   ├── locales/             # i18n JSON files
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   ├── api.ts               # API client
│   ├── styles.css           # Global styles and CSS variables
│   └── i18n.ts              # Localization configuration
├── e2e/                     # Playwright tests
├── vite.config.ts           # Vite configuration
└── playwright.config.ts     # Playwright configuration
```

## 2. Role-Based UI Architecture

### Current Role Handling
The app already has role-based dashboard rendering:

```typescript
// In App.tsx
if (user.role === 'operator') {
  return <OperatorDashboard dash={dash} onNavigate={onNavigate} />;
}

if (user.role === 'marketer') {
  return <ManagerDashboard dash={dash} onNavigate={onNavigate} />;
}

if (user.role === 'owner') {
  return <AdminDashboard dash={dash} onNavigate={onNavigate} />;
}
```

### Role-Based Tab Visibility
```typescript
// In App.tsx
const allowedTabs: Tab[] = useMemo(() => {
  const role = String(effectiveUser?.role || '').toLowerCase();
  if (role === 'owner')
    return ['dashboard', 'customers', 'pos', 'integrations', 'products', 'settings', 'marketing', 'compliance'];

  const perms = new Set(effectiveUser?.permissions || []);
  const tabs: Tab[] = [];
  if (perms.has('dashboard.read')) tabs.push('dashboard');
  if (perms.has('customer.list') || perms.has('customer.read')) tabs.push('customers');
  // ... more permissions checks
  return tabs;
}, [effectiveAuthReady, user, me?.role, me?.permissions]);
```

### Auth Context
The `AuthProvider` in `stores/auth.tsx` manages authentication state:
- JWT token validation and refresh
- User information storage
- Session management

## 3. Full HD Optimization Strategy

### Current Responsive Design
- Mobile-first approach with CSS Grid and Flexbox
- Breakpoints defined: 320px (sm), 768px (md), 1024px (lg), 1280px (xl), 1536px (2xl)
- Missing: 1920px (3xl) breakpoint for Full HD

### CSS Variables for Responsive Design
```css
:root {
  --breakpoint-sm: 320px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
  --breakpoint-3xl: 1920px; /* Full HD monitor - new */
}
```

### Grid System Enhancement
Current grid system supports up to 6 columns on xl screens. For Full HD, we need:
- 12-column grid for 1920px screens
- Enhanced gap utilities for larger screens
- Optimized card sizes and spacing

## 4. Integration Points for New Features

### Role-Based UI Rendering
**Integration Points:**
- `App.tsx` - Main dashboard selector
- `AuthContext` - User role and permissions retrieval
- Role-specific dashboard components in `src/components/dashboard/`

**New Components Needed:**
- Role-based layout wrapper component
- Permission-based content render helper
- Role-specific widget composition system

### Responsive Design for Full HD
**Integration Points:**
- `src/styles.css` - CSS variables and media queries
- `vite.config.ts` - Build configuration
- All existing components using grid/flex layouts

**New Components Needed:**
- Responsive grid component with 1920px support
- Enhanced card and spacing utilities
- Full HD optimized widget layouts

### E2E Testability with Universal Identifiers
**Integration Points:**
- `playwright.config.ts` - Test configuration
- `e2e/` - Test files
- All UI components (add data-testid attributes)

**New Components Needed:**
- Test utils for role-based testing
- Universal identifier generator
- Enhanced test selectors

### Localization Management
**Integration Points:**
- `src/i18n.ts` - i18next configuration
- `src/locales/` - JSON files
- `LanguageSwitcher.tsx` - Language switcher component

**New Components Needed:**
- Centralized string management system
- Type-safe translation keys
- Language fallback and error handling

## 5. Data Flow Architecture

### Role Information Flow
```
AuthContext (user.role)
    ↓
App.tsx (dashboard selector)
    ↓
Role-specific dashboard
    ↓
Role-specific widgets
    ↓
Permission-based content
```

### Permission Check Pattern
```typescript
// Current approach in App.tsx
const allowedTabs = useMemo(() => {
  const perms = new Set(effectiveUser?.permissions || []);
  const tabs: Tab[] = [];
  if (perms.has('dashboard.read')) tabs.push('dashboard');
  // ...
  return tabs;
}, [effectiveAuthReady, user, me?.role, me?.permissions]);
```

### Enhanced Data Flow for Refactor
```typescript
// Proposed: Role-based content renderer
interface RoleBasedContentProps {
  role: string;
  permissions?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleBasedContent({ 
  role, 
  permissions = [], 
  children, 
  fallback = null 
}: RoleBasedContentProps) {
  const { user } = useAuth();
  
  // Check role and permissions
  const hasAccess = 
    user?.role === role || 
    permissions.some(p => user?.permissions.includes(p));
    
  return hasAccess ? children : fallback;
}
```

## 6. Testing Architecture

### Current Testing Setup
- Playwright E2E with smoke, critical, functional, roles, and auth test suites
- `e2e/global-setup.ts` - Test data seeding
- `e2e/_shared.ts` - Shared test utilities

### Testability Improvements
**Key Enhancements:**
1. Add `data-testid` attributes to all interactive elements
2. Create role-specific test utilities
3. Add viewport-specific test scenarios (1920x1080)
4. Enhance mock data for role-based testing
5. Add accessibility testing

### Proposed Test Structure
```
e2e/
├── roles/
│   ├── admin-dashboard.spec.ts
│   ├── operator-dashboard.spec.ts
│   └── manager-dashboard.spec.ts
├── responsive/
│   ├── mobile.spec.ts
│   ├── tablet.spec.ts
│   ├── desktop.spec.ts
│   └── fullhd.spec.ts
├── accessibility/
│   └── a11y.spec.ts
└── _shared/
    ├── roles.ts
    ├── viewports.ts
    └── utils.ts
```

## 7. Localization Architecture

### Current System
```typescript
// src/i18n.ts
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';
import srb from './locales/srb.json';

const resources = {
  ru: { translation: ru },
  en: { translation: en },
  srb: { translation: srb },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'ru', 'srb'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },
  });
```

### Centralized Localization Management
**Proposed Enhancements:**
1. Type-safe translation keys using TypeScript interfaces
2. Centralized string management with validation
3. Language fallback chain improvements
4. Dynamic string loading
5. Translation status monitoring

```typescript
// src/types/i18n.ts
interface TranslationKeys {
  menu: {
    dashboard: string;
    clients: string;
    sales: string;
    // ... all other translation keys
  };
  // ... other sections
}

// src/hooks/useTranslation.ts
import { useTranslation as useI18nTranslation } from 'react-i18next';

export function useTranslation() {
  const { t, i18n } = useI18nTranslation();
  
  return {
    t: (key: keyof TranslationKeys, options?: any) => t(key, options),
    i18n,
  };
}
```

## 8. Build Order and Implementation Phases

### Phase 1: Foundation (2-3 days)
- [ ] Add 1920px (3xl) breakpoint to CSS variables
- [ ] Enhance grid system for 12-column layouts
- [ ] Optimize spacing and typography for Full HD
- [ ] Add `data-testid` attributes to all components
- [ ] Set up Full HD viewport testing

### Phase 2: Role-Based UI System (3-4 days)
- [ ] Create role-based content renderer component
- [ ] Implement permission-based content wrapper
- [ ] Refactor dashboard components to use new system
- [ ] Create role-specific widget composition system
- [ ] Add role-based test utilities

### Phase 3: Enhanced Localization (2-3 days)
- [ ] Create TypeScript interfaces for translation keys
- [ ] Implement type-safe translation hook
- [ ] Add string validation and fallback
- [ ] Create centralized localization management
- [ ] Add localization testing

### Phase 4: Full HD Optimization (3-4 days)
- [ ] Optimize dashboard layouts for 1920x1080
- [ ] Enhance widget sizing and spacing
- [ ] Add responsive grid component
- [ ] Optimize card and container sizes
- [ ] Test on various Full HD display configurations

### Phase 5: Accessibility and Feedback (2-3 days)
- [ ] Add accessibility attributes to all components
- [ ] Implement ARIA labels and roles
- [ ] Add keyboard navigation support
- [ ] Enhance error handling and feedback mechanisms
- [ ] Run accessibility audits and fix issues

### Phase 6: E2E Test Coverage (3-4 days)
- [ ] Add role-based E2E tests
- [ ] Add Full HD viewport test scenarios
- [ ] Add accessibility testing with Playwright
- [ ] Enhance existing test coverage
- [ ] Run full test suite and fix issues

## 9. Key Architecture Decisions

### Decision 1: Role-Based Content Rendering
**Option A:** Current conditional rendering in App.tsx
- Simple, easy to understand
- Limited scalability

**Option B:** Role-based HOC or render prop component
- More modular and reusable
- Better testability
- Enhanced maintainability

**Decision:** Implement Option B - role-based render prop component

### Decision 2: Grid System Enhancement
**Option A:** Extend existing CSS grid
- Leverages existing knowledge
- Minimal learning curve

**Option B:** Use CSS Grid with CSS variables
- More flexible and maintainable
- Better for complex layouts

**Decision:** Extend existing CSS grid with 3xl breakpoint

### Decision 3: Localization Type Safety
**Option A:** Manual TypeScript interfaces
- Complete control
- Time-consuming to maintain

**Option B:** Generate types from JSON files
- Automated, less error-prone
- Requires tooling setup

**Decision:** Implement manual TypeScript interfaces with validation

## 10. Codebase Modifications

### Files to Modify
1. `src/App.tsx` - Refactor role-based dashboard selection
2. `src/styles.css` - Add 3xl breakpoint, enhance grid system
3. `src/stores/auth.tsx` - Enhance user data management
4. `src/components/dashboard/*.tsx` - Optimize for Full HD
5. `src/i18n.ts` - Enhance localization configuration
6. `vite.config.ts` - Add build optimizations
7. `playwright.config.ts` - Add viewport configurations
8. `e2e/*` - Add role-based and Full HD test scenarios

### New Files to Create
1. `src/components/RoleBasedContent.tsx` - Role-based content renderer
2. `src/hooks/usePermissions.ts` - Permission checking hook
3. `src/types/i18n.ts` - Translation key interfaces
4. `src/utils/translation.ts` - Localization utilities
5. `src/components/ResponsiveGrid.tsx` - Enhanced grid component
6. `e2e/responsive/fullhd.spec.ts` - Full HD viewport tests
7. `e2e/roles/role-based.spec.ts` - Role-based testing utils
8. `e2e/accessibility/a11y.spec.ts` - Accessibility tests

## 11. Performance Optimization Considerations

### Code Splitting
- Role-specific dashboards as dynamic imports
- Widget components as async chunks
- Lazy loading for non-critical content

### Bundle Optimization
- Tree-shakable components
- Minification and compression
- CDN asset delivery

### Rendering Optimization
- React.memo for static components
- useMemo and useCallback for expensive operations
- Virtualization for large datasets

## 12. Security and Access Control

### Role-Based Authorization
- Server-side permission checks (API endpoints)
- Client-side role verification
- Secure cookie handling for JWT tokens

### Content Security
- XSS protection via React
- Sanitized user input
- CSP headers

## 13. Browser Support

### Target Browsers
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

### Progressive Enhancement
- Basic functionality on older browsers
- Enhanced features on modern browsers
- Graceful degradation

## 14. Conclusion

The v2.2 UI/UX refactor for ErpGreeHouse will enhance the existing role-based dashboard system and optimize the interface for Full HD screens (1920x1080). The refactor focuses on:

1. **Role-based UI rendering** with a modular component architecture
2. **Full HD optimization** with enhanced responsive grid system
3. **Improved testability** with universal identifiers and role-based test utilities
4. **Centralized localization management** with type safety
5. **Enhanced accessibility** with ARIA attributes and keyboard navigation

The implementation will follow a phased approach, starting with foundational improvements and progressing to role-specific and viewport-specific optimizations. The architecture ensures compatibility with the existing codebase while providing a scalable foundation for future UI enhancements.
