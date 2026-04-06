# CI/CD Pipeline Audit & Fix Plan

**Comprehensive audit of all GitHub Actions workflows to identify and fix non-E2E CI/CD errors across build, test, lint, security, and deployment stages.**

---

## Critical Issues (Fix Immediately)

### 1. Node.js Version Inconsistency
| Location | Current | Issue |
|----------|---------|-------|
| `tests.yml:272` | `node-version: '20'` | Out of sync with other workflows |
| `ci.yml`, `pr.yml`, `cd-*.yml` | `node-version: 24` | Correct (Node 24) |

**Fix:** Standardize all workflows to Node 24 (already using in most places).

### 2. Test Script Masking Failures
`@middleware/run_tests.sh:17,28` uses `|| true` which causes test failures to be silently ignored.

```bash
# Current (BAD)
pytest ... tests/unit/ || true
pytest ... tests/integrations/ || true
```

**Fix:** Remove `|| true` or implement proper exit code handling.

### 3. Report Path Mismatches
| Source | Writes To | Docker Volume |
|--------|-----------|---------------|
| `run_tests.sh` | `../out/` | `/app/reports` |
| `docker-compose.test.yml` | (pytest config) | `/app/reports` |
| `ci.yml:55` | expects `middleware/reports` | inconsistent |

**Fix:** Align all report paths to use consistent directory structure.

---

## High Priority Issues

### 4. Python 3.14 - Bleeding Edge Risk
Using Python 3.14 (not yet stable/released) may cause dependency compatibility issues.

**Recommendation:** Pin to Python 3.12 or 3.13 for stability.

### 5. Pre-commit Version Mismatches
| Tool | Pre-commit | requirements.txt | Issue |
|------|------------|------------------|-------|
| Black | 23.3.0 | 25.1.0 | Major version drift |
| Flake8 | 6.0.0 | 7.3.0 | Version mismatch |

**Fix:** Sync versions between `.pre-commit-config.yaml` and `requirements.txt`.

### 6. Missing Pre-commit in tests.yml
`tests.yml` runs linting separately but doesn't run pre-commit, leading to potential drift.

**Fix:** Add pre-commit hook execution to ensure consistency.

---

## Medium Priority Issues

### 7. Coverage Report Path Inconsistencies
- `tests.yml:60` uploads `middleware/reports/coverage.xml`
- `run_tests.sh` writes to `../out/coverage.xml`
- `ci.yml` doesn't upload coverage files

**Fix:** Standardize all coverage output paths.

### 8. Docker Image `postgres:18-alpine` Doesn't Exist
`@prod/docker-compose.yml:183` references `postgres:18-alpine` but latest PostgreSQL is 16.

**Fix:** Change to `postgres:16-alpine` or `postgres:15-alpine`.

### 9. Bandit Inconsistency
- `pr.yml:198` runs `bandit -r app/ -q`
- `tests.yml:200` runs `bandit -r app/ -f json -o reports/bandit_report.json || true`

Different args and error handling between workflows.

### 10. Safety Check Deprecated
`tests.yml:205` uses `safety check` which is deprecated in newer versions.

**Fix:** Consider migrating to `pip-audit` (already used in `pr.yml:195`).

---

## Workflow-Specific Issues

### ci.yml
- Line 46: `ERP_MOCK_MODE: 'true'` quoted, inconsistent with boolean usage elsewhere
- Line 67: E2E section should not be in scope per user request (excluded from this plan)

### pr.yml
- Line 74: `NODE_OPTIONS` at job level instead of step level
- Line 91: `ci:check` may fail if Biome not configured identically across environments

### tests.yml
- Line 72: `e2e-tests` job has dependency on `integration-tests` which may cause delays
- Line 302: `mvp-validation` requires all jobs including E2E (user-excluded from scope)
- Line 228: `isort` check has `|| true` - silently passes failures
- Line 249: `flake8` has extensive ignore list masking real issues

### cd-dev.yml / cd-staging.yml / cd-prod.yml
- Line 66: `set +e` / `set -e` pattern in test running is complex and error-prone
- Line 120-141: Git operations for deploy pointer may fail on branch conflicts

---

## Implementation Priority Order

### Phase 1: Critical Fixes (Blocks CI/CD)
1. Fix `run_tests.sh` to properly fail on test errors
2. Align Node.js versions to 24 in `tests.yml`
3. Fix report path consistency between Docker and host

### Phase 2: High Priority (Prevents Future Issues)
4. Downgrade Python 3.14 → 3.12/3.13
5. Sync pre-commit versions with requirements.txt
6. Fix PostgreSQL version in prod compose

### Phase 3: Medium Priority (Cleanup & Consistency)
7. Standardize bandit execution
8. Replace deprecated `safety` with `pip-audit`
9. Clean up flake8 ignore list
10. Align coverage report paths

---

## Files to Modify

| File | Changes |
|------|---------|
| `.github/workflows/tests.yml` | Node version, report paths, add pre-commit |
| `middleware/run_tests.sh` | Remove `\|\| true`, fix exit codes |
| `.pre-commit-config.yaml` | Sync Black, Flake8 versions |
| `middleware/requirements.txt` | Downgrade Python compatibility if needed |
| `prod/docker-compose.yml` | Fix PostgreSQL version |
| `.github/workflows/pr.yml` | Standardize bandit args |
| `.github/workflows/tests.yml` | Replace safety with pip-audit |

---

## Verification Steps

1. Run `pre-commit run --all-files` locally
2. Run `bash middleware/run_tests.sh` and verify exit code on failure
3. Run `docker compose -f prod/docker-compose.yml config` to validate
4. Check Node version consistency: `grep -r "node-version" .github/workflows/`
