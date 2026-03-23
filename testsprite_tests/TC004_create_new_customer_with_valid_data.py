import requests
import uuid

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
CUSTOMERS_URL = f"{BASE_URL}/api/v1/customers"

USERNAME = "admin"
PASSWORD = "admin"
TIMEOUT = 30

def test_create_new_customer_with_valid_data():
    # Step 1: Authenticate and obtain access token
    try:
        login_resp = requests.post(
            LOGIN_URL,
            json={"username": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT,
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        access_token = login_data.get("access_token")
        assert access_token is not None, "No access token returned"

        headers = {"Authorization": f"Bearer {access_token}"}

        # Step 2: Create a new customer with unique phone to avoid conflicts
        unique_phone = "+1234567" + str(uuid.uuid4().int)[:7]
        new_customer_payload = {
            "full_name": "John Doe",
            "phone": unique_phone,
            "notes": "Test customer created by automated test"
        }

        create_resp = requests.post(
            CUSTOMERS_URL,
            json=new_customer_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert create_resp.status_code == 200, f"Customer creation failed: {create_resp.text}"
        customer = create_resp.json()
        # Validate response fields
        assert customer.get("full_name") == new_customer_payload["full_name"], "full_name mismatch"
        assert customer.get("phone") == new_customer_payload["phone"], "phone mismatch"
        assert customer.get("notes") == new_customer_payload["notes"], "notes mismatch"
        assert "id" in customer and isinstance(customer["id"], str), "Missing or invalid customer id"

    finally:
        # Cleanup: delete the created customer if creation succeeded
        if 'customer' in locals() and "id" in customer:
            try:
                delete_resp = requests.delete(
                    f"{CUSTOMERS_URL}/{customer['id']}",
                    headers=headers,
                    timeout=TIMEOUT,
                )
                # We do not assert here since it is cleanup, but log failure if needed
                if delete_resp.status_code not in (200, 204):
                    print(f"Warning: Failed to delete customer {customer['id']} after test")
            except Exception as e:
                print(f"Warning: Exception during cleanup deleting customer {customer['id']}: {e}")

test_create_new_customer_with_valid_data()
