import requests

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
DASHBOARD_ANALYTICS_URL = f"{BASE_URL}/api/v1/dashboard/analytics"
TIMEOUT = 30

USERNAME = "admin"
PASSWORD = "admin"

def test_get_dashboard_analytics_with_valid_token():
    try:
        # Login to get access token
        login_payload = {"username": USERNAME, "password": PASSWORD}
        login_response = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        assert login_response.status_code == 200, f"Login failed with status code {login_response.status_code}"
        login_json = login_response.json()
        access_token = login_json.get("access_token")
        assert access_token, "Access token not found in login response"

        # Get dashboard analytics with valid token
        headers = {"Authorization": f"Bearer {access_token}"}
        analytics_response = requests.get(DASHBOARD_ANALYTICS_URL, headers=headers, timeout=TIMEOUT)
        assert analytics_response.status_code == 200, f"Expected 200, got {analytics_response.status_code}"

        analytics_data = analytics_response.json()
        assert isinstance(analytics_data, dict), "Analytics data is not a dictionary"

        # Basic structure checks for AnalyticsData (assuming typical analytics keys present)
        assert analytics_data, "Analytics data is empty"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_dashboard_analytics_with_valid_token()