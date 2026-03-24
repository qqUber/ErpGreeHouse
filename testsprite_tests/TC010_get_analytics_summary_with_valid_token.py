import requests

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
ANALYTICS_SUMMARY_URL = f"{BASE_URL}/api/v1/analytics/summary"
USERNAME = "admin"
PASSWORD = "admin"
TIMEOUT = 30

def test_get_analytics_summary_with_valid_token():
    # Step 1: Login to get access token
    login_payload = {"username": USERNAME, "password": PASSWORD}
    try:
        login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status code {login_resp.status_code}"
        login_json = login_resp.json()
        access_token = login_json.get("access_token")
        assert access_token, "Access token not found in login response"
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    # Step 2: Use access token to call analytics summary endpoint
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        resp = requests.get(ANALYTICS_SUMMARY_URL, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}"
        json_data = resp.json()
        # Basic sanity check for AnalyticsSummary data presence
        assert isinstance(json_data, dict) and len(json_data) > 0, "AnalyticsSummary response data invalid or empty"
    except requests.RequestException as e:
        assert False, f"Analytics summary request failed: {e}"

test_get_analytics_summary_with_valid_token()