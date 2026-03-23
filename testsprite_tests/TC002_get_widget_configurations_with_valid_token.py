import requests

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
WIDGETS_URL = f"{BASE_URL}/api/v1/dashboard/widgets"
TIMEOUT = 30

def test_get_widget_configurations_with_valid_token():
    login_payload = {
        "username": "admin",
        "password": "admin"
    }
    try:
        # Authenticate and get access token
        login_response = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        assert login_response.status_code == 200, f"Login failed with status code {login_response.status_code}"
        login_data = login_response.json()
        access_token = login_data.get("access_token")
        assert access_token, "Access token not found in login response"

        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        # Get widget configurations
        widgets_response = requests.get(WIDGETS_URL, headers=headers, timeout=TIMEOUT)
        assert widgets_response.status_code == 200, f"Failed to get widgets. Status code: {widgets_response.status_code}"

        widgets_data = widgets_response.json()
        assert isinstance(widgets_data, list), "Widgets response is not a list"

        # Optionally check for dicts inside list (WidgetConfig objects)
        for widget in widgets_data:
            assert isinstance(widget, dict), "WidgetConfig item is not a dictionary"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_widget_configurations_with_valid_token()
