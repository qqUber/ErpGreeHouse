import requests

BASE_URL = "http://localhost:8000"
USERNAME = "admin"
PASSWORD = "admin"
TIMEOUT = 30

def test_list_all_products_with_valid_token():
    # Authenticate and get access token
    login_url = f"{BASE_URL}/api/v1/public/auth/login"
    login_payload = {"username": USERNAME, "password": PASSWORD}
    try:
        login_response = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        login_response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    login_data = login_response.json()
    access_token = login_data.get("access_token")
    assert access_token, "Access token not found in login response"

    # List all products
    products_url = f"{BASE_URL}/api/v1/products"
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        products_response = requests.get(products_url, headers=headers, timeout=TIMEOUT)
        products_response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"GET products request failed: {e}"

    assert products_response.status_code == 200, f"Expected status code 200, got {products_response.status_code}"

    products = products_response.json()
    assert isinstance(products, list), "Response should be a list"
    # If list is not empty, verify at least one product structure
    if products:
        product = products[0]
        assert isinstance(product, dict), "Each product should be a dict"
        # Basic keys expected in Product as per schema: name, price, description 
        assert "name" in product, "Product missing 'name' field"
        assert "price" in product, "Product missing 'price' field"
        assert "description" in product, "Product missing 'description' field"

test_list_all_products_with_valid_token()
