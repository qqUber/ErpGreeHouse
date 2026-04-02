---
description: 2-Month Deep QA & UI/UX Consistency Roadmap — Evidence-Based Plan for Senior Team + TechLead
auto_execution_mode: 3
---

# 🔬 Coffee Shop CRM — 2-Month Deep QA & UI/UX Consistency Roadmap

> **Scope**: Full-stack quality hardening with emphasis on UI/UX visual consistency across
> FHD (1920×1080), 2K (2560×1440), 4K (3840×2160), Mobile-S (375×667), Mobile-L (428×926).
>
> **Team**: 3 Senior Developers + 1 TechLead (reviewer/controller)
> **Duration**: 8 weeks (2 months), 2-week sprints

---

## 📊 Evidence-Based Audit Summary (Current State)

### 1. Inline Styles — CRITICAL (438 occurrences across 16 files)

| File | `style={` count | Severity |
|---|---|---|
| `App.tsx` | **131** | 🔴 Critical — login, settings, header, customers views |
| `IntegrationSettings.tsx` | **85** | 🔴 Critical — entire component uses inline styles |
| `AnalyticsView.tsx` | **71** | 🔴 Critical — charts and data visualization |
| `ProductImport.tsx` | **35** | 🟡 Major |
| `WidgetSkeleton.tsx` | **33** | 🟡 Major |
| `OperationalWidget.tsx` | **30** | 🟡 Major |
| `ConsentTable.tsx` | **18** | 🟠 Moderate |
| `ComplianceView.tsx` | **11** | 🟠 Moderate |
| Others (8 files) | **25 total** | 🟢 Minor |

**Root cause**: Components were built incrementally without a shared CSS class strategy.
Inline styles bypass theme variables, dark mode, and media queries — causing:
- No responsive adaptation on different resolutions
- Dark mode inconsistencies (hardcoded `#f8fafc`, `white`, `rgba(0,0,0,0.55)`)
- No breakpoint-aware layout changes

### 2. `!important` Overrides — 282 occurrences

| File | Count |
|---|---|
| `styles.css` | **273** |
| `styles-2026.css` | **9** |

**Impact**: Extremely high specificity making theme overrides fragile. Dark mode rules
in `styles-2026.css` require `!important` just to override base styles.

### 3. Hardcoded Cyrillic Strings (bypassing i18n) — 293 occurrences

| File | Count | Example |
|---|---|---|
| `MarketingView.tsx` | **111** | Russian labels in campaign forms |
| `IntegrationSettings.tsx` | **85** | Russian labels for bot settings |
| `ProductImport.tsx` | **35** | Russian import instructions |
| `LoginPage.tsx` | **18** | Russian auth text |
| `App.tsx` | **19** | `Клиент #${customer.id}` fallback |
| `LoyaltyTmaView.tsx` | **12** | Russian loyalty labels |
| `OperationalWidget.tsx` | **7** | Mixed RU/EN |
| `ErrorBoundary.tsx` | **5** | Russian error messages |

### 4. CSS Architecture Fragmentation

| CSS File | Purpose | Issues |
|---|---|---|
| `styles.css` (4164 lines) | Main design system | Contains utility classes mimicking Tailwind, 273 `!important` |
| `styles-2026.css` (487 lines) | Glassmorphism/modern enhancements | Duplicates some tokens, theme-specific overrides |
| `index.css` (37 lines) | Sidebar fallback | Hardcoded hex colors (`#f5f5f5`, `#2196f3`), no CSS vars |
| 8× component `.css` files | Per-component styles | Isolated but inconsistent with main tokens |

### 5. Responsive Breakpoint Coverage

| Breakpoint | CSS `@media` | `useViewportMode` | WidgetGrid | Gap |
|---|---|---|---|---|
| Mobile ≤767px | ✅ `max-width: 767px` | ✅ `< 768 → mobile` | ✅ `xs: 480` | — |
| Tablet 768–1199px | ⚠️ Partial | ✅ `< 1200 → tablet` | ✅ `md: 996` | Tablet not tested |
| Desktop 1200px+ | ✅ | ✅ `≥ 1200 → desktop` | ✅ `lg: 1200` | — |
| 2xl 1536px | ✅ Container/Grid | ❌ No mode | — | No density tier |
| FHD 1920px | ✅ Container/Grid | ❌ No mode | — | No density tier |
| 2K 2560px | ❌ **Missing** | ❌ No mode | — | 🔴 No coverage |
| 4K 3840px | ❌ **Missing** | ❌ No mode | — | 🔴 No coverage |

