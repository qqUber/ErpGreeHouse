import requests

BASE_URL = "http://localhost:8000"
AUTH_LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
CUSTOMERS_URL = f"{BASE_URL}/api/v1/customers"

USERNAME = "admin"
PASSWORD = "admin"
TIMEOUT = 30


def test_update_existing_customer_with_valid_data():
    # Step 1: Authenticate and get access token
    login_payload = {"username": USERNAME, "password": PASSWORD}
    try:
        login_response = requests.post(AUTH_LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        login_response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Authentication failed: {e}"
    login_data = login_response.json()
    access_token = login_data.get("access")
    assert access_token, "No access token returned from login"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    # Create a new customer to update
    create_payload = {
        "full_name": "Initial Test User",
        "phone": "1234567890",
        "notes": "Test notes"
    }

    customer_id = None
    try:
        # Create customer
        create_response = requests.post(CUSTOMERS_URL, json=create_payload, headers=headers, timeout=TIMEOUT)
        create_response.raise_for_status()
        created_customer = create_response.json()
        customer_id = created_customer.get("id") or created_customer.get("_id") or created_customer.get("customer_id")
        assert customer_id, "Created customer ID is missing"

        # Prepare update data
        update_payload = {
            "full_name": "Updated Test User",
            "phone": "0987654321",
            "notes": "Updated notes"
        }

        # Update existing customer
        update_url = f"{CUSTOMERS_URL}/{customer_id}"
        update_response = requests.put(update_url, json=update_payload, headers=headers, timeout=TIMEOUT)
        update_response.raise_for_status()

        assert update_response.status_code == 200, f"Expected status 200, got {update_response.status_code}"
        updated_customer = update_response.json()

        # Verify updated fields
        assert updated_customer.get("full_name") == update_payload["full_name"], "full_name not updated correctly"
        assert updated_customer.get("phone") == update_payload["phone"], "phone not updated correctly"
        assert updated_customer.get("notes") == update_payload["notes"], "notes not updated correctly"
        # Optionally verify the ID remains the same
        assert updated_customer.get("id") == customer_id or updated_customer.get("_id") == customer_id, "Customer ID mismatch after update"

    finally:
        # Cleanup: delete created customer if exists
        if customer_id:
            try:
                delete_url = f"{CUSTOMERS_URL}/{customer_id}"
                requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
            except requests.RequestException:
                pass


test_update_existing_customer_with_valid_data()