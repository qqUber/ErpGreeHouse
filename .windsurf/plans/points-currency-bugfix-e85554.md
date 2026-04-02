# Points/Currency Bug Fix Plan — Phased Implementation

**Goal:** Fix critical currency/points unit confusion and related transaction integrity bugs in the loyalty system while maintaining production safety.

---

## Phase 1: Critical Fixes (URGENT — Deploy First)
*Est: 2-3 hours | Risk: High if wrong, Zero if correct*

### 1.1 Fix Currency/Points Unit Confusion in `create_sale`
**File:** `middleware/app/admin_api.py:1417-1426`

**Problem:** `clamp_redeem_points()` works in rubles but balance updates treat it as points. Conflation causes incorrect customer balances.

**Fix Strategy:**
- Change `clamp_redeem_points()` to accept and return **points** (not rubles)
- Keep `total_rubles` for percent calculations only
- Ensure `payable = total - (bonus_used * 100)` where `bonus_used` is in rubles converted to kopecks
- Align all units: points ledger uses points, balance uses points, API returns points

**Verification:**
```python
# Test case: Customer has 500 points, requests 300, 30% max on 1000₽ purchase
# Expected: bonus_used = min(300, 500, 300) = 300 points = 300 rubles
# payable = 100000 - 30000 = 70000 kopecks = 700₽
# new_balance = 500 - 300 + earned = correct
```

### 1.2 Remove Double Balance Update
**File:** `middleware/app/admin_api.py:1471, 1529`

**Action:** Delete lines 1470-1472 (first UPDATE). Keep only the final UPDATE at line 1529-1532.

### 1.3 Fix Transaction Isolation
**File:** `middleware/app/admin_api.py:1391-1535`

**Action:** Move ALL database mutations before the single `conn.commit()` at line 1535. Current code has interim updates that leave DB inconsistent if crash occurs.

**Required moves:**
- Line 1471 balance update → DELETE (handled by 1.2)
- Line 1478-1484 points_ledger insert → keep before commit
- Line 1486-1492 points_ledger insert → keep before commit
- Line 1508-1525 referral updates → move before commit
- Line 1529-1532 final balance → keep

---

## Phase 2: Quality Improvements
*Est: 1-2 hours | Can batch with Phase 1 if needed*

### 2.1 Fix Receipt Format Inconsistency
**File:** `middleware/app/admin_api.py:1441`

**Change:**
```python
# FROM:
lines.append(ReceiptLine(text=f"Списано: {bonus_used}"))
# TO:
lines.append(ReceiptLine(text=f"Списано: {format_currency(bonus_used * 100)}"))
```

### 2.2 Remove Unused Import
**File:** `middleware/app/admin_api.py:27-32`

**Action:** Remove `LoyaltyRules` from imports (keep `get_loyalty_rules`, `calc_earned_points`, etc.)

### 2.3 Fix Race Condition in Birthday Bonus
**File:** `middleware/app/worker.py:606-614`

**Problem:** Non-atomic check-then-update allows duplicate birthday bonuses.

**Fix:** Use single UPDATE with WHERE clause:
```sql
UPDATE customers 
SET balance_points = balance_points + ?, birthday_bonus_last_year = ?
WHERE id = ? AND (birthday_bonus_last_year IS NULL OR birthday_bonus_last_year != ?)
```
Then check `cur.rowcount > 0` before inserting to points_ledger.

---

## Phase 3: Test Coverage & Regression Prevention
*Est: 2-3 hours | Parallel track with dev*

### 3.1 Add Unit Tests for Points Calculation
**New file:** `middleware/tests/unit/test_loyalty_points.py`

**Test cases:**
- `test_points_calculation_with_zero_balance` — ensure no negative
- `test_max_redeem_percent_respected` — 30% cap enforced
- `test_referral_bonus_chain` — referrer + referred both get bonuses
- `test_points_expiry_doesnt_go_negative` — MAX(0, balance - expiry)
- `test_bonus_earned_on_payable_not_total` — post-discount accrual

### 3.2 Integration Test for Sale Transaction
**New file:** `middleware/tests/integration/test_sale_points.py`

**Test:** Full sale flow with mocked customer, verify:
- balance_points updated correctly
- points_ledger has correct entries
- receipt PDF generated with correct values

### 3.3 Fix Existing Test Path
**File:** `middleware/tests/conftest.py:115`

**Decision:** Document why `/tmp/erp_tests` is used (avoid bind-mount I/O issues). No change needed unless CI failures occur.

---

## Risk Assessment

| Phase | Risk Level | Rollback Strategy |
|-------|-----------|-------------------|
| 1 | Medium | Database backup before deploy; feature flag if possible |
| 2 | Low | Standard revert; no data changes |
| 3 | Zero | Test-only code, no production impact |

## Verification Checklist

- [ ] Unit tests pass: `pytest middleware/tests/unit/ -q`
- [ ] Integration tests pass: `pytest middleware/tests/integration/ -q`
- [ ] Manual test: Create sale with bonus redemption, verify balance
- [ ] Manual test: Create sale >30% of total, verify capped at 30%
- [ ] Log review: No "bonus_used mismatch" warnings

## Definition of Done

- All Phase 1 fixes deployed and monitored for 24h
- Customer balance audit shows zero discrepancies
- Receipt format consistent (all values formatted)
- New unit tests ≥90% coverage on loyalty.py

---

**Approved by:** TechLead (pending)
**Estimated Total:** 5-8 hours across all phases
**Priority:** P0 — Currency bugs affect revenue
