import requests

BASE_URL = "http://localhost:8000"

def test_list_all_customers_with_valid_token():
    login_url = f"{BASE_URL}/api/v1/public/auth/login"
    customers_url = f"{BASE_URL}/api/v1/customers"
    auth_payload = {"username": "admin", "password": "admin"}
    timeout = 30

    try:
        # Authenticate and get token
        login_resp = requests.post(login_url, json=auth_payload, timeout=timeout)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        access_token = login_data.get("access_token")
        assert access_token, "No access_token found in login response"

        headers = {"Authorization": f"Bearer {access_token}"}

        # Call GET /api/v1/customers with valid token
        resp = requests.get(customers_url, headers=headers, timeout=timeout)
        assert resp.status_code == 200, f"Expected 200 but got {resp.status_code}"

        customers_list = resp.json()
        assert isinstance(customers_list, list), "Response is not a list of customers"

        # Further validate that each item is likely a Customer object (dict with expected keys)
        for customer in customers_list:
            assert isinstance(customer, dict), "Customer entry is not a dictionary"
            # At minimum expect keys like 'full_name', 'phone'
            assert "full_name" in customer, "Customer missing 'full_name' field"
            assert "phone" in customer, "Customer missing 'phone' field"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_list_all_customers_with_valid_token()