**Key Finding**: `useViewportMode` only returns 3 modes (mobile/tablet/desktop) with
density toggle at 1600px. No awareness of 2K/4K. Theme breakpoints stop at `3xl: 1920px`.

### 6. Font System

- **Single font stack**: `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`
- No custom web font loaded (no Google Fonts, no `@font-face`)
- Font sizes use CSS variables consistently in stylesheet, but **inline styles override** with
  hardcoded `fontSize: 18`, `fontSize: 13`, etc.
- No `clamp()` or fluid typography for resolution scaling

### 7. Theme Duplication

- `theme.ts` (272 lines) — TypeScript theme object with full color/spacing/breakpoint tokens
- `styles.css` `:root` — CSS custom properties (identical values)
- **Problem**: Two sources of truth. `theme.ts` is barely used (only `WidgetGrid` references
  breakpoints indirectly). Most components use CSS vars or inline hex values.

### 8. API Layer — Solid but Monolithic

- `api.ts` (1213 lines) — Single file with all types + fetchWithAuth + 40+ API methods
- Good patterns: token refresh interceptor, abort controller tracking, centralized auth headers
- **Issues**: File too large for maintainability; no request/response type validation at runtime

### 9. `money()` Formatter — Hardcoded Locale

```typescript
function money(n: number) {
  return new Intl.NumberFormat('ru-RU').format(n);
}
```
Always formats as Russian regardless of selected language.

---

## 🗓️ Sprint Plan (8 Weeks)

### SPRINT 1 — Weeks 1–2: Foundation & Design System Hardening

**Goal**: Establish single source of truth for design tokens, eliminate `index.css` drift,
extend breakpoint system to 2K/4K, create visual regression baseline.

#### Dev-A: CSS Architecture Unification
1. **Merge `index.css` into `styles.css`** — replace hardcoded hex with CSS vars
2. **Audit and reduce `!important` count** from 273 → target <50
   - Strategy: Increase specificity via `.app-shell` nesting instead of `!important`
   - Refactor `styles-2026.css` dark overrides to use `[data-theme="dark"]` selectors
3. **Add 2K and 4K breakpoints** to both CSS and `theme.ts`:
   ```
   --breakpoint-4xl: 2560px;  /* 2K / QHD */
   --breakpoint-5xl: 3840px;  /* 4K / UHD */
   ```
4. **Add container queries for FHD+ screens** with appropriate max-widths and padding

#### Dev-B: Extend `useViewportMode` + Fluid Typography
1. **Extend `ViewportMode`** type: `'mobile' | 'tablet' | 'desktop' | 'desktop-xl' | 'desktop-2k' | 'desktop-4k'`
2. **Extend `ViewDensity`**: `'compact' | 'comfortable' | 'spacious'` (spacious = 2K+)
3. **Implement fluid typography** using `clamp()`:
   ```css
   --font-size-body: clamp(0.875rem, 0.8rem + 0.25vw, 1.125rem);
   --font-size-h1: clamp(1.875rem, 1.5rem + 1vw, 3rem);
   ```
4. **Update `WidgetGrid` breakpoints** to include 2K/4K column configurations
5. **Create `useMediaQuery` hook** for components needing resolution-aware behavior

#### Dev-C: Visual Regression Test Infrastructure
1. **Set up Playwright visual comparison** (screenshot baselines) for 5 target resolutions:
   - Mobile-S: 375×667
   - Mobile-L: 428×926
   - FHD: 1920×1080
   - 2K: 2560×1440
   - 4K: 3840×2160
2. **Create screenshot baseline spec** covering: Login, Dashboard, Customers, POS, Settings, Marketing
3. **Configure CI to run visual tests** on every PR (diff threshold: 0.1%)

#### TechLead: Review & Validation
- Review all CSS architecture changes for consistency
- Validate breakpoint coverage against design spec
- Sign off on visual regression baseline images

**Sprint 1 Exit Criteria**:
- [ ] Single CSS variable source of truth (no hardcoded hex in `index.css`)
- [ ] `!important` count < 50
- [ ] `useViewportMode` returns 6 modes
- [ ] Fluid typography active across all heading/body sizes
- [ ] Visual regression baselines captured for 5 resolutions × 6 pages = 30 screenshots

---

### SPRINT 2 — Weeks 3–4: Inline Style Elimination (Critical Components)

**Goal**: Convert the top 3 inline-style offenders to CSS classes using design tokens.
Ensure dark mode and responsive behavior for all converted components.

#### Dev-A: `App.tsx` (131 inline styles)
1. **Login form** (lines 765–840): Extract to `.login-form`, `.login-card`, `.login-header` classes
   - Replace hardcoded `maxWidth: 380`, `padding: 24`, `borderRadius: 20` with CSS vars
   - Add responsive: full-width on mobile, centered card on desktop, wider on 4K
