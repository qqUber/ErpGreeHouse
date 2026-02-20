# 🧪 Test Automation Plan - ERP GreenHouse

**Version:** 1.0.0  
**Date:** February 20, 2026  
**Status:** Active Implementation

---

## 📋 Executive Summary

This document defines the comprehensive test automation strategy for the ERP GreenHouse project (Telegram CRM + ERPNext Loyalty Integration). The goal is to achieve **100% stable, repeatable test execution** with proper mocking of external services.

---

## 🎯 Core Principles (Green Build Policy)

### Rule 1: Commit = Clean Build + 100% Passing Tests
- ✅ **REQUIRED**: All tests must pass before committing
- ❌ **FORBIDDEN**: Committing with failing tests
- 🔧 **PROCESS**: Fix failing tests BEFORE commit

### Rule 2: New Task = 100% Tests Passing
- ✅ **REQUIRED**: Verify existing tests pass before starting new feature
- ✅ **REQUIRED**: Cover new code with tests
- ✅ **REQUIRED**: Run full test suite after implementation
- ❌ **FORBIDDEN**: Skipping tests with `@pytest.mark.skip` without approval

### Rule 3: Push = Full Test Suite Execution
- ✅ **REQUIRED**: Run ALL tests (Unit + Integration + E2E) before `git push`
- ❌ **FORBIDDEN**: Hiding errors or ignoring failing tests
- ❌ **FORBIDDEN**: Disabling tests in CI/CD

### Rule 4: External Dependencies = Proper Mocking
- ✅ **REQUIRED**: Mock Telegram API in Unit/Integration tests
- ✅ **REQUIRED**: Mock ERPNext API in Unit/Integration tests
- ✅ **REQUIRED**: Mock POS/Kassa systems in Unit/Integration tests
- ✅ **REQUIRED**: Real calls only in E2E on staging environment
- 🔧 **PROCESS**: If missing mocks → Add mocks, NOT remove tests

---

## 🏗️ Test Architecture

### Testing Pyramid

```
                    ┌─────────────────┐
                    │   E2E (5-10%)   │  ← Critical user journeys
                    ├─────────────────┤
                ┌───┴─────────────────┴───┐
                │  Integration (15-20%)   │  ← API, DB, Redis
                ├─────────────────────────┤
            ┌───┴─────────────────────────┴───┐
            │      Unit Tests (70-80%)        │  ← Business logic
            └─────────────────────────────────┘
```

### Test Categories

| Category | Purpose | Tools | Target Coverage |
|----------|---------|-------|-----------------|
| **Unit** | Business logic, validation | pytest, pytest-asyncio, unittest.mock | 80%+ |
| **Integration** | Service interaction | pytest, fakeredis, test DB | 90%+ |
| **E2E** | User journeys | Playwright, aiogram simulator | 100% critical paths |
| **Security** | OWASP compliance | bandit, safety | 100% scans |
| **Performance** | Load testing | locust, pytest-benchmark | p95 < 200ms |

---

## 🛠️ Test Environment Setup

### Infrastructure Requirements

```yaml
Services:
  - Redis: 7+ (caching, sessions)
  - Database: SQLite (dev), PostgreSQL 15+ (prod)
  - Mock ERP: Custom mock server
  - Telegram Mock: aiogram mock
```

### Environment Variables (.env.test)

```bash
# Test Mode
TEST_MODE=true
ERP_MOCK_MODE=true
DEBUG_MODE=false

# Telegram (Mock)
TELEGRAM_BOT_TOKEN=test_token_123456789:AABBccDDeeFFggHHiiJJkkLLmmNNooP

# ERPNext (Mock)
ERP_API_BASE_URL=http://localhost:8000/mock/erp
ERP_API_KEY=test_api_key_12345
ERP_API_SECRET=test_api_secret_67890

# Database
DATABASE_URL=sqlite:///test_telegram_crm.db

# Redis
REDIS_URL=redis://localhost:6379/1

# Security (Test Keys)
JWT_SECRET_KEY=test_jwt_secret_key_for_testing_only_12345
WEBHOOK_SECRET=test_webhook_secret_67890
```

### Docker Compose for Testing

```bash
# Start test infrastructure
docker-compose -f docker-compose.test.yml up -d

# Services:
# - redis-test (port 6379)
# - postgres-test (port 5432, optional)
# - mock-erp (port 8080, optional)
```

---

## 🧪 Mocking Strategy

### External Service Mocks

#### 1. Telegram Bot Mock

```python
# conftest.py provides mock_message and mock_callback_query fixtures
@pytest.mark.asyncio
async def test_cmd_start(mock_message):
    from app.handlers import cmd_start
    
    await cmd_start(mock_message)
    
    # Verify message was sent
    mock_message.answer.assert_called_once()
```

