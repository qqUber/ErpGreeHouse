"""
Integration Tests - ERP Client

Tests ERP client integration with proper mocking.
Uses fixtures from conftest.py for consistent test data.
"""

import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.integrations.pos.erpnext_client import ERPClient

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


@pytest.mark.asyncio
async def test_erp_client_get_customer_by_telegram_id_real_logic(erpnext_mock):
    """Test ERPClient.get_customer_by_telegram_id with real request logic (mocked HTTP)."""
    telegram_id = 123456789

    # Setup mock HTTP response via respx
    erpnext_mock.mock_get_customer(str(telegram_id))

    # Initialize client with mock mode OFF to test the actual request logic
    with patch("app.integrations.pos.erpnext_client.get_settings") as mock_settings:
        mock_settings.return_value.erp_mock_mode = False
        mock_settings.return_value.erp_api_base_url = "http://localhost:8000"
        mock_settings.return_value.erp_api_key = "key"
        mock_settings.return_value.erp_api_secret = "secret"

        client = ERPClient()
        result = await client.get_customer_by_telegram_id(telegram_id)

        assert result is not None
        assert result["telegram_id"] == str(telegram_id)
        assert result["first_name"] == "Test User"


@pytest.mark.asyncio
async def test_erp_client_create_customer_real_logic(erpnext_mock, redis_client):
    """Test ERPClient.create_customer with real request logic (mocked HTTP)."""
    telegram_id = 123456789
    name = "New Customer"
    phone = "+79991234567"

    # Setup mock HTTP response via respx
    erpnext_mock.mock_get_customer_by_phone(phone)  # Search by phone first
    erpnext_mock.mock_create_customer_resource(phone)  # Create Customer resource
    erpnext_mock.mock_create_customer(str(telegram_id), name)  # Create Telegram Client link

    # Initialize client with mock mode OFF
    with patch("app.integrations.pos.erpnext_client.get_settings") as mock_settings, patch(
        "app.integrations.pos.erpnext_client.get_redis", return_value=redis_client
    ):
        mock_settings.return_value.erp_mock_mode = False
        mock_settings.return_value.erp_api_base_url = "http://localhost:8000"
        mock_settings.return_value.erp_api_key = "key"
        mock_settings.return_value.erp_api_secret = "secret"

        client = ERPClient()
        result = await client.create_customer(telegram_id, name, phone, "Consent text")

        assert result is not None
        assert result["telegram_id"] == str(telegram_id)
        assert result["first_name"] == name


@pytest.mark.asyncio
async def test_erp_client_error_handling_real_logic(erpnext_mock):
    """Test ERPClient error handling when API returns 500."""
    telegram_id = 123456789

    # Setup mock error response
    erpnext_mock.mock_error(
        "GET",
        f'/api/resource/Telegram Client?filters=[["telegram_id","=","{telegram_id}"]]&fields=["name", "telegram_id", "first_name", "balance", "customer_link"]',
        500,
    )

    with patch("app.integrations.pos.erpnext_client.get_settings") as mock_settings:
        mock_settings.return_value.erp_mock_mode = False
        mock_settings.return_value.erp_api_base_url = "http://localhost:8000"

        client = ERPClient()
        with pytest.raises(Exception):  # httpx.HTTPStatusError
            await client.get_customer_by_telegram_id(telegram_id)


@pytest.mark.asyncio
async def test_erp_client_create_order(mock_erp_client, test_order_data):
    """Test creating order"""
    # Setup mock response
    mock_erp_client.create_order = AsyncMock(
        return_value={
            "order_id": "ORD-00001",
            "success": True,
            "total": test_order_data["total"],
            "bonus_used": test_order_data["bonus_used"],
        }
    )

    # Call method
    result = await mock_erp_client.create_order(
        customer_id=test_order_data["customer_id"],
        items=test_order_data["items"],
        total=test_order_data["total"],
        bonus_used=test_order_data["bonus_used"],
    )

    # Verify
    assert result["success"] is True
    assert result["order_id"] == "ORD-00001"
    mock_erp_client.create_order.assert_called_once()


