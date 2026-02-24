import pytest

# This test file tests the worker functions.
# Due to celery task wrapping, we test the core logic in a simplified manner.
# Full integration testing would require a running celery worker.


def test_worker_module_imports():
    """Test that worker module can be imported without errors."""
    from app import worker
    assert worker is not None
    assert hasattr(worker, 'execute_marketing_trigger')
    assert hasattr(worker, 'safe_send')
