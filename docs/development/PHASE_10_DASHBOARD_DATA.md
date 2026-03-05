# Phase 10: Dashboard Data Implementation

## Overview

The dashboard currently has placeholder UI sections that don't display actual data:
1. **Оперативные данные** (Operational Data) - Shows only placeholder text
2. **Маркетинговые события** (Marketing Events) - Always empty because no seed data exists

## Current State

### What's Working
- Dashboard KPI cards (Sales, Revenue, Customers, Net Accrual)
- Revenue trend chart (+41% growth displayed)
- Recent sales transactions list
- Authentication and permissions

### What's Missing
1. **Operational Data Section**
   - UI: Has title and description only
   - Data: No API call or data display
   - Should show: Hourly/daily breakdown, key operational metrics

2. **Marketing Events Section**
   - UI: Implemented but shows "No recent events"
   - Data: API queries `marketing_trigger_events` table
   - Problem: No seed data for triggers/events
   - Should show: Recent trigger executions, campaign events

## Goals

1. **Implement Operational Data Display**
   - Create API endpoint for operational summary
   - Display hourly sales breakdown
   - Show top products today
   - Display active staff/operators metrics

2. **Seed Marketing Data**
   - Create marketing triggers in seed script
   - Generate marketing events linked to transactions
   - Show realistic campaign activity

3. **Update E2E Tests**
   - Verify dashboard shows all data sections
   - Test marketing events appear after seeding

## Success Criteria

- [ ] Operational Data section shows real metrics (not placeholder)
- [ ] Marketing Events section shows recent trigger executions
- [ ] Dashboard screenshot shows all sections populated
- [ ] E2E tests pass with full dashboard validation

## Technical Details

### Database Schema (Already Exists)
```sql
-- marketing_triggers table exists
-- marketing_trigger_events table exists
-- Need seed data for both
```

### API Requirements
1. **GET /api/v1/dashboard/operational** (NEW)
   - Hourly transaction counts
   - Today's top products
   - Active operator summary

2. **Seed Script Updates**
   - Create marketing triggers (birthday, loyalty tier, etc.)
   - Generate events for recent transactions

### Frontend Changes
1. **DashboardView.tsx**
   - Add operational data API call
   - Display hourly breakdown chart
   - Show top products table

2. **Seed Data**
   - `middleware/app/seed.py` - Add marketing triggers
   - Link events to existing transactions

## Files to Modify

- `middleware/app/seed.py` - Add marketing data seeding
- `middleware/app/admin_api.py` - Add operational endpoint
- `admin-ui/src/App.tsx` - Implement operational data display
- `admin-ui/e2e/smoke/dashboard.spec.ts` - Update tests

## Estimation

- **Seed marketing data**: 2 hours
- **Operational API endpoint**: 3 hours
- **Frontend implementation**: 4 hours
- **Testing & validation**: 2 hours
- **Total**: ~11 hours

## Dependencies

- Requires Phase 9 (E2E Infrastructure) - COMPLETE
- Database schema already in place
- No external service dependencies

## Out of Scope

- Real-time WebSocket updates
- Advanced operational analytics
- Marketing campaign creation UI
- Email/SMS delivery tracking
