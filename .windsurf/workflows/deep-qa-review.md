---
description: Deep Quality Assurance & Improvement Review — Full project review plan with roles
auto_execution_mode: 3
---

# Deep QA & Improvement Review Plan

## Roles

| Role | Code | Responsibility |
|------|------|----------------|
| **Frontend QA Lead** | `FE-QA` | UI/UX consistency, theming, modals, accessibility, i18n completeness |
| **Backend QA Lead** | `BE-QA` | API correctness, security, DB integrity, error handling, performance |
| **Loyalty & Marketing Specialist** | `LM-SP` | Business logic math, tier rules, campaign flows, configurability |
| **i18n/L10n Reviewer** | `I18N` | Translation completeness, hardcoded strings, pluralization, locale parity |
| **Test & CI Engineer** | `QA-CI` | Test coverage, flaky tests, CI pipeline health, Docker test infra |

> In a single-person execution, Cascade plays all roles sequentially per phase.

---

## Phase 0 — Pre-Flight (est. 10 min)

**Role: `QA-CI`**

### 0.1 Environment Health Check
```bash
# Docker stack healthy
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/AASS/IdeaProjects/ErpGreeHouse && docker compose ps"
# Backend health
wsl -d Ubuntu -e bash -c "curl -s http://localhost:8000/health | python3 -m json.tool"
# Frontend build
cd admin-ui && npm run type-check
```

### 0.2 Baseline Test Snapshot
```bash
# Unit tests
docker compose exec -T backend python -m pytest tests/unit/ -q --tb=line 2>&1 | tail -5
# Integration tests
docker compose exec -T backend python -m pytest tests/integration/ -q --tb=line 2>&1 | tail -5
```

### 0.3 GitHub Review Agent Comments
- Pull latest PR review comments from GitHub
- Create a checklist of every unresolved agent recommendation
- Tag each with severity (block / warn / info)

**Acceptance**: Green unit tests, list of open review comments documented.

---

## Phase 1 — i18n & Localization Audit (est. 30 min)

**Role: `I18N`**

### 1.1 Key Parity Check (Automated)
Scan all 3 locale files and report key mismatches:
```
Target files:
  admin-ui/src/locales/en.json   (reference — EN is source of truth)
  admin-ui/src/locales/ru.json
  admin-ui/src/locales/srb.json
```
- Script: load all 3 JSONs, deep-diff keys recursively, report missing/extra per locale.
- Also detect duplicate JSON keys (like the `"points"` duplicates found previously).

### 1.2 Hardcoded String Scan (Automated)
Grep all `.tsx` files for:
- Russian/Cyrillic literals outside `t()` calls
- Bare English text in JSX (not wrapped in `t()`)
- Template literals with user-facing text

```
Target dirs:
  admin-ui/src/**/*.tsx
  admin-ui/src/**/*.ts (excluding api.ts, i18n.ts, vite-env.d.ts)
```

### 1.3 Component-by-Component i18n Audit (Manual)
For each component, verify every user-facing string uses `t('...')`:

| Priority | Component | Key area |
|----------|-----------|----------|
| HIGH | `MarketingView.tsx` (45KB) | Campaign forms, status labels, error msgs |
| HIGH | `App.tsx` (92KB) | Navigation, tabs, settings, all modals |
| HIGH | `ComplianceView.tsx` | Consent labels, deletion flow |
| HIGH | `AnalyticsView.tsx` (27KB) | Chart labels, time filters, export labels |
| MED | `CustomersTable.tsx` | Column headers, filters, segment labels |
| MED | `ProductsTable.tsx` | Product fields, import/export labels |
| MED | `IntegrationSettings.tsx` | Config fields, status messages |
| MED | `LoginPage.tsx` | Auth form, error messages |
| LOW | `Navigation.tsx` / `Sidebar.tsx` | Nav items |
| LOW | Dashboard widgets (11 files) | Widget titles, stat labels |
| LOW | UI primitives (`Button`, `DataTable`, etc.) | Accessibility labels |

