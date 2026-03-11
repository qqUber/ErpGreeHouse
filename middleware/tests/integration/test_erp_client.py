import pytest
import sys
import os
from unittest.mock import Mock, patch
from typing import Dict

# Ensure we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.integrations.pos.erpnext_client import ERPClient


@pytest.fixture
def mock_settings():
    with patch("app.integrations.pos.erpnext_client.get_settings") as mock:
        mock.return_value = Mock(
            erp_mock_mode=False,
            erp_api_base_url="https://mock.erp",
            erp_api_key="key",
            erp_api_secret="secret",
            redis_url="redis://localhost:6379/0",
        )
        yield mock


@pytest.fixture
def erp_client(mock_settings):
    with patch("app.integrations.pos.erpnext_client.get_redis") as mock_redis:
        mock_redis.return_value = Mock()
        return ERPClient()


@pytest.mark.asyncio
async def test_get_customer_by_telegram_id(erp_client):
    with patch.object(erp_client, "_request", new_callable=Mock) as mock_req:
        mock_req.return_value = {
            "data": [{"name": "CUST-001", "first_name": "Test", "balance": 100}]
        }

        # Async mock setup
        async def async_req(*args, **kwargs):
            return mock_req(*args, **kwargs)

        erp_client._request = async_req

        result = await erp_client.get_customer_by_telegram_id(12345)
        assert result["name"] == "CUST-001"
        assert result["first_name"] == "Test"


@pytest.mark.asyncio
async def test_create_customer(erp_client):
    with patch.object(erp_client, "_request") as mock_req:
        # Mock responses for different calls
        async def side_effect(method, endpoint, **kwargs):
            if endpoint.startswith("/api/resource/Customer?filters="):
                return {"data": []}  # No existing customer
            if endpoint == "/api/resource/Customer":
                return {"data": {"name": "CUST-NEW"}}
            if endpoint == "/api/resource/Telegram Client":
                return {"data": {"name": "TG-CLIENT", "customer_link": "CUST-NEW"}}
            if endpoint == "/api/resource/Loyalty Transaction":
                return {"data": {"name": "LOY-TX"}}
            return {}

        erp_client._request = side_effect

        result = await erp_client.create_customer(
            12345, "Test User", "+1234567890", "Consent"
        )
        assert result["name"] == "TG-CLIENT"
        assert result["customer_link"] == "CUST-NEW"


@pytest.mark.asyncio
async def test_get_balance(erp_client):
    with patch.object(erp_client, "_request") as mock_req:

        async def side_effect(method, endpoint, **kwargs):
            return {
                "data": [
                    {"points": 100, "transaction_type": "Accrual"},
                    {"points": -50, "transaction_type": "Redemption"},
                ]
            }

        erp_client._request = side_effect

        bal = await erp_client.get_balance("TG-CLIENT")
        assert bal == 50


@pytest.mark.asyncio
async def test_create_order(erp_client):
    with patch.object(erp_client, "_request") as mock_req:

        async def side_effect(method, endpoint, **kwargs):
            if endpoint.startswith("/api/resource/Telegram Client"):
                return {"data": {"customer_link": "CUST-001"}}
            if endpoint == "/api/resource/Sales Order":
                return {"data": {"name": "ORD-001"}}
            if endpoint == "/api/resource/Loyalty Transaction":
                return {"data": {"name": "LOY-TX"}}
            return {}

        erp_client._request = side_effect

        items = [{"code": "ITEM-1", "qty": 2, "price": 100}]
        res = await erp_client.create_order("TG-CLIENT", items, 50)

        assert res["order_id"] == "ORD-001"
        assert res["total"] == 150  # (2*100) - 50
        assert res["bonus_used"] == 50