2. **Settings panel** (lines 1000–1082): Extract to `.settings-panel`, `.settings-row` classes
   - Replace `fontWeight: 900, fontSize: 18` with `.settings-title` using vars
   - Fix hardcoded `rgba(0,0,0,0.55)` → use `var(--muted)`
3. **Header toolbar** (line 753): Extract to `.header-toolbar` class
4. **CustomerView** (lines 1168–1199): Extract search controls and detail panels to CSS
   - Replace hardcoded `backgroundColor: '#f8fafc'`, `backgroundColor: 'white'`

#### Dev-B: `IntegrationSettings.tsx` (85 inline styles)
1. Create `IntegrationSettings.css` with themed classes
2. Replace all inline `style={{...}}` with semantic class names
3. Ensure dark mode support via `[data-theme="dark"]` overrides
4. Add responsive breakpoints for mobile/tablet layout changes

#### Dev-C: `AnalyticsView.tsx` (71 inline styles)
1. Create `AnalyticsView.css` with chart container, metric card, and filter classes
2. Convert all inline styles to CSS classes
3. Add responsive grid layout: 1 col mobile → 2 col tablet → 3–4 col desktop → 4–6 col 4K
4. Ensure chart containers scale properly at all resolutions

#### TechLead: Review & Validation
- Verify no visual regression from inline-to-CSS conversion
- Validate dark mode rendering for all converted components
- Check responsive behavior at 5 target resolutions

**Sprint 2 Exit Criteria**:
- [ ] `App.tsx` inline style count: 131 → <10
- [ ] `IntegrationSettings.tsx` inline style count: 85 → 0
- [ ] `AnalyticsView.tsx` inline style count: 71 → 0
- [ ] All 3 components pass dark mode visual check
- [ ] All 3 components pass responsive visual check at 5 resolutions
- [ ] Visual regression tests pass (< 0.1% diff)

---

### SPRINT 3 — Weeks 5–6: i18n Completion + Remaining Inline Styles + Mobile UX

**Goal**: Eliminate all hardcoded Cyrillic strings, convert remaining inline-style
components, and polish mobile UX.

#### Dev-A: i18n Hardcoded String Elimination
1. **`MarketingView.tsx`** (111 matches): Extract all Russian strings to i18n keys
   - Add keys to `en.json`, `ru.json`, `srb.json`
   - Replace campaign form labels, status badges, error messages
2. **`IntegrationSettings.tsx`** (85 matches): Full i18n conversion
3. **`ProductImport.tsx`** (35 matches): Import wizard labels
4. **`LoginPage.tsx`** (18 matches): Auth-related strings
5. **Fix `money()` formatter** in `App.tsx`:
   ```typescript
   function money(n: number, locale?: string) {
     return new Intl.NumberFormat(locale || i18n.language || 'en').format(n);
   }
   ```
6. **Fix `Клиент #${customer.id}`** fallback in `App.tsx` line 886:
   ```typescript
   const customerName = customer.full_name || customer.phone || t('customers.unnamed', { id: customer.id });
   ```

#### Dev-B: Remaining Inline Style Conversion
1. **`ProductImport.tsx`** (35 inline styles) → extract to `ProductImport.css`
2. **`WidgetSkeleton.tsx`** (33 inline styles) → extract to `WidgetSkeleton.css` update
3. **`OperationalWidget.tsx`** (30 inline styles) → convert to themed classes
4. **`ConsentTable.tsx`** (18 inline styles) → convert to themed classes
5. **`ComplianceView.tsx`** (11 inline styles) → convert to themed classes

#### Dev-C: Mobile UX Polish
1. **Navigation**: Convert tab bar to bottom navigation on mobile
   - Scrollable horizontal tabs with active indicator
   - Touch targets ≥ 44px
2. **Login form**: Full-screen mobile layout with keyboard-aware positioning
3. **Tables** (`CustomersTable`, `ProductsTable`, `ConsentTable`):
   - Horizontal scroll with sticky first column on mobile
   - Card layout alternative for mobile-S
4. **Modals**: Full-screen on mobile, centered on desktop
5. **Touch interactions**: Swipe gestures for tab navigation (optional)

#### TechLead: Review & Validation
- Audit i18n coverage: ensure all 3 locales (en, ru, srb) have 100% key parity
- Run i18n completeness check script
- Mobile UX review on actual devices or emulators

