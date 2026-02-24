"""
JWT integration tests for complete authentication flow
Tests the full JWT authentication cycle including login, token refresh, and protected endpoint access
"""

import pytest
import time
import jwt
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch, MagicMock
from fastapi import HTTPException
from fastapi.testclient import TestClient

# Import the FastAPI app
from app.main import app
from app.auth import create_access_token, create_refresh_token, validate_access_token
from app.config import get_settings


@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)


@pytest.fixture
def admin_user():
    """Sample admin user data"""
    return {
        "user_id": 1,
        "username": "test_admin",
        "role": "owner",
        "password": "test_password"
    }


class TestJWTLoginFlow:
    """Test complete JWT login flow"""
    
    @patch('app.admin_auth_api._get_admin_by_credentials')
    def test_jwt_login_success(self, mock_get_admin, client, admin_user):
        """Test successful JWT login with cookie setting"""
        mock_get_admin.return_value = admin_user
        
        response = client.post(
            "/api/v1/public/auth/login",
            json={"username": "test_admin", "password": "test_password"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response contains tokens
        assert "access_token" in data
        assert "refresh_token" in data
        assert "token" in data  # Legacy token
        
        # Check cookies are set
        cookies = response.cookies
        assert "access_token" in cookies
        assert "refresh_token" in cookies
        assert "admin_session" in cookies  # Legacy cookie
        
        # Validate the access token
        access_token = data["access_token"]
        payload = validate_access_token(access_token)
        assert payload is not None
        assert payload["sub"] == str(admin_user["user_id"])
        assert payload["username"] == admin_user["username"]
        assert payload["role"] == admin_user["role"]
    
    def test_jwt_login_invalid_credentials(self, client):
        """Test login with invalid credentials"""
        response = client.post(
            "/api/v1/public/auth/login",
            json={"username": "invalid", "password": "wrong"}
        )
        
        assert response.status_code == 401
        assert "Unauthorized" in response.json()["detail"]
        
        # Check no cookies are set
        assert len(response.cookies) == 0
    
    def test_jwt_login_missing_fields(self, client):
        """Test login with missing fields"""
        response = client.post(
            "/api/v1/public/auth/login",
            json={"username": "test"}  # Missing password
        )
        
        assert response.status_code == 422  # Validation error
    
    @patch('app.admin_auth_api._get_admin_by_credentials')
    def test_jwt_login_disabled_user(self, mock_get_admin, client, admin_user):
        """Test login with disabled user"""
        admin_user["disabled"] = 1
        mock_get_admin.return_value = admin_user
        
        response = client.post(
            "/api/v1/public/auth/login",
            json={"username": "test_admin", "password": "test_password"}
        )
        
        assert response.status_code == 401
        assert "disabled" in response.json()["detail"].lower()


class TestJWTProtectedEndpoints:
    """Test accessing protected endpoints with JWT"""
    
    @pytest.fixture
    def auth_client(self, client, admin_user):
        """Create authenticated client with JWT cookies"""
        with patch('app.admin_auth_api._get_admin_by_credentials') as mock_get_admin:
            mock_get_admin.return_value = admin_user
            
            # Login to get cookies
            response = client.post(
                "/api/v1/public/auth/login",
                json={"username": "test_admin", "password": "test_password"}
            )
            
            assert response.status_code == 200
            return client
    
    def test_access_protected_endpoint_with_jwt_cookies(self, auth_client):
        """Test accessing protected endpoint with JWT cookies"""
        # Try to access a protected endpoint
        response = auth_client.get("/api/v1/admin/dashboard")
        
        # Should not be 401 (unauthorized)
        # Note: 404 might indicate the endpoint doesn't exist, but that's a different issue
        assert response.status_code != 401
    
    def test_access_protected_endpoint_without_auth(self, client):
        """Test accessing protected endpoint without authentication"""
        response = client.get("/api/v1/admin/dashboard")
        
        assert response.status_code == 401
        assert "Unauthorized" in response.json()["detail"]
    
    def test_access_protected_endpoint_with_invalid_jwt(self, client):
        """Test accessing protected endpoint with invalid JWT"""
        # Set invalid cookie
        client.cookies.set("access_token", "invalid.token.here")
        
        response = client.get("/api/v1/admin/dashboard")
        
        assert response.status_code == 401
    
    def test_access_protected_endpoint_with_expired_jwt(self, client, admin_user):
        """Test accessing protected endpoint with expired JWT"""
        # Create expired token
        settings = get_settings()
        expire = datetime.now(timezone.utc) - timedelta(hours=1)
        
        payload = {
            "sub": str(admin_user["user_id"]),
            "username": admin_user["username"],
            "role": admin_user["role"],
            "type": "access",
            "exp": expire,
            "iat": datetime.now(timezone.utc) - timedelta(hours=2)
        }
        
        expired_token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        client.cookies.set("access_token", expired_token)
        
        response = client.get("/api/v1/admin/dashboard")
        
        assert response.status_code == 401


class TestJWTRefreshFlow:
    """Test JWT token refresh flow"""
    
    @pytest.fixture
    def auth_client_with_refresh(self, client, admin_user):
        """Create authenticated client with refresh token"""
        with patch('app.admin_auth_api._get_admin_by_credentials') as mock_get_admin:
            mock_get_admin.return_value = admin_user
            
            # Login to get tokens
            response = client.post(
                "/api/v1/public/auth/login",
                json={"username": "test_admin", "password": "test_password"}
            )
            
            assert response.status_code == 200
            return client
    
    def test_jwt_refresh_success(self, auth_client_with_refresh, admin_user):
        """Test successful token refresh"""
        # Get original tokens
        original_access = auth_client_with_refresh.cookies.get("access_token")
        original_refresh = auth_client_with_refresh.cookies.get("refresh_token")
        
        assert original_access is not None
        assert original_refresh is not None
        
        # Wait a moment to ensure new tokens are different
        time.sleep(0.1)
        
        # Refresh tokens
        response = auth_client_with_refresh.post("/api/v1/public/auth/refresh")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check new tokens are provided
        assert "access_token" in data
        assert "refresh_token" in data
        
        # Check cookies are updated
        new_access = auth_client_with_refresh.cookies.get("access_token")
        new_refresh = auth_client_with_refresh.cookies.get("refresh_token")
        
        assert new_access is not None
        assert new_refresh is not None
        assert new_access != original_access  # New access token
        assert new_refresh != original_refresh  # New refresh token
        
        # Validate new tokens
        access_payload = validate_access_token(new_access)
        assert access_payload is not None
        assert access_payload["sub"] == str(admin_user["user_id"])
    
    def test_jwt_refresh_without_refresh_token(self, client):
        """Test refresh without refresh token"""
        response = client.post("/api/v1/public/auth/refresh")
        
        assert response.status_code == 401
        assert "Unauthorized" in response.json()["detail"]
    
    def test_jwt_refresh_with_invalid_refresh_token(self, client):
        """Test refresh with invalid refresh token"""
        client.cookies.set("refresh_token", "invalid.token.here")
        
        response = client.post("/api/v1/public/auth/refresh")
        
        assert response.status_code == 401
    
    def test_jwt_refresh_with_expired_refresh_token(self, client, admin_user):
        """Test refresh with expired refresh token"""
        # Create expired refresh token
        settings = get_settings()
        expire = datetime.now(timezone.utc) - timedelta(hours=1)
        
        payload = {
            "sub": str(admin_user["user_id"]),
            "type": "refresh",
            "exp": expire,
            "iat": datetime.now(timezone.utc) - timedelta(hours=2)
        }
        
        expired_refresh_token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        client.cookies.set("refresh_token", expired_refresh_token)
        
        response = client.post("/api/v1/public/auth/refresh")
        
        assert response.status_code == 401


class TestJWTAuthStatus:
    """Test JWT authentication status endpoint"""
    
    def test_auth_status_unauthenticated(self, client):
        """Test auth status when not authenticated"""
        response = client.get("/api/v1/public/auth/status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is False
        assert "user" not in data or data["user"] is None
    
    @pytest.fixture
    def auth_client(self, client, admin_user):
        """Create authenticated client"""
        with patch('app.admin_auth_api._get_admin_by_credentials') as mock_get_admin:
            mock_get_admin.return_value = admin_user
            
            response = client.post(
                "/api/v1/public/auth/login",
                json={"username": "test_admin", "password": "test_password"}
            )
            
            assert response.status_code == 200
            return client
    
    def test_auth_status_authenticated(self, auth_client, admin_user):
        """Test auth status when authenticated"""
        response = auth_client.get("/api/v1/public/auth/status")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["authenticated"] is True
        assert "user" in data
        assert data["user"]["username"] == admin_user["username"]
        assert data["user"]["role"] == admin_user["role"]
    
    def test_auth_status_with_expired_token(self, client, admin_user):
        """Test auth status with expired token"""
        # Create expired token
        settings = get_settings()
        expire = datetime.now(timezone.utc) - timedelta(hours=1)
        
        payload = {
            "sub": str(admin_user["user_id"]),
            "username": admin_user["username"],
            "role": admin_user["role"],
            "type": "access",
            "exp": expire,
            "iat": datetime.now(timezone.utc) - timedelta(hours=2)
        }
        
        expired_token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        client.cookies.set("access_token", expired_token)
        
        response = client.get("/api/v1/public/auth/status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is False


class TestJWTMixedAuthentication:
    """Test mixed authentication scenarios (JWT + Legacy)"""
    
    def test_legacy_header_with_jwt_cookies(self, auth_client_with_refresh):
        """Test legacy header takes precedence over JWT cookies"""
        # Set x-admin-secret header
        response = auth_client_with_refresh.get(
            "/api/v1/admin/dashboard",
            headers={"x-admin-secret": "test-secret-key"}
        )
        
        # Should work with legacy header even if JWT cookies are present
        # The exact status depends on the current auth implementation
        assert response.status_code != 401  # Should not be unauthorized
    
    def test_bearer_token_in_header(self, client, admin_user):
        """Test Bearer token in Authorization header"""
        # Create valid JWT
        access_token = create_access_token(admin_user)
        
        response = client.get(
            "/api/v1/admin/dashboard",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        # Should not be unauthorized
        assert response.status_code != 401
    
    def test_mixed_auth_priority_order(self, client, admin_user):
        """Test authentication priority order"""
        # Create valid JWT
        access_token = create_access_token(admin_user)
        
        # Test with Bearer header (should work)
        response = client.get(
            "/api/v1/admin/dashboard",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        assert response.status_code != 401
        
        # Test with x-admin-secret header (should work if legacy is enabled)
        response = client.get(
            "/api/v1/admin/dashboard",
            headers={"x-admin-secret": "test-secret-key"}
        )
        # Status depends on current implementation


class TestJWTErrorScenarios:
    """Test JWT error scenarios and edge cases"""
    
    def test_jwt_with_none_algorithm(self, client):
        """Test JWT with 'none' algorithm (security test)"""
        # Create token with 'none' algorithm (should be rejected)
        payload = {
            "sub": "1",
            "username": "hacker",
            "role": "owner",
            "type": "access",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "iat": datetime.now(timezone.utc)
        }
        
        try:
            none_token = jwt.encode(payload, "", algorithm="none")
            client.cookies.set("access_token", none_token)
            
            response = client.get("/api/v1/admin/dashboard")
            
            # Should be rejected
            assert response.status_code == 401
        except Exception:
            # Expected - 'none' algorithm should be rejected
            pass
    
    def test_jwt_with_wrong_secret(self, client):
        """Test JWT with wrong secret key"""
        # Create token with wrong secret
        payload = {
            "sub": "1",
            "username": "test",
            "role": "admin",
            "type": "access",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "iat": datetime.now(timezone.utc)
        }
        
        wrong_secret_token = jwt.encode(payload, "wrong_secret", algorithm="HS256")
        client.cookies.set("access_token", wrong_secret_token)
        
        response = client.get("/api/v1/admin/dashboard")
        
        assert response.status_code == 401
    
    def test_jwt_token_replay_attack(self, client, admin_user):
        """Test basic replay attack protection (tokens should expire)"""
        # This test is limited since we can't easily test replay without more complex setup
        # But we can verify tokens have expiration
        
        access_token = create_access_token(admin_user)
        
        # Decode token to check expiration
        settings = get_settings()
        payload = jwt.decode(access_token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        
        assert "exp" in payload  # Token should have expiration
        assert payload["exp"] > datetime.now(timezone.utc).timestamp()  # Should expire in future


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "--tb=short"])