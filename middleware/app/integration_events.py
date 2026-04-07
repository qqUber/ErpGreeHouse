import json
from typing import Any

from .db import get_db
from .worker import deliver_webhook_event


def dispatch_event(event_type: str, payload: dict[str, Any]) -> None:
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("SELECT id, config_json FROM integrations WHERE enabled=1 AND kind='outbound_webhook'")
        rows = cur.fetchall()
        for r in rows:
            try:
                cfg = json.loads(r["config_json"] or "{}")
            except Exception:
                cfg = {}
            events = cfg.get("events")
            if isinstance(events, list) and event_type not in events:
                continue
            deliver_webhook_event.delay(int(r["id"]), event_type, payload)
    finally:
        conn.close()