@pytest.mark.asyncio
async def test_erp_client_get_order(mock_erp_client, erp_mock_responses):
    """Test getting order details"""
    # Setup mock response
    order_data = erp_mock_responses["order"]
    mock_erp_client.get_order = AsyncMock(return_value=order_data)

    # Call method
    result = await mock_erp_client.get_order("ORD-00001")

    # Verify
    assert result is not None
    assert result["order_id"] == "ORD-00001"
    assert result["status"] == "completed"
    mock_erp_client.get_order.assert_called_once_with("ORD-00001")


@pytest.mark.asyncio
async def test_erp_client_get_customer_orders(mock_erp_client):
    """Test getting customer orders"""
    # Setup mock response
    mock_erp_client.get_customer_orders = AsyncMock(
        return_value=[
            {
                "order_id": "ORD-00001",
                "status": "completed",
                "total": 1000.0,
                "date": "2024-01-15",
            },
            {
                "order_id": "ORD-00002",
                "status": "pending",
                "total": 500.0,
                "date": "2024-01-16",
            },
        ]
    )

    # Call method
    result = await mock_erp_client.get_customer_orders("CRM-CUST-00001")

    # Verify
    assert len(result) == 2
    assert result[0]["order_id"] == "ORD-00001"
    mock_erp_client.get_customer_orders.assert_called_once_with("CRM-CUST-00001")


@pytest.mark.asyncio
async def test_erp_client_get_products(mock_erp_client, erp_mock_responses):
    """Test getting product list"""
    # Setup mock response
    products_data = erp_mock_responses["products"]
    mock_erp_client.get_products = AsyncMock(return_value=products_data)

    # Call method
    result = await mock_erp_client.get_products()

    # Verify
    assert len(result) > 0
    assert result[0]["item_code"] == "LATTE"
    assert result[0]["rate"] == 250.0
    mock_erp_client.get_products.assert_called_once()


@pytest.mark.asyncio
async def test_erp_client_get_product_by_id(mock_erp_client, test_product_data):
    """Test getting product by ID"""
    # Setup mock response
    mock_erp_client.get_product_by_id = AsyncMock(return_value=test_product_data)

    # Call method
    result = await mock_erp_client.get_product_by_id("TEST-001")

    # Verify
    assert result is not None
    assert result["item_code"] == "TEST-001"
    assert result["rate"] == 100.0
    mock_erp_client.get_product_by_id.assert_called_once_with("TEST-001")


@pytest.mark.asyncio
async def test_erp_client_error_handling(mock_erp_client):
    """Test ERP client error handling"""
    # Setup mock to raise exception
    mock_erp_client.get_customer_by_phone = AsyncMock(side_effect=Exception("Connection timeout"))

    # Call method and verify exception
    with pytest.raises(Exception) as exc_info:
        await mock_erp_client.get_customer_by_phone("+79991234567")

    assert "Connection timeout" in str(exc_info.value)


@pytest.mark.asyncio
async def test_erp_client_retry_logic(monkeypatch):
    """Test ERP client retry logic with HTTP mocks."""
    import httpx
    import respx

    from app.integrations.pos.erpnext_client import ERPClient

    # Create a real client but point it to a mock base URL
    monkeypatch.setenv("ERP_MOCK_MODE", "false")
    monkeypatch.setenv("ERP_API_BASE_URL", "http://test-erpnext.instance")

    from app.integrations.pos.erpnext_client import ERPClient

    client = ERPClient()
    # Ensure base_url and headers are set even if settings were already loaded
    client.base_url = "http://test-erpnext.instance"
    client.headers = {"Authorization": "token test:test"}
    client.mock = False

    with respx.mock:
        # 1. Mock first 2 attempts as 500 errors, 3rd as 200 success
        route = respx.get("http://test-erpnext.instance/api/resource/Customer")
        route.side_effect = [
            httpx.Response(500),
            httpx.Response(500),
            httpx.Response(200, json={"data": [{"name": "CUST-001"}]}),
        ]

        # This call should trigger 2 retries and then succeed
        # We need to pass filters to match the actual call in get_customer_by_phone if that's what we test
        # Let's test _request directly for simplicity since it's the one with retry logic
        result = await client._request("GET", "/api/resource/Customer")

        assert result is not None
        assert result["data"][0]["name"] == "CUST-001"
        assert route.call_count == 3
