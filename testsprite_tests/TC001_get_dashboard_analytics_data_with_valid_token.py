import requests

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
ANALYTICS_URL = f"{BASE_URL}/api/v1/dashboard/analytics"
TIMEOUT = 30

def test_get_dashboard_analytics_with_valid_token():
    # Step 1: Login to get access token
    login_payload = {
        "username": "admin",
        "password": "admin"
    }
    try:
        login_response = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        assert login_response.status_code == 200, f"Login failed with status {login_response.status_code}"
        login_json = login_response.json()
        assert "access_token" in login_json and isinstance(login_json["access_token"], str), "Access token missing in login response"
        access_token = login_json["access_token"]
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    # Step 2: Use access token to get dashboard analytics
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    try:
        analytics_response = requests.get(ANALYTICS_URL, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Analytics request failed: {e}"

    # Step 3: Validate response status code and body
    assert analytics_response.status_code == 200, f"Expected 200 but got {analytics_response.status_code}"
    try:
        analytics_data = analytics_response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Basic structure validation of AnalyticsData (not fully detailed in PRD, so minimal check)
    assert isinstance(analytics_data, dict), "AnalyticsData response should be a JSON object"
    assert len(analytics_data) > 0, "AnalyticsData response is empty"

test_get_dashboard_analytics_with_valid_token()
