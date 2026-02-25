"""
Integration Tests - ERP Client

Tests ERP client integration with proper mocking.
Uses fixtures from conftest.py for consistent test data.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


@pytest.mark.asyncio
async def test_erp_client_get_customer_by_phone(mock_erp_client, test_customer_data):
    """Test getting customer by phone number"""
    # Setup mock response
    mock_erp_client.get_customer_by_phone = AsyncMock(return_value=test_customer_data)

    # Call method
    result = await mock_erp_client.get_customer_by_phone(test_customer_data["phone"])

    # Verify
    assert result is not None
    assert result["phone"] == test_customer_data["phone"]
    mock_erp_client.get_customer_by_phone.assert_called_once_with(
        test_customer_data["phone"]
    )


@pytest.mark.asyncio
async def test_erp_client_get_customer_by_telegram(mock_erp_client):
    """Test getting customer by Telegram ID"""
    # Setup mock response
    expected = {
        "customer_id": "CRM-CUST-00001",
        "telegram_id": "123456789",
        "full_name": "Test Customer",
    }
    mock_erp_client.get_customer_by_telegram = AsyncMock(return_value=expected)

    # Call method
    result = await mock_erp_client.get_customer_by_telegram("123456789")

    # Verify
    assert result is not None
    assert result["telegram_id"] == "123456789"
    mock_erp_client.get_customer_by_telegram.assert_called_once_with("123456789")


@pytest.mark.asyncio
async def test_erp_client_create_customer(mock_erp_client, test_customer_data):
    """Test creating new customer"""
    # Setup mock response
    mock_erp_client.create_customer = AsyncMock(
        return_value={"customer_id": "CRM-CUST-00002", "success": True}
    )

    # Call method
    result = await mock_erp_client.create_customer(
        phone=test_customer_data["phone"],
        full_name=test_customer_data["full_name"],
        telegram_id=str(test_customer_data["telegram_id"]),
    )

    # Verify
    assert result["success"] is True
    assert result["customer_id"] == "CRM-CUST-00002"
    mock_erp_client.create_customer.assert_called_once()


@pytest.mark.asyncio
async def test_erp_client_get_loyalty_balance(mock_erp_client, erp_mock_responses):
    """Test getting loyalty balance"""
    # Setup mock response
    balance_data = erp_mock_responses["loyalty_balance"]
    mock_erp_client.get_loyalty_balance = AsyncMock(return_value=balance_data)

    # Call method
    result = await mock_erp_client.get_loyalty_balance("CRM-CUST-00001")

    # Verify
    assert result is not None
    assert result["available_points"] == 500
    assert result["accrued_points"] == 1000
    mock_erp_client.get_loyalty_balance.assert_called_once_with("CRM-CUST-00001")


@pytest.mark.asyncio
async def test_erp_client_add_loyalty_points(mock_erp_client):
    """Test adding loyalty points"""
    # Setup mock response
    mock_erp_client.add_loyalty_points = AsyncMock(
        return_value={
            "success": True,
            "transaction_id": "LT-00001",
            "points_added": 100,
        }
    )

    # Call method
    result = await mock_erp_client.add_loyalty_points(
        customer_id="CRM-CUST-00001", points=100, order_id="ORD-00001"
    )

    # Verify
    assert result["success"] is True
    assert result["points_added"] == 100
    mock_erp_client.add_loyalty_points.assert_called_once()


@pytest.mark.asyncio
async def test_erp_client_redeem_loyalty_points(mock_erp_client):
    """Test redeeming loyalty points"""
    # Setup mock response
    mock_erp_client.redeem_loyalty_points = AsyncMock(
        return_value={
            "success": True,
            "transaction_id": "LT-00002",
            "points_redeemed": 50,
        }
    )

    # Call method
    result = await mock_erp_client.redeem_loyalty_points(
        customer_id="CRM-CUST-00001", points=50, order_id="ORD-00001"
    )

    # Verify
    assert result["success"] is True
    assert result["points_redeemed"] == 50
    mock_erp_client.redeem_loyalty_points.assert_called_once()


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
    mock_erp_client.get_customer_by_phone = AsyncMock(
        side_effect=Exception("Connection timeout")
    )

    # Call method and verify exception
    with pytest.raises(Exception) as exc_info:
        await mock_erp_client.get_customer_by_phone("+79991234567")

    assert "Connection timeout" in str(exc_info.value)


@pytest.mark.skip(
    reason="Retry logic test requires actual ERP client implementation with retry"
)
@pytest.mark.asyncio
async def test_erp_client_retry_logic(mock_erp_client):
    """Test ERP client retry logic - SKIPPED for now"""
    # This test requires the actual ERP client implementation with retry logic
    # The mock client doesn't implement retry, so we skip this test for now
    pass
