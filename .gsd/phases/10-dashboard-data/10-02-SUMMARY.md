---
phase: 10-dashboard-data
plan: 02
subsystem: database
tags: [seed-data, database, marketing, customers]
requires: [phase-9]
provides: [rich-seed-data]
affects: [phase-10]
tech-stack:
  added: []
  patterns: [seed-generation]
key-files:
  modified: [middleware/app/test_api.py]
key-decisions: []
duration: 2 hours
completed: 2026-03-05
---

# Phase 10 Plan 02: Comprehensive Seed Data for Dashboard Summary

## Objective
Created rich seed data for all database tables to populate the dashboard with realistic enterprise CRM data including marketing campaigns, triggers, customer segments, and operational events.

## Context
Current seed only creates basic customers, products, and transactions. Missing: marketing data, segments, triggers, consent records, integration logs.

## Key Accomplishments

### 1. Enhanced Seed Function Structure
**File:** `middleware/app/test_api.py`
- Refactored `seed_test_data()` to call sub-functions
- Improved code organization and maintainability
- Added comprehensive error handling

### 2. Expanded Product Catalog
Created 48 products across categories:
- Coffee (12): Эспрессо, Капучино, Латте, Американо, Раф, Мокко, etc.
- Tea (6): Black, green, herbal, fruit, matcha, chai
- Desserts (10): Cheesecakes, tiramisu, croissants, muffins, ice cream
- Food (12): Sandwiches, salads, soups, bagels, wraps
- Drinks (8): Lemonade, mojito, smoothies, fresh juices

### 3. Created Rich Customer Profiles
50 customers with:
- Full Russian names
- Phone numbers
- Telegram IDs
- VK IDs
- QR tokens
- Balance points (0-5000)
- Birthday dates
- Marketing preferences (80% opt-in)
- Created dates spread across 90 days

### 4. Generated Realistic Transactions
500+ transactions with:
- Spread across last 90 days
- Peak hours: 8-10am, 12-2pm, 5-7pm
- Weekend vs weekday patterns
- Average check: 200-800₽
- 1-4 items per transaction
- Bonus points usage (30% of transactions)

### 5. Created Marketing Segments
5 customer segments:
1. VIP Customers (top 10% by spend)
2. Frequent Buyers (5+ transactions)
3. New Customers (joined last 30 days)
4. At Risk (no purchase in 60 days)
5. Birthday Month

### 6. Created Marketing Triggers
6 automated triggers:
1. Welcome New Customer (after first purchase)
2. Birthday Discount (on birthday)
3. Loyalty Tier Upgrade (threshold reached)
4. Win-back Campaign (30 days inactive)
5. Big Spender Thanks (>2000₽ transaction)
6. Referral Request (after 5th purchase)

### 7. Created Marketing Campaigns
4 campaigns:
1. Spring Coffee Festival (active, sent)
2. New Latte Launch (scheduled)
3. VIP Exclusive (segment: VIP)
4. Win-back Special (segment: At Risk)

### 8. Generated Trigger Events
For each transaction, created trigger events:
- Linked to trigger_id
- Set status: processed/pending/failed
- Spread across last 7 days
- 200+ total events

### 9. Generated Marketing Events
Campaign engagement events:
- Opens: 60-70% of recipients
- Clicks: 15-25% of opens
- Conversions: 5-10% of clicks
- 500+ events across last 14 days

### 10. Created Consent Records
For each customer:
- Data processing consent (all customers)
- Marketing consent (80% opt-in)
- Spread across customer lifetime

### 11. Created Integration Deliveries
Webhook delivery logs:
- Telegram: 200+ deliveries
- VK: 100+ deliveries
- ERP sync: 50+ deliveries
- Mix of success/failed/pending

## Verification
After seeding, verified counts:
- 50 customers
- 48 products
- 500+ transactions
- 6 triggers
- 4 campaigns
- 200+ trigger events
- 500+ marketing events
- 100+ consents
- 350+ integration deliveries

## Deviations from Plan
None - plan executed exactly as written.

## Next Phase Readiness
Rich seed data is available for dashboard API endpoints.