**What to Mock:**
- `aiogram.Bot.send_message`
- `aiogram.Bot.edit_message_text`
- `aiogram.Bot.answer_callback_query`
- `aiogram.Bot.get_me`

**What NOT to Mock:**
- Handler logic
- Business logic in handlers

#### 2. ERPNext Client Mock

```python
# conftest.py provides mock_erp_client fixture
@pytest.mark.asyncio
async def test_get_balance(mock_erp_client):
    with patch('app.handlers.ERPClient', return_value=mock_erp_client):
        balance = await mock_erp_client.get_loyalty_balance('CRM-CUST-00001')
        
        assert balance['available_points'] == 500
        mock_erp_client.get_loyalty_balance.assert_called_once()
```

**What to Mock:**
- `ERPClient.get_customer_by_phone()`
- `ERPClient.get_customer_by_telegram()`
- `ERPClient.create_customer()`
- `ERPClient.get_loyalty_balance()`
- `ERPClient.add_loyalty_points()`
- `ERPClient.redeem_loyalty_points()`
- `ERPClient.create_order()`
- `ERPClient.get_products()`

**Mock Responses:**
```python
{
    'customer_id': 'CRM-CUST-00001',
    'available_points': 500,
    'accrued_points': 1000,
    'redeemed_points': 500
}
```

#### 3. Redis Mock

```python
# Use fakeredis for unit tests
@pytest.fixture
def redis_client():
    import fakeredis
    redis = fakeredis.FakeRedis(db=1, decode_responses=True)
    yield redis
    redis.close()

def test_cache_operations(redis_client):
    redis_client.set('test_key', 'test_value')
    assert redis_client.get('test_key') == 'test_value'
```

**When to Use Real Redis:**
- Integration tests (via docker-compose)
- E2E tests (full stack)

#### 4. Database Mock

```python
# Use in-memory SQLite for unit tests
@pytest.fixture
def clean_database():
    from app.db import init_db
    # Create tables
    init_db()
    yield
    # Drop tables
    cleanup_db()
```

---

## 📊 Test Execution Workflow

### Pre-Commit Checklist

```bash
# 1. Verify environment
python test_runner.py --check-env

# 2. Run unit tests (fast)
python test_runner.py --unit

# 3. Run linting
python -m black --check app/
python -m flake8 app/

# 4. Commit if all pass
git add .
git commit -m "feat: add new feature"
```

### Pre-Push Checklist

```bash
# 1. Run full test suite
python test_runner.py

# 2. Verify coverage (optional)
python test_runner.py --coverage

# 3. Check reports
open reports/*/report.html

# 4. Push if all pass
git push origin feature-branch
```

### CI/CD Pipeline

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis:7-alpine
        ports: [6379:6379]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run unit tests
        run: pytest tests/unit -v --tb=short
      
      - name: Run integration tests
        run: pytest tests/integration -v --tb=short
      
      - name: Run security scan
        run: |
          bandit -r app/
          safety check
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 🔧 Test Data Management

### Test Data Factories

```python
# conftest.py provides test_customer_data, test_order_data, etc.

def test_customer_registration(test_customer_data):
    customer = create_customer(**test_customer_data)
    
    assert customer.telegram_id == test_customer_data['telegram_id']
    assert customer.consent_given == True
```

### Sample Data

```python
# Customer data
test_customer = {
    'telegram_id': 123456789,
    'phone': '+79991234567',
    'first_name': 'Test',
    'last_name': 'Customer',
    'consent_version': '1.0',
    'consent_timestamp': '2024-01-15T10:30:00Z'
}

# Order data
test_order = {
    'customer_id': 'CRM-CUST-00001',
    'items': [
        {'item_code': 'LATTE', 'qty': 2, 'rate': 250.0},
        {'item_code': 'CAPPUCCINO', 'qty': 1, 'rate': 200.0}
    ],
    'total': 700.0,
    'bonus_used': 50.0
}
```

### Data Isolation

- ✅ Each test has isolated data
- ✅ Automatic cleanup after each test
- ✅ Use transactions for rollback
- ✅ No shared state between tests

---

## 📈 Metrics and KPIs

### Coverage Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Unit Test Coverage | >80% | TBD | ⏳ Pending |
| Integration Coverage | >90% | TBD | ⏳ Pending |
| E2E Critical Paths | 100% | TBD | ⏳ Pending |
| Security Scans | 100% | TBD | ⏳ Pending |

### Performance Targets

| Operation | Target (p95) | Current | Status |
|-----------|--------------|---------|--------|
| API Response | <200ms | TBD | ⏳ Pending |
| DB Query | <50ms | TBD | ⏳ Pending |
| Redis Op | <20ms | TBD | ⏳ Pending |
| Test Suite | <10 min | TBD | ⏳ Pending |

