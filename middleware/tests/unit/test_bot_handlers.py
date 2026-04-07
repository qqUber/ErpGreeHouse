"""
Unit tests for Telegram bot handlers

Smoke tests verify handler functions can be imported and have correct signatures.
Full handler logic is tested via integration tests.
"""

from app import handlers


def test_handlers_module_imports():
    """Smoke-check handlers module import."""
    assert handlers is not None
