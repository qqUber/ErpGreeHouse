import requests

BASE_URL = "http://localhost:8000"
LOGIN_PATH = "/api/v1/public/auth/login"
TIMEOUT = 30


def test_user_login_with_valid_credentials():
    url = BASE_URL + LOGIN_PATH
    payload = {
        "username": "admin",
        "password": "admin"
    }
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        data = response.json()
        # Validate presence of access and refresh tokens in response body
        assert "access_token" in data, "Missing access token in response"
        assert "refresh_token" in data, "Missing refresh token in response"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"


test_user_login_with_valid_credentials()