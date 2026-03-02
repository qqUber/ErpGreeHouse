# Phase 00: Test Improvement - Research

**Researched:** 2026-02-28
**Domain:** Python test automation, database testing, API integration testing
**Confidence:** MEDIUM

## Summary

This research document covers the key aspects of implementing a test improvement phase for the ErpGreeHouse project. The phase focuses on fixing critical test failures (consent flow, database locking, Telegram integration) and improving test coverage for low coverage modules (handlers.py, commands.py, vk_handler.py).

The research identifies standard Python testing tools, best practices for test isolation and coverage improvement, and solutions to common pitfalls like database file locking on Windows. Key recommendations include using `pytest` for testing, `unittest.mock` or `pytest-mock` for mocking external API calls, and implementing proper database cleanup mechanisms.

**Primary recommendation:** Use `pytest` with `pytest-mock` for mocking, implement transactional tests with proper database cleanup, and focus on test coverage improvement using `pytest-cov`.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose        | Why Standard         |
| ------- | ------- | -------------- | -------------------- |
| pytest | 7.0+ | Test framework | Most popular Python testing framework, with rich plugin ecosystem |
| pytest-cov | 3.0+ | Coverage reporting | Integrates seamlessly with pytest, provides detailed coverage reports |
| pytest-mock | 3.10+ | Mocking library | Simplifies mocking with unittest.mock, integrates well with pytest |

### Supporting

| Library | Version | Purpose        | When to Use |
| ------- | ------- | -------------- | ----------- |
| unittest.mock | Built-in | Mocking framework | Standard library solution for mocking, no additional dependencies |
| psycopg2-binary | 2.9+ | PostgreSQL adapter | If using PostgreSQL instead of SQLite |
| SQLAlchemy | 1.4+ | ORM | For complex database interactions testing |

### Alternatives Considered

| Instead of | Could Use     | Tradeoff                       |
| ---------- | ------------- | ------------------------------ |
| pytest | unittest | pytest has better syntax and plugin ecosystem |
| pytest-mock | mock | pytest-mock simplifies mocking setup in pytest |

**Installation:**
```bash
pip install pytest pytest-cov pytest-mock
```

## Architecture Patterns

### Recommended Project Structure

```
tests/
├── unit/          # Unit tests - isolated, fast
├── integration/   # Integration tests - test interactions between components
├── e2e/           # End-to-end tests - test complete system
└── conftest.py    # Shared fixtures for all tests
```

### Pattern 1: Transactional Tests

**What:** Tests that run within a database transaction that is rolled back after each test, ensuring isolation.
**When to use:** Database integration tests that modify data.

**Example:**
```python
# Source: https://docs.pytest.org/en/7.0.x/fixture.html#scope-sharing-fixtures-across-classes-modules-packages-or-session
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Create tables
    Base.metadata.create_all(engine)
    
    yield session
    
    # Roll back transaction
    session.rollback()
    session.close()
```

### Pattern 2: Mocking External APIs

**What:** Replacing real API calls with mock responses to ensure tests are fast and reliable.
**When to use:** Tests that interact with external services (like Telegram API).

**Example:**
```python
# Source: https://docs.python.org/3/library/unittest.mock.html
from unittest.mock import patch
import pytest

def test_telegram_api_call():
    with patch("app.telegram_api.send_message") as mock_send:
        mock_send.return_value = {"ok": True, "result": {"message_id": 123}}
        
        # Call the function that uses send_message
        result = send_telegram_message("test chat", "test message")
        
        assert result == {"ok": True, "result": {"message_id": 123}}
        mock_send.assert_called_once_with("test chat", "test message")
```

### Anti-Patterns to Avoid

- **Testing Implementation Details:** Tests should focus on behavior, not implementation. Avoid testing private methods directly.
- **Shared State Between Tests:** Ensure tests are isolated to prevent interference. Use fixtures to set up and tear down state.
- **Real API Calls in Tests:** Always mock external API calls to ensure tests are fast and reliable.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem   | Don't Build        | Use Instead | Why                      |
| --------- | ------------------ | ----------- | ------------------------ |
| Database cleanup | Custom file deletion logic | pytest-django or transactional tests | Handles edge cases like file locking |
| Mocking HTTP requests | Custom mock implementations | unittest.mock or pytest-mock | Built-in, well-maintained solutions |
| Coverage reporting | Custom coverage tracker | pytest-cov | Integrates seamlessly with pytest |

**Key insight:** Python has a rich ecosystem of testing tools. Always use established libraries instead of building custom solutions.

## Common Pitfalls

### Pitfall 1: Database File Locking on Windows

**What goes wrong:** Tests fail with `PermissionError: [WinError 32] The process cannot access the file` when running on Windows.
**Why it happens:** SQLite database connections may not be properly closed, leaving the database file locked.
**How to avoid:** Implement proper connection management and use transactional tests with in-memory databases.
**Warning signs:** Tests pass individually but fail when running the entire suite.

