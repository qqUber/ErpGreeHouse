"""
Master JWT Test Suite for ErpGreeHouse Middleware.
Validates authentication, authorization, token lifecycle, security, and performance.
"""

import os
import time
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import jwt
import pytest
from fastapi.testclient import TestClient

from app.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_admin_from_jwt,
    validate_access_token,
    validate_refresh_token,
)
from app.config import get_settings
from app.main import app

# --- Setup & Fixtures ---


@pytest.fixture
def client():
    """FastAPI TestClient for integration tests."""
    return TestClient(app)


@pytest.fixture
def mock_admin():
    """Mock admin user data."""
    return {"user_id": 1, "username": "test_master_admin", "role": "admin"}


@pytest.fixture
def settings():
    """Access application settings."""
    return get_settings()


# --- Unit Tests: Token Generation & Utils ---


class TestJWTUnit:
    """Unit tests for individual JWT utility functions."""

    def test_create_and_validate_access_token(self, mock_admin):
        """Verify access token generation and successful validation."""
        token = create_access_token(mock_admin)
        assert isinstance(token, str)

        payload = validate_access_token(token)
        assert payload is not None
        assert payload["sub"] == str(mock_admin["user_id"])
        assert payload["username"] == mock_admin["username"]
        assert payload["role"] == mock_admin["role"]
        assert payload["type"] == "access"

    def test_create_and_validate_refresh_token(self, mock_admin):
        """Verify refresh token generation and successful validation."""
        token = create_refresh_token(mock_admin)
        assert isinstance(token, str)

        payload = validate_refresh_token(token)
        assert payload is not None
        assert payload["sub"] == str(mock_admin["user_id"])
        assert payload["type"] == "refresh"

    def test_get_admin_from_jwt(self, mock_admin):
        """Test extraction of admin data from a valid JWT payload."""
        token = create_access_token(mock_admin)
        payload = validate_access_token(token)

        admin_data = get_admin_from_jwt(payload)
        assert admin_data["user_id"] == mock_admin["user_id"]
        assert admin_data["username"] == mock_admin["username"]
        assert admin_data["role"] == mock_admin["role"]
        assert "permissions" in admin_data


# --- Security Tests: Edge Cases & Error Handling ---


class TestJWTSecurity:
    """Security tests for JWT validation edge cases."""

    def test_expired_token(self, mock_admin, settings):
        """Ensure expired tokens are rejected."""
        # Create a token that expired 1 hour ago
        payload = {
            "sub": str(mock_admin["user_id"]),
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
            "iat": datetime.now(timezone.utc) - timedelta(hours=2),
            "type": "access",
        }
        token = jwt.encode(
            payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
        )

        # Validation should return None for expired tokens
        assert validate_access_token(token) is None

    def test_invalid_signature(self, mock_admin, settings):
        """Ensure tokens with incorrect signatures are rejected."""
        token = create_access_token(mock_admin)
        # Tamper with the signature by using a different key
        wrong_key = "completely_wrong_secret_key_12345"
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        tampered_token = jwt.encode(
            payload, wrong_key, algorithm=settings.jwt_algorithm
        )

        assert validate_access_token(tampered_token) is None

    def test_tampered_payload(self, mock_admin, settings):
        """Ensure tampered token payloads are rejected."""
        token = create_access_token(mock_admin)
        header, payload_b64, signature = token.split(".")

        # Decode, modify, and re-encode payload without re-signing
        import base64
        import json

        # Fix padding for base64 decode
        padding = "=" * (4 - len(payload_b64) % 4)
        decoded_payload = json.loads(base64.urlsafe_b64decode(payload_b64 + padding))
        decoded_payload["role"] = "owner"  # Escalate privileges

        new_payload_b64 = (
            base64.urlsafe_b64encode(json.dumps(decoded_payload).encode())
            .decode()
            .rstrip("=")
        )
        tampered_token = f"{header}.{new_payload_b64}.{signature}"

        assert validate_access_token(tampered_token) is None

    def test_malformed_token(self):
        """Ensure malformed token strings are rejected."""
        assert validate_access_token("not.a.token") is None
        assert validate_access_token("header.payload.signature.extra") is None
        assert validate_access_token("") is None

    def test_missing_claims(self, settings):
        """Ensure tokens missing required claims (sub, type) are rejected."""
        payload = {"username": "no_sub"}
        token = jwt.encode(
            payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
        )
        assert validate_access_token(token) is None


