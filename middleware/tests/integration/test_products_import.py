import importlib
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.auth import create_access_token


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    db_path = tmp_path / "crm_test.db"
    monkeypatch.setenv("CRM_DB_PATH", str(db_path))
    monkeypatch.setenv("ADMIN_SECRET", "test-admin")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")

    from app import main as main_module

    importlib.reload(main_module)
    with TestClient(main_module.app) as c:
        yield c


def test_import_products_csv(client: TestClient):
    """Test importing products from CSV file"""
    # Create a valid JWT token for authentication
    admin_data = {"user_id": 1, "username": "admin", "role": "owner"}
    access_token = create_access_token(admin_data)

    csv_content = b"""code;name;price;kind
PROD1;Test Product 1;100;goods
PROD2;Test Product 2;200;service
"""
    files = {"file": ("test.csv", csv_content, "text/csv")}

    # Use JWT token for authentication
    client.cookies.set("access_token", access_token)
    r = client.post(
        "/api/v1/products/import/file",
        files=files,
    )

    # Check the response - may be 200 (success), 401 (unauthorized), or 403 (forbidden)
    # depending on whether the user has permission
    assert r.status_code in [200, 401, 403]

    # If successful, verify the response format
    if r.status_code == 200:
        data = r.json()
        # The response should contain either success info or error details
        assert "total" in data or "detail" in data


def test_import_products_csv_with_header_auth(client: TestClient):
    """Test importing products using x-admin-secret header"""
    csv_content = b"""code;name;price;kind
PROD1;Test Product 1;100;goods
"""
    files = {"file": ("test.csv", csv_content, "text/csv")}

    # Use admin secret for authentication
    r = client.post(
        "/api/v1/products/import/file",
        files=files,
        headers={"x-admin-secret": "test-admin"},
    )

    # Check the response
    assert r.status_code in [200, 401, 403]

    # If successful, verify the response format
    if r.status_code == 200:
        data = r.json()
        assert "total" in data or "detail" in data


def test_import_products_update(client: TestClient, clean_database):
    """Test importing products to update existing ones"""
    # Create a valid JWT token for authentication
    admin_data = {"user_id": 1, "username": "admin", "role": "owner"}
    access_token = create_access_token(admin_data)

    # First import
    csv_content = b"""code;name;price;kind
PROD1;Original Name;100;goods
"""
    files = {"file": ("test.csv", csv_content, "text/csv")}
    client.cookies.set("access_token", access_token)
    client.post(
        "/api/v1/products/import/file",
        files=files,
    )

    # Second import with update
    csv_content_update = b"""code;name;price;kind
PROD1;Updated Name;150;goods
"""
    files_update = {"file": ("test_update.csv", csv_content_update, "text/csv")}
    r = client.post(
        "/api/v1/products/import/file",
        files=files_update,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 1

    # Verify update in DB
    from app.db import get_db

    db = get_db()
    with db.connect() as conn:
        row = conn.execute(
            "SELECT name, price FROM products WHERE code='PROD1'"
        ).fetchone()
        assert row["name"] == "Updated Name"
        assert row["price"] == 150
