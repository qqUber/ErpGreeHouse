
import os
import sys
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

# Add middleware to path
sys.path.insert(0, os.path.join(os.getcwd(), 'middleware'))

logging.basicConfig(level=logging.INFO)

# Mock settings
class Settings:
    jwt_secret_key = "test-secret-key"
    jwt_algorithm = "HS256"
    jwt_access_token_expire_minutes = 30
    admin_secret = "test-secret-key"
    jwt_refresh_token_expire_days = 7

def get_settings():
    return Settings()

# Mock DB
class MockDB:
    def connect(self):
        return self
    def execute(self, query, params=None):
        return self
    def fetchone(self):
        return None
    def fetchall(self):
        return []
    def close(self):
        pass

import app.auth as auth
import app.admin_auth_api as admin_auth_api

# Monkey patch get_settings and get_db
auth.get_settings = get_settings
auth.get_db = lambda: MockDB()
admin_auth_api.get_settings = get_settings
admin_auth_api.get_db = lambda: MockDB()

# Test Logic
def test_owner_permission():
    print("Testing owner permission...")
    
    # 1. Create token for owner
    admin_data = {
        "user_id": 1,
        "username": "admin",
        "role": "owner"
    }
    
    token = auth.create_access_token(admin_data)
    print(f"Token created: {token[:20]}...")
    
    # 2. Validate token
    payload = auth.validate_access_token(token)
    print(f"Payload: {payload}")
    
    if not payload:
        print("Token validation failed!")
        return

    # 3. Get admin from JWT
    admin = auth.get_admin_from_jwt(payload)
    print(f"Admin from JWT: {admin}")
    
    # 4. Check permission
    try:
        auth.check_permission(admin, "dashboard.read")
        print("Permission check passed!")
    except Exception as e:
        print(f"Permission check failed: {e}")

if __name__ == "__main__":
    test_owner_permission()
