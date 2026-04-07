import importlib

import pytest
from fastapi.testclient import TestClient

from app.auth import create_access_token
from app.db import get_db


@pytest.fixture
def client(clean_database, redis_client):
    from app import main as main_module

    importlib.reload(main_module)
    with TestClient(main_module.app) as c:
        yield c


@pytest.mark.asyncio
async def test_analytics_data_aggregation(clean_database):
    """Test aggregating analytics data."""
    # 1. Setup local data
    db = get_db()
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO customers (id, phone, full_name, telegram_id) VALUES (?, ?, ?, ?)",
            (1, "+79991234567", "Test User", 123456789),
        )
        conn.execute(
            "INSERT INTO transactions (customer_id, total_amount, bonus_used, bonus_earned, items_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (1, 1000, 0, 100, "[]", "2024-01-01 10:00:00"),
        )
        conn.execute(
            "INSERT INTO transactions (customer_id, total_amount, bonus_used, bonus_earned, items_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (1, 2000, 0, 200, "[]", "2024-01-02 10:00:00"),
        )
        conn.commit()

    # 3. Test Analytics API
    admin_data = {"user_id": 1, "username": "admin", "role": "admin"}
    access_token = create_access_token(admin_data)

    from app import main as main_module

    importlib.reload(main_module)
    with TestClient(main_module.app) as client_api:
        client_api.cookies.set("access_token", access_token)
        response = client_api.get(
            "/api/v1/analytics/dashboard/overview",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["metrics"]["total_revenue"] >= 30.0
        assert data["metrics"]["total_transactions"] >= 2
