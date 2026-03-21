import requests

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
ANALYTICS_SUMMARY_URL = f"{BASE_URL}/api/v1/analytics/summary"

USERNAME = "admin"
PASSWORD = "admin"
TIMEOUT = 30


def test_get_analytics_summary_with_valid_token():
    try:
        # Authenticate and get access token
        login_payload = {"username": USERNAME, "password": PASSWORD}
        login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        access_token = login_data.get("access_token")
        assert access_token, "Access token missing in login response"

        # Call analytics summary endpoint with valid token
        headers = {"Authorization": f"Bearer {access_token}"}
        analytics_resp = requests.get(ANALYTICS_SUMMARY_URL, headers=headers, timeout=TIMEOUT)
        assert analytics_resp.status_code == 200, f"Analytics summary request failed: {analytics_resp.text}"

        analytics_data = analytics_resp.json()
        # Basic validation: response json should be a dict and not empty (assuming AnalyticsSummary is a dict)
        assert isinstance(analytics_data, dict), "AnalyticsSummary response is not a dictionary"
        assert analytics_data, "AnalyticsSummary response is empty"

    except requests.RequestException as e:
        assert False, f"RequestException occurred: {e}"


test_get_analytics_summary_with_valid_token()
