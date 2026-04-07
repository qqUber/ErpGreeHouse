import hashlib
import json
from typing import Optional

from .db import get_db


def generate_short_code(url: str, campaign_id: int, customer_id: int) -> str:
    """Generate a short code for tracking clicks."""
    unique_key = f"{url}_{campaign_id}_{customer_id}"
    hash_object = hashlib.sha256(unique_key.encode())
    short_code = hash_object.hexdigest()[:8]
    return short_code


def store_short_url(short_code: str, original_url: str, campaign_id: int, customer_id: int):
    """Store short URL mapping in database."""
    db = get_db()
    conn = db.connect()
    try:
        conn.execute(
            "INSERT OR REPLACE INTO short_urls (short_code, original_url, campaign_id, customer_id) VALUES (?, ?, ?, ?)",
            (short_code, original_url, campaign_id, customer_id),
        )
        conn.commit()
    finally:
        conn.close()


def get_original_url(short_code: str) -> Optional[dict]:
    """Get original URL from short code and track click."""
    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT original_url, campaign_id, customer_id FROM short_urls WHERE short_code = ?",
            (short_code,),
        ).fetchone()

        if row:
            # Track click event
            conn.execute(
                "INSERT INTO marketing_events (campaign_id, user_id, event_type, event_data) VALUES (?, ?, ?, ?)",
                (
                    row["campaign_id"],
                    row["customer_id"],
                    "clicked",
                    json.dumps({"url": row["original_url"]}),
                ),
            )
            conn.commit()

            return {
                "original_url": row["original_url"],
                "campaign_id": row["campaign_id"],
                "customer_id": row["customer_id"],
            }
        return None
    finally:
        conn.close()
