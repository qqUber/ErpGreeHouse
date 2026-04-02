# Functional Improvement Plan — UDS Digital Parity

> **Goal**: Evolve Coffee Shop CRM to match/exceed UDS Digital's functional capabilities.
> **Scope**: Functional features only — no UI/UX redesign or backend architecture changes unless required by a feature.
> **Benchmark**: https://uds-digital.ru / https://getuds.app/business

---

## Current State Summary

### What We Already Have (✅)
| Feature | Status |
|---|---|
| **Multi-tier loyalty** (Базовый → Серебро → Золото → Платина) | ✅ Full — 4 tiers, Redis leaderboard, accrual %, redeem caps |
| **Cashback system** | ✅ Full — points earned per purchase, tier-based accrual % |
| **QR-based virtual card** | ✅ Full — qr_token per customer, TMA & Telegram bot |
| **Customer segmentation (RFM)** | ✅ Full — Recency/Frequency/Monetary analysis, 5 segments |
| **Marketing campaigns** | ✅ Full — segments, campaigns, send/pause/resume/cancel, budget control |
| **Marketing triggers** | ✅ Full — birthday, inactive, welcome, points expiration events |
| **Push notifications (Telegram)** | ✅ Full — text, photo, video, document, media groups via Celery |
| **VK channel** | ✅ Full — VK bot integration, photo + text messages |
| **Product recommendations** | ✅ Full — preference analysis, post-order/menu/daily push contexts |
| **Customer base management** | ✅ Full — filters, search, CRUD, analytics fields |
| **Product catalog** | ✅ Full — products with code, name, kind, price, active flag |
| **Multi-location support** | ✅ Full — countries → cities → locations hierarchy |
| **Customer visits tracking** | ✅ Full — per-location visit counts and spend |
| **ERP integration** | ✅ Full — ERPNext sync, POS integration |
| **Analytics & statistics** | ✅ Full — dashboard, sales/customer/loyalty charts, exports |
| **Admin RBAC** | ✅ Full — roles, permissions, JWT auth |
| **Consent management (GDPR)** | ✅ Full — consent types, versions, audit trail |
| **Short URLs** | ✅ Full — campaign tracking links |

### What's Missing or Partial (❌/⚠️)

| # | UDS Feature | Our Status | Gap |
|---|---|---|---|
| 1 | **Referral program** | ❌ Missing | No invite links, no referral bonuses, no referral-based tier upgrades |
| 2 | **Gift certificates / vouchers** | ❌ Missing | No certificate creation, sending, or redemption |
| 3 | **Customer reviews & ratings** | ❌ Missing | No review collection, star ratings, or feedback management |
| 4 | **Welcome bonus points** | ❌ Missing | Trigger exists for `customer.welcome` but no points awarded |
| 5 | **Birthday bonus points** | ⚠️ Partial | Birthday trigger fires but only sends message — no auto-points |
| 6 | **Points expiration** | ⚠️ Partial | Trigger fires but no actual point deduction/expiration logic |
| 7 | **Multi-level loyalty auto-upgrade** | ⚠️ Partial | Tiers exist but auto-upgrade by spend OR referrals not implemented |
| 8 | **Configurable loyalty settings** | ❌ Missing | Tiers are hardcoded in Python; no admin UI to configure % and thresholds |
| 9 | **Max % payable by points setting** | ⚠️ Partial | Exists per tier in code but not configurable from admin |
| 10 | **News feed** | ❌ Missing | No news/article feed for customers in bot or TMA |
| 11 | **Online ordering (Telegram bot)** | ❌ Missing | Menu exists but no cart/order/payment flow |
| 12 | **Online payments** | ❌ Missing | No payment gateway integration |
| 13 | **Wallet cards (Apple Wallet / G-Pay)** | ❌ Missing | No .pkpass or Google Pay pass generation |
| 14 | **Cross-marketing** | ❌ Missing | No partner business certificate exchange |
| 15 | **Employee motivation/rewards** | ❌ Missing | No staff reward tracking per registration/sale |
| 16 | **Customer import (CSV/Excel)** | ❌ Missing | No bulk customer import from file |
| 17 | **Fraud/security monitoring** | ❌ Missing | No suspicious operation detection for cashiers |
| 18 | **Items redeemable for points** | ❌ Missing | No "goods for points" catalog |
| 19 | **Phone-only loyalty accrual** | ❌ Missing | Customer must have Telegram; no phone-only fallback |
| 20 | **Auto-reply to reviews** | ❌ Missing | No automated feedback response system |
| 21 | **Telegram Bot card** | ⚠️ Partial | Bot exists but no dedicated loyalty card view in TG |

