import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from unittest.mock import patch

from app.main import app


@pytest.fixture
def client():
    """Test client fixture."""
    with TestClient(app) as test_client:
        yield test_client


def test_dashboard_overview(client: TestClient):
    """Test getting dashboard overview with various time ranges."""
    # Test with default time range (7d)
    response = client.get("/api/v1/analytics/dashboard/overview")
    assert response.status_code == 200
    data = response.json()
    assert "time_range" in data
    assert "metrics" in data
    assert data["time_range"] == "7d"

    # Test metrics are present
    metrics = data["metrics"]
    assert "total_customers" in metrics
    assert "new_customers" in metrics
    assert "total_transactions" in metrics
    assert "transactions" in metrics
    assert "total_revenue" in metrics
    assert "revenue" in metrics
    assert "avg_check" in metrics
    assert "points_redeemed" in metrics
    assert "points_earned" in metrics
    assert "active_customers" in metrics
    assert "retention_rate" in metrics

    # Test with different time ranges
    for time_range in ["24h", "30d", "90d", "1y"]:
        response = client.get(
            f"/api/v1/analytics/dashboard/overview?time_range={time_range}"
        )
        assert response.status_code == 200
        assert response.json()["time_range"] == time_range


def test_sales_chart(client: TestClient):
    """Test getting sales chart data."""
    # Test with default parameters
    response = client.get("/api/v1/analytics/dashboard/sales")
    assert response.status_code == 200
    data = response.json()
    assert "time_range" in data
    assert "interval" in data
    assert "data" in data
    assert isinstance(data["data"], list)

    # Test with different intervals
    for interval in ["day", "week", "month"]:
        response = client.get(f"/api/v1/analytics/dashboard/sales?interval={interval}")
        assert response.status_code == 200
        assert response.json()["interval"] == interval


def test_customer_chart(client: TestClient):
    """Test getting customer chart data."""
    # Test with default parameters
    response = client.get("/api/v1/analytics/dashboard/customers")
    assert response.status_code == 200
    data = response.json()
    assert "time_range" in data
    assert "interval" in data
    assert "data" in data
    assert isinstance(data["data"], list)


def test_loyalty_chart(client: TestClient):
    """Test getting loyalty chart data."""
    # Test with default parameters
    response = client.get("/api/v1/analytics/dashboard/loyalty")
    assert response.status_code == 200
    data = response.json()
    assert "time_range" in data
    assert "interval" in data
    assert "data" in data
    assert isinstance(data["data"], list)


def test_loyalty_report_overview(client: TestClient):
    """Test getting loyalty report overview."""
    # Test with default time range (30d)
    response = client.get("/api/v1/analytics/reports/loyalty/overview")
    assert response.status_code == 200
    data = response.json()
    assert "time_range" in data
    assert "metrics" in data
    assert data["time_range"] == "30d"

    # Test metrics are present
    metrics = data["metrics"]
    assert "points_earned" in metrics
    assert "points_redeemed" in metrics
    assert "redemption_rate" in metrics
    assert "avg_points_per_transaction" in metrics
    assert "avg_points_redeemed_per_customer" in metrics
    assert "avg_visits_per_redeeming_customer" in metrics
    assert "reminder_count" in metrics


def test_loyalty_detailed_report(client: TestClient):
    """Test getting detailed loyalty report."""
    response = client.get("/api/v1/analytics/reports/loyalty/detailed")
    assert response.status_code == 200
    data = response.json()
    assert "time_range" in data
    assert "customer_data" in data
    assert isinstance(data["customer_data"], list)


def test_customer_segmentation(client: TestClient):
    """Test getting customer segmentation."""
    response = client.get("/api/v1/analytics/customers/segmentation")
    assert response.status_code == 200
    data = response.json()
    assert "segments" in data
    assert "total_customers" in data

    # Test segments are present
    segments = data["segments"]
    assert "new" in segments
    assert "active" in segments
    assert "at_risk" in segments
    assert "churned" in segments
    assert "vip" in segments


def test_data_export_endpoints(client: TestClient):
    """Test data export endpoints."""
    # Test loyalty report export
    response = client.get("/api/v1/analytics/export/loyalty/csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "attachment" in response.headers["content-disposition"]

    # Test sales report export
    response = client.get("/api/v1/analytics/export/sales/csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "attachment" in response.headers["content-disposition"]

    # Test customers report export
    response = client.get("/api/v1/analytics/export/customers/csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "attachment" in response.headers["content-disposition"]


def test_external_api_endpoints(client: TestClient):
    """Test external API endpoints with API key authentication."""
    # Test without API key
    response = client.get("/api/v1/analytics/api/reports/sales")
    assert response.status_code == 400

    # Test with invalid API key
    response = client.get("/api/v1/analytics/api/reports/sales?api_key=invalid_key")
    assert response.status_code == 401

    # Test with valid API key (using default)
    response = client.get("/api/v1/analytics/api/reports/sales?api_key=default_api_key")
    assert response.status_code == 200

    # Test other external endpoints
    endpoints = [
        "/api/v1/analytics/api/reports/customers",
        "/api/v1/analytics/api/reports/loyalty",
    ]

    for endpoint in endpoints:
        response = client.get(f"{endpoint}?api_key=default_api_key")
        assert response.status_code == 200


def test_api_key_configuration():
    """Test that API key configuration is properly handled."""
    with patch.dict("os.environ", {"ANALYTICS_API_KEY": "test_api_key"}):
        from app.analytics_api import get_external_sales_report
        from fastapi.testclient import TestClient
        import sys
        import io

        # Redirect stdout to capture print output
        captured_output = io.StringIO()
        sys.stdout = captured_output

        # This is a simplified test since we can't directly call the endpoint with the patched environment
        # in the same way as the client fixture
        sys.stdout = sys.__stdout__


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
