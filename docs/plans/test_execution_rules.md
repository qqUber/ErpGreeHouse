# 📜 Test Execution Rules - ERP GreenHouse

**Version:** 1.0.0  
**Date:** February 20, 2026  
**Status:** ENFORCED

---

## 🛡️ Green Build Policy

### Rule #1: Commit = Clean Build + 100% Passing Tests

**BEFORE EVERY COMMIT:**

```bash
# 1. Run unit tests (fast check)
python test_runner.py --unit

# 2. If unit tests pass → commit
git add .
git commit -m "feat: implemented new feature"

# 3. If tests fail → FIX FIRST
# DO NOT commit with failing tests
```

**ENFORCEMENT:**
- ✅ **ALLOWED**: Commit only when all tests pass
- ❌ **FORBIDDEN**: Committing with failing tests
- ❌ **FORBIDDEN**: Using `git commit --no-verify` to skip hooks
- ❌ **FORBIDDEN**: Commenting out tests to make build pass

**CONSEQUENCES:**
- Code review rejection
- CI/CD pipeline failure
- Team notification

---

### Rule #2: New Task = Start with 100% Passing Tests

**BEFORE STARTING NEW FEATURE:**

```bash
# 1. Pull latest code
git pull origin main

# 2. Run full test suite
python test_runner.py

# 3. Verify all tests pass
# If tests fail → report immediately
# Do NOT start new work on broken baseline
```

**DURING IMPLEMENTATION:**

```bash
# 1. Write tests FIRST (TDD approach preferred)
# 2. Implement feature
# 3. Run tests after each change
# 4. Refactor if needed
# 5. Run full suite again
```

**AFTER IMPLEMENTATION:**

```bash
# 1. Run full test suite
python test_runner.py

# 2. Check coverage (if needed)
python test_runner.py --coverage

# 3. Verify all tests pass
# 4. Commit changes
```

---

### Rule #3: Push = Full Test Suite Execution

**BEFORE EVERY PUSH:**

```bash
# MANDATORY: Run ALL tests
python test_runner.py

# Expected output:
# ✅ PASSED - Unit Tests
# ✅ PASSED - Integration Tests
# ✅ PASSED - Security Tests

# If ANY test fails → DO NOT PUSH
# Fix tests first, then push
```

**FORBIDDEN ACTIONS:**

❌ **NEVER** skip tests with `@pytest.mark.skip` without approval  
❌ **NEVER** hide errors with `try/except`  
❌ **NEVER** disable tests in CI/CD configuration  
❌ **NEVER** push with `--no-verify` to bypass checks  
❌ **NEVER** ignore failing tests with comment "fix later"

**REQUIRED ACTIONS:**

✅ **ALWAYS** run full test suite before push  
✅ **ALWAYS** fix failing tests immediately  
✅ **ALWAYS** maintain test coverage  
✅ **ALWAYS** update tests when changing functionality  

---

### Rule #4: External Dependencies = Proper Mocking

**MOCKING REQUIREMENTS:**

| Service | Unit Tests | Integration Tests | E2E Tests |
|---------|-----------|------------------|-----------|
| Telegram API | ✅ Mock | ✅ Mock | ❌ Real |
| ERPNext API | ✅ Mock | ✅ Mock | ❌ Real |
| POS System | ✅ Mock | ✅ Mock | ❌ Real |
| Kassa System | ✅ Mock | ✅ Mock | ❌ Real |
| Redis | ⚠️ FakeRedis | ❌ Real | ❌ Real |
| Database | ✅ SQLite | ❌ Real | ❌ Real |

**HOW TO MOCK:**

```python
# ✅ CORRECT: Mock external service
@pytest.mark.asyncio
async def test_get_customer(mock_erp_client):
    # Mock is provided by conftest.py
    mock_erp_client.get_customer_by_phone.return_value = {
        'customer_id': 'CRM-CUST-00001',
        'phone': '+79991234567'
    }
    
    # Test handler logic
    result = await get_customer('+79991234567')
    
    # Verify mock was called
    mock_erp_client.get_customer_by_phone.assert_called_once()

# ❌ WRONG: Real API call in unit test
@pytest.mark.asyncio
async def test_get_customer():
    # DON'T: Make real API calls in unit tests
    result = await real_erp_client.get_customer_by_phone('+79991234567')
```

**IF MOCKS ARE MISSING:**

1. **DON'T** remove the test
2. **DON'T** skip the test
3. **DO** add the missing mock to `conftest.py`
4. **DO** update `.env.test` with test configuration
5. **DO** document the mock pattern

**EXAMPLE: Adding Missing Mock**

