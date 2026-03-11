import pytest
from app.trigger_engine import _check_criteria


def test_check_criteria_empty():
    assert _check_criteria({}, {"total_amount": 100}) == True


def test_check_criteria_min_amount_success():
    assert _check_criteria({"min_amount": 5000}, {"total_amount": 6000}) == True


def test_check_criteria_min_amount_fail():
    assert _check_criteria({"min_amount": 5000}, {"total_amount": 4000}) == False


def test_check_criteria_min_amount_missing_event_data():
    assert _check_criteria({"min_amount": 5000}, {}) == False