# --- Integration Tests: Real-world Auth Flows ---


class TestJWTIntegration:
    """Integration tests simulating real authentication flows."""

    @patch("app.admin_auth_api.get_db")
    def test_full_auth_cycle(self, mock_get_db, client, mock_admin):
        """Test login -> access protected route -> refresh -> access again."""
        # 1. Login - Mock DB response
        mock_conn = MagicMock()
        mock_get_db.return_value.connect.return_value = mock_conn

        # Mock user record from DB
        mock_row = {
            "id": mock_admin["user_id"],
            "username": mock_admin["username"],
            "password_hash": "mock_hash",
            "password_salt": "mock_salt",
            "password_iter": 1,
            "must_change_password": 0,
            "disabled": 0,
            "role": mock_admin["role"],
        }
        mock_conn.execute.return_value.fetchone.return_value = mock_row

        # Mock password verification
        with patch("app.admin_auth_api.hash_password", return_value="mock_hash"):
            login_resp = client.post(
                "/api/v1/public/auth/login",
                json={"username": mock_admin["username"], "password": "password123"},
            )

        assert login_resp.status_code == 200
        cookies = login_resp.cookies
        # JWT tokens are delivered via HTTPOnly cookies, not in JSON response
        access_token = cookies.get("access_token")
        refresh_token = cookies.get("refresh_token")
        assert access_token is not None, "access_token should be in cookies"
        assert refresh_token is not None, "refresh_token should be in cookies"

        # 2. Access protected route with cookies
        # Note: We need a real protected route. /api/v1/auth/me is a good candidate
        client.cookies.update(cookies)
        me_resp = client.get("/api/v1/auth/me")
        assert me_resp.status_code == 200
        assert me_resp.json()["username"] == mock_admin["username"]

        # 3. Refresh token
        # Mock the admin lookup for refresh
        with patch(
            "app.admin_auth_api._get_admin_by_id",
            return_value={
                "id": 1,
                "username": mock_admin["username"],
                "role": mock_admin["role"],
            },
        ):
            # Sleep a bit to ensure 'iat' claim changes if tokens are generated too fast
            time.sleep(1.1)
            refresh_resp = client.post("/api/v1/public/auth/refresh")

        assert refresh_resp.status_code == 200
        # Refresh returns tokens in cookies, not in JSON body
        new_cookies = refresh_resp.cookies
        new_access_token = new_cookies.get("access_token")
        assert (
            new_access_token is not None
        ), "access_token should be in cookies after refresh"
        # Token should be different because 'iat' changed
        assert new_access_token != access_token

        # 4. Access protected route with new cookie
        client.cookies.update(new_cookies)
        me_resp_after = client.get("/api/v1/auth/me")
        assert me_resp_after.status_code == 200

    def test_protected_route_unauthorized(self, client):
        """Verify that accessing protected routes without tokens returns 401."""
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401


# --- Performance Tests ---


class TestJWTPerformance:
    """Basic performance benchmarks for token operations."""

    def test_token_generation_speed(self, mock_admin):
        """Measure speed of generating 1000 tokens."""
        start_time = time.time()
        iterations = 1000
        for _ in range(iterations):
            create_access_token(mock_admin)
        end_time = time.time()

        avg_time = (end_time - start_time) / iterations
        print(f"\nAverage token generation time: {avg_time*1000:.4f}ms")
        # Assert generation is reasonably fast (e.g., < 100ms per token is safe for most environments)
        assert avg_time < 0.1  # < 100ms per token

    def test_token_validation_speed(self, mock_admin):
        """Measure speed of validating 1000 tokens."""
        token = create_access_token(mock_admin)
        start_time = time.time()
        iterations = 1000
        for _ in range(iterations):
            validate_access_token(token)
        end_time = time.time()

        avg_time = (end_time - start_time) / iterations
        print(f"\nAverage token validation time: {avg_time*1000:.4f}ms")
        assert avg_time < 0.1  # < 100ms per validation


if __name__ == "__main__":
    pytest.main([__file__])
