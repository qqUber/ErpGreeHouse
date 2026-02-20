import httpx
import sys
import random

base_url = "http://localhost:8000"
username = sys.argv[1]
password = sys.argv[2]

try:
    client = httpx.Client()
    # Login
    resp = client.post(f"{base_url}/api/v1/public/auth/login", json={"username": username, "password": password})
    print(f"Login Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"Login Response: {resp.text}")
        sys.exit(1)
    
    # Create Customer
    phone = f"7999{random.randint(1000000, 9999999)}"
    print(f"Creating customer with phone: {phone}")
    payload = {"full_name": f"Test User {phone}", "phone": phone}
    resp = client.post(f"{base_url}/api/v1/customers", json=payload)
    print(f"Create Customer Status: {resp.status_code}")
    print(f"Create Customer Response: {resp.text}")

except Exception as e:
    print(f"Error: {e}")