---

## Implementation Roadmap

### Phase 1 — Core Loyalty Enhancements (Weeks 1–3)

#### 1.1 Welcome Bonus Points
**Priority**: High | **Effort**: S
- Award configurable bonus points on customer registration
- New field: `system_settings.welcome_bonus_points` (integer)
- Modify `customer.welcome` trigger handler to credit points automatically
- Update customer `balance_points` atomically on registration
- Backend: `middleware/app/worker.py` → `process_periodic_marketing()`
- DB: Add `welcome_bonus_awarded` flag to `customers` to prevent double-award

#### 1.2 Birthday Bonus Points
**Priority**: High | **Effort**: S
- Auto-award configurable points on birthday
- New field: `system_settings.birthday_bonus_points` (integer)
- New field: `system_settings.birthday_bonus_days_before` (integer, default 0)
- Modify birthday trigger to credit points + send congratulatory message
- Add `birthday_bonus_last_year` to `customers` to prevent duplicate annual awards

#### 1.3 Points Expiration Engine
**Priority**: High | **Effort**: M
- New table: `points_ledger` (customer_id, amount, source, expires_at, expired, created_at)
- Migrate from simple `balance_points` counter to ledger-based tracking
- Settings: `system_settings.points_ttl_months` (0 = never expire)
- Settings: `system_settings.points_extend_on_purchase` (boolean)
- Celery periodic task to scan & expire stale points
- Notify customer N days before expiration (configurable)

#### 1.4 Configurable Loyalty Settings (Admin API + UI)
**Priority**: High | **Effort**: M
- New table: `loyalty_tiers` (id, name, min_spent, accrual_percent, max_redeem_percent, sort_order)
- New table: `loyalty_settings` (key, value) — or extend `system_settings`
- Keys: `loyalty_mode` (cashback | discount), `base_accrual_percent`, `max_pay_by_points_percent`
- Admin API: CRUD endpoints for tiers and settings
- Remove hardcoded `LoyaltyRules` from `loyalty.py`; load from DB with Redis cache
- Admin UI: Settings page for loyalty configuration

#### 1.5 Auto Tier Upgrade
**Priority**: High | **Effort**: S
- After each transaction, recalculate customer tier from DB-configured thresholds
- If tier changes → send congratulation message via preferred channel
- Store `current_tier_id` on `customers` table
- Support upgrade by: total spend OR referral count (Phase 2)

---

### Phase 2 — Referral Program (Weeks 3–5)

#### 2.1 Referral Link Infrastructure
**Priority**: High | **Effort**: M
- New table: `referrals` (id, referrer_id, referred_id, referral_code, status, bonus_awarded, created_at)
- Generate unique referral code per customer (e.g., `REF-{qr_token[:8]}`)
- Deep link: `https://t.me/{bot}?start=ref_{code}` for Telegram
- Track referral chain: who invited whom
- Limit: configurable max referral depth (default 1 level)

#### 2.2 Referral Rewards
**Priority**: High | **Effort**: S
- Settings: `referral_bonus_referrer` (points for inviter)
- Settings: `referral_bonus_referred` (welcome bonus for invitee)
- Settings: `referral_min_purchase` (invitee must make first purchase before bonus fires)
- Award points only when referred customer completes first purchase (fraud prevention)

#### 2.3 Referral-Based Tier Upgrade
**Priority**: Medium | **Effort**: S
- Add `referral_count` to tier upgrade conditions (alongside `min_spent`)
- Extend `loyalty_tiers` table: `min_referrals` column
- Recalculate tier when referral count changes