**Sprint 3 Exit Criteria**:
- [ ] Hardcoded Cyrillic matches: 293 → 0
- [ ] Inline style total: 438 → <30 (remaining only for truly dynamic values)
- [ ] i18n key parity: 100% across en/ru/srb
- [ ] `money()` formatter locale-aware
- [ ] Mobile navigation touch-friendly (≥44px targets)
- [ ] All tables usable on 375px width

---

### SPRINT 4 — Weeks 7–8: 4K Polish, Performance, API Hardening, Final QA

**Goal**: Ensure pixel-perfect rendering at 2K/4K, optimize performance for large
screens, harden API layer, comprehensive final QA pass.

#### Dev-A: 4K / High-DPI Polish
1. **Dashboard grid at 4K**: 5–6 column layout with increased widget sizes
2. **Typography at 4K**: Verify fluid `clamp()` produces readable sizes
   - Body text: ~18px at 4K (not too small)
   - H1: ~48px at 4K (not overwhelming)
3. **Spacing at 4K**: Use `--spacing-5xl` / `--spacing-6xl` for container padding
4. **Charts/visualizations**: Ensure Recharts/chart components scale SVG viewBox
5. **Images and icons**: Ensure SVG icons are used (no raster artifacts at 4K)
6. **Login card at 4K**: Wider card (480–520px) with larger inputs

#### Dev-B: Performance Optimization
1. **Code-split views** using `React.lazy()`:
   - `MarketingView`, `ComplianceView`, `AnalyticsView` — lazy loaded
2. **Memoize expensive components**:
   - `WidgetGrid` children with `React.memo()`
   - `CustomersView` search suggestions with `useMemo()`
3. **API layer refactor**: Split `api.ts` (1213 lines) into:
   - `api/client.ts` — fetchWithAuth, auth helpers
   - `api/types.ts` — all TypeScript types
   - `api/endpoints.ts` — Api object methods
   - `api/index.ts` — re-exports
4. **Remove console.log statements** from production build (uncomment esbuild drop)
5. **Add request deduplication** for concurrent identical API calls

#### Dev-C: Theme Consolidation & Cleanup
1. **Deprecate `theme.ts` TypeScript object** — use CSS custom properties as single source
   - Or: Generate `theme.ts` values FROM CSS vars at build time
2. **Remove duplicate token definitions** between `styles.css` and `styles-2026.css`
3. **Create theme validation script** that checks:
   - All CSS vars referenced in components exist in `:root`
   - No hardcoded hex colors in `.tsx` files
   - i18n key completeness across all locales
4. **Add Storybook** (optional, stretch goal) for component visual documentation

#### TechLead: Final QA & Sign-Off
1. **Full visual regression pass** at all 5 resolutions
2. **Dark mode audit** — every page, every component
3. **i18n audit** — switch between en/ru/srb on every page
4. **Performance audit**:
   - Lighthouse score ≥ 90 (Performance, Accessibility, Best Practices)
   - Bundle size analysis (target < 500KB gzipped)
5. **Accessibility audit**:
   - All interactive elements have aria labels
   - Color contrast ratio ≥ 4.5:1
   - Keyboard navigation works on all pages
6. **Docker full test suite** — all backend unit + integration tests green
7. **CI/CD E2E** — all Playwright specs green across smoke/critical/loyalty paths

**Sprint 4 Exit Criteria**:
- [ ] 2K/4K rendering verified (visual regression green)
- [ ] Dark mode: 0 visual regressions across all pages
- [ ] Lighthouse Performance ≥ 90
- [ ] Lighthouse Accessibility ≥ 90
- [ ] Bundle size < 500KB gzipped
- [ ] `api.ts` split into 4 focused modules
- [ ] All Docker tests green
- [ ] All CI/CD E2E tests green
- [ ] Theme validation script passes with 0 warnings

---

## 📐 Resolution Reference Matrix

| Resolution | Viewport | Use Case | Container Max-Width | Grid Cols | Font Scale |
|---|---|---|---|---|---|
| Mobile-S | 375×667 | iPhone SE, small Androids | 100% | 1–2 | 0.875× |
| Mobile-L | 428×926 | iPhone 14 Pro Max | 100% | 1–2 | 1× |
| FHD | 1920×1080 | Standard monitors | 1920px | 3–4 | 1× |
| 2K QHD | 2560×1440 | Premium monitors | 2400px | 4–5 | 1.05× |
| 4K UHD | 3840×2160 | Ultra-wide / 4K TVs | 3200px | 5–6 | 1.15× |

---

## 🎨 Typography Scale (Fluid)

