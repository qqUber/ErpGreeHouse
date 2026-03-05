# Phase 9-01: Hardening - Research

## Phase Overview
**Phase:** 09 (Hardening)
**Goal:** Fix the 26 security issues identified in Phase 8 Security Audit

## Phase 8 Findings Summary

| Severity | Count | Issue Type | Files Affected |
|----------|-------|------------|----------------|
| HIGH | 1 | Weak SHA1 hash | erpnext_client.py:261 |
| MEDIUM | 20 | SQL expression issues | handlers.py, commands.py, test_api.py |
| LOW | 5 | Hardcoded strings, try/except/pass | admin_api.py, admin_auth_api.py |

## Research Findings

### 1. SHA1 Hash Issue (HIGH)

**Location:** `middleware/app/integrations/pos/erpnext_client.py:261`

**Current Code:**
```python
order_id = hashlib.sha1(f"{client_name}{ts}".encode()).hexdigest()[:10]
```

**Analysis:**
- Used to generate a short order ID for ERP integration
- Not used for cryptographic security, just unique ID generation
- Bandit flags as HIGH because SHA1 is considered cryptographically weak

**Recommended Fix:**
Replace with SHA256:
```python
order_id = hashlib.sha256(f"{client_name}{ts}".encode()).hexdigest()[:10]
```

**Risk:** Low - produces same-length output, just more secure

### 2. SQL Expression Issues (MEDIUM x 20)

**Analysis of flagged locations:**

Looking at handlers.py:121, the pattern is:
```python
f"UPDATE customers SET {', '.join(updates)} WHERE id = ?"
```

**Finding:** These are **likely false positives** because:
- The `updates` list is built from hardcoded column names (e.g., "telegram_id", "vk_id")
- Column names are NOT from user input
- The query uses parameterized `?` with tuple(params) for values

**However:** Should verify all 20 flagged locations to confirm.

**Recommended Action:**
1. Review each flagged location
2. Confirm parameterized queries are used correctly
3. Add `# noqa: B608` comments for false positives
4. Fix any real vulnerabilities

### 3. Low Severity Issues (LOW x 5)

**Types:**
- Hardcoded cookie names ("access_token", "refresh_token", "bearer")
- Try/except/pass patterns (silent cache failures)

**Recommended Action:**
- Document as acceptable patterns
- Or replace with more explicit error handling

## Recommended Approach

### Priority 1: Fix HIGH Severity
- Replace SHA1 with SHA256 in erpnext_client.py

### Priority 2: Review MEDIUM Severity  
- Audit each SQL expression issue
- Confirm parameterized queries used
- Add noqa comments for false positives
- Fix any real vulnerabilities

### Priority 3: Address LOW Severity
- Document or fix based on effort

## Implementation Notes

- Re-run bandit after fixes to verify
- Consider adding security tests
- Phase 9 has 2 plans available

---

**Research completed:** 2026-03-04
