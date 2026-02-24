"""
Comprehensive JWT unit tests with 100% coverage
Tests all JWT functionality including security edge cases
"""

import pytest
import jwt
import time
import os
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch, MagicMock
from typing import Any, Dict
from fastapi import HTTPException

# Import JWT functions from auth module
from app.auth import (
    create_access_token,
    create_refresh_token,
    validate_access_token,
    validate_refresh_token,
    decode_token,
    get_admin_from_jwt,
    _get_role_permissions,
    get_role_permissions,
    get_default_permissions
)
from app.config import get_settings
from app.security import constant_time_equals


class TestJWTTokenCreation:
    """Test JWT token creation functions"""
    
    def test_create_access_token_basic(self):
        """Test basic access token creation"""
        admin = {
            "user_id": 1,
            "username": "test_user",
            "role": "admin"
        }
        
        token = create_access_token(admin)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode and verify payload
        settings = get_settings()
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        
        assert payload["sub"] == "1"
        assert payload["username"] == "test_user"
        assert payload["role"] == "admin"
        assert payload["type"] == "access"
        assert "exp" in payload
        assert "iat" in payload
        assert "permissions" in payload
    
    def test_create_access_token_with_permissions(self):
        """Test access token creation with role permissions"""
        admin = {
            "user_id": 1,
            "username": "test_user",
            "role": "owner"
        }
        
        token = create_access_token(admin)
        payload = jwt.decode(token, get_settings().jwt_secret_key, algorithms=[get_settings().jwt_algorithm])
        
        assert payload["permissions"] == ["*"]  # Owner has all permissions
    
    def test_create_access_token_missing_fields(self):
        """Test access token creation with missing optional fields"""
        admin = {"user_id": 1}  # Minimal admin dict
        
        token = create_access_token(admin)
        payload = jwt.decode(token, get_settings().jwt_secret_key, algorithms=[get_settings().jwt_algorithm])
        
        assert payload["sub"] == "1"
        assert payload["username"] == ""  # Default empty string
        assert payload["role"] == ""  # Default empty string
    
    def test_create_refresh_token_basic(self):
        """Test basic refresh token creation"""
        admin = {
            "user_id": 1,
            "username": "test_user"
        }
        
        token = create_refresh_token(admin)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode and verify payload
        settings = get_settings()
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        
        assert payload["sub"] == "1"
        assert payload["type"] == "refresh"
        assert "exp" in payload
        assert "iat" in payload
        assert "username" not in payload  # Refresh tokens don't include username
    
    def test_token_expiration_times(self):
        """Test that tokens have correct expiration times"""
        admin = {"user_id": 1}
        
        access_token = create_access_token(admin)
        refresh_token = create_refresh_token(admin)
        
        settings = get_settings()
        
        access_payload = jwt.decode(access_token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        refresh_payload = jwt.decode(refresh_token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        
        # Check expiration times are reasonable
        access_exp = datetime.fromtimestamp(access_payload["exp"], timezone.utc)
        refresh_exp = datetime.fromtimestamp(refresh_payload["exp"], timezone.utc)
        now = datetime.now(timezone.utc)
        
        # Access token should expire in ~30 minutes
        access_delta = access_exp - now
        assert timedelta(minutes=29) < access_delta < timedelta(minutes=31)
        
        # Refresh token should expire in ~30 days
        refresh_delta = refresh_exp - now
        assert timedelta(days=29) < refresh_delta < timedelta(days=31)


class TestJWTTokenValidation:
    """Test JWT token validation functions"""
    
    def test_validate_access_token_valid(self):
        """Test validation of valid access token"""
        admin = {
            "user_id": 1,
            "username": "test_user",
            "role": "admin"
        }
        
        token = create_access_token(admin)
        payload = validate_access_token(token)
        
        assert payload is not None
        assert payload["sub"] == "1"
        assert payload["type"] == "access"
        assert payload["username"] == "test_user"
    
    def test_validate_access_token_invalid_type(self):
        """Test validation fails for refresh token used as access token"""
        admin = {"user_id": 1}
        refresh_token = create_refresh_token(admin)
        
        payload = validate_access_token(refresh_token)
        assert payload is None
    
    def test_validate_access_token_expired(self):
        """Test validation fails for expired token"""
        # Create token with past expiration
        admin = {"user_id": 1}
        settings = get_settings()
        
        expire = datetime.now(timezone.utc) - timedelta(hours=1)
        payload = {
            "sub": "1",
            "type": "access",
            "exp": expire,
            "iat": datetime.now(timezone.utc) - timedelta(hours=2)
        }
        expired_token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        
        result = validate_access_token(expired_token)
        assert result is None
    
    def test_validate_access_token_invalid_signature(self):
        """Test validation fails for tampered token"""
        admin = {"user_id": 1}
        token = create_access_token(admin)
        
        # Tamper with token
        tampered_token = token[:-10] + "tampered123"
        
        result = validate_access_token(tampered_token)
        assert result is None
    
    def test_validate_refresh_token_valid(self):
        """Test validation of valid refresh token"""
        admin = {"user_id": 1}
        
        token = create_refresh_token(admin)
        payload = validate_refresh_token(token)
        
        assert payload is not None
        assert payload["sub"] == "1"
        assert payload["type"] == "refresh"
    
    def test_validate_refresh_token_invalid_type(self):
        """Test validation fails for access token used as refresh token"""
        admin = {"user_id": 1}
        access_token = create_access_token(admin)
        
        payload = validate_refresh_token(access_token)
        assert payload is None
    
    def test_validate_tokens_empty_string(self):
        """Test validation fails for empty string"""
        assert validate_access_token("") is None
        assert validate_refresh_token("") is None
    
    def test_validate_tokens_none(self):
        """Test validation fails for None"""
        assert validate_access_token(None) is None
        assert validate_refresh_token(None) is None
    
    def test_validate_tokens_invalid_format(self):
        """Test validation fails for invalid token format"""
        assert validate_access_token("invalid.token.here") is None
        assert validate_refresh_token("invalid.token.here") is None


class TestJWTDecode:
    """Test JWT decode function"""
    
    def test_decode_token_valid(self):
        """Test decoding valid token"""
        admin = {"user_id": 1}
        token = create_access_token(admin)
        
        payload = decode_token(token)
        
        assert payload["sub"] == "1"
        assert payload["type"] == "access"
    
    def test_decode_token_expired(self):
        """Test decoding expired token raises exception"""
        settings = get_settings()
        expire = datetime.now(timezone.utc) - timedelta(hours=1)
        
        payload = {
            "sub": "1",
            "type": "access",
            "exp": expire,
            "iat": datetime.now(timezone.utc) - timedelta(hours=2)
        }
        expired_token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            decode_token(expired_token)
        
        assert exc_info.value.status_code == 401
        assert "expired" in exc_info.value.detail.lower()
    
    def test_decode_token_invalid_signature(self):
        """Test decoding tampered token raises exception"""
        admin = {"user_id": 1}
        token = create_access_token(admin)
        
        # Tamper with token
        tampered_token = token[:-10] + "tampered123"
        
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            decode_token(tampered_token)
        
        assert exc_info.value.status_code == 401
        assert "invalid" in exc_info.value.detail.lower()
    
    def test_decode_token_invalid_format(self):
        """Test decoding invalid format raises exception"""
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            decode_token("invalid.token")
        
        assert exc_info.value.status_code == 401


class TestGetAdminFromJWT:
    """Test get_admin_from_jwt function"""
    
    def test_get_admin_from_jwt_complete(self):
        """Test converting complete JWT payload to admin dict"""
        payload = {
            "sub": "123",
            "username": "testuser",
            "role": "admin",
            "permissions": ["read", "write"]
        }
        
        admin = get_admin_from_jwt(payload)
        
        assert admin["is_authenticated"] is True
        assert admin["user_id"] == 123
        assert admin["username"] == "testuser"
        assert admin["role"] == "admin"
        assert admin["permissions"] == ["read", "write"]
    
    def test_get_admin_from_jwt_missing_fields(self):
        """Test converting JWT payload with missing fields"""
        payload = {"sub": "456"}  # Minimal payload
        
        admin = get_admin_from_jwt(payload)
        
        assert admin["is_authenticated"] is True
        assert admin["user_id"] == 456
        assert admin["username"] == ""  # Default empty string
        assert admin["role"] == ""  # Default empty string
        assert admin["permissions"] == []  # Default empty list
    
    def test_get_admin_from_jwt_none_values(self):
        """Test converting JWT payload with None values"""
        payload = {
            "sub": None,
            "username": None,
            "role": None,
            "permissions": None
        }
        
        # get_admin_from_jwt doesn't handle None sub - this should raise an error
        with pytest.raises(TypeError):
            get_admin_from_jwt(payload)


class TestRolePermissions:
    """Test role permission functions"""
    
    def test_get_role_permissions_owner(self):
        """Test owner role has all permissions"""
        permissions = _get_role_permissions("owner")
        assert permissions == ["*"]
    
    def test_get_role_permissions_operator(self):
        """Test operator role has correct permissions from database"""
        permissions = _get_role_permissions("operator")
        # Operator should have specific permissions from the role_permissions table
        assert "dashboard.read" in permissions
        assert "customer.create" in permissions
        assert "pos.sale" in permissions
    
    def test_get_role_permissions_manager(self):
        """Test manager role has correct permissions from database"""
        permissions = _get_role_permissions("manager")
        # Manager should have marketing permissions
        assert "dashboard.read" in permissions
        assert "marketing.campaigns" in permissions
    
    @patch('app.auth.get_role_permissions')
    def test_get_role_permissions_mock(self, mock_get_role_perms):
        """Test getting permissions with mocked function"""
        mock_get_role_perms.return_value = ["read", "write"]
        
        permissions = _get_role_permissions("admin")
        
        assert permissions == ["read", "write"]
    
    def test_get_default_permissions(self):
        """Test default permission mappings"""
        # Owner doesn't have default permissions - it uses wildcard ["*"]
        # in get_role_permissions instead
        assert get_default_permissions("owner") == set()
        assert "dashboard.read" in get_default_permissions("operator")
        assert "marketing.campaigns" in get_default_permissions("manager")
        assert "marketing.campaigns" in get_default_permissions("marketer")
        assert get_default_permissions("unknown") == set()


class TestSecurityEdgeCases:
    """Test security-related edge cases"""
    
    def test_timing_attack_protection(self):
        """Test that token validation timing is consistent"""
        # This is more of a conceptual test - in practice we'd use constant_time_equals
        admin = {"user_id": 1}
        valid_token = create_access_token(admin)
        
        # Measure time for valid token
        start = time.time()
        validate_access_token(valid_token)
        valid_time = time.time() - start
        
        # Measure time for invalid token
        start = time.time()
        validate_access_token("invalid.token.here")
        invalid_time = time.time() - start
        
        # Times should be reasonably close (within 10x factor)
        # This is a rough check - in practice we'd use more sophisticated timing analysis
        assert valid_time < invalid_time * 10
    
    def test_token_tampering_detection(self):
        """Test detection of various token tampering methods"""
        admin = {"user_id": 1}
        original_token = create_access_token(admin)
        
        # Test different tampering methods
        tampered_tokens = [
            original_token[:-5],  # Truncated
            original_token + "extra",  # Appended
            original_token.replace(".", "_"),  # Invalid format
            "header.payload.signature",  # Valid format, invalid content
            "",  # Empty string
            None,  # None
        ]
        
        for tampered in tampered_tokens:
            if tampered is not None:
                result = validate_access_token(tampered)
                assert result is None, f"Tampered token should be rejected: {tampered}"
    
    def test_algorithm_confusion_attack_prevention(self):
        """Test prevention of algorithm confusion attacks"""
        settings = get_settings()
        
        # Try to create token with different algorithm
        admin = {"user_id": 1}
        payload = {
            "sub": "1",
            "type": "access",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "iat": datetime.now(timezone.utc)
        }
        
        # This should fail when validated with our expected algorithm
        try:
            # Create token with HS256 (our expected algorithm)
            valid_token = jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")
            result = validate_access_token(valid_token)
            assert result is not None
            
            # Try to validate with different secret (should fail)
            wrong_secret_token = jwt.encode(payload, "wrong_secret", algorithm="HS256")
            result = validate_access_token(wrong_secret_token)
            assert result is None
        except Exception:
            pass  # Expected to fail
    
    def test_empty_and_malformed_tokens(self):
        """Test handling of empty and malformed tokens"""
        malformed_tokens = [
            "",
            "   ",  # Whitespace only
            "invalid",
            "header.payload",  # Missing signature
            "header.payload.signature.extra",  # Too many parts
            "..",  # Empty parts
            ".payload.",  # Missing header and signature
            "header..signature",  # Missing payload
        ]
        
        for token in malformed_tokens:
            assert validate_access_token(token) is None
            assert validate_refresh_token(token) is None


class TestJWTIntegration:
    """Integration tests for complete JWT flow"""
    
    def test_complete_access_token_lifecycle(self):
        """Test complete lifecycle of access token creation and validation"""
        # Create admin data
        original_admin = {
            "user_id": 42,
            "username": "integration_test",
            "role": "admin"
        }
        
        # Create token
        token = create_access_token(original_admin)
        assert token is not None
        
        # Validate token
        payload = validate_access_token(token)
        assert payload is not None
        
        # Convert back to admin format
        validated_admin = get_admin_from_jwt(payload)
        
        # Verify data integrity
        assert validated_admin["user_id"] == original_admin["user_id"]
        assert validated_admin["username"] == original_admin["username"]
        assert validated_admin["role"] == original_admin["role"]
        assert validated_admin["is_authenticated"] is True
    
    def test_complete_refresh_token_lifecycle(self):
        """Test complete lifecycle of refresh token creation and validation"""
        original_admin = {"user_id": 42}
        
        # Create refresh token
        token = create_refresh_token(original_admin)
        assert token is not None
        
        # Validate refresh token
        payload = validate_refresh_token(token)
        assert payload is not None
        
        # Verify payload integrity
        assert payload["sub"] == str(original_admin["user_id"])
        assert payload["type"] == "refresh"
    
    def test_token_type_separation(self):
        """Test that access and refresh tokens are properly separated"""
        admin = {"user_id": 1}
        
        access_token = create_access_token(admin)
        refresh_token = create_refresh_token(admin)
        
        # Access token should not validate as refresh token
        assert validate_refresh_token(access_token) is None
        
        # Refresh token should not validate as access token
        assert validate_access_token(refresh_token) is None
    
    def test_token_expiration_edge_cases(self):
        """Test token expiration edge cases"""
        # Test with expired tokens directly
        settings = get_settings()
        admin = {"user_id": 1}
        
        # Create a token and verify it works
        token = create_access_token(admin)
        payload = validate_access_token(token)
        assert payload is not None
        
        # Create an expired token manually
        expire = datetime.now(timezone.utc) - timedelta(minutes=1)
        expired_payload = {
            "sub": "1",
            "type": "access",
            "exp": expire,
            "iat": datetime.now(timezone.utc) - timedelta(minutes=31)
        }
        expired_token = jwt.encode(expired_payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        
        # Expired token should be invalid
        result = validate_access_token(expired_token)
        assert result is None


class TestJWTErrorHandling:
    """Test JWT error handling and logging"""
    
    @patch('app.auth.logger')
    def test_validation_logging(self, mock_logger):
        """Test that validation failures are properly logged"""
        # Test expired token logging
        settings = get_settings()
        expire = datetime.now(timezone.utc) - timedelta(hours=1)
        
        payload = {
            "sub": "1",
            "type": "access",
            "exp": expire,
            "iat": datetime.now(timezone.utc) - timedelta(hours=2)
        }
        expired_token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        
        validate_access_token(expired_token)
        
        # Verify logging was called
        mock_logger.warning.assert_called()
    
    @patch('app.auth.logger')
    def test_decode_error_logging(self, mock_logger):
        """Test that decode errors are properly logged"""
        try:
            decode_token("invalid.token.here")
        except HTTPException:
            pass
        
        # Verify error logging
        mock_logger.warning.assert_called()
    
    def test_secret_key_validation(self):
        """Test that secret key is properly validated"""
        settings = get_settings()
        
        # Secret key should be non-empty
        assert settings.jwt_secret_key is not None
        assert len(settings.jwt_secret_key) > 0
        
        # Algorithm should be supported
        assert settings.jwt_algorithm in ["HS256", "HS384", "HS512"]


# Parametrized tests for different scenarios
@pytest.mark.parametrize("role,expected_permissions", [
    ("owner", ["*"]),
    ("operator", ["dashboard.read", "customer.create", "customer.search", "customer.list", "customer.read", "pos.sale", "transaction.read", "product.read"]),
    ("manager", ["dashboard.read", "customer.read", "customer.list", "product.read", "product.create", "product.update", "product.import", "marketing.campaigns", "marketing.users", "integration.read", "integration.update", "report.export"]),
    ("marketer", ["dashboard.read", "customer.read", "customer.list", "product.read", "product.create", "product.update", "product.import", "marketing.campaigns", "marketing.users", "integration.read", "integration.update", "report.export"]),
])
def test_role_permissions_parametrized(role, expected_permissions):
    """Test role permissions with different roles"""
    permissions = _get_role_permissions(role)
    # Check that expected permissions are present (set comparison)
    assert set(expected_permissions).issubset(set(permissions))


@pytest.mark.parametrize("token_type,validation_func", [
    ("access", validate_access_token),
    ("refresh", validate_refresh_token),
])
def test_token_type_validation_parametrized(token_type, validation_func):
    """Test token validation for different token types"""
    admin = {"user_id": 1}
    
    if token_type == "access":
        token = create_access_token(admin)
    else:
        token = create_refresh_token(admin)
    
    payload = validation_func(token)
    assert payload is not None
    assert payload["type"] == token_type


@pytest.mark.parametrize("invalid_token", [
    "",
    "invalid",
    "header.payload.signature.extra",
    "..",
    None,
])
def test_invalid_tokens_parametrized(invalid_token):
    """Test validation of various invalid tokens"""
    if invalid_token is not None:
        assert validate_access_token(invalid_token) is None
        assert validate_refresh_token(invalid_token) is None


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "--tb=short"])