import requests

BASE_URL = "http://localhost:8000"
LOGIN_ENDPOINT = "/api/v1/public/auth/login"
TIMEOUT = 30


def test_user_login_with_valid_credentials():
    url = BASE_URL + LOGIN_ENDPOINT
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
        json_response = response.json()
        assert "access_token" in json_response, "Response JSON does not contain 'access_token'"
        assert "refresh_token" in json_response, "Response JSON does not contain 'refresh_token'"
        assert isinstance(json_response["access_token"], str) and len(json_response["access_token"]) > 0, "Invalid access_token value"
        assert isinstance(json_response["refresh_token"], str) and len(json_response["refresh_token"]) > 0, "Invalid refresh_token value"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"


test_user_login_with_valid_credentials()