#### 2.4 Referral Analytics
**Priority**: Medium | **Effort**: S
- API: `/analytics/referrals` — top referrers, conversion rate, total referred
- Admin UI: Referral leaderboard widget

---

### Phase 3 — Gift Certificates & Items for Points (Weeks 5–7)

#### 3.1 Gift Certificates
**Priority**: High | **Effort**: L
- New table: `certificates` (id, code, type, value, currency, status, sender_id, recipient_id, recipient_phone, message, expires_at, redeemed_at, created_at)
- Types: `fixed_amount`, `percentage_discount`, `free_item`
- Admin can create & send certificates to segments (batch)
- Customer can send certificate to friend via Telegram share
- Redemption: scan QR or enter code at POS → apply to transaction
- Cross-marketing: partner businesses can issue certificates for your customers

#### 3.2 Items Redeemable for Points
**Priority**: Medium | **Effort**: M
- New table: `reward_items` (id, product_id, points_cost, stock_limit, active, created_at)
- Customer can exchange accumulated points for specific items
- Bot flow: "Rewards" menu → browse → redeem → generate voucher code
- POS integration: apply reward voucher to transaction
- Admin UI: manage reward catalog

---

### Phase 4 — Reviews & Feedback System (Weeks 7–9)

#### 4.1 Post-Purchase Review Collection
**Priority**: High | **Effort**: M
- New table: `reviews` (id, customer_id, transaction_id, location_id, rating, comment, status, admin_reply, created_at)
- After transaction, send review request via Telegram (delay: configurable hours)
- Rating: 1-5 stars via inline keyboard
- Optional text comment after rating
- Status: `pending` → `published` | `hidden`

#### 4.2 Feedback Dashboard
**Priority**: Medium | **Effort**: M
- Admin API: `/reviews` — list, filter by rating/location/date
- Admin can reply to reviews (reply sent back to customer via Telegram)
- Aggregate metrics: average rating, NPS score, rating distribution
- Admin UI: Reviews tab with filters, reply action

#### 4.3 Auto-Reply to Reviews
**Priority**: Low | **Effort**: S
- Configurable auto-reply templates per rating range (1-2: apologetic, 3: neutral, 4-5: thankful)
- Settings: `auto_reply_enabled`, `auto_reply_delay_minutes`
- Template variables: `{customer_name}`, `{rating}`, `{location_name}`

#### 4.4 QR-Based Feedback
**Priority**: Low | **Effort**: S
- Generate location-specific QR codes for table/counter display
- Scanning opens Telegram bot → "Rate your visit" flow
- No purchase required — captures walk-in sentiment

---

### Phase 5 — News Feed & Content (Weeks 9–10)

#### 5.1 News Feed
**Priority**: Medium | **Effort**: M
- New table: `news_articles` (id, title, body, image_url, published_at, status, author_id, created_at)
- Admin API: CRUD for articles + publish/unpublish
- Telegram bot: `/news` command → last 5 articles
- TMA: News section with card layout
- Push notification on new article (optional, per article flag)

#### 5.2 Promotions Feed
**Priority**: Medium | **Effort**: S
- Extend `news_articles` with `type` field: `news` | `promotion` | `event`
- Promotions can have: `valid_from`, `valid_until`, `promo_code`, `discount_percent`
- Bot: "Current promotions" button in main menu
- Auto-expire past promotions

---

### Phase 6 — Online Ordering (Weeks 10–13)

#### 6.1 Catalog in Bot
**Priority**: Medium | **Effort**: M
- Telegram bot menu with categories → products → add to cart
- TMA: full catalog browsing with search and filters
- Show prices, descriptions, images
- Respect product `active` flag

#### 6.2 Cart & Order Flow
**Priority**: Medium | **Effort**: L
- New tables: `orders` (id, customer_id, location_id, status, total, bonus_used, delivery_type, payment_method, created_at)
- New table: `order_items` (id, order_id, product_id, qty, price)
- Order statuses: `draft` → `confirmed` → `preparing` → `ready` → `completed` | `cancelled`
- Location selection (pickup point)
- Apply loyalty points at checkout
- Order confirmation notification

