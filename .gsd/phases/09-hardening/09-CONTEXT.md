# Phase 09: Hardening - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the 26 security issues identified in Phase 8 Security Audit to complete the v1.1 Security milestone.

</domain>

<decisions>
## Implementation Decisions

### Issue Classification

- **HIGH (1):** SHA1 hash in erpnext_client.py - MUST FIX
- **MEDIUM (20):** SQL expression issues - REVIEW (likely false positives)
- **LOW (5):** Hardcoded strings, try/except/pass - REVIEW/DOCUMENT

### Fix Approach

- Replace SHA1 with SHA256 (straightforward replacement)
- Review SQL issues to confirm parameterized queries are used correctly
- Add noqa comments for confirmed false positives
- Document acceptable LOW severity patterns

</decisions>

<specifics>
## Specific Findings from Phase 8

SHA1 at line 261 in erpnext_client.py:
```python
order_id = hashlib.sha1(f"{client_name}{ts}".encode()).hexdigest()[:10]
```
Used for generating short order IDs - not cryptographic, but should be updated.

SQL issues reviewed in handlers.py - use parameterized queries with `?` placeholders.

</specifics>

<deferred>
## Deferred Ideas

None - Phase 9 is focused on fixing Phase 8 findings.

</deferred>

---

_Phase: 09-hardening_
_Context gathered: 2026-03-04_
