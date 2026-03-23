import json
import logging
from typing import Any, Dict

from .constants import SECONDS_PER_HOUR
from .db import get_db
from .worker import celery_app

logger = logging.getLogger(__name__)


def evaluate_and_queue_triggers(
    customer_id: int, event_source: str, event_data: Dict[str, Any]
) -> None:
    """
    Evaluates all active triggers for a given event_source and queues Celery tasks for them if conditions are met.
    """
    db = get_db()
    conn = db.connect()
    try:
        triggers = conn.execute(
            "SELECT id, criteria_json, delay_hours, message_text, media_type, media_url, caption FROM marketing_triggers WHERE active=1 AND event_source=?",
            (event_source,),
        ).fetchall()

        if not triggers:
            return

        for trigger in triggers:
            trigger_id = trigger["id"]
            try:
                criteria = json.loads(trigger["criteria_json"])
            except json.JSONDecodeError:
                continue

            # Check criteria
            if not _check_criteria(criteria, event_data):
                continue

            # Record the event and queue it
            delay_hours = int(trigger["delay_hours"])
            message_text = trigger["message_text"]
            media_type = trigger["media_type"]
            media_url = trigger["media_url"]
            caption = trigger["caption"]
            source_tx_id = event_data.get("transaction_id")

            # Queue the Celery task
            task_kwargs = {
                "customer_id": customer_id,
                "trigger_id": trigger_id,
                "message_text": message_text,
                "media_type": media_type,
                "media_url": media_url,
                "caption": caption,
            }

            # We schedule it for now + delay_hours.
            # In Celery, countdown is in seconds.
            countdown_seconds = delay_hours * SECONDS_PER_HOUR

            # Register in DB
            cur = conn.execute(
                """
                INSERT INTO marketing_trigger_events (trigger_id, customer_id, source_tx_id, status, scheduled_for)
                VALUES (?, ?, ?, 'pending', datetime('now', ?))
                """,
                (trigger_id, customer_id, source_tx_id, f"+{delay_hours} hours"),
            )
            event_id = cur.lastrowid
            conn.commit()

            task_kwargs["event_id"] = event_id

            logger.info(
                f"Queueing trigger {trigger_id} for customer {customer_id} in {delay_hours} hours"
            )
            # Send task to Celery
            celery_app.send_task(
                "app.worker.execute_marketing_trigger",
                kwargs=task_kwargs,
                countdown=countdown_seconds,
            )

    finally:
        conn.close()


def _check_criteria(criteria: Dict[str, Any], event_data: Dict[str, Any]) -> bool:
    """
    Evaluate if event_data satisfies the given criteria dict.
    Example criteria: {"min_amount": 5000}
    Example event: {"total_amount": 6000}
    """
    if not criteria:
        return True  # Empty criteria matches everything for this event source

    for key, expected_value in criteria.items():
        if key == "min_amount":
            actual_amount = event_data.get("total_amount", 0)
            if actual_amount < expected_value:
                return False
        if key == "days_inactive":
            actual_days = event_data.get("days_inactive", 0)
            if actual_days < expected_value:
                return False
        if key == "points_to_expire":
            actual_points = event_data.get("points_to_expire", 0)
            if actual_points < expected_value:
                return False
        if key == "purchase_category":
            actual_category = event_data.get("category", "")
            if actual_category != expected_value:
                return False
        # Add more criteria types here as needed

    return True