#### 6.3 Online Payments
**Priority**: Low | **Effort**: L
- Integrate payment gateway (YooKassa / Tinkoff / Stripe)
- Telegram Payments API for in-bot purchases
- Payment status tracking and receipts
- Refund flow

---

### Phase 7 — Wallet Cards & Advanced Features (Weeks 13–15)

#### 7.1 Apple Wallet Pass
**Priority**: Medium | **Effort**: M
- Generate `.pkpass` files with customer QR, name, balance
- Send via Telegram file or deep link
- Auto-update pass when balance changes (push notification to Wallet)
- Library: `wallet-py` or custom PKCS#7 signing

#### 7.2 Google Pay Pass
**Priority**: Medium | **Effort**: M
- Google Pay API for Passes: loyalty card object
- JWT-based pass creation
- Similar update mechanism as Apple Wallet

#### 7.3 Phone-Only Loyalty
**Priority**: Medium | **Effort**: S
- Allow accrual by phone number without Telegram registration
- Cashier enters phone → system finds/creates customer → awards points
- SMS notification of balance (optional, paid channel)
- Customer can later link Telegram to access full features

#### 7.4 Customer Import
**Priority**: Medium | **Effort**: M
- Admin API: `POST /customers/import` — accept CSV/Excel
- Validation: phone format, duplicate detection, field mapping
- Import report: created, skipped, errors
- Admin UI: upload wizard with preview

---

### Phase 8 — Security & Staff Features (Weeks 15–16)

#### 8.1 Fraud Detection
**Priority**: Medium | **Effort**: M
- Monitor suspicious patterns:
  - Same cashier + same customer > N transactions/day
  - Points accrual without matching POS receipt
  - Unusually high bonus redemption
- New table: `security_alerts` (id, alert_type, severity, details_json, resolved, created_at)
- Admin dashboard widget: security alerts with severity indicators
- Configurable thresholds in `system_settings`

#### 8.2 Employee Motivation
**Priority**: Low | **Effort**: M
- Track per-employee metrics: registrations acquired, transactions processed
- New table: `employee_metrics` (id, employee_id, metric_type, value, period, created_at)
- Cashier identified by admin user performing the sale
- Admin UI: Employee leaderboard
- Optional: bonus points for top-performing employees

---

## Priority Matrix

| Phase | Features | Business Impact | Effort | Priority |
|---|---|---|---|---|
| 1 | Welcome/Birthday points, Points expiration, Config loyalty, Auto-upgrade | 🔴 Critical | M | **P0** |
| 2 | Referral program | 🔴 Critical | M | **P0** |
| 3 | Gift certificates, Items for points | 🟡 High | L | **P1** |
| 4 | Reviews & feedback | 🟡 High | M | **P1** |
| 5 | News feed | 🟢 Medium | M | **P2** |
| 6 | Online ordering + payments | 🟡 High | XL | **P1** |
| 7 | Wallet cards, Phone-only, Import | 🟢 Medium | L | **P2** |
| 8 | Fraud detection, Employee motivation | 🟢 Medium | M | **P2** |

---

## Database Changes Summary

### New Tables
1. `points_ledger` — granular point tracking with expiration
2. `loyalty_tiers` — configurable tier definitions
3. `referrals` — referral tracking
4. `certificates` — gift certificates/vouchers
5. `reward_items` — items redeemable for points
6. `reviews` — customer reviews/ratings
7. `news_articles` — news/promotions feed
8. `orders` + `order_items` — online ordering
9. `security_alerts` — fraud detection
10. `employee_metrics` — staff performance tracking

### Modified Tables
- `customers`: add `current_tier_id`, `referral_code`, `referred_by`, `welcome_bonus_awarded`, `birthday_bonus_last_year`
- `system_settings`: new keys for loyalty configuration, review settings, referral settings

---

## Technical Notes

- All new features should respect existing patterns: FastAPI routes, SQLite + Redis cache, Celery async tasks
- All list endpoints must return `{items: [...], pagination: {...}}` format
- All user-facing strings must use i18n keys
- Points are integers (not currency) — do not divide by 100
- New Telegram bot commands should be registered in bot handler with proper keyboard layouts
- Admin UI pages follow existing React + Vite + TypeScript patterns
- No local tests — Docker only per project rules
