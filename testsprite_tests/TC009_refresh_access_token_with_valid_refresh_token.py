import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:8000"
LOGIN_PATH = "/api/v1/public/auth/login"
REFRESH_PATH = "/api/v1/auth/refresh"
TIMEOUT = 30

def test_refresh_access_token_with_valid_refresh_token():
    login_url = BASE_URL + LOGIN_PATH
    refresh_url = BASE_URL + REFRESH_PATH
    username = "admin"
    password = "admin"
    login_payload = {
        "username": username,
        "password": password
    }
    try:
        # Step 1: Login to get refresh token
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status code {login_resp.status_code}"
        login_data = login_resp.json()
        assert "refresh" in login_data and isinstance(login_data["refresh"], str) and login_data["refresh"], "Refresh token missing or invalid in login response"

        refresh_token = login_data["refresh"]

        # Step 2: Use refresh token to get new access token
        headers = {
            "Authorization": f"Bearer {refresh_token}"
        }
        refresh_resp = requests.post(refresh_url, headers=headers, timeout=TIMEOUT)
        assert refresh_resp.status_code == 200, f"Refresh token request failed with status code {refresh_resp.status_code}"
        refresh_data = refresh_resp.json()
        assert "access" in refresh_data and isinstance(refresh_data["access"], str) and refresh_data["access"], "Access token missing or invalid in refresh response"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_refresh_access_token_with_valid_refresh_token()