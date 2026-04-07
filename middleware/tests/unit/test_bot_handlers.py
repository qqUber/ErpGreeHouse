"""
Unit tests for Telegram bot handlers

Smoke tests verify handler functions can be imported and have correct signatures.
Full handler logic is tested via integration tests.
"""

from unittest.mock import patch

import pytest

from app import handlers