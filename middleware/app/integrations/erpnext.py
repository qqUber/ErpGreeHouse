#!/usr/bin/env python3
"""ERPNext API Client Module - Minimal implementation for testing"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional


logger = logging.getLogger(__name__)


# Circuit breaker fallback implementation
def circuit(failure_threshold=5, recovery_timeout=30):
    """Decorator to mimic circuit breaker functionality (simplified version)"""

    def decorator(func):
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        return wrapper

    return decorator


class ERPNextClient:
    """ERPNext API client with circuit breaker and retry logic"""

    def __init__(self, base_url: str, api_key: str, api_secret: str):
        self.base_url = base_url
        self.api_key = api_key
        self.api_secret = api_secret
        self.headers = {
            "Authorization": f"token {api_key}:{api_secret}",
            "Content-Type": "application/json",
        }

    @circuit(failure_threshold=5, recovery_timeout=30)
    def get_customers(
        self, modified_after: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get customers from ERPNext

        Args:
            modified_after: Only return customers modified after this date

        Returns:
            List of customer dicts with relevant fields
        """
        return [
            {
                "name": "CUST001",
                "customer_name": "Test Customer",
                "email_id": "test@example.com",
                "mobile_no": "+1234567890",
                "loyalty_points": 100,
                "loyalty_tier": "Bronze",
                "consent_status": "granted",
                "date_of_birth": "1990-01-01",
                "last_visit_date": "2023-10-01",
            }
        ]

    @circuit(failure_threshold=5, recovery_timeout=30)
    def get_sales_invoices(
        self, posting_date_from: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get sales invoices (purchases) from ERPNext

        Args:
            posting_date_from: Only return invoices posted after this date

        Returns:
            List of sales invoice dicts with relevant fields
        """
        return [
            {
                "name": "INV001",
                "customer": "CUST001",
                "posting_date": "2023-10-01",
                "grand_total": 100.0,
                "status": "Paid",
            }
        ]

    @circuit(failure_threshold=5, recovery_timeout=30)
    def update_customer_loyalty(
        self, customer_name: str, loyalty_points: int, loyalty_tier: str
    ) -> Dict[str, Any]:
        """
        Update customer loyalty information in ERPNext

        Args:
            customer_name: Customer name (ERPNext unique identifier)
            loyalty_points: Current loyalty points balance
            loyalty_tier: Loyalty tier (e.g., "Bronze", "Silver", "Gold")

        Returns:
            Updated customer dict
        """
        return {
            "name": customer_name,
            "customer_name": "Test Customer",
            "loyalty_points": loyalty_points,
            "loyalty_tier": loyalty_tier,
        }

    @circuit(failure_threshold=5, recovery_timeout=30)
    def create_customer(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new customer in ERPNext

        Args:
            customer_data: Customer information to create

        Returns:
            Created customer dict
        """
        return {"name": "CUST001", **customer_data}
