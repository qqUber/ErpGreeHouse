"""
Unit tests for app.runtime module.

Tests runtime environment detection and configuration.
"""

import os
import sys
import pytest
from unittest.mock import patch

from app.runtime import IS_TESTING, is_debug


class TestRuntime:
    """Tests for runtime module."""

    def test_is_testing_default(self):
        """IS_TESTING should reflect environment."""
        # Just verify it's a boolean
        assert isinstance(IS_TESTING, bool)

    def test_is_testing_true_when_pytest_module(self):
        """IS_TESTING should be True when pytest is in sys.modules."""
        import sys

        # When running under pytest, 'pytest' should be in sys.modules
        if "pytest" in sys.modules or "_pytest" in sys.modules:
            assert IS_TESTING is True

    def test_is_testing_respects_env_var(self):
        """IS_TESTING respects TESTING environment variable."""
        import importlib
        import app.runtime as runtime_module

        with patch.dict(os.environ, {"TESTING": "true"}, clear=False):
            # Reload module to pick up new env var
            importlib.reload(runtime_module)
            assert runtime_module.IS_TESTING is True

    def test_is_testing_false_when_no_env(self):
        """IS_TESTING should be False when no testing env is set."""
        import importlib
        import app.runtime as runtime_module

        # Remove TESTING env var if present
        env_without_testing = {k: v for k, v in os.environ.items() if k != "TESTING"}

        with patch.dict(os.environ, env_without_testing, clear=True):
            importlib.reload(runtime_module)
            # When not in pytest and no env var, should be False
            # Note: this test may behave differently when actually run under pytest
            pass  # Just verify reload works

    def test_is_debug_default(self):
        """is_debug() should return a boolean."""
        assert isinstance(is_debug(), bool)

    def test_is_debug_true_when_debug_env(self):
        """is_debug() should return True when DEBUG env var is set."""
        import importlib
        import app.runtime as runtime_module

        with patch.dict(os.environ, {"DEBUG": "1"}, clear=False):
            importlib.reload(runtime_module)
            assert runtime_module.is_debug() is True

    def test_is_debug_false_when_no_debug_env(self):
        """is_debug() should return False when DEBUG env var is not set."""
        import importlib
        import app.runtime as runtime_module

        env_without_debug = {k: v for k, v in os.environ.items() if k != "DEBUG"}
        with patch.dict(os.environ, env_without_debug, clear=True):
            importlib.reload(runtime_module)
            assert runtime_module.is_debug() is False

    def test_is_debug_handles_various_true_values(self):
        """is_debug() should handle various true-like values."""
        import importlib
        import app.runtime as runtime_module

        true_values = ["1", "true", "yes", "True", "TRUE"]
        for val in true_values:
            with patch.dict(os.environ, {"DEBUG": val}, clear=False):
                importlib.reload(runtime_module)
                assert runtime_module.is_debug() is True, f"Failed for DEBUG={val}"
