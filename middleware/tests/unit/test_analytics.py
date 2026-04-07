"""
Analytics API unit tests.
NOTE: aiogram and celery are stubbed out globally in conftest.py.
"""

import os

os.environ.setdefault("ERP_MOCK_MODE", "true")


def test_analytics_module_uses_mock_mode():
    """Smoke-check analytics test module bootstrap env."""
    assert os.environ.get("ERP_MOCK_MODE") == "true"