### Quality Metrics

- **Flaky Test Rate**: <1%
- **False Positive Rate**: <2%
- **Bug Detection Rate**: >95%
- **Test Execution Time**: <10 minutes

---

## 🚨 Troubleshooting Guide

### Common Issues

#### Issue 1: Tests Fail Due to Missing Mocks

**Symptom:**
```
E   aiogram.utils.exceptions.NetworkError: Request timeout
```

**Solution:**
```python
# Add mock for external service
with patch('app.handlers.ERPClient') as MockClient:
    mock_client = MockClient.return_value
    mock_client.get_customer_balance.return_value = {...}
    
    # Run test
    await handler_function(mock_message)
```

#### Issue 2: Redis Connection Failed

**Symptom:**
```
E   redis.exceptions.ConnectionError: Error connecting to Redis
```

**Solution:**
```python
# Use fakeredis for unit tests
@pytest.fixture
def redis_client():
    import fakeredis
    return fakeredis.FakeRedis()

# Or start Redis via docker
docker-compose -f docker-compose.test.yml up -d redis-test
```

#### Issue 3: Database Locked

**Symptom:**
```
E   sqlite3.OperationalError: database is locked
```

**Solution:**
```python
# Use separate test database
# Ensure proper cleanup in fixtures
@pytest.fixture
def clean_database():
    # Create fresh DB
    init_db()
    yield
    # Cleanup
    drop_all_tables()
```

#### Issue 4: Tests Pass Locally but Fail in CI

**Symptom:** Tests work on developer machine but fail in GitHub Actions

**Solution:**
- ✅ Ensure all mocks are properly configured
- ✅ Use environment variables for configuration
- ✅ Don't rely on local services
- ✅ Test with same Python version as CI

---

## 📚 Documentation and Reporting

### Test Reports

Reports are generated in HTML format:

```
reports/
└── 20260220_143022/
    ├── report.html           # Main report
    ├── unit_tests.html       # Unit test report
    ├── integration_tests.html # Integration test report
    ├── coverage/             # Coverage HTML
    └── SUMMARY.md            # Text summary
```

### Coverage Reports

```bash
# Generate coverage report
pytest --cov=app --cov-report=html:reports/coverage

# View in browser
open reports/coverage/index.html
```

### Test Documentation

Each test file should include:

```python
"""
Test Module: test_<feature>.py

Description: What this module tests
Coverage: What percentage of code is covered
Dependencies: Required mocks and fixtures

Test Cases:
- test_feature_happy_path: Main functionality
- test_feature_edge_cases: Boundary conditions
- test_feature_error_handling: Error scenarios
"""
```

---

## 🔄 Continuous Improvement

### Weekly Review

- Review failing tests
- Identify flaky tests
- Update test data
- Optimize slow tests

### Monthly Metrics

- Coverage trends
- Test execution time
- Bug detection rate
- False positive analysis

### Quarterly Strategy

- Evaluate new testing tools
- Update testing strategy
- Refactor test architecture
- Training and knowledge sharing

---

## ✅ Implementation Checklist

### Phase 1: Foundation (Week 1)

- [x] Create `.env.test` configuration
- [x] Create `docker-compose.test.yml`
- [x] Create `conftest.py` with fixtures
- [x] Create `test_runner.py`
- [ ] Update all unit tests to use new fixtures
- [ ] Update all integration tests
- [ ] Document mocking patterns

### Phase 2: Stabilization (Week 2)

- [ ] Fix all failing unit tests
- [ ] Fix all failing integration tests
- [ ] Achieve 80%+ unit test coverage
- [ ] Achieve 90%+ integration test coverage
- [ ] Setup CI/CD pipeline
- [ ] Configure automated reporting

### Phase 3: E2E Enhancement (Week 3)

- [ ] Update E2E tests for critical paths
- [ ] Add Telegram bot E2E tests
- [ ] Add performance benchmarks
- [ ] Setup staging environment
- [ ] Run E2E tests on staging

### Phase 4: Production Readiness (Week 4)

- [ ] Final coverage review
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation complete
- [ ] Team training completed

---

## 🎯 Success Criteria

### Technical Criteria

- ✅ All tests pass consistently (100% success rate)
- ✅ Test suite executes in <10 minutes
- ✅ Coverage targets met (80%+ unit, 90%+ integration)
- ✅ No flaky tests (<1% flakiness)
- ✅ CI/CD pipeline green

### Process Criteria

- ✅ Developers follow Green Build Policy
- ✅ All commits have passing tests
- ✅ All PRs have test results
- ✅ Regular test review meetings
- ✅ Continuous improvement culture

---

**Document Owner:** Development Team  
**Last Updated:** February 20, 2026  
**Next Review:** February 27, 2026  
**Version:** 1.0.0
