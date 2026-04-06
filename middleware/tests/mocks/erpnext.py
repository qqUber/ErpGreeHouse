import json
from typing import Any, Dict, List, Optional

import respx
from httpx import Response


class ERPNextMock:
    """Helper to mock ERPNext API responses using respx."""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.mock = respx.mock(base_url=self.base_url)

    def mock_get_customer(self, telegram_id: str, data: Optional[Dict[str, Any]] = None):
        """Mock GET request for a customer by telegram_id."""
        if data is None:
            data = {
                "data": [
                    {
                        "name": f"CUST-{telegram_id}",
                        "telegram_id": telegram_id,
                        "first_name": "Test User",
                        "balance": 100.0,
                        "customer_link": f"CUST-{telegram_id}",
                    }
                ]
            }

        filters = f'[["telegram_id","=","{telegram_id}"]]'
        url = f'/api/resource/Telegram Client?filters={filters}&fields=["name", "telegram_id", "first_name", "balance", "customer_link"]'
        self.mock.get(url).mock(return_value=Response(200, json=data))

    def mock_get_customer_by_phone(self, phone: str, data: Optional[Dict[str, Any]] = None):
        """Mock GET request for a customer by phone."""
        if data is None:
            data = {"data": []}  # No customer found

        url = f'/api/resource/Customer?filters=[["mobile_no","=","{phone}"]]'
        self.mock.get(url).mock(return_value=Response(200, json=data))

    def mock_create_customer_resource(self, phone: str):
        """Mock POST request to create a Customer resource."""
        data = {
            "data": {
                "name": f"CUST-NEW",
                "mobile_no": phone,
                "customer_name": "New Customer",
            }
        }
        self.mock.post("/api/resource/Customer").mock(return_value=Response(201, json=data))

    def mock_create_customer(self, telegram_id: str, name: str):
        """Mock POST request to create a customer."""
        data = {
            "data": {
                "name": f"CUST-{telegram_id}",
                "telegram_id": telegram_id,
                "first_name": name,
            }
        }
        self.mock.post("/api/resource/Telegram Client").mock(return_value=Response(201, json=data))

    def mock_create_loyalty_transaction(self):
        """Mock POST request to create a loyalty transaction."""
        self.mock.post("/api/resource/Loyalty Transaction").mock(return_value=Response(201))

    def mock_error(self, method: str, url: str, status_code: int = 500):
        """Mock an error response."""
        if method.upper() == "GET":
            self.mock.get(url).mock(return_value=Response(status_code))
        elif method.upper() == "POST":
            self.mock.post(url).mock(return_value=Response(status_code))

    def __enter__(self):
        self.mock.__enter__()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.mock.__exit__(exc_type, exc_val, exc_tb)
