import requests
import uuid

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
PRODUCTS_URL = f"{BASE_URL}/api/v1/products"
USERNAME = "admin"
PASSWORD = "admin"
TIMEOUT = 30


def test_create_new_product_with_valid_data():
    # Authenticate to get access token
    login_payload = {
        "username": USERNAME,
        "password": PASSWORD
    }
    try:
        login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        login_resp.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"
    login_data = login_resp.json()
    access_token = login_data.get("access_token")
    assert access_token, "No access token received on login"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    # Prepare product data
    unique_suffix = str(uuid.uuid4())[:8]
    product_payload = {
        "name": f"Test Product {unique_suffix}",
        "price": 19.99,
        "description": "This is a test product created for test case TC007."
    }

    product_id = None
    try:
        # Create new product
        resp = requests.post(PRODUCTS_URL, json=product_payload, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected status code 200, got {resp.status_code}"
        product = resp.json()
        product_id = product.get("id") or product.get("product_id")
        assert product_id, "Created product does not have an ID"
        assert product.get("name") == product_payload["name"], "Product name mismatch"
        assert isinstance(product.get("price"), (int, float)) and product.get("price") == product_payload["price"], "Product price mismatch"
        assert product.get("description") == product_payload["description"], "Product description mismatch"
    finally:
        if product_id:
            # Clean up: delete created product
            try:
                delete_resp = requests.delete(f"{PRODUCTS_URL}/{product_id}", headers=headers, timeout=TIMEOUT)
                # It's okay if delete failed, just try best effort cleanup
            except requests.RequestException:
                pass


test_create_new_product_with_valid_data()
