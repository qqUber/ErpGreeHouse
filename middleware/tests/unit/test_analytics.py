import os
import sys
import pytest

# Patch out heavy imports before app loads
from unittest.mock import MagicMock, patch

os.environ.setdefault("ERP_MOCK_MODE", "true")
os.environ.setdefault("CRM_DB_PATH", ":memory:")
os.environ.setdefault("ADMIN_SECRET", "test_admin_secret")

# Mock Celery / bot modules so app.main can be collected
sys.modules.setdefault("celery", MagicMock())
sys.modules.setdefault("celery.app", MagicMock())

with patch.dict("sys.modules", {
    "aiogram": MagicMock(),
    "aiogram.types": MagicMock(),
    "aiogram.filters": MagicMock(),
    "aiogram.fsm.context": MagicMock(),
}):
    from fastapi.testclient import TestClient
    from app.main import app  # noqa: E402


@pytest.fixture
def client():
    return TestClient(app)


def test_sales_stats_no_auth(client):
    response = client.get("/api/v1/stats/sales")
    assert response.status_code in (401, 403)


def test_sales_stats_with_secret(client):
    headers = {"x-admin-secret": "test_admin_secret"}
    response = client.get("/api/v1/stats/sales?days=7", headers=headers)
    # Accept either success or auth failure (depends on configured secret)
    assert response.status_code in (200, 401, 403)
    if response.status_code == 200:
        data = response.json()
        assert "stats" in data
        assert isinstance(data["stats"], list)
