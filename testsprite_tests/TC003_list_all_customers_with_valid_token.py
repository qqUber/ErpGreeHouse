import requests

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
CUSTOMERS_URL = f"{BASE_URL}/api/v1/customers"
TIMEOUT = 30

def test_list_all_customers_with_valid_token():
    # Authenticate and get access token
    login_payload = {
        "username": "admin",
        "password": "admin"
    }
    try:
        login_response = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        login_response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"
    login_data = login_response.json()
    assert "access_token" in login_data, "Access token missing in login response"
    access_token = login_data["access_token"]

    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    try:
        response = requests.get(CUSTOMERS_URL, headers=headers, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"GET customers request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    customers = response.json()
    assert isinstance(customers, list), f"Expected response to be a list, got {type(customers)}"

    # Basic schema checks for Customer objects (dicts with expected keys)
    for customer in customers:
        assert isinstance(customer, dict), "Each customer should be a dictionary"
        # Based on typical Customer schema keys from PRD: at least full_name and phone expected
        assert "full_name" in customer, "Customer item missing 'full_name'"
        assert "phone" in customer, "Customer item missing 'phone'"

test_list_all_customers_with_valid_token()
