"""
Unit tests for app.request_context module.

Tests the context variable management for admin session tokens.
"""

import pytest
from app.request_context import (
    get_admin_session_token,
    reset_admin_session_token,
    set_admin_session_token,
)


class TestRequestContext:
    """Tests for request context functions."""

    def test_get_admin_session_token_default_none(self):
        """Default value should be None."""
        # In a fresh context, should return None
        result = get_admin_session_token()
        assert result is None

    def test_set_and_get_admin_session_token(self):
        """Should be able to set and get a token."""
        token = "test-token-12345"
        set_admin_session_token(token)
        result = get_admin_session_token()
        assert result == token

    def test_set_admin_session_token_returns_token(self):
        """set_admin_session_token should return a ContextVar token."""
        token = "test-token"
        result = set_admin_session_token(token)
        # Should return a contextvars.Token
        assert result is not None

    def test_reset_admin_session_token(self):
        """reset_admin_session_token should reset to previous value."""
        # Set initial token
        token1 = set_admin_session_token("token1")
        assert get_admin_session_token() == "token1"

        # Set new token
        set_admin_session_token("token2")
        assert get_admin_session_token() == "token2"

        # Reset to previous
        reset_admin_session_token(token1)
        # After reset, should be None (default) since we reset to before any set
        result = get_admin_session_token()
        assert result is None

    def test_set_none_token(self):
        """Should be able to set token to None explicitly."""
        set_admin_session_token("token")
        assert get_admin_session_token() == "token"

        set_admin_session_token(None)
        assert get_admin_session_token() is None

    def test_isolation_between_contexts(self):
        """Context variables should be isolated between different contexts."""
        import contextvars
        import asyncio

        async def task1():
            set_admin_session_token("task1-token")
            return get_admin_session_token()

        async def task2():
            set_admin_session_token("task2-token")
            return get_admin_session_token()

        # Run both tasks and verify they have different tokens
        t1 = asyncio.create_task(task1())
        t2 = asyncio.create_task(task2())

        result1 = asyncio.get_event_loop().run_until_complete(t1)
        result2 = asyncio.get_event_loop().run_until_complete(t2)

        # Each task should see its own token
        assert result1 == "task1-token"
        assert result2 == "task2-token"
