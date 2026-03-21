import requests

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/v1/public/auth/login"
PRODUCTS_URL = f"{BASE_URL}/api/v1/products"
AUTH_CREDENTIALS = {"username": "admin", "password": "admin"}
TIMEOUT = 30

def test_list_all_products_with_valid_token():
    # Authenticate and get access token
    try:
        login_resp = requests.post(LOGIN_URL, json=AUTH_CREDENTIALS, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.status_code} {login_resp.text}"
        login_data = login_resp.json()
        access_token = login_data.get("access_token")
        assert access_token, "Access token not found in login response"
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        resp = requests.get(PRODUCTS_URL, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"GET /products request failed: {e}"

    assert resp.status_code == 200, f"Expected status 200, got {resp.status_code}"
    try:
        products = resp.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(products, list), f"Expected list of products, got {type(products)}"
    # Further validate each product item if needed
    for product in products:
        assert isinstance(product, dict), f"Each product should be a dict, got {type(product)}"
        # Check typical product fields present (name, price)
        assert "name" in product, "Product missing 'name' field"
        assert "price" in product, "Product missing 'price' field"
        assert isinstance(product["price"], (int, float)), "Product 'price' should be a number"


test_list_all_products_with_valid_token()
