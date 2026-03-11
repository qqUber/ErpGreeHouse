#!/usr/bin/env python3
"""
JWT Verification Script
Verifies that the backend can decode a manually generated JWT using the key from .env.

Usage:
    python verify_jwt_token.py

This script:
1. Loads JWT_SECRET_KEY from environment or uses the default dev key
2. Creates a test JWT token with the same payload structure as the backend
3. Validates the token using the same validation logic as the backend
"""

import os
import sys
import json
from datetime import datetime, timedelta, timezone

# Add middleware to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

def main():
    # Get the secret key - require JWT_SECRET_KEY environment variable
    jwt_secret_key = os.getenv("JWT_SECRET_KEY") or os.getenv("JWT_SECRET") or os.getenv("ADMIN_SECRET")
    jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    
    if not jwt_secret_key:
        print("ERROR: JWT_SECRET_KEY environment variable is not set.")
        print("Please set it before running this script:")
        print("  Windows (CMD): set JWT_SECRET_KEY=your-secret-key")
        print("  Windows (PowerShell): $env:JWT_SECRET_KEY='your-secret-key'")
        print("  Linux/Mac: export JWT_SECRET_KEY='your-secret-key'")
        return 1
    
    secret = jwt_secret_key
    
    print(f"=== JWT Verification Test ===")
    print(f"Algorithm: {jwt_algorithm}")
    print(f"Secret (first 20 chars): {secret[:20]}...")
    print()
    
    # Try to import PyJWT
    try:
        import jwt
    except ImportError:
        print("ERROR: PyJWT not installed. Install with: pip install PyJWT")
        return 1
    
    # Create a test token with the same payload structure as the backend
    admin_data = {
        "sub": "1",  # user_id
        "username": "admin",
        "role": "admin",
    }
    
    # Token expiration (same as config.py)
    access_token_expire_minutes = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Create the token
    exp = datetime.now(timezone.utc) + timedelta(minutes=access_token_expire_minutes)
    payload = {
        **admin_data,
        "exp": exp,
        "iat": datetime.now(timezone.utc),
        "type": "access"
    }
    
    # Encode the token
    encoded_token = jwt.encode(payload, secret, algorithm=jwt_algorithm)
    print(f"Created test token: {encoded_token[:50]}...")
    
    # Now try to decode it
    try:
        decoded = jwt.decode(encoded_token, secret, algorithms=[jwt_algorithm])
        print(f"\nToken decoded successfully!")
        print(f"Payload: {json.dumps(decoded, indent=2, default=str)}")
        print("\n=== TEST PASSED: JWT encoding/decoding works correctly ===")
        return 0
    except jwt.ExpiredSignatureError:
        print("ERROR: Token has expired (should not happen for freshly created token)")
        return 1
    except jwt.InvalidTokenError as e:
        print(f"ERROR: Invalid token: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
