import requests

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
CUSTOMERS_URL = f"{BASE_URL}/api/v1/customers"
TIMEOUT = 30

def test_list_all_customers_with_valid_token():
    # Authenticate and obtain access token
    auth_payload = {
        "username": "admin",
        "password": "admin"
    }
    try:
        login_response = requests.post(LOGIN_URL, json=auth_payload, timeout=TIMEOUT)
        assert login_response.status_code == 200, f"Login failed with status {login_response.status_code}"
        tokens = login_response.json()
        assert "access_token" in tokens, "Access token missing in login response"
        access_token = tokens["access_token"]
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    try:
        # Request list of customers
        response = requests.get(CUSTOMERS_URL, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
        customers = response.json()
        assert isinstance(customers, list), "Response is not a list"
        # Optionally check that each item is a dict representing a Customer object
        for customer in customers:
            assert isinstance(customer, dict), "Customer item is not a dict"
    except requests.RequestException as e:
        assert False, f"GET /api/v1/customers request failed: {e}"

test_list_all_customers_with_valid_token()
