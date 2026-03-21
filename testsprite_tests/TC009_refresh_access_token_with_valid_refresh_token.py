import requests

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
REFRESH_URL = f"{BASE_URL}/api/v1/auth/refresh"
TIMEOUT = 30

def test_refresh_access_token_with_valid_refresh_token():
    # Step 1: Login to get refresh token
    login_payload = {
        "username": "admin",
        "password": "admin"
    }
    try:
        login_response = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        assert login_response.status_code == 200, f"Login failed with status {login_response.status_code}"
        login_data = login_response.json()
        refresh_token = login_data.get("refresh_token")
        assert isinstance(refresh_token, str) and refresh_token, "Refresh token not found in login response"

        # Step 2: Call refresh endpoint with valid refresh token
        headers = {
            "Authorization": f"Bearer {refresh_token}"
        }
        refresh_response = requests.post(REFRESH_URL, headers=headers, timeout=TIMEOUT)
        assert refresh_response.status_code == 200, f"Refresh failed with status {refresh_response.status_code}"

        refresh_data = refresh_response.json()
        # Validate the response contains a new access token
        access_token = refresh_data.get("access_token")
        assert isinstance(access_token, str) and access_token, "Access token not found in refresh response"
    except (requests.RequestException, AssertionError) as e:
        raise e

test_refresh_access_token_with_valid_refresh_token()
