---
phase: 00-test-improvement
plan: 01
subsystem: testing
tags:
  - pytest
  - fixtures
  - sqlite
  - database
---

# Phase 00 Plan 01: Fix Consent Test Failures Summary

## One-Liner
Fixed critical test infrastructure bug in pytest fixture - using SQLAlchemy URL instead of absolute filesystem path with sqlite3.connect()

## Dependency Graph

- **Requires**: Test infrastructure setup in `middleware/tests/`
- **Provides**: Fixed test fixtures that correctly connect to SQLite database
- **Affects**: All tests using the `clean_database` fixture

## Tech Stack

- **Added**: None (bug fix only)
- **Patterns**: pytest fixture scoping - critical distinction between session-scoped URLs and function-scoped absolute paths

## Key Files Modified

- `middleware/tests/conftest.py` - Line 161 fixed

## Decisions Made

1. **SQLAlchemy URL vs Absolute Path**: Understood that `sqlite3.connect()` requires absolute filesystem paths, not SQLAlchemy URLs
2. **Fixture Scope Awareness**: Recognized `test_db_path` (session-scoped, SQLAlchemy URL) vs `db_path` (function-scoped, absolute path) distinction

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SQLite connection using SQLAlchemy URL**

- **Found during**: Running consent flow tests
- **Issue**: Line 161 in `conftest.py` used `test_db_path` which is a SQLAlchemy URL (`sqlite:///test_telegram_crm.db`), but `sqlite3.connect()` requires an absolute filesystem path like `C:/Users/AASS/IdeaProjects/ErpGreeHouse/middleware/test_telegram_crm.db`
- **Fix**: Changed line 161 to use `db_path` instead of `test_db_path`
- **Files modified**: `middleware/tests/conftest.py`
- **Commit**: 0f2347a

## Metrics

- **Duration**: Session-based (continuation from previous session)
- **Completed**: 2026-03-02

## Verification

Test passes:
```
tests/unit/test_consent_flow.py::test_store_consent_with_type PASSED [100%]
```

## Commits

- 0f2347a: fix(00-01): fix consent test failures
