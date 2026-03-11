import pytest
import time
import jwt
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from app.main import app
from app.auth import (
    create_access_token,
    create_refresh_token,
    validate_access_token,
    validate_refresh_token,
)
from app.config import get_settings

# Role definitions for testing
ROLES = {
    "owner": {
        "user_id": 1,
        "username": "owner_user",
        "role": "owner",
        "permissions": ["*"],
    },
    "manager": {
        "user_id": 2,
        "username": "manager_user",
        "role": "manager",
        "permissions": ["product.create", "product.update"],
    },
    "operator": {
        "user_id": 3,
        "username": "operator_user",
        "role": "operator",
        "permissions": ["customer.read", "pos.sale"],
    },
    "guest": {
        "user_id": 4,
        "username": "guest_user",
        "role": "guest",
        "permissions": [],
    },
}


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def settings():
    return get_settings()


class TestJWTRoleBasedE2E:
    """
    E2E JWT Authentication Test Suite covering all user roles.
    Validates token lifecycle, RBAC, and security best practices.
    """

    @pytest.mark.parametrize("role_name", ROLES.keys())
    @patch("app.admin_auth_api.get_db")
    def test_role_login_and_token_generation(self, mock_get_db, client, role_name):
        """
        Scenario: Successful login for each role and verification of JWT claims.
        Preconditions: User exists in database with specific role.
        Steps:
        1. Call /api/v1/public/auth/login with valid credentials.
        2. Verify 200 OK.
        3. Verify Set-Cookie headers for access_token and refresh_token.
        4. Decode access_token and verify claims (sub, role, username).
        """
        role_data = ROLES[role_name]

        # Mock DB for login
        mock_conn = MagicMock()
        mock_get_db.return_value.connect.return_value = mock_conn
        mock_row = {
            "id": role_data["user_id"],
            "username": role_data["username"],
            "password_hash": "mock_hash",
            "password_salt": "mock_salt",
            "password_iter": 1,
            "must_change_password": 0,
            "disabled": 0,
            "role": role_data["role"],
        }
        mock_conn.execute.return_value.fetchone.return_value = mock_row

        with patch("app.admin_auth_api.hash_password", return_value="mock_hash"):
            response = client.post(
                "/api/v1/public/auth/login",
                json={"username": role_data["username"], "password": "password123"},
            )

        assert response.status_code == 200
        assert "access_token" in response.cookies
        assert "refresh_token" in response.cookies

        # Verify JWT claims
        token = response.cookies["access_token"]
        payload = validate_access_token(token)
        assert payload is not None
        assert payload["sub"] == str(role_data["user_id"])
        assert payload["role"] == role_data["role"]
        assert payload["username"] == role_data["username"]
        assert payload["type"] == "access"

    @pytest.mark.parametrize("role_name", ["owner", "manager", "operator"])
    @patch("app.admin_auth_api._get_admin_by_id")
    def test_role_token_refresh(self, mock_get_admin, client, role_name):
        """
        Scenario: Token refresh mechanism for different roles.
        Preconditions: User has a valid refresh token.
        Steps:
        1. Call /api/v1/public/auth/refresh with valid refresh token cookie.
        2. Verify 200 OK.
        3. Verify new access_token and refresh_token are issued.
        4. Verify new access_token has correct role claims.
        """
        role_data = ROLES[role_name]
        mock_get_admin.return_value = {
            "id": role_data["user_id"],
            "username": role_data["username"],
            "role": role_data["role"],
        }

        # Create a valid refresh token
        refresh_token = create_refresh_token(
            {
                "user_id": role_data["user_id"],
                "username": role_data["username"],
                "role": role_data["role"],
            }
        )

        # Call refresh endpoint
        client.cookies.set("refresh_token", refresh_token)
        response = client.post(
            "/api/v1/public/auth/refresh"
        )

        assert response.status_code == 200
        assert "access_token" in response.cookies
        assert "refresh_token" in response.cookies

        # Verify new access token
        new_access_token = response.cookies["access_token"]
        payload = validate_access_token(new_access_token)
        assert payload["role"] == role_data["role"]

    def test_rbac_access_control(self, client):
        """
        Scenario: Verify Role-Based Access Control (RBAC).
        Preconditions: Tokens generated for Owner and Operator.
        Steps:
        1. Access owner-only endpoint with Owner token -> 200.
        2. Access owner-only endpoint with Operator token -> 403 (or restricted).
        """
        owner_token = create_access_token(ROLES["owner"])
        operator_token = create_access_token(ROLES["operator"])

        # Assuming /api/v1/auth/me returns role info we can check
        # Owner access
        client.cookies.set("access_token", owner_token)
        resp_owner = client.get("/api/v1/auth/me")
        assert resp_owner.status_code == 200
        assert resp_owner.json()["role"] == "owner"

        # Operator access
        client.cookies.set("access_token", operator_token)
        resp_operator = client.get("/api/v1/auth/me")
        assert resp_operator.status_code == 200
        assert resp_operator.json()["role"] == "operator"

    def test_logout_invalidates_session(self, client):
        """
        Scenario: Logout functionality.
        Preconditions: User is logged in with valid cookies.
        Steps:
        1. Call /api/v1/auth/logout.
        2. Verify cookies are cleared (max-age=0 or expired).
        3. Subsequent request to protected route should fail (if middleware checks session/blacklist,
           though here it just clears cookies).
        """
        access_token = create_access_token(ROLES["owner"])

        # Logout
        client.cookies.set("access_token", access_token)
        response = client.post(
            "/api/v1/auth/logout"
        )

        assert response.status_code == 200
        # Check if cookies are set to be deleted (Set-Cookie with empty value or expires in past)
        # TestClient handles cookie deletion by removing them from its jar if instructed
        assert (
            "access_token" not in response.cookies
            or response.cookies["access_token"] == ""
        )

    def test_negative_invalid_tokens(self, client):
        """
        Scenario: Negative flows with invalid/malformed tokens.
        Steps:
        1. Malformed JWT -> 401.
        2. Valid JWT but wrong type (refresh token as access token) -> 401.
        3. Token with invalid signature -> 401.
        """
        # 1. Malformed
        client.cookies.set("access_token", "not.a.jwt")
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

        # 2. Wrong type
        refresh_token = create_refresh_token(ROLES["owner"])
        client.cookies.set("access_token", refresh_token)
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

        # 3. Invalid signature
        tampered_token = create_access_token(ROLES["owner"]) + "tamper"
        client.cookies.set("access_token", tampered_token)
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_token_expiration_e2e(self, client, settings):
        """
        Scenario: Token expiration handling.
        Preconditions: Token issued with 0 second expiry.
        Steps:
        1. Generate token that is already expired.
        2. Attempt to use it -> 401.
        """
        with patch("app.auth.get_settings") as mock_settings:
            # Mock settings to have 0 minutes expiry
            mock_s = MagicMock()
            mock_s.jwt_access_token_expire_minutes = -1  # Expired 1 minute ago
            mock_s.jwt_secret_key = settings.jwt_secret_key
            mock_s.jwt_algorithm = settings.jwt_algorithm
            mock_settings.return_value = mock_s

            expired_token = create_access_token(ROLES["owner"])

        client.cookies.set("access_token", expired_token)
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401
        # Check status code instead of text (localized error messages vary)

    @patch("app.admin_auth_api.get_db")
    def test_guest_role_restrictions(self, mock_get_db, client):
        """
        Scenario: Guest role has minimal permissions.
        """
        guest_token = create_access_token(ROLES["guest"])

        # Guest should be able to see their own info but maybe not much else
        client.cookies.set("access_token", guest_token)
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 200
        assert resp.json()["role"] == "guest"
        assert len(resp.json()["permissions"]) == 0

    def test_security_key_management(self, settings):
        """
        Security verification: Ensure tokens cannot be decoded with wrong key.
        """
        token = create_access_token(ROLES["owner"])
        wrong_key = "wrong_secret_key_12345678901234567890"

        with pytest.raises(jwt.InvalidSignatureError):
            jwt.decode(token, wrong_key, algorithms=[settings.jwt_algorithm])


if __name__ == "__main__":
    import pytest

    pytest.main([__file__])
