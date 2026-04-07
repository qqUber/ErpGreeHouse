"""
Analytics API unit tests.
NOTE: aiogram and celery are stubbed out globally in conftest.py.
"""

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("ERP_MOCK_MODE", "true")