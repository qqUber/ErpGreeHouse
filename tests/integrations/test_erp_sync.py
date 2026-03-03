#!/usr/bin/env python3
"""ERP Integration Tests"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta


class TestERPNextClient:
    """Tests for ERPNext API client"""

    @pytest.fixture
    def erp_client(self):
        """Create a test ERPNextClient instance"""
        from middleware.app.integrations.erpnext import ERPNextClient

        return ERPNextClient(
            base_url="https://test-erpnext.instance",
            api_key="test-api-key",
            api_secret="test-api-secret",
        )

    def test_initialization(self, erp_client):
        """Test client initialization"""
        assert erp_client.base_url == "https://test-erpnext.instance"
        assert erp_client.api_key == "test-api-key"
        assert erp_client.api_secret == "test-api-secret"

    @patch("middleware.app.integrations.erpnext.requests.get")
    def test_get_customers(self, mock_get, erp_client):
        """Test getting customers from ERPNext"""
        # Mock the requests.get response
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "data": [
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
        }
        mock_get.return_value = mock_response

        customers = erp_client.get_customers()
        assert len(customers) == 1
        assert customers[0]["customer_name"] == "Test Customer"
        assert customers[0]["loyalty_points"] == 100

    @patch("middleware.app.integrations.erpnext.requests.get")
    def test_get_sales_invoices(self, mock_get, erp_client):
        """Test getting sales invoices from ERPNext"""
        # Mock the requests.get response
        mock_response = MagicMock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "data": [
                {
                    "name": "INV001",
                    "customer": "CUST001",
                    "posting_date": "2023-10-01",
                    "grand_total": 100.0,
                    "status": "Paid",
                }
            ]
        }
        mock_get.return_value = mock_response

        invoices = erp_client.get_sales_invoices()
        assert len(invoices) == 1
        assert invoices[0]["name"] == "INV001"
        assert invoices[0]["grand_total"] == 100.0

    @patch("middleware.app.integrations.erpnext.requests.get")
    @patch("middleware.app.integrations.erpnext.requests.put")
    def test_update_customer_loyalty(self, mock_put, mock_get, erp_client):
        """Test updating customer loyalty information"""
        # Mock get customer response
        mock_get_response = MagicMock()
        mock_get_response.raise_for_status.return_value = None
        mock_get_response.json.return_value = {
            "data": {
                "name": "CUST001",
                "customer_name": "Test Customer",
                "loyalty_points": 100,
                "loyalty_tier": "Bronze",
            }
        }
        mock_get.return_value = mock_get_response

        # Mock update customer response
        mock_put_response = MagicMock()
        mock_put_response.raise_for_status.return_value = None
        mock_put_response.json.return_value = {
            "data": {
                "name": "CUST001",
                "customer_name": "Test Customer",
                "loyalty_points": 200,
                "loyalty_tier": "Silver",
            }
        }
        mock_put.return_value = mock_put_response

        updated_customer = erp_client.update_customer_loyalty("CUST001", 200, "Silver")
        assert updated_customer["loyalty_points"] == 200
        assert updated_customer["loyalty_tier"] == "Silver"


class TestERPSyncService:
    """Tests for ERP synchronization service"""

    @pytest.fixture
    def sync_service(self):
        """Create a test ERPSyncService instance"""
        from middleware.app.integrations.erp_sync import ERPSyncService

        return ERPSyncService()

    @pytest.fixture
    def db_session(self):
        """Create a test database session"""
        return MagicMock()

    def test_sync_customers_success(self, db_session):
        """Test successful customer synchronization"""
        from middleware.app.integrations.erp_sync import ERPSyncService

        # Create mock ERP client
        mock_erp = MagicMock()
        mock_erp.get_customers.return_value = [
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

        # Create sync service and replace the erp_client attribute
        sync_service = ERPSyncService()
        sync_service.erp_client = mock_erp

        result = sync_service.sync_customers(db_session)
        assert result["success"] is True
        assert result["successful_records"] == 1
        assert result["failed_records"] == 0

    def test_sync_customers_failure(self, db_session):
        """Test customer synchronization failure"""
        from middleware.app.integrations.erp_sync import ERPSyncService

        # Create mock ERP client that raises exception
        mock_erp = MagicMock()
        mock_erp.get_customers.side_effect = Exception("API Connection Error")

        # Create sync service and replace the erp_client attribute
        sync_service = ERPSyncService()
        sync_service.erp_client = mock_erp

        result = sync_service.sync_customers(db_session)
        assert result["success"] is False
        assert result["successful_records"] == 0
        assert result["failed_records"] == 0
        assert "API Connection Error" in result["errors"][0]

    def test_import_purchases(self, db_session):
        """Test purchase import functionality"""
        from middleware.app.integrations.erp_sync import ERPSyncService

        # Create mock ERP client
        mock_erp = MagicMock()
        mock_erp.get_sales_invoices.return_value = [
            {
                "name": "INV001",
                "customer": "CUST001",
                "posting_date": "2023-10-01",
                "grand_total": 100.0,
                "status": "Paid",
            }
        ]

        # Create sync service and replace the erp_client attribute
        sync_service = ERPSyncService()
        sync_service.erp_client = mock_erp

        result = sync_service.import_purchases(db_session)
        assert result["success"] is True
        assert result["successful_records"] == 1
        assert result["failed_records"] == 0


class TestERPModels:
    """Tests for ERP sync database models (without SQLAlchemy dependency)"""

    def test_sync_history_model(self):
        """Test SyncHistory model without SQLAlchemy"""
        from middleware.app.models.erp_sync import SyncHistory

        now = datetime.now()
        history = SyncHistory(
            sync_type="customer_sync",
            total_records=100,
            successful_records=95,
            failed_records=5,
            sync_start=now,
            sync_end=now + timedelta(minutes=1),
        )

        assert history.sync_type == "customer_sync"
        assert history.total_records == 100
        assert history.successful_records == 95
        assert history.failed_records == 5
        assert history.sync_start == now
        assert history.sync_end == now + timedelta(minutes=1)

    def test_failed_event_model(self):
        """Test FailedEvent model without SQLAlchemy"""
        from middleware.app.models.erp_sync import FailedEvent

        now = datetime.now()
        failed_event = FailedEvent(
            event_type="customer_sync",
            event_data='{"customer": "CUST001"}',
            error_message="API Connection Error",
            retry_count=2,
            max_retries=3,
            last_attempt=now,
        )

        assert failed_event.event_type == "customer_sync"
        assert failed_event.event_data == '{"customer": "CUST001"}'
        assert failed_event.error_message == "API Connection Error"
        assert failed_event.retry_count == 2
        assert failed_event.max_retries == 3
        assert failed_event.last_attempt == now

    def test_sync_metric_model(self):
        """Test SyncMetric model without SQLAlchemy"""
        from middleware.app.models.erp_sync import SyncMetric

        now = datetime.now()
        metric = SyncMetric(
            metric_name="erp_sync_duration",
            metric_value=1.5,
            metric_labels='{"sync_type": "customer_sync"}',
            recorded_at=now,
        )

        assert metric.metric_name == "erp_sync_duration"
        assert metric.metric_value == 1.5
        assert metric.metric_labels == '{"sync_type": "customer_sync"}'
        assert metric.recorded_at == now
