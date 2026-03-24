import requests

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
PRODUCTS_URL = f"{BASE_URL}/api/v1/products"
TIMEOUT = 30

def test_list_all_products_with_valid_token():
    # Authenticate to get access token
    login_payload = {
        "username": "admin",
        "password": "admin"
    }
    try:
        login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status code {login_resp.status_code}"
        login_json = login_resp.json()
        assert "access_token" in login_json, "Access token missing in login response"
        access_token = login_json["access_token"]

        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        resp = requests.get(PRODUCTS_URL, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}"

        products = resp.json()
        assert isinstance(products, list), "Response is not a list"

        # Optional: Check each item in list has at least expected keys in Product object
        # Assuming Product object has keys: id, name, price, description (inferred from create endpoint)
        for product in products:
            assert isinstance(product, dict), "Product item is not a dict"
            assert "name" in product, "Product missing 'name'"
            assert "price" in product, "Product missing 'price'"
            assert "description" in product, "Product missing 'description'"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_list_all_products_with_valid_token()