```python
# conftest.py - Add new mock
@pytest.fixture
def mock_pos_client():
    mock = MagicMock()
    mock.process_sale = AsyncMock(return_value={
        'transaction_id': 'POS-001',
        'success': True
    })
    return mock

# Test using the mock
@pytest.mark.asyncio
async def test_process_sale(mock_pos_client):
    with patch('app.integrations.POSClient', return_value=mock_pos_client):
        result = await process_sale(items=[...])
        assert result['success'] == True
```

---

## 🧪 Test Environment Stability

### Infrastructure Requirements

**LOCAL DEVELOPMENT:**

```bash
# Start test infrastructure (Redis, etc.)
docker-compose -f docker-compose.test.yml up -d

# Verify services are running
docker-compose -f docker-compose.test.yml ps

# Expected:
# redis-test    → healthy
# postgres-test → healthy (if using postgres profile)
```

**BEFORE RUNNING TESTS:**

```bash
# 1. Verify Redis is available
redis-cli ping
# Expected: PONG

# 2. Verify .env.test exists
test -f .env.test && echo "OK" || echo "MISSING"

# 3. Verify test database is clean
rm -f test_telegram_crm.db
```

**TEST ISOLATION:**

- ✅ Each test has isolated database
- ✅ Each test has isolated Redis DB
- ✅ Automatic cleanup after each test
- ✅ No shared state between tests
- ✅ Tests can run in any order

---

## 📊 Test Categories and When to Use

### Unit Tests

**PURPOSE:** Test business logic in isolation

**WHEN TO USE:**
- Testing pure functions (loyalty calculations)
- Testing handlers with mocked dependencies
- Testing schemas and validation
- Testing utilities and helpers

**EXAMPLE:**

```python
# tests/unit/test_loyalty.py
def test_calc_earned_points():
    rules = LoyaltyRules(accrual_percent=10, min_amount=100)
    
    # Below threshold
    assert calc_earned_points(99, rules) == 0
    
    # At threshold
    assert calc_earned_points(100, rules) == 10
    
    # Above threshold
    assert calc_earned_points(1000, rules) == 100
```

**EXECUTION:**
```bash
python test_runner.py --unit
# Time: ~30 seconds
```

---

### Integration Tests

**PURPOSE:** Test service interaction

**WHEN TO USE:**
- Testing API endpoints
- Testing database operations
- Testing Redis caching
- Testing ERP client integration

**EXAMPLE:**

```python
# tests/integration/test_erp_client.py
@pytest.mark.asyncio
async def test_get_customer_balance(mock_erp_client):
    # Mock ERP response
    mock_erp_client.get_loyalty_balance.return_value = {
        'available_points': 500
    }
    
    # Call real handler that uses ERP client
    balance = await get_customer_balance('CRM-CUST-00001')
    
    # Verify interaction
    assert balance['available'] == 500
    mock_erp_client.get_loyalty_balance.assert_called_once()
```

**EXECUTION:**
```bash
python test_runner.py --integration
# Time: ~2 minutes
```

---

### E2E Tests

**PURPOSE:** Test complete user journeys

**WHEN TO USE:**
- Customer registration flow
- Order processing workflow
- Loyalty points redemption
- Admin UI workflows

**EXAMPLE:**

```python
# tests/e2e/test_registration.py
@pytest.mark.asyncio
async def test_customer_registration_flow():
    # 1. User sends /start
    await bot.send_message('/start')
    
    # 2. Bot responds with welcome
    response = await bot.get_last_message()
    assert 'welcome' in response.text.lower()
    
    # 3. User sends phone number
    await bot.send_message('+79991234567')
    
    # 4. Bot asks for consent
    response = await bot.get_last_message()
    assert 'consent' in response.text.lower()
    
    # 5. User agrees
    await bot.click_button('Agree')
    
    # 6. Verify customer created
    customer = await db.get_customer_by_phone('+79991234567')
    assert customer is not None
```

**EXECUTION:**
```bash
python test_runner.py --e2e
# Time: ~5 minutes
```

---

## 🚨 Error Handling and Debugging

### When Test Fails

**STEP 1: Identify Failure Type**

```bash
# Run with verbose output
pytest tests/unit/test_file.py::test_function -v -s

# Check error type:
# - AssertionError → Logic error
# - ConnectionError → Environment issue
# - Timeout → Performance issue
# - MockError → Mocking issue
```

**STEP 2: Analyze Root Cause**

| Error Type | Likely Cause | Solution |
|------------|-------------|----------|
| `AssertionError` | Wrong logic or outdated test | Fix code or update test |
| `ConnectionError` | Service not running | Start service or add mock |
| `TimeoutError` | Slow test or deadlock | Optimize test or fix race condition |
| `MockError` | Mock not configured | Add proper mock in conftest.py |

**STEP 3: Fix and Verify**

```bash
# Fix the issue
# ... make changes ...

# Re-run test
pytest tests/unit/test_file.py::test_function -v

# If passes → run full suite
python test_runner.py
```

