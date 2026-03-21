import requests
import uuid

BASE_URL = "http://localhost:8000"
LOGIN_ENDPOINT = "/api/v1/public/auth/login"
CUSTOMERS_ENDPOINT = "/api/v1/customers"
TIMEOUT = 30

USERNAME = "admin"
PASSWORD = "admin"

def get_access_token():
    url = BASE_URL + LOGIN_ENDPOINT
    body = {
        "username": USERNAME,
        "password": PASSWORD
    }
    resp = requests.post(url, json=body, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Login failed with status {resp.status_code}"
    data = resp.json()
    access_token = data.get("access_token")
    assert access_token is not None, "Access token not found in login response"
    return access_token

def create_customer(access_token, full_name=None, phone=None, notes=None):
    url = BASE_URL + CUSTOMERS_ENDPOINT
    if full_name is None:
        full_name = "Test User " + str(uuid.uuid4())
    if phone is None:
        phone = "+1234567890"
    if notes is None:
        notes = "Created for testing."

    body = {
        "full_name": full_name,
        "phone": phone,
        "notes": notes
    }

    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    resp = requests.post(url, json=body, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Failed to create customer, status {resp.status_code}"
    return resp.json()

def delete_customer(access_token, customer_id):
    url = f"{BASE_URL}{CUSTOMERS_ENDPOINT}/{customer_id}"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    resp = requests.delete(url, headers=headers, timeout=TIMEOUT)
    # Deletion success expected to be 200 or 204 (not specified in PRD)
    assert resp.status_code in (200,204), f"Failed to delete customer id {customer_id}, status {resp.status_code}"

def test_TC005_update_existing_customer_with_valid_data():
    access_token = get_access_token()
    created_customer = create_customer(access_token)
    customer_id = created_customer.get("id")
    assert customer_id is not None, "Created customer id is None"

    update_url = f"{BASE_URL}{CUSTOMERS_ENDPOINT}/{customer_id}"
    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    updated_data = {
        "full_name": created_customer.get("full_name", "") + " Updated",
        "phone": created_customer.get("phone", ""),
        "notes": created_customer.get("notes", "") + " Updated notes."
    }

    try:
        resp = requests.put(update_url, json=updated_data, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Update customer failed with status {resp.status_code}"
        updated_customer = resp.json()

        # Validate updated fields
        assert updated_customer.get("id") == customer_id, "Customer ID mismatch after update"
        assert updated_customer.get("full_name") == updated_data["full_name"], "full_name not updated correctly"
        assert updated_customer.get("phone") == updated_data["phone"], "phone not updated correctly"
        assert updated_customer.get("notes") == updated_data["notes"], "notes not updated correctly"

    finally:
        # Clean up by deleting the created customer
        delete_customer(access_token, customer_id)

test_TC005_update_existing_customer_with_valid_data()
