import sys

import requests

BASE_URL = "http://localhost:8000"


def check(url):
    try:
        r = requests.get(url)
        print(f"{url}: {r.status_code}")
        if r.status_code != 200:
            print(f"Response: {r.text}")
    except Exception as e:
        print(f"{url}: Error {e}")


print("Checking endpoints...")
check(f"{BASE_URL}/api/v1/public/status")
check(f"{BASE_URL}/api/v1/public/auth/status")
