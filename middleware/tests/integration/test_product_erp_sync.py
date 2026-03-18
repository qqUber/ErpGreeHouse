import importlib
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from app.auth import create_access_token
from app.db import get_db
from app.integrations.pos.erpnext_client import ERPClient
from tests.mocks.erpnext import ERPNextMock


@pytest.fixture
def client(clean_database, redis_client):
    from app import main as main_module

    importlib.reload(main_module)
    with TestClient(main_module.app) as c:
        yield c


@pytest.mark.asyncio
async def test_erp_client_get_balance(erpnext_mock, redis_client):
    """Test ERPClient.get_balance with HTTP mock."""
    client_name = "CUST-001"
    # Use regex to match the URL with filters and fields which might be encoded differently
    import re

    erpnext_mock.mock.get(url__regex=r".*/api/resource/Loyalty%20Transaction.*").mock(
        return_value=httpx.Response(
            200,
            json={
                "data": [
                    {"points": 100, "transaction_type": "Accrual"},
                    {"points": 50, "transaction_type": "Accrual"},
                ]
            },
        )
    )

    with patch("app.integrations.pos.erpnext_client.get_settings") as mock_settings:
        mock_settings.return_value.erp_mock_mode = False
        mock_settings.return_value.erp_api_base_url = "http://localhost:8000"

        client_erp = ERPClient()
        balance = await client_erp.get_balance(client_name)
        assert balance == 150


@pytest.mark.asyncio
async def test_product_import_api_with_jwt(client, clean_database):
    """Test product import API with JWT authentication."""
    # Create admin JWT token
    admin_data = {"user_id": 1, "username": "admin", "role": "admin"}
    access_token = create_access_token(admin_data)

    csv_content = b"sku;name;price;category\nPROD1;New Prod;150;goods"
    files = {"file": ("test.csv", csv_content, "text/csv")}

    client.cookies.set("access_token", access_token)
    response = client.post(
        "/api/v1/products/import/file",
        files=files,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1

    # Verify in DB
    db = get_db()
    with db.connect() as conn:
        cur = conn.execute("SELECT name FROM products WHERE code='PROD1'")
        row = cur.fetchone()
        assert row["name"] == "New Prod"


@pytest.mark.asyncio
async def test_customer_sync_from_erpnext(clean_database):
    """Test synchronizing customers from ERPNext to local DB."""
    # Note: ERPSyncService currently uses a stub ERPNextClient that doesn't make HTTP requests
    from app.integrations.erp_sync import ERPSyncService

    service = ERPSyncService()

    db = get_db()
    result = service.sync_customers(db)

    assert result["success"] is True
    assert result["total_records"] >= 1