### 1.4 Backend Hardcoded Strings
Scan Python files for hardcoded Russian user-facing strings in bot responses:
```
Target: middleware/app/handlers.py (1768 lines — LARGEST file)
Focus: All await message.answer(...) and await cb.message.edit_text(...)
```
Also check:
- `middleware/app/loyalty.py` — Tier names ("Базовый", "Серебро", "Золото", "Платина")
- `middleware/app/pos_templates.py` — Receipt/POS text

**Acceptance**: Zero key mismatches between locales, zero hardcoded user-facing strings in frontend components.

---

## Phase 2 — UI/UX & Theming Review (est. 45 min)

**Role: `FE-QA`**

### 2.1 Theme Consistency Audit
```
Target CSS files:
  admin-ui/src/styles.css         (84KB — main styles)
  admin-ui/src/styles-2026.css    (13KB — new design system)
  admin-ui/src/components/ui/*.css (Button, DataTable, ErrorMessage, Input, StatCard)
  admin-ui/src/theme.ts           (theme definitions)
```

Check:
- [ ] Every `background-color`, `color`, `border-color` uses CSS variables (not hardcoded hex)
- [ ] Dark mode: `.dark` class or `prefers-color-scheme` properly propagates
- [ ] No `!important` overrides that break theming
- [ ] Consistent spacing scale (4px/8px/12px/16px/24px/32px)
- [ ] Typography scale consistency (font-size, line-height, font-weight)

### 2.2 Modal/Dialog/Popup Inventory
Walk every modal, dialog, frame, and popup in the app. For each:

| Component | Modals to check |
|-----------|----------------|
| `App.tsx` | Settings modal, customer detail modal, product edit/create, sale dialog |
| `MarketingView.tsx` | Campaign create/edit modal, send confirmation, segment editor |
| `ConsentTable.tsx` | Consent detail modal |
| `ProfileDeletion.tsx` | Delete confirmation flow |
| `ProductImport.tsx` | Import dialog |
| `IntegrationSettings.tsx` | Integration config modal, Telegram setup |
| `LoginPage.tsx` | Auth error display |

