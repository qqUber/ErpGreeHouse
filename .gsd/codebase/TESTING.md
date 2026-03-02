# Testing Conventions

This document outlines the testing conventions and structure for the ErpGreeHouse project.

## Test Framework Overview

### Python Tests (Middleware)

- **Framework**: pytest
- **Configuration File**: `middleware/pytest.ini`
- **Coverage Tool**: coverage.py
- **Coverage Configuration**: Defined in `pytest.ini`

### JavaScript/React Tests (Admin UI)

- **E2E Testing**: Playwright (version 1.58.2)
- **Configuration File**: `admin-ui/playwright.config.ts`
- **Reporting**: Allure (version 3.4.5)

## Python Test Structure

### Directory Layout

```
middleware/
├── tests/
│   ├── conftest.py          # Shared fixtures for all tests
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── init_db.py           # Database initialization for tests
├── pytest.ini              # pytest configuration
├── test-reports/           # Test report outputs
└── test_*.db               # Test database files
```

### Test Categorization

#### Test Markers

Tests are categorized using pytest markers (configured in `pytest.ini`):

- **`@pytest.mark.unit`**: Unit tests (run by default in pre-push checks)
- **`@pytest.mark.integration`**: Integration tests (not run in pre-push)
- **`@pytest.mark.slow`**: Slow tests (deselected with `-m "not slow"`)
- **`@pytest.mark.fast`**: Fast tests (run by default)
- **`@pytest.mark.asyncio`**: Async tests

#### Unit Tests

Location: `middleware/tests/unit/`

Key unit test files:
- `test_jwt_comprehensive.py`: JWT token handling
- `test_jwt_security.py`: JWT security checks
- `test_rbac.py`: Role-based access control
- `test_consent_flow.py`: User consent management
- `test_loyalty_core.py`: Loyalty program logic
- `test_telegram_registration_flow.py`: Telegram user registration
- `test_vk_handler.py`: VKontakte integration handler

#### Integration Tests

Location: `middleware/tests/integration/`

Key integration test files:
- `test_jwt_integration.py`: JWT integration with API endpoints
- `test_jwt_roles_e2e.py`: End-to-end role-based authentication
- `test_admin_api.py`: Admin API integration tests
- `test_admin_auth.py`: Admin authentication flow
- `test_erp_client_integration.py`: ERP system integration
- `test_role_access.py`: Role-based access control integration
- `test_telegram_integration.py`: Telegram bot integration

### Test Fixtures

**Main Fixture File**: `middleware/tests/conftest.py`

Key fixtures:
- Database connection setup
- Test client initialization
- JWT token generation
- Mock objects for external services

### Test Data

- **Test Databases**: Separate SQLite databases for testing (`test_*.db`)
- **Database Seeding**: `seed_data.py` for initializing test data
- **Database Reset**: `init_db.py` for resetting test database

### Test Execution

#### Running Tests

```bash
# Run all tests
pytest

# Run only unit tests
pytest -m unit

# Run only fast tests
pytest -m fast

# Run specific test file
pytest tests/unit/test_jwt_comprehensive.py

# Run tests with coverage report
pytest --cov=app --cov-report=html

# Run tests in parallel
pytest -n auto
```

#### Test Reports

- **HTML Coverage Report**: Generated to `htmlcov/` directory
- **Test Output**: Detailed reports in `test-reports/` directory

## Admin UI Testing (E2E)

### Test Framework

- **Tool**: Playwright
- **Configuration**: `admin-ui/playwright.config.ts`
- **Timeout**: 90 seconds per test (increased for CI stability)
- **Retries**: 1 retry for failed tests

### Test Structure

```
admin-ui/
├── e2e/
│   ├── global-setup.ts       # Global test setup (runs once before all tests)
│   ├── _shared.ts            # Shared utilities and helpers
│   ├── smoke/                # Smoke tests
│   ├── critical/             # Critical path tests
│   ├── functional/           # Functional tests
│   ├── roles/                # Role-based tests
│   └── auth/                 # Authentication tests
├── playwright-report/        # Playwright HTML report
├── test-results/             # Test result artifacts
└── allure-results/           # Allure report data
```

### Test Projects