### Pitfall 2: Flaky Tests Due to External API Calls

**What goes wrong:** Tests fail randomly because of external API failures or rate limits.
**Why it happens:** Tests are making real API calls, which are subject to network latency and external service availability.
**How to avoid:** Mock all external API calls in tests.
**Warning signs:** Tests fail randomly without any changes to the codebase.

### Pitfall 3: Low Test Coverage

**What goes wrong:** Tests don't cover enough of the codebase, leading to untested bugs.
**Why it happens:** Tests are not written for all functions or edge cases.
**How to avoid:** Use coverage reporting tools to identify gaps and prioritize writing tests for low coverage areas.
**Warning signs:** Coverage reports show less than 80% coverage for critical modules.

## Code Examples

### Fixing _store_consent() Function Signature

```python
# middleware/app/handlers.py
def _store_consent(customer_id: int, consent_text: str, consent_version: str, consent_type: str = "data_processing") -> None:
    """Store consent record for 152-ФЗ compliance. Wrapper around shared module function."""
    _shared_store(customer_id, "tg", consent_text, consent_version, consent_type)
```

### Database Cleanup Fixture

```python
# middleware/tests/conftest.py
import os
import time
import pytest

@pytest.fixture(scope="function")
def clean_database():
    db_files = [
        "test_telegram_crm.db", 
        "test_debug.db", 
        "test_crm.db"
    ]
    
    for db_file in db_files:
        if os.path.exists(db_file):
            # Try to remove file, with retry logic for Windows file locking
            for _ in range(3):
                try:
                    os.remove(db_file)
                    break
                except PermissionError:
                    time.sleep(0.1)
                    
    yield
    
    # Cleanup after test
    for db_file in db_files:
        if os.path.exists(db_file):
            for _ in range(3):
                try:
                    os.remove(db_file)
                    break
                except PermissionError:
                    time.sleep(0.1)
```

### Mocking Telegram API Calls

```python
# middleware/tests/integration/test_telegram_integration.py
import pytest
from unittest.mock import patch
from app.integrations.bots.telegram_handler import TelegramHandler

def test_telegram_message_sending(mocker):
    # Mock the Telegram API call
    mock_send_message = mocker.patch("app.integrations.bots.telegram_handler.send_message")
    mock_send_message.return_value = {"ok": True, "result": {"message_id": 123}}
    
    # Create handler instance
    handler = TelegramHandler()
    
    # Test sending a message
    result = handler.send_message(chat_id="12345", text="Test message")
    
    assert result["ok"] is True
    assert result["result"]["message_id"] == 123
    mock_send_message.assert_called_once_with("12345", "Test message")
```

## State of the Art

| Old Approach | Current Approach | When Changed   | Impact          |
| ------------ | ---------------- | -------------- | --------------- |
| Manual database cleanup | Transactional tests with rollback | pytest 3.0+ | Faster, more reliable tests |
| Real API calls in tests | Mocked API responses | unittest.mock added in Python 3.3 | Tests are faster and more reliable |
| Coverage tracking with coverage.py | pytest-cov integration | pytest-cov 2.0+ | Simplified coverage reporting |

**Deprecated/outdated:**

- `nose` testing framework: Replaced by pytest
- `mock` library: Built into unittest.mock in Python 3.3+
- Manual coverage tracking: Replaced by pytest-cov

## Open Questions

Things that couldn't be fully resolved:

1. **Database connection management in complex tests:**
   - What we know: SQLite connections need to be properly closed to avoid file locking
   - What's unclear: Best approach for managing connections in tests with multiple database operations
   - Recommendation: Use transactional tests with in-memory databases

## Sources

### Primary (HIGH confidence)

- [pytest documentation](https://docs.pytest.org/) - Official pytest documentation
- [unittest.mock documentation](https://docs.python.org/3/library/unittest.mock.html) - Official Python mocking library documentation
- [pytest-cov documentation](https://pytest-cov.readthedocs.io/) - Coverage reporting for pytest

### Secondary (MEDIUM confidence)

- [Python Testing with pytest](https://pragprog.com/titles/bopytest/python-testing-with-pytest/) - Book by Brian Okken
- [Testing Python Applications with pytest](https://realpython.com/pytest-python-testing/) - Real Python tutorial

### Tertiary (LOW confidence)

- Stack Overflow answers about database file locking on Windows
- Community discussions about test isolation in Python

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Based on official documentation and industry standard tools
- Architecture: MEDIUM - Based on common testing patterns and practices
- Pitfalls: HIGH - Based on real-world experiences and well-documented issues

**Research date:** 2026-02-28
**Valid until:** 2026-03-28
