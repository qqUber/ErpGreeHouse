import requests

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
WIDGETS_URL = f"{BASE_URL}/api/v1/dashboard/widgets"

USERNAME = "admin"
PASSWORD = "admin"
TIMEOUT = 30

def test_get_widget_configurations_with_valid_token():
    try:
        # Step 1: Login to get access token
        login_response = requests.post(
            LOGIN_URL,
            json={"username": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        login_data = login_response.json()
        assert "access_token" in login_data, "Access token missing in login response"
        access_token = login_data["access_token"]

        # Step 2: Get widget configurations using access token
        headers = {"Authorization": f"Bearer {access_token}"}
        widgets_response = requests.get(
            WIDGETS_URL,
            headers=headers,
            timeout=TIMEOUT
        )
        assert widgets_response.status_code == 200, f"Widgets request failed: {widgets_response.text}"

        widgets_data = widgets_response.json()
        assert isinstance(widgets_data, list), f"Expected list of WidgetConfig objects, got {type(widgets_data)}"

        # Optionally check elements have expected keys if known (not defined in PRD)
        # Just verify elements are dicts as WidgetConfig objects (presumed)
        for widget in widgets_data:
            assert isinstance(widget, dict), f"WidgetConfig should be dict, found {type(widget)}"

    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

test_get_widget_configurations_with_valid_token()