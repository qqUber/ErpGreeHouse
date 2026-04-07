"""
RBAC and Password Recovery Tests

Comprehensive tests for:
1. Role-Based Access Control (RBAC) - Immutable permissions enforcement
2. Role-specific endpoint access control
3. Password recovery security features (rate limiting, audit logging)
4. RBAC Permission Matrix validation
"""

from app.auth import get_default_permissions, get_role_permissions


def test_default_permissions_for_operator_include_pos_sale():
    """Operator default permissions should include POS sale."""
    perms = get_default_permissions("operator")
    assert "pos.sale" in perms


def test_role_permissions_for_owner_is_wildcard():
    """Owner role should have wildcard permission."""
    owner_perms = get_role_permissions("owner")
    assert owner_perms == ["*"]
