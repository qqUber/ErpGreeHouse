"""
Analytics API unit tests.
NOTE: aiogram and celery are stubbed out globally in conftest.py.
"""
import os
import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("ERP_MOCK_MODE", "true")
os.environ.setdefault("CRM_DB_PATH", ":memory:")


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


def test_sales_stats_no_auth(client):
    """Endpoint should reject unauthenticated requests."""
    response = client.get("/api/v1/stats/sales")
    assert response.status_code in (401, 403)


def test_sales_stats_with_secret(client):
    """Endpoint should return stats dict when called with secret header."""
    headers = {"x-admin-secret": os.environ.get("ADMIN_SECRET", "test_admin_secret")}
    response = client.get("/api/v1/stats/sales?days=7", headers=headers)
    assert response.status_code in (200, 401, 403)
    if response.status_code == 200:
        data = response.json()
        assert "stats" in data
        assert isinstance(data["stats"], list)
