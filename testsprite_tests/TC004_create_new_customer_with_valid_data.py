import requests
import uuid

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
CUSTOMERS_URL = f"{BASE_URL}/api/v1/customers"
USERNAME = "admin"
PASSWORD = "admin"
TIMEOUT = 30


def test_create_new_customer_with_valid_data():
    # Step 1: Authenticate and get access token
    auth_payload = {"username": USERNAME, "password": PASSWORD}
    try:
        auth_response = requests.post(LOGIN_URL, json=auth_payload, timeout=TIMEOUT)
        assert auth_response.status_code == 200, f"Login failed: {auth_response.text}"
        auth_json = auth_response.json()
        access_token = auth_json.get("access_token")
        assert access_token, "Missing access_token in login response"
    except requests.RequestException as e:
        assert False, f"Exception during login request: {e}"

    headers = {"Authorization": f"Bearer {access_token}"}

    # Step 2: Prepare valid customer data
    unique_suffix = str(uuid.uuid4().int)[:4]  # use digits only for phone
    customer_data = {
        "full_name": f"Test User {unique_suffix}",
        "phone": f"+1555000{unique_suffix}",
        "notes": "Created by automated test case TC004"
    }

    created_customer_id = None

    try:
        # Step 3: Send POST request to create customer
        create_response = requests.post(CUSTOMERS_URL, json=customer_data, headers=headers, timeout=TIMEOUT)
        assert create_response.status_code == 200, f"Expected 200 OK but got {create_response.status_code}: {create_response.text}"

        customer = create_response.json()
        # Validate response body contains expected fields matching request
        assert "full_name" in customer and customer["full_name"] == customer_data["full_name"], "full_name mismatch"
        assert "phone" in customer and customer["phone"] == customer_data["phone"], "phone mismatch"
        assert "notes" in customer and customer["notes"] == customer_data["notes"], "notes mismatch"
        assert "id" in customer and isinstance(customer["id"], (str, int)), "Missing or invalid customer id"

        created_customer_id = customer["id"]

    except requests.RequestException as e:
        assert False, f"Exception during create customer request: {e}"

    finally:
        # Step 4: Cleanup - delete the created customer if created
        if created_customer_id:
            try:
                delete_url = f"{CUSTOMERS_URL}/{created_customer_id}"
                delete_response = requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
                # Deletion may return 200 or 204 depending on API implementation
                assert delete_response.status_code in (200, 204), f"Failed to delete customer {created_customer_id}: {delete_response.status_code}, {delete_response.text}"
            except requests.RequestException as e:
                # Log deletion failure but don't fail test here since test passed creation
                print(f"Warning: Exception during cleanup delete request: {e}")


test_create_new_customer_with_valid_data()
