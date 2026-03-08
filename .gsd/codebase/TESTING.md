# TESTING.md - Testing Patterns and Configuration

## Overview

This document describes the testing approach for ErpGreeHouse, including test types, configuration, and how to run tests. The project uses a combination of unit tests, integration tests, and E2E tests to ensure reliability.

## Test Types

### 1. Unit Tests

**Purpose**: Test individual functions, methods, and classes in isolation.

**Location**: `middleware/tests/unit/`

**Framework**: pytest with pytest-asyncio

**Patterns**:
- Test one function per test case
- Use mocks for external dependencies
- Focus on core business logic

**Example**:
```python
import pytest
from app.auth import create_access_token

def test_create_access_token():
    admin = {
        "user_id": 1,
        "username": "admin",
        "role": "owner"
    }
    token = create_access_token(admin)
    assert isinstance(token, str)
    assert len(token) > 0
```

### 2. Integration Tests

**Purpose**: Test interactions between multiple components.

**Location**: `middleware/tests/integration/`

**Framework**: pytest with pytest-asyncio and TestClient

**Patterns**:
- Test API endpoints with real HTTP requests
- Use test database with seed data
- Test integration with external APIs using mocks

**Example**:
```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_login(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
```

### 3. E2E Tests

**Purpose**: Test the complete application flow from user perspective.

**Location**: `admin-ui/e2e/`

**Framework**: Playwright

**Patterns**:
- Test user journeys (login, create customer, place order)
- Use real browser interactions
- Test against a running application

**Example**:
```typescript
import { test, expect } from "@playwright/test";

test("should login and view dashboard", async ({ page }) => {
    await page.goto("/");
    
    // Login
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "admin");
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard"]');
    
    // Check if dashboard is displayed
    expect(await page.isVisible('[data-testid="dashboard"]')).toBeTruthy();
});
```

### 4. Smoke Tests

**Purpose**: Quick verification that the application is running correctly.

**Location**: `admin-ui/e2e/smoke/`

**Framework**: Playwright

**Patterns**:
- Test critical paths only
- Run quickly (<5 minutes)
- Focus on core functionality

### 5. Accessibility Tests

**Purpose**: Ensure the application is accessible to all users.

**Location**: `admin-ui/e2e/accessibility/`

**Framework**: Playwright with axe-core

**Patterns**:
- Run axe accessibility checks
- Test for common accessibility issues
- Generate accessibility reports

**Example**:
```typescript
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("should have no accessibility issues", async ({ page }) => {
    await page.goto("/");
    const axeBuilder = new AxeBuilder({ page });
    const accessibilityScanResults = await axeBuilder.analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Test Configuration

### 1. Pytest Configuration (Backend)

**File**: `middleware/pytest.ini`

**Key Configuration**:
```ini
[pytest]
testpaths = tests
norecursedirs = .venv venv Lib Scripts reports .pytest_cache node_modules vendor
asyncio_mode = auto

addopts =
    --strict-markers
    --tb=short
    -ra

markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    fast: marks tests as fast (run by default in pre-push)
    integration: marks tests as integration tests (not run in pre-push)
    unit: marks tests as unit tests (run in pre-push)
    asyncio: marks tests as async tests

