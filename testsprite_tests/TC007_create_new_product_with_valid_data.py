import requests

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
PRODUCTS_URL = f"{BASE_URL}/api/v1/products"
TIMEOUT = 30

def test_create_new_product_with_valid_data():
    # Step 1: Authenticate to get access token
    auth_payload = {
        "username": "admin",
        "password": "admin"
    }
    try:
        login_resp = requests.post(LOGIN_URL, json=auth_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_json = login_resp.json()
        access_token = login_json.get("access_token")
        assert access_token and isinstance(access_token, str), "Access token missing or invalid"

        # Step 2: Create a new product with valid data
        product_payload = {
            "name": "Test Product TC007",
            "price": 19.99,
            "description": "This is a test product created during automated testing."
        }
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        post_resp = requests.post(PRODUCTS_URL, json=product_payload, headers=headers, timeout=TIMEOUT)
        assert post_resp.status_code == 200, f"Product creation failed with status {post_resp.status_code}"
        product = post_resp.json()
        assert isinstance(product, dict), "Response is not a JSON object"
        assert product.get("name") == product_payload["name"], "Product name mismatch"
        assert abs(product.get("price", 0) - product_payload["price"]) < 0.001, "Product price mismatch"
        assert product.get("description") == product_payload["description"], "Product description mismatch"
        assert "id" in product and isinstance(product["id"], (int, str)), "Product ID missing or invalid"
    finally:
        # Step 3: Clean up - delete the created product if exists
        if 'product' in locals() and product.get("id"):
            try:
                headers_del = {
                    "Authorization": f"Bearer {access_token}"
                }
                del_resp = requests.delete(f"{PRODUCTS_URL}/{product['id']}", headers=headers_del, timeout=TIMEOUT)
                # Deletion might return 200 or 204 for success, accept either
                assert del_resp.status_code in [200, 204], f"Cleanup deletion failed with status {del_resp.status_code}"
            except Exception:
                pass

test_create_new_product_with_valid_data()
