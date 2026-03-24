import requests

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
CUSTOMERS_URL = f"{BASE_URL}/api/v1/customers"

USERNAME = "admin"
PASSWORD = "admin"
TIMEOUT = 30


def test_create_new_customer_with_valid_data():
    # Step 1: Login to get access token
    login_payload = {
        "username": USERNAME,
        "password": PASSWORD
    }
    try:
        login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        login_resp.raise_for_status()
    except Exception as e:
        assert False, f"Login request failed: {e}"
    login_data = login_resp.json()
    access_token = login_data.get("access_token")
    assert access_token and isinstance(access_token, str), "Access token missing or invalid in login response"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    # Step 2: Create a new customer with valid data
    customer_payload = {
        "full_name": "Test User",
        "phone": "+1234567890",
        "notes": "Created during automated test"
    }
    try:
        create_resp = requests.post(CUSTOMERS_URL, json=customer_payload, headers=headers, timeout=TIMEOUT)
        create_resp.raise_for_status()
    except Exception as e:
        assert False, f"Create customer request failed: {e}"

    # Step 3: Validate response
    assert create_resp.status_code == 200, f"Expected 200 OK, got {create_resp.status_code}"
    customer = create_resp.json()
    # Validate returned Customer object fields
    assert isinstance(customer, dict), "Response is not a JSON object"
    for field in ("id", "full_name", "phone", "notes"):
        assert field in customer, f"Field '{field}' missing in customer response"
    assert customer["full_name"] == customer_payload["full_name"], "full_name mismatch"
    assert customer["phone"] == customer_payload["phone"], "phone mismatch"
    assert customer["notes"] == customer_payload["notes"], "notes mismatch"


test_create_new_customer_with_valid_data()
