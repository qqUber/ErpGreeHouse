import requests

BASE_URL = "http://localhost:8000"
LOGIN_ENDPOINT = "/api/v1/public/auth/login"
ANALYTICS_SUMMARY_ENDPOINT = "/api/v1/analytics/summary"
TIMEOUT = 30

USERNAME = "admin"
PASSWORD = "admin"


def test_get_analytics_summary_with_valid_token():
    # Step 1: Login to get access token
    login_url = BASE_URL + LOGIN_ENDPOINT
    login_payload = {
        "username": USERNAME,
        "password": PASSWORD
    }
    try:
        login_response = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        login_response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    login_json = login_response.json()
    access_token = login_json.get("access_token")
    assert access_token, "Access token not found in login response"

    # Step 2: Access analytics summary with valid token
    analytics_url = BASE_URL + ANALYTICS_SUMMARY_ENDPOINT
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    try:
        analytics_response = requests.get(analytics_url, headers=headers, timeout=TIMEOUT)
        analytics_response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Analytics summary request failed: {e}"

    assert analytics_response.status_code == 200, f"Expected status code 200, got {analytics_response.status_code}"

    analytics_json = analytics_response.json()
    # Minimal validation for AnalyticsSummary shape
    assert isinstance(analytics_json, dict), "Analytics summary response is not a JSON object"


test_get_analytics_summary_with_valid_token()