For each modal verify:
- [ ] Title is translated
- [ ] Body text is translated
- [ ] Button labels translated
- [ ] Placeholder text translated
- [ ] Error/success messages translated
- [ ] Text doesn't truncate in any locale (Russian/Serbian strings are longer than English)
- [ ] Modal is keyboard-dismissible (Escape key)
- [ ] Focus trap works (Tab doesn't escape modal)
- [ ] Works in both Light and Dark themes
- [ ] Responsive on narrow viewports

### 2.3 Table/List Component Audit
```
Target: CustomersTable.tsx, ProductsTable.tsx, ConsentTable.tsx, DataTable.tsx
```
- [ ] Column headers use i18n
- [ ] Empty states have translated messages
- [ ] Pagination labels translated
- [ ] Sort indicators visible in dark mode
- [ ] Long text cells have proper truncation + tooltip
- [ ] Number formatting is locale-aware (decimal sep, thousands sep)

### 2.4 Accessibility Quick-Scan
- [ ] All `<button>` elements have accessible names
- [ ] All `<input>` fields have associated `<label>` or `aria-label`
- [ ] Color contrast ratio ≥ 4.5:1 for normal text
- [ ] Interactive elements have visible focus indicators
- [ ] `role` attributes on custom widgets (tabs, modals, dropdowns)
- [ ] Images/icons have alt text or `aria-hidden`

**Acceptance**: Every modal/dialog works in EN/RU/SRB × Light/Dark, no truncation, no accessibility violations.

---

## Phase 3 — Marketing & Loyalty Deep Review (est. 60 min)

**Role: `LM-SP`**

### 3.1 Loyalty Math Verification
```
Target files:
  middleware/app/loyalty.py          (446 lines — core logic)
  middleware/app/loyalty_profile.py  (profile/card data)
  middleware/app/constants.py        (business rule constants)
```

#### 3.1.1 Tier System Review
Current tiers (from code):
| Tier | Min Spent | Accrual % | Max Redeem % |
|------|-----------|-----------|--------------|
| Базовый | 0 | 5% | 30% |
| Серебро | 10,000 | 7% | 50% |
| Золото | 50,000 | 10% | 100% |
| Платина | 100,000 | 15% | 100% |

Verify:
- [ ] `calc_earned_points()`: math is correct for edge cases (0, 99, min_amount boundary, MAX_AMOUNT)
- [ ] `clamp_redeem_points()`: correctly limits redemption (0 balance, exact balance, over-request)
- [ ] `get_tier()`: tier boundaries are inclusive/exclusive correctly (at exactly 10000 → Серебро?)
- [ ] `get_next_tier()`: returns None for Платина correctly
- [ ] Points are **integers** everywhere (no float drift)
- [ ] `min_amount_for_accrual = 100` — is this cents or rubles? (Must match the /100 conversion)

#### 3.1.2 Configurability Assessment
- [ ] Are tiers configurable via admin panel or only in code?
- [ ] Can accrual/redeem percentages be changed without deploy?
- [ ] Is `INACTIVE_POINTS_EXPIRY_DAYS = 180` configurable?
- [ ] Is `min_amount_for_accrual = 100` configurable?
- [ ] Can new tiers be added/removed from admin?

#### 3.1.3 Coffee Shop Business Fit
- [ ] Are tier thresholds realistic for a coffee shop? (avg check ~300-500₽)
- [ ] 10,000₽ for Silver = ~20-33 visits — reasonable?
- [ ] 50,000₽ for Gold = ~100-167 visits — achievable in 6 months?
- [ ] 100,000₽ for Platinum = too high for most coffee shops?
- [ ] Birthday trigger fires correctly?
- [ ] Inactivity trigger thresholds make sense?

#### 3.1.4 Points Expiration
```
Target: middleware/app/worker.py :: expire_inactive_points()
```
- [ ] SQL correctly identifies inactive customers
- [ ] Only zeroes customers with NO transactions in last N days
- [ ] Does not accidentally zero customers with recent transactions
- [ ] Edge case: customer with last transaction exactly N days ago

### 3.2 Marketing Campaign System
```
Target files:
  middleware/app/marketing_service.py  (774 lines)
  middleware/app/marketing_api.py      (303 lines)
  middleware/app/trigger_engine.py     (118 lines)
  middleware/app/worker.py             (672 lines — send tasks)
  admin-ui/src/MarketingView.tsx       (45KB — UI)
```

#### 3.2.1 Campaign Lifecycle
- [ ] Draft → Scheduled → Active → Completed flow works
- [ ] Pause/Resume works without data loss
- [ ] Cancel prevents further sends
- [ ] Status transitions are properly guarded (EDITABLE/PAUSABLE/RESUMABLE/CANCELLABLE sets)
- [ ] Budget limit enforcement works

#### 3.2.2 Targeting & Segmentation
- [ ] Segment criteria JSON is validated
- [ ] Consent check (152-ФЗ): only `marketing_allowed=1` customers receive campaigns
- [ ] Rate limiting: `is_rate_limited()` prevents spam
- [ ] VK + Telegram multi-channel dispatch works

#### 3.2.3 Content Types
Verify each dispatch path in `marketing_service.py`:
- [ ] `text` → `send_customer_message` task
- [ ] `photo` → `send_photo_message` task
- [ ] `video` → `send_video_message` task
- [ ] `document` → `send_document_message` task
- [ ] `media_group` → `send_media_group_message` task (verify task still exists!)
- [ ] VK variants work

#### 3.2.4 Trigger Engine
- [ ] `customer.birthday` trigger evaluates correctly
- [ ] `customer.inactive` trigger uses correct day calculation
- [ ] `customer.welcome` trigger fires for new customers (< 24h)
- [ ] `points.expiration` trigger warns before points expire
- [ ] Duplicate triggers are prevented (same event + same customer)
- [ ] `delay_hours` scheduling works correctly

**Acceptance**: All math verified with edge cases, campaign lifecycle complete, no broken dispatch paths.

---

## Phase 4 — Backend Code Quality (est. 45 min)

**Role: `BE-QA`**

### 4.1 Security Scan
```
Target files (by risk):
  middleware/app/admin_auth_api.py  (36KB — auth, JWT, cookies)
  middleware/app/auth.py           (11KB — permission checks)
  middleware/app/handlers.py       (68KB — Telegram bot input)
  middleware/app/db.py             (27KB — SQL queries)
  middleware/app/admin_api.py      (60KB — admin endpoints)
```

Check:
- [ ] No SQL injection (all queries use parameterized `?`)
- [ ] No `eval()`, `exec()`, `pickle` usage
- [ ] JWT tokens: proper expiry, refresh rotation, httpOnly cookies
- [ ] CORS configuration is restrictive
- [ ] Admin secret not logged or exposed
- [ ] File upload paths are sanitized
- [ ] Rate limiting on auth endpoints
- [ ] Password hashing uses bcrypt/argon2 (not MD5/SHA)

### 4.2 Error Handling & Observability
- [ ] All DB connections use `try/finally: conn.close()` (audit `db.connect()` calls)
- [ ] All API endpoints return consistent error format `{detail: ...}`
- [ ] No bare `except Exception: pass` (after worker.py fix)
- [ ] Logging: structured, with context (customer_id, campaign_id, etc.)
- [ ] Health endpoints work: `/health`, `/health/db`, `/health/redis`

### 4.3 Dead Code & Code Smells
- [ ] Unused imports
- [ ] Functions defined but never called
- [ ] Duplicated delivery-event tracking (6 copies in worker.py)
- [ ] `handlers.py` at 1768 lines — candidate for decomposition
- [ ] `App.tsx` at 92KB — candidate for decomposition

### 4.4 Database Integrity
- [ ] Foreign key constraints enabled in SQLite
- [ ] Migrations are idempotent
- [ ] Seed data doesn't conflict with migrations
- [ ] No orphaned records possible (cascading deletes)

**Acceptance**: Zero SQL injection vectors, consistent error handling, no silent failures.

---

## Phase 5 — Frontend Code Quality (est. 30 min)

**Role: `FE-QA`**

### 5.1 Component Architecture
- [ ] `App.tsx` (92KB) — identify decomposition opportunities
- [ ] `MarketingView.tsx` (45KB) — same
- [ ] `AnalyticsView.tsx` (27KB) — same
- [ ] Proper separation: data fetching vs rendering
- [ ] All API calls go through `api.ts` (no raw `fetch`)
- [ ] Proper error boundaries (`ErrorBoundary.tsx` usage)

### 5.2 State Management
- [ ] No prop drilling > 3 levels
- [ ] `useEffect` cleanup functions present where needed
- [ ] No stale closure issues in callbacks
- [ ] Loading/error states handled for all async operations

### 5.3 Performance
- [ ] Large lists use virtualization or pagination
- [ ] Images/charts lazy-loaded
- [ ] No re-render storms (check `useCallback`/`useMemo` usage)
- [ ] Bundle size: check for unnecessary large deps

**Acceptance**: No monolith components > 500 lines identified without decomposition plan.

---

## Phase 6 — Test Coverage & CI Health (est. 30 min)

**Role: `QA-CI`**

### 6.1 Backend Test Health
```
Tests found:
  Unit:        15+ test files in tests/unit/
  Integration: 15+ test files in tests/integration/
  Functional:  1 file in tests/functional/
```

- [ ] Run full suite, capture pass/fail counts
- [ ] Identify and triage all failing tests (pre-existing vs new)
- [ ] Check `test_role_access.py` failures (29 failures seen — investigate root cause)
- [ ] Verify test isolation (no test-order dependencies)

### 6.2 Frontend Test Health
```
Tests found:
  Unit:  Pagination.test.tsx, PerformanceWidget.test.tsx
  E2E:   47 Playwright spec files across smoke/auth/loyalty/roles/functional/localization
```

- [ ] Run Vitest unit tests in Docker
- [ ] Inventory E2E specs and note which are smoke vs comprehensive
- [ ] Check for flaky selectors (avoid text-based, prefer test-id)

### 6.3 Missing Test Coverage
Identify untested critical paths:
- [ ] Loyalty math: `calc_earned_points`, `clamp_redeem_points` edge cases
- [ ] Marketing campaign send flow
- [ ] Profile deletion end-to-end
- [ ] Currency conversion (/100) consistency
- [ ] Admin password change flow

**Acceptance**: Full test inventory documented, failing tests triaged, coverage gaps listed.

---

## Phase 7 — GitHub Agent Feedback Resolution (est. 20 min)

**Role: `QA-CI`**

- [ ] Pull all open review comments from current branch PRs
- [ ] Categorize each: code-style / bug / security / perf / architecture
- [ ] Map each to a Phase above (most will overlap)
- [ ] Mark which are already addressed by previous fixes
- [ ] Create action items for remaining unresolved comments

**Acceptance**: Every GitHub agent comment has a resolution status.

---

## Phase 8 — Fix Implementation (est. variable)

**All roles execute in order:**

1. `I18N` — Missing keys, hardcoded strings, locale parity
2. `LM-SP` — Loyalty math bugs, configurability improvements
3. `BE-QA` — Security fixes, error handling, dead code removal
4. `FE-QA` — Theme fixes, modal issues, accessibility
5. `QA-CI` — Test fixes, new regression tests

### Fix Priority Order:
1. **P0 — Blockers**: Security vulnerabilities, data corruption risks, broken features
2. **P1 — Critical**: i18n breaks, incorrect math, test failures from our changes
3. **P2 — Major**: Theme inconsistencies, missing error handling, dead code
4. **P3 — Minor**: Style issues, naming, small refactors

---

## Phase 9 — Verification & Report (est. 20 min)

**Role: `QA-CI`**

1. Re-run full backend test suite (Docker)
2. Re-run frontend type-check
3. Verify all locale files parse cleanly
4. Compile final report:

### Report Template:
```
# Deep QA Review Report — [DATE]

## Executive Summary
- Critical issues: X found, Y fixed
- Major issues: X found, Y fixed
- Minor issues: X found, Y fixed

## 1. i18n & Localization
| Issue | Severity | Status | File |
|-------|----------|--------|------|

## 2. UI/UX & Theming
| Issue | Severity | Status | File |
|-------|----------|--------|------|

## 3. Marketing & Loyalty
| Issue | Severity | Status | File |
|-------|----------|--------|------|

## 4. Backend Quality
| Issue | Severity | Status | File |
|-------|----------|--------|------|

## 5. Frontend Quality
| Issue | Severity | Status | File |
|-------|----------|--------|------|

## 6. Test Health
| Suite | Pass | Fail | Skip | Notes |
|-------|------|------|------|-------|

## 7. GitHub Agent Feedback
| Comment | Category | Status |
|---------|----------|--------|

## 8. Recommendations (Top 5)
1. ...
2. ...
```

5. Commit with message: `qa: Deep QA review — [summary]`

---

## Execution Order Summary

| Phase | Role | Est. Time | Depends On |
|-------|------|-----------|------------|
| 0. Pre-Flight | `QA-CI` | 10 min | — |
| 1. i18n Audit | `I18N` | 30 min | Phase 0 |
| 2. UI/UX Review | `FE-QA` | 45 min | Phase 0 |
| 3. Marketing & Loyalty | `LM-SP` | 60 min | Phase 0 |
| 4. Backend Quality | `BE-QA` | 45 min | Phase 0 |
| 5. Frontend Quality | `FE-QA` | 30 min | Phase 2 |
| 6. Test & CI | `QA-CI` | 30 min | Phase 0 |
| 7. GitHub Feedback | `QA-CI` | 20 min | Phase 0 |
| 8. Fix Implementation | ALL | variable | Phases 1-7 |
| 9. Verification | `QA-CI` | 20 min | Phase 8 |

**Total estimated: ~5 hours for thorough review + fixes**

> Phases 1–4 can run in parallel if multiple people are available.
> For single-person execution, recommended order: 0 → 1 → 3 → 4 → 2 → 5 → 6 → 7 → 8 → 9
> (i18n and business logic first — they surface the most impactful bugs)
