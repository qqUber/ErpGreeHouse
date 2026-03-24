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
        # Assert status code
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        
        json_data = response.json()
        
        # Assert presence of access_token and refresh_token
        assert "access_token" in json_data, "Response JSON missing 'access_token' token"
        assert isinstance(json_data["access_token"], str) and len(json_data["access_token"]) > 0, "'access_token' token is invalid"
        assert "refresh_token" in json_data, "Response JSON missing 'refresh_token' token"
        assert isinstance(json_data["refresh_token"], str) and len(json_data["refresh_token"]) > 0, "'refresh_token' token is invalid"
        
    except requests.Timeout:
        assert False, "Request timed out"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    except ValueError:
        assert False, "Response is not valid JSON"

test_user_login_with_valid_credentials()