```css
/* Base system — using clamp() for automatic scaling */
--font-size-xs:      clamp(0.625rem,  0.6rem  + 0.15vw, 0.875rem);   /* 10–14px */
--font-size-sm:      clamp(0.75rem,   0.7rem  + 0.2vw,  1rem);       /* 12–16px */
--font-size-base:    clamp(0.875rem,  0.8rem  + 0.25vw, 1.125rem);   /* 14–18px */
--font-size-lg:      clamp(1rem,      0.9rem  + 0.3vw,  1.375rem);   /* 16–22px */
--font-size-xl:      clamp(1.125rem,  1rem    + 0.4vw,  1.625rem);   /* 18–26px */
--font-size-2xl:     clamp(1.375rem,  1.2rem  + 0.5vw,  2rem);       /* 22–32px */
--font-size-3xl:     clamp(1.625rem,  1.4rem  + 0.7vw,  2.5rem);     /* 26–40px */
--font-size-4xl:     clamp(2rem,      1.7rem  + 1vw,    3.25rem);    /* 32–52px */
```

---

## 🧪 Testing Strategy

### Visual Regression (Playwright)
- **5 resolutions × 8 pages = 40 screenshot baselines**
- Pages: Login, Dashboard, Customers, POS, Products, Settings, Marketing, Analytics
- Diff threshold: 0.1% pixel difference
- Run on: CI/CD only (never local)

### Unit Tests (Vitest)
- New CSS utility hook tests: `useViewportMode`, `useMediaQuery`
- i18n completeness test: programmatic check all 3 locale files have same keys
- Theme validation test: ensure no orphan CSS variables

### Integration Tests (Docker)
- Backend: all existing + loyalty calculation regression
- Frontend-Backend: API contract validation

### E2E Tests (CI/CD only)
- Existing smoke + critical + loyalty suites
- New: resolution-specific navigation test (ensure tabs don't overflow at each breakpoint)

---

## 📋 Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Inline→CSS migration breaks E2E selectors | Medium | High | Use `data-testid` attrs (already present), never change those |
| `!important` removal causes cascade bugs | High | Medium | Incremental removal with visual regression after each batch |
| 4K testing environment unavailable | Medium | Low | Use Playwright viewport emulation (not pixel-perfect but good enough) |
| i18n key drift between locales | Low | Medium | Automated completeness check in CI |
| `api.ts` refactor breaks imports | Medium | High | Add barrel `api/index.ts` re-exporting same symbols |
| Dark mode regressions from CSS refactor | High | Medium | Visual regression screenshots include dark mode variants |

---

## 👥 Role Assignment Matrix

| Task Category | Dev-A | Dev-B | Dev-C | TechLead |
|---|---|---|---|---|
| CSS architecture & `!important` cleanup | ✅ Owner | | | Review |
| Responsive breakpoints (2K/4K) | ✅ Owner | Support | | Review |
| `useViewportMode` extension | | ✅ Owner | | Review |
| Fluid typography | | ✅ Owner | | Review |
| Inline style removal (App.tsx) | ✅ Owner | | | Review |
| Inline style removal (IntegrationSettings) | | ✅ Owner | | Review |
| Inline style removal (AnalyticsView) | | | ✅ Owner | Review |
| i18n hardcoded strings | ✅ Owner | | Support | Review |
| Mobile UX polish | | | ✅ Owner | Review |
| Visual regression infrastructure | | | ✅ Owner | Review |
| API layer refactor | | ✅ Owner | | Review |
| 4K polish | ✅ Owner | | | Review |
| Performance optimization | | ✅ Owner | | Review |
| Theme consolidation | | | ✅ Owner | Review |
| Final QA & sign-off | | | | ✅ Owner |

---

## ✅ Overall Success Metrics (End of 8 Weeks)

| Metric | Current | Target |
|---|---|---|
| Inline `style={}` occurrences | 438 | < 30 |
| `!important` rules | 282 | < 50 |
| Hardcoded Cyrillic in `.tsx` | 293 | 0 |
| CSS files with hardcoded hex | 3 | 0 |
| Responsive breakpoints covered | 5 (320–1920) | 7 (320–3840) |
| `useViewportMode` modes | 3 | 6 |
| Visual regression baselines | 0 | 40 (5 res × 8 pages) |
| i18n key parity (en=ru=srb) | ~85% | 100% |
| Lighthouse Performance | Unknown | ≥ 90 |
| Lighthouse Accessibility | Unknown | ≥ 90 |
| `api.ts` file size | 1213 lines (1 file) | ~300 lines × 4 files |
| Dark mode visual bugs | Multiple | 0 |
| Docker backend tests | Green | Green |
| CI/CD E2E tests | Green | Green |
