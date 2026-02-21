import pytest
import asyncio
from unittest.mock import patch, MagicMock
from app.worker import execute_marketing_trigger

@patch("app.worker.get_db")
@patch("app.worker.create_bot")
@patch("app.worker.safe_send")
def test_execute_trigger_success(mock_safe_send, mock_create_bot, mock_get_db):
    # Mocking
    mock_db = MagicMock()
    mock_conn = MagicMock()
    mock_db.connect.return_value = mock_conn
    mock_get_db.return_value = mock_db
    
    # We have two fetchones:
    # 1) check event status pending
    # 2) get telegram id
    mock_conn.execute.return_value.fetchone.side_effect = [
        {"status": "pending"},
        {"telegram_id": "12345"}
    ]
    
    mock_safe_send.return_value = True
    
    # Run the raw async function nested inside the celery task
    result = execute_marketing_trigger(customer_id=1, trigger_id=1, message_text="Test Message", event_id=7)
    
    # Assert
    assert result["sent"] == True
    assert result["chat_id"] == 12345
    mock_safe_send.assert_called_once()
