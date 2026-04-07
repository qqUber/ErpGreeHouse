"""
Unit tests for app.request_context module.

Tests the context variable management for admin session tokens.
"""

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
        # First, ensure we start from default (None)
        # Save the current token so we can reset after the test
        initial_tok = set_admin_session_token(None)
        reset_admin_session_token(initial_tok)

        # Set initial token
        token1 = set_admin_session_token("token1")
        assert get_admin_session_token() == "token1"

        # Set new token
        token2 = set_admin_session_token("token2")
        assert get_admin_session_token() == "token2"

        # Reset to state before token2 was set
        reset_admin_session_token(token2)
        result = get_admin_session_token()
        assert result == "token1"

    def test_set_none_token(self):
        """Should be able to set token to None explicitly."""
        set_admin_session_token("token")
        assert get_admin_session_token() == "token"

        set_admin_session_token(None)
        assert get_admin_session_token() is None

    def test_isolation_between_contexts(self):
        """Context variables should be isolated between different contexts."""
        import contextvars

        results = {}

        def run_in_ctx(name, token_value):
            set_admin_session_token(token_value)
            results[name] = get_admin_session_token()

        # Run in separate contexts via copy_context()
        ctx1 = contextvars.copy_context()
        ctx2 = contextvars.copy_context()

        ctx1.run(run_in_ctx, "task1", "task1-token")
        ctx2.run(run_in_ctx, "task2", "task2-token")

        # Each context should see its own token
        assert results["task1"] == "task1-token"
        assert results["task2"] == "task2-token"
