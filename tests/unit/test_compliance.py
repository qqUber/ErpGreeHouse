import pytest
import sys
import os
import importlib
from pathlib import Path

# Add middleware directory to path
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "middleware"))
)

from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    db_path = tmp_path / "crm_test.db"
    monkeypatch.setenv("CRM_DB_PATH", str(db_path))
    monkeypatch.setenv("ADMIN_SECRET", "")
    monkeypatch.setenv("ADMIN_BOOTSTRAP_DEFAULT", "true")
    monkeypatch.setenv("ADMIN_DEFAULT_USERNAME", "admin")
    monkeypatch.setenv("ADMIN_DEFAULT_PASSWORD", "ChangeMe123!")
    monkeypatch.setenv("ADMIN_BOOTSTRAP_DEMO_USERS", "false")
    monkeypatch.setenv("ADMIN_RECOVERY_SECRET", "RecoverMe123!")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")

    from app import main as main_module

    importlib.reload(main_module)
    with TestClient(main_module.app) as c:
        yield c


@pytest.fixture
def authenticated_client(client: TestClient) -> TestClient:
    """Fixture to get an authenticated client"""
    # Login first
    login_response = client.post(
        "/api/v1/public/auth/login",
        json={"username": "admin", "password": "ChangeMe123!"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["token"]

    # Add token to all subsequent requests
    client.headers["x-admin-secret"] = token
    return client


def test_get_consents(authenticated_client):
    """Test getting consent records"""
    response = authenticated_client.get("/api/v1/compliance/consents")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert isinstance(data["items"], list)


def test_get_customer_consents(authenticated_client):
    """Test getting consent history for a customer"""
    # First, create a test customer
    customer_data = {
        "full_name": "Test Customer",
        "phone": "+79991234567",
        "marketing_allowed": 1,
        "data_processing_allowed": 1,
    }
    customer_response = authenticated_client.post(
        "/api/v1/customers", json=customer_data
    )
    assert customer_response.status_code == 200
    customer_id = customer_response.json()["id"]

    # Get customer consents
    response = authenticated_client.get(f"/api/v1/compliance/consents/{customer_id}")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert isinstance(data["items"], list)


def test_delete_customer(authenticated_client):
    """Test deleting a customer"""
    # First, create a test customer
    customer_data = {
        "full_name": "Test Customer to Delete",
        "phone": "+79991234568",
        "marketing_allowed": 1,
        "data_processing_allowed": 1,
    }
    customer_response = authenticated_client.post(
        "/api/v1/customers", json=customer_data
    )
    assert customer_response.status_code == 200
    customer_id = customer_response.json()["id"]

    # Delete customer
    response = authenticated_client.delete(
        f"/api/v1/compliance/customers/{customer_id}"
    )
    assert response.status_code == 200
    assert response.json()["status"] == "deleted"

    # Verify customer was deleted
    get_response = authenticated_client.get(f"/api/v1/customers/{customer_id}")
    assert get_response.status_code == 404
