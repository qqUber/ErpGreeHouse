import requests
import time

BASE_URL = "http://localhost:8000"
USERNAME = "admin"
PASSWORD = "admin"
TIMEOUT = 30


def test_update_existing_customer_with_valid_data():
    # Authenticate to get access token
    login_url = f"{BASE_URL}/api/v1/public/auth/login"
    login_payload = {"username": USERNAME, "password": PASSWORD}
    try:
        login_resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        access_token = login_resp.json().get("access_token")
        assert access_token, "Access token missing in login response"
    except Exception as e:
        assert False, f"Authentication failed with exception: {e}"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    # Create a new customer to update later, use unique phone number
    create_url = f"{BASE_URL}/api/v1/customers"
    unique_phone = f"+1234567{int(time.time() % 10000000):07d}"
    customer_data_create = {
        "full_name": "Test User To Update",
        "phone": unique_phone,
        "notes": "Initial notes"
    }

    customer_id = None
    try:
        create_resp = requests.post(create_url, headers=headers, json=customer_data_create, timeout=TIMEOUT)
        assert create_resp.status_code == 200, f"Customer creation failed: {create_resp.text}"
        created_customer = create_resp.json()
        customer_id = created_customer.get("id")
        assert customer_id, "Created customer ID is missing"

        # Prepare updated data
        updated_customer_data = {
            "full_name": "Updated Test User",
            "phone": "+1987654321",
            "notes": "Updated notes for testing"
        }

        # Update the created customer
        update_url = f"{BASE_URL}/api/v1/customers/{customer_id}"
        update_resp = requests.put(update_url, headers=headers, json=updated_customer_data, timeout=TIMEOUT)
        assert update_resp.status_code == 200, f"Customer update failed: {update_resp.text}"
        updated_customer = update_resp.json()

        # Validate that the returned updated customer matches the update data
        assert updated_customer.get("id") == customer_id, "Updated customer ID mismatch"
        assert updated_customer.get("full_name") == updated_customer_data["full_name"], "Full name not updated correctly"
        assert updated_customer.get("phone") == updated_customer_data["phone"], "Phone not updated correctly"
        assert updated_customer.get("notes") == updated_customer_data["notes"], "Notes not updated correctly"

    finally:
        # Cleanup: Delete the created customer
        if customer_id:
            try:
                delete_resp = requests.delete(f"{BASE_URL}/api/v1/customers/{customer_id}", headers=headers, timeout=TIMEOUT)
                # Deletion might be 200 or 204 depending on API implementation; accept both
                assert delete_resp.status_code in (200, 204), f"Customer deletion failed: {delete_resp.text}"
            except Exception:
                pass  # Ignore cleanup errors


test_update_existing_customer_with_valid_data()
