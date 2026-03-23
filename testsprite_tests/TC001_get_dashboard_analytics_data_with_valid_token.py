import requests

BASE_URL = "http://localhost:8000"
LOGIN_ENDPOINT = "/api/v1/public/auth/login"
ANALYTICS_ENDPOINT = "/api/v1/dashboard/analytics"
TIMEOUT = 30

USERNAME = "admin"
PASSWORD = "admin"


def test_get_dashboard_analytics_data_with_valid_token():
    # Login to get access token
    login_url = BASE_URL + LOGIN_ENDPOINT
    login_payload = {"username": USERNAME, "password": PASSWORD}
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        access_token = login_data.get("access_token")
        assert access_token, "Access token missing in login response"
    except (requests.RequestException, AssertionError) as e:
        assert False, f"Login request failed or invalid response: {e}"

    # Call the analytics endpoint with the valid token
    analytics_url = BASE_URL + ANALYTICS_ENDPOINT
    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        analytics_resp = requests.get(analytics_url, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to analytics endpoint failed: {e}"

    assert analytics_resp.status_code == 200, f"Expected 200 but got {analytics_resp.status_code}"

    try:
        analytics_data = analytics_resp.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(analytics_data, dict), "AnalyticsData response should be a JSON object"


test_get_dashboard_analytics_data_with_valid_token()