[coverage:run]
source = app
omit =
    */tests/*
    */test_*.py
    */.venv/*
    */venv/*
    */vendor/*
    */node_modules/*
    */__pycache__/*
    */mypy_cache/*
    */.pytest_cache/*

[coverage:report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise NotImplementedError
    if __name__ == .__main__.:
    if TYPE_CHECKING:
    @abstractmethod
precision = 2
show_missing = True
skip_covered = False

[coverage:html]
directory = htmlcov
```

### 2. Playwright Configuration (Frontend)

**File**: `admin-ui/playwright.config.ts`

**Key Configuration**:
```typescript
import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'url';

const uiMode = process.env.E2E_UI_MODE || 'auto';
const isManual = uiMode === 'manual';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: 1,
  globalSetup: fileURLToPath(new URL('./e2e/global-setup.ts', import.meta.url)),
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    channel: process.env.E2E_BROWSER_CHANNEL || undefined,
    headless: !isManual,
    launchOptions: isManual ? { slowMo: Number(process.env.E2E_SLOWMO_MS || 250) } : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 90_000,
    navigationTimeout: 90_000,
  },

  maxFailures: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  workers: 1,

  projects: [
    { name: 'smoke', testDir: './e2e/smoke', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'critical', testDir: './e2e/critical', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'functional', testDir: './e2e/functional', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'roles', testDir: './e2e/roles', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'auth', testDir: './e2e/auth', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'accessibility', testDir: './e2e/accessibility', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'fullhd', testDir: './e2e/smoke', use: { viewport: { width: 1920, height: 1080 } } },
  ],
});
```

### 3. Vitest Configuration (Frontend Unit Tests)

**File**: `admin-ui/vite.config.test.ts`

**Key Configuration**:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'e2e', 'tests/setup.ts'],
    },
  },
});
```

## Test Setup

### 1. Backend Test Setup

**Prerequisites**:
- Python 3.11+
- pip

**Setup**:
```bash
cd middleware
pip install -r requirements.txt
pip install pytest pytest-asyncio pytest-cov pytest-html pytest-mock fakeredis
```

**Run Tests**:
```bash
# Run all tests
pytest

# Run unit tests only
pytest tests/unit/ -v

# Run integration tests only
pytest tests/integration/ -v

# Run with coverage
pytest tests/unit/ -v --cov=app --cov-report=html

# Run specific test file
pytest tests/unit/test_auth.py -v

# Run specific test function
pytest tests/unit/test_auth.py::test_create_access_token -v
```

### 2. Frontend Test Setup

**Prerequisites**:
- Node.js 18+
- npm

**Setup**:
```bash
cd admin-ui
npm install
npx playwright install
```

**Run Tests**:
```bash
# Run all E2E tests
npm run test:e2e

# Run smoke tests
npm run test:e2e:smoke

# Run critical path tests
npm run test:e2e:critical

# Run unit tests
npm run test:unit

# Run unit tests with coverage
npm run test:unit:coverage

# Run tests in UI mode
npm run test:unit:ui

# Run E2E tests in manual mode
npm run test:e2e:manual
```

### 3. Docker Test Setup

**Prerequisites**:
- Docker 20.10+
- Docker Compose 2.0+

**Run E2E Tests in Docker**:
```bash
# From project root
./run-e2e-docker.sh
```

**Docker Compose File**: `docker-compose.e2e.yml`

## Authentication in Tests

### 1. Backend Authentication

**Test Login**:
```python
def test_login(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
```

**Using Tokens in Tests**:
```python
def test_get_customers(client):
    # Login first
    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin"}
    )
    access_token = login_response.json()["access_token"]
    
    # Use token to access protected endpoint
    response = client.get(
        "/api/v1/customers",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
```

### 2. Frontend Authentication

**E2E Test Login**:
```typescript
import { test, expect } from "@playwright/test";

test("should login and view dashboard", async ({ page }) => {
    await page.goto("/");
    
    // Login
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "admin");
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard"]');
    
    // Check if dashboard is displayed
    expect(await page.isVisible('[data-testid="dashboard"]')).toBeTruthy();
});
```

**API Login in E2E Tests**:
```typescript
import { test, expect } from "@playwright/test";

test("should get customers via API", async ({ page, request }) => {
    // Login via API
    const loginResponse = await request.post("/api/v1/auth/login", {
        data: { username: "admin", password: "admin" },
    });
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    expect(loginData.access_token).toBeDefined();
    
    // Get customers with token
    const customersResponse = await request.get("/api/v1/customers", {
        headers: { Authorization: `Bearer ${loginData.access_token}` },
    });
    expect(customersResponse.ok()).toBeTruthy();
    const customersData = await customersResponse.json();
    expect(customersData).toBeInstanceOf(Array);
});
```

## Test Database

### 1. SQLite (Development)

**File**: `middleware/crm.db`

**Seed Data**: `middleware/seed_data.py`

**Run Seed Data**:
```bash
cd middleware
python seed_data.py
```

### 2. PostgreSQL (Production)

**Configuration**:
```bash
DATABASE_URL=postgresql://user:pass@localhost/telegram_crm
```

**Migrations**: Use SQLAlchemy ORM for migrations.

## Mocking External Services

### 1. Mocking ERPNext API

**Pattern**:
```python
from unittest.mock import patch
from app.integrations.erpnext import get_erpnext_client

def test_get_erpnext_client_mock():
    with patch('app.integrations.erpnext.requests.get') as mock_get:
        # Mock ERPNext response
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "data": {
                "name": "ERPNext Client"
            }
        }
        
        client = get_erpnext_client()
        assert client is not None
```

### 2. Mocking Redis

**Pattern**:
```python
from unittest.mock import patch
from app.cache import redis_cache

def test_redis_cache_mock():
    with patch('app.cache.redis.StrictRedis') as mock_redis:
        mock_redis.return_value.get.return_value = b'"test value"'
        
        value = redis_cache.get("test_key")
        assert value == "test value"
```

## Test Reports

### 1. Pytest HTML Report

**Generate Report**:
```bash
pytest tests/unit/ -v --html=report.html
```

### 2. Playwright HTML Report

**Generate Report**:
```bash
npm run test:e2e -- --reporter=html
```

**View Report**:
```bash
open admin-ui/playwright-report/index.html
```

### 3. Vitest Coverage Report

**Generate Report**:
```bash
npm run test:unit:coverage
```

**View Report**:
```bash
open admin-ui/coverage/index.html
```

## CI/CD

### 1. GitHub Actions

**Workflow File**: `.github/workflows/test.yml`

**Key Features**:
- Runs on push to main branch
- Runs unit, integration, and E2E tests
- Generates coverage reports
- Checks for accessibility issues

### 2. Pre-commit Hooks

**Configuration**: `.pre-commit-config.yaml`

**Hooks**:
- Black formatter
- Ruff linter
- Mypy type checker
- pytest for fast tests

## Test Best Practices

### 1. Test Naming

**Pattern**: `test_<function_name>_<scenario>`

**Examples**:
```python
test_create_access_token
test_create_access_token_with_expired
test_login_invalid_credentials
test_get_customers_empty_list
```

### 2. Test Structure

**Arrange-Act-Assert**:
```python
def test_get_customer():
    # Arrange
    customer_id = 1
    
    # Act
    customer = get_customer(customer_id)
    
    # Assert
    assert customer is not None
    assert customer.id == customer_id
```

### 3. Fixtures

**Reusable Setup**:
```python
import pytest
from app.db import get_db

@pytest.fixture
def db_session():
    """Create a test database session."""
    # Setup
    db = get_db()
    yield db
    # Teardown
    db.close()

def test_create_customer(db_session):
    customer = create_customer(db_session, {"name": "John Doe"})
    assert customer is not None
```

### 4. Mocking

**External Dependencies**:
```python
from unittest.mock import patch

def test_send_email_mock():
    with patch('app.notifications.send_email') as mock_send_email:
        mock_send_email.return_value = True
        
        result = send_email("john@example.com", "Test Subject", "Test Body")
        assert result is True
```

### 5. Assertions

**Specific Assertions**:
```python
# Good
assert customer.name == "John Doe"
assert len(customers) == 3
assert customer.is_active is True

# Bad (too vague)
assert customer
assert customers
```

## Performance Testing

### 1. Load Testing

**Tool**: Locust

**Pattern**:
```python
from locust import HttpUser, task, between

class UserBehavior(HttpUser):
    wait_time = between(1, 2.5)
    
    @task(1)
    def login(self):
        self.client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin"})
    
    @task(2)
    def get_customers(self):
        self.client.get("/api/v1/customers")
```

**Run Load Test**:
```bash
locust -f locustfile.py --host=http://localhost:8000
```

### 2. Performance Metrics

**Prometheus Metrics**: `/metrics`

**Grafana Dashboard**: Use Prometheus data to create performance dashboards.

## Troubleshooting Tests

### 1. Test Failures

**Common Issues**:
- Database connection errors
- External API failures
- Timeout errors
- Authentication issues

**Debugging**:
```bash
# Run tests with verbose output
pytest tests/unit/test_auth.py -v -s

# Run tests with pdb debugger
pytest tests/unit/test_auth.py -v -xvs --tb=short --no-header --no-summary
```

### 2. Test Performance

**Slow Tests**:
- Identify slow tests with `pytest --durations=10`
- Optimize database queries
- Use mocks for external dependencies

### 3. Test Flakiness

**Root Causes**:
- Network latency
- Database state
- External API variability

**Solutions**:
- Use consistent test data
- Retry flaky tests
- Improve test isolation