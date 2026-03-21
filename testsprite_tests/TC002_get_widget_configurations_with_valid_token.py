import requests
from requests.exceptions import RequestException

BASE_URL = "http://localhost:8000"
LOGIN_ENDPOINT = "/api/v1/public/auth/login"
WIDGETS_ENDPOINT = "/api/v1/dashboard/widgets"
USERNAME = "admin"
PASSWORD = "admin"
TIMEOUT = 30

def test_get_widget_configurations_with_valid_token():
    access_token = None
    try:
        # Step 1: Obtain access token via login
        login_resp = requests.post(
            f"{BASE_URL}{LOGIN_ENDPOINT}",
            json={"username": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        assert "access_token" in login_data, "access_token not in login response"
        access_token = login_data["access_token"]

        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        # Step 2: Call GET /api/v1/dashboard/widgets with valid token
        widgets_resp = requests.get(
            f"{BASE_URL}{WIDGETS_ENDPOINT}",
            headers=headers,
            timeout=TIMEOUT
        )
        assert widgets_resp.status_code == 200, f"Expected 200 OK, got {widgets_resp.status_code}"

        widgets_data = widgets_resp.json()
        assert isinstance(widgets_data, list), "Response is not a list"
        # Optionally further validate each WidgetConfig object if schema detail is known
    except RequestException as e:
        assert False, f"Request failed: {e}"

test_get_widget_configurations_with_valid_token()
