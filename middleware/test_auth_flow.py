#!/usr/bin/env python3
"""Test authentication flow script"""

import sys

import requests

BASE_URL = "http://localhost:8000"


def test_auth_flow():
    """Test the complete authentication flow"""
    print("Testing authentication flow...")

    # Test 1: Check authentication status
    print("\n1. Checking authentication status...")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/public/auth/status")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

    # Test 2: Try to login with valid credentials
    print("\n2. Testing login with valid credentials...")
    login_data = {"username": "admin", "password": "admin"}

    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/public/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"},
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")

        if response.status_code == 200:
            print("\nLogin successful!")

            # Check if we got access token in cookies
            access_token = response.cookies.get("access_token")
            if access_token:
                print(f"Access token received: {access_token[:50]}...")
            else:
                print("No access token in cookies")

            # Test 3: Try to access protected route
            print("\n3. Testing access to protected route...")
            headers = {}
            if access_token:
                headers["Cookie"] = f"access_token={access_token}"

            response = requests.get(f"{BASE_URL}/api/v1/auth/me", headers=headers)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.json()}")

            if response.status_code == 200:
                print("\nProtected route accessed successfully!")
            else:
                print("\nFailed to access protected route")

        else:
            print("\nLogin failed")

    except Exception as e:
        print(f"Error: {e}")

    # Test 4: Try to login with invalid credentials
    print("\n4. Testing login with invalid credentials...")
    invalid_login_data = {"username": "invalid", "password": "invalid"}

    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/public/auth/login",
            json=invalid_login_data,
            headers={"Content-Type": "application/json"},
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")

        if response.status_code == 401:
            print("\nInvalid credentials correctly rejected")
        else:
            print("\nInvalid credentials not rejected properly")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    print("=" * 50)
    print("Authentication Flow Test Script")
    print("=" * 50)

    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code != 200:
            print("\nServer is not responding correctly")
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
            sys.exit(1)
        else:
            print("\nServer is running")
    except Exception as e:
        print(f"\nFailed to connect to server: {e}")
        print("\nPlease make sure the backend server is running on port 8000")
        sys.exit(1)

    test_auth_flow()
    print("\n" + "=" * 50)
    print("Test completed")
    print("=" * 50)