Playwright tests are organized into projects (configured in `playwright.config.ts`):

1. **smoke**: Quick tests to verify basic functionality
2. **critical**: Critical user flows
3. **functional**: Full functionality testing
4. **roles**: Role-based access control
5. **auth**: Authentication and authorization

### Test Execution

#### Running Tests

```bash
# Run all tests
npm run test:e2e

# Run smoke tests
npm run test:e2e:smoke

# Run critical tests
npm run test:e2e:critical

# Run tests in manual mode (UI visible)
npm run test:e2e:manual

# Generate Allure report
npm run report:allure
```

#### Test Configuration

**Environment Variables**:
- `E2E_BASE_URL`: Test server URL (default: http://localhost:5173)
- `E2E_BROWSER_CHANNEL`: Browser channel (e.g., "chrome", "firefox")
- `E2E_UI_MODE`: UI mode ("auto" or "manual")
- `E2E_PAUSE`: Pause duration between actions (in seconds)
- `E2E_SLOWMO_MS`: Slow motion delay (in milliseconds)

### Test Credentials

- **File**: `admin-ui/e2e/.test-credentials.json` (gitignored)
- **Format**:
  ```json
  {
    "admin": {
      "username": "admin",
      "password": "password"
    },
    "manager": {
      "username": "manager",
      "password": "password"
    }
  }
  ```

## API Testing Patterns

### Test Client Setup

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_endpoint():
    response = client.get("/api/v1/resource")
    assert response.status_code == 200
```

### Authentication in Tests

```python
def test_protected_endpoint():
    token = get_test_token()
    response = client.get(
        "/api/v1/protected",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
```

### Database Testing

```python
import pytest
from app.db import get_db, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
    Base.metadata.drop_all(engine)
```

## Test Naming Conventions

### Python Tests

- Test files: `test_*.py`
- Test functions: `test_<feature_being_tested>`
- Test classes: `Test<Feature>`

Example:
```python
def test_jwt_token_generation():
    # Test code

def test_invalid_credentials_are_rejected():
    # Test code
```

### Playwright Tests

- Test files: `*.spec.ts`
- Test functions: `test('should <expected_behavior>', async ({ page }) => {})`

Example:
```typescript
test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'password');
    await page.click('#login-button');
    await expect(page).toHaveURL('/dashboard');
});
```

## Test Best Practices

### Python Tests

1. **Use fixtures for shared setup**: Define reusable fixtures in `conftest.py`
2. **Test isolation**: Each test should run independently
3. **Clear assertions**: Make assertions specific and readable
4. **Mock external dependencies**: Use `unittest.mock` or `pytest-mock`
5. **Parametrize tests**: Test multiple inputs with `@pytest.mark.parametrize`
6. **Test error conditions**: Check that errors are properly handled
7. **Keep tests focused**: Each test should test one thing

### Playwright Tests

1. **Use page objects**: Create reusable selectors and actions
2. **Wait for elements**: Use `await page.waitForSelector()` instead of fixed waits
3. **Handle navigation**: Wait for URL changes or network requests
4. **Take screenshots**: Use `page.screenshot()` for debugging
5. **Test responsive design**: Test on different viewport sizes
6. **Clean up**: Use `test.afterAll()` for test cleanup

## CI/CD Testing

### Pre-Commit Checks

- **Python**: Runs black, isort, flake8, bandit, and mypy
- **Admin UI**: Runs Biome lint and format checks

### GitHub Actions

- **Test Matrix**: Tests run on multiple Python versions and OS
- **Coverage Enforcement**: Fails if coverage drops below threshold
- **Dependency Checks**: Runs safety checks for vulnerabilities

## Test Maintenance

### Adding New Tests

1. Identify test category (unit or integration)
2. Create test file following naming convention
3. Write test function with clear name and purpose
4. Use existing fixtures or create new ones
5. Run test to ensure it passes
6. Commit test file

### Updating Tests

1. Update tests when features change
2. Fix broken tests immediately
3. Refactor tests to improve readability
4. Remove outdated tests

### Test Coverage

- Aim for high coverage but prioritize meaningful tests
- Cover critical paths and error conditions
- Don't chase 100% coverage at the expense of quality