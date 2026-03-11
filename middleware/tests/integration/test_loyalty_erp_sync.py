import pytest
import httpx
from unittest.mock import patch, AsyncMock
from app.integrations.pos.erpnext_client import ERPClient
from app.db import get_db
from tests.mocks.erpnext import ERPNextMock

@pytest.mark.asyncio
async def test_loyalty_accrual_sync_flow(erpnext_mock, clean_database, redis_client):
    """Test full loyalty accrual flow with ERP sync."""
    telegram_id = 123456789
    phone = "+79991234567"
    points = 100
    
    # 1. Setup ERPNext mocks
    # ERPClient constructor doesn't call anything, but create_loyalty_transaction calls _request
    erpnext_mock.mock_create_loyalty_transaction()

    # 2. Use ERPClient directly
    with patch("app.integrations.pos.erpnext_client.get_redis", return_value=redis_client), \
         patch("app.integrations.pos.erpnext_client.get_settings") as mock_settings:
        
        mock_settings.return_value.erp_mock_mode = False
        mock_settings.return_value.erp_api_base_url = "http://localhost:8000"
        
        client = ERPClient()
        await client.create_loyalty_transaction("CUST-001", "Accrual", points, "Test Bonus")
        
        # Verify call (implicit in respx)