### Forbidden Error Handling

```python
# ❌ FORBIDDEN: Hiding errors with try/except
def test_something():
    try:
        result = some_function()
        assert result == expected
    except Exception:
        pass  # DON'T DO THIS!

# ❌ FORBIDDEN: Skipping without reason
@pytest.mark.skip("will fix later")  # DON'T DO THIS!
def test_something():
    ...

# ✅ CORRECT: Proper error handling
def test_something():
    result = some_function()
    assert result == expected
    
# ✅ CORRECT: Skip with valid reason
@pytest.mark.skip(reason="Redis not available in CI")
def test_redis_integration():
    ...
```

---

## 📈 Metrics and Monitoring

### Test Execution Metrics

Track these metrics for each test run:

```python
# pytest --metrics output:
Total Tests: 150
Passed: 148 (98.7%)
Failed: 2 (1.3%)
Skipped: 5 (3.2%)
Duration: 8m 32s

Coverage:
- Unit: 85%
- Integration: 92%
- E2E: 100% (critical paths)
```

### Quality Gates

**MINIMUM THRESHOLDS:**

| Metric | Threshold | Action if Below |
|--------|-----------|-----------------|
| Pass Rate | >98% | Fix failing tests immediately |
| Coverage | >80% | Add missing tests |
| Duration | <10 min | Optimize slow tests |
| Flakiness | <1% | Stabilize flaky tests |

**AUTOMATIC CHECKS:**

```yaml
# CI/CD quality gates
quality_gates:
  min_pass_rate: 98
  min_coverage: 80
  max_duration_minutes: 10
  max_flakiness_percent: 1
```

---

## 🔄 Continuous Improvement

### Weekly Test Review

**AGENDA:**

1. Review failing tests from past week
2. Identify flaky tests
3. Discuss test optimization opportunities
4. Share mocking best practices
5. Update test documentation

**CHECKLIST:**

- [ ] All failing tests have tickets created
- [ ] Flaky tests identified and documented
- [ ] Slow tests optimized
- [ ] New test patterns documented
- [ ] Mock library updated

### Monthly Metrics Review

**REPORT:**

```markdown
# Test Metrics - Month YYYY-MM

## Coverage Trends
- Unit: 82% → 85% (+3%)
- Integration: 90% → 92% (+2%)
- E2E: 100% (stable)

## Performance
- Average run time: 8m 30s → 7m 45s (-45s)
- Slowest test: test_e2e_order_flow (2m 10s)

## Quality
- Pass rate: 98.5%
- Flaky tests: 2 (1.3%)
- Bugs caught by tests: 15
```

### Quarterly Strategy Update

**TOPICS:**

1. Evaluate new testing tools
2. Review testing architecture
3. Update best practices
4. Plan test infrastructure improvements
5. Team training needs

---

## 📚 Quick Reference

### Common Commands

```bash
# Run all tests
python test_runner.py

# Run specific test type
python test_runner.py --unit
python test_runner.py --integration
python test_runner.py --e2e

# Run with coverage
python test_runner.py --coverage

# Run single test file
pytest tests/unit/test_file.py -v

# Run single test function
pytest tests/unit/test_file.py::test_function -v

# Debug test (show print statements)
pytest tests/unit/test_file.py::test_function -v -s

# Re-run failed tests
pytest --lf

# Run tests in parallel
pytest -n auto
```

### Common Mocks

```python
# From conftest.py:
mock_message          # Telegram message
mock_callback_query   # Callback query
mock_erp_client       # ERP API client
mock_bot              # Telegram bot
redis_client          # Redis (fakeredis)
test_customer_data    # Sample customer
test_order_data       # Sample order
```

### Environment Setup

```bash
# 1. Create test environment
cp .env.test.example .env.test

# 2. Start test infrastructure
docker-compose -f docker-compose.test.yml up -d

# 3. Verify setup
python test_runner.py --check-env

# 4. Run tests
python test_runner.py
```

---

## ✅ Compliance Checklist

### Before Commit

- [ ] Unit tests pass
- [ ] No linting errors
- [ ] Code formatted with Black
- [ ] Imports sorted with isort

### Before Push

- [ ] All tests pass (unit + integration + security)
- [ ] Coverage targets met
- [ ] No flaky tests introduced
- [ ] Documentation updated

### Before Merge

- [ ] CI/CD pipeline green
- [ ] Code review approved
- [ ] Test reports reviewed
- [ ] Performance verified (if applicable)

---

**ENFORCED BY:** Development Team  
**EFFECTIVE DATE:** February 20, 2026  
**LAST UPDATED:** February 20, 2026  
**NEXT REVIEW:** March 20, 2026  
**VERSION:** 1.0.0
