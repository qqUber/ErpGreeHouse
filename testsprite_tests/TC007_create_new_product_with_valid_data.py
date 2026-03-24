import requests

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
PRODUCTS_URL = f"{BASE_URL}/api/v1/products"
TIMEOUT = 30

USERNAME = "admin"
PASSWORD = "admin"


def test_create_new_product_with_valid_data():
    # Authenticate and get access token
    try:
        login_resp = requests.post(
            LOGIN_URL,
            json={"username": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT,
        )
        assert login_resp.status_code == 200, "Login failed"
        login_data = login_resp.json()
        access_token = login_data.get("access_token")
        assert access_token, "No access token in login response"

        headers = {"Authorization": f"Bearer {access_token}"}

        # Prepare valid product data
        product_data = {
            "name": "Test Product TC007",
            "price": 19.99,
            "description": "This is a test product created by test case TC007"
        }

        # Create product
        create_resp = requests.post(
            PRODUCTS_URL,
            json=product_data,
            headers=headers,
            timeout=TIMEOUT,
        )

        assert create_resp.status_code == 200, f"Unexpected status code {create_resp.status_code}"
        product_resp_data = create_resp.json()
        # Validate returned product fields
        assert product_resp_data.get("name") == product_data["name"]
        assert float(product_resp_data.get("price", -1)) == product_data["price"]
        assert product_resp_data.get("description") == product_data["description"]
        assert "id" in product_resp_data, "Created product missing id"

    finally:
        # Cleanup: delete created product if creation succeeded and response had id
        if 'create_resp' in locals() and create_resp.status_code == 200:
            product_id = create_resp.json().get("id")
            if product_id:
                try:
                    requests.delete(
                        f"{PRODUCTS_URL}/{product_id}",
                        headers=headers,
                        timeout=TIMEOUT,
                    )
                except Exception:
                    pass


test_create_new_product_with_valid_data()