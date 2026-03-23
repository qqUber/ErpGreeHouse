import requests

BASE_URL = "http://localhost:8000"
TIMEOUT = 30
USERNAME = "admin"
PASSWORD = "admin"

def test_refresh_access_token_with_valid_refresh_token():
    login_url = f"{BASE_URL}/api/v1/public/auth/login"
    refresh_url = f"{BASE_URL}/api/v1/auth/refresh"

    # Step 1: Login to get refresh token
    try:
        login_resp = requests.post(
            login_url,
            json={"username": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT
        )
        login_resp.raise_for_status()
        login_data = login_resp.json()

        refresh_token = None
        if "refresh" in login_data and isinstance(login_data["refresh"], str):
            refresh_token = login_data["refresh"]
        elif "refresh_token" in login_data and isinstance(login_data["refresh_token"], str):
            refresh_token = login_data["refresh_token"]
        elif login_resp.cookies and "refresh" in login_resp.cookies:
            refresh_token = login_resp.cookies.get("refresh")

        assert refresh_token is not None and isinstance(refresh_token, str), "Missing refresh token in login response"

        assert "access" in login_data and isinstance(login_data["access"], str), "Missing access token in login response"

        # Step 2: Use refresh token to refresh access token
        headers = {"Authorization": f"Bearer {refresh_token}"}
        refresh_resp = requests.post(refresh_url, headers=headers, timeout=TIMEOUT)

        refresh_resp.raise_for_status()
        refresh_data = refresh_resp.json()

        assert refresh_resp.status_code == 200, f"Expected status 200 but got {refresh_resp.status_code}"
        assert "access" in refresh_data and isinstance(refresh_data["access"], str), "Missing new access token in refresh response"
    except requests.RequestException as e:
        raise AssertionError(f"HTTP request failed: {e}")
    except ValueError:
        raise AssertionError("Response is not valid JSON")

test_refresh_access_token_with_valid_refresh_token()
