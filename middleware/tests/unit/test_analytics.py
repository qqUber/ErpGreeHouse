"""
Analytics API unit tests.
NOTE: aiogram and celery are stubbed out globally in conftest.py.
"""

import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("ERP_MOCK_MODE", "true")


@pytest.fixture
def client(tmp_path: Path):
    # Create a temp database file for this test
    db_path = tmp_path / "test_analytics.db"
    os.environ["CRM_DB_PATH"] = str(db_path)
    os.environ["ADMIN_SECRET"] = "test_admin_secret"
    os.environ["CORS_ORIGINS"] = "http://localhost:5173"

    from app.db import init_db

    init_db()

    import importlib

    from app import main as main_module

    importlib.reload(main_module)
    return TestClient(main_module.app)


def test_sales_stats_no_auth(client):
    """Endpoint should reject unauthenticated requests."""
    response = client.get("/api/v1/stats/sales")
    assert response.status_code in (401, 403)


def test_sales_stats_with_secret(client, clean_database):
    """Endpoint should return 200 with clean database."""
    response = client.get(
        "/api/v1/stats/sales", headers={"x-admin-secret": "test_admin_secret"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "stats" in data
