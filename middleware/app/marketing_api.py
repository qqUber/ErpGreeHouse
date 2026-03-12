import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, Header, HTTPException
from pydantic import BaseModel

from .admin_auth_api import require_jwt_auth
from .auth import check_permission
from .db import get_db
from .worker import celery_app

router = APIRouter(prefix="/api/v1/marketing")


def get_customers_with_consent(
    limit: int = 1000, offset: int = 0
) -> List[Dict[str, Any]]:
    """
    Get list of customers who have given marketing consent.
    Used for sending marketing campaigns (152-ФЗ compliance).

    Args:
        limit: Maximum number of records to return
        offset: Number of records to skip

    Returns:
        List of customer dictionaries with telegram_id
    """
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            """
            SELECT id, telegram_id, vk_id, phone, full_name, marketing_allowed
            FROM customers
            WHERE marketing_allowed = 1 AND (telegram_id IS NOT NULL OR vk_id IS NOT NULL)
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        )
        return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()


class SegmentCreate(BaseModel):
    name: str
    criteria: dict[str, Any]


class CampaignCreate(BaseModel):
    name: str
    segment_id: int
    type: str
    content: str
    content_type: str = "text"
    media_urls: Optional[str] = None
    caption: Optional[str] = None
    scheduled_at: Optional[str] = None


class TriggerCreate(BaseModel):
    name: str
    event_source: str
    criteria: dict[str, Any]
    delay_hours: int
    message_text: str
    media_type: Optional[str] = None
    media_url: Optional[str] = None
    caption: Optional[str] = None


@router.get("/segments")
def list_segments(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.users")
    db = get_db()
    conn = db.connect()
    rows = conn.execute(
        "SELECT * FROM marketing_segments ORDER BY created_at DESC"
    ).fetchall()
    return [dict(r) for r in rows]


@router.post("/segments")
def create_segment(
    segment: SegmentCreate,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.users")
    db = get_db()
    conn = db.connect()
    cursor = conn.execute(
        "INSERT INTO marketing_segments (name, criteria_json, last_updated) VALUES (?, ?, datetime('now'))",
        (segment.name, json.dumps(segment.criteria)),
    )
    conn.commit()
    return {"id": cursor.lastrowid, "name": segment.name}


@router.get("/segments/{id}/preview")
@router.get("/marketing/segments/{id}/preview")
def preview_segment(
    id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
    limit: int = 50,
    offset: int = 0,
):
    check_permission(auth_result, "marketing.users")
    db = get_db()
    conn = db.connect()

    try:
        # Get segment criteria
        cur = conn.execute(
            "SELECT criteria_json FROM marketing_segments WHERE id = ?", (id,)
        )
        segment = cur.fetchone()

        if not segment:
            raise HTTPException(status_code=404, detail="Segment not found")

        criteria = json.loads(segment["criteria_json"])

        # Build query to find matching customers with marketing consent
        query = """
            SELECT id, telegram_id, vk_id, phone, full_name, marketing_allowed, points_balance
            FROM customers
            WHERE marketing_allowed = 1 AND (telegram_id IS NOT NULL OR vk_id IS NOT NULL)
        """
        params = []

        # Apply segmentation criteria
        conditions = []

        if "min_balance" in criteria:
            conditions.append("points_balance >= ?")
            params.append(criteria["min_balance"])

        if "days_since_visit" in criteria:
            conditions.append("julianday('now') - julianday(last_visit) >= ?")
            params.append(criteria["days_since_visit"])

        if "min_purchase_amount" in criteria:
            conditions.append("""
                EXISTS (
                    SELECT 1 FROM transactions
                    WHERE customer_id = customers.id
                    AND total_amount >= ?
                )
            """)
            params.append(criteria["min_purchase_amount"])

        if "purchase_frequency" in criteria:
            conditions.append("""
                (SELECT COUNT(*) FROM transactions WHERE customer_id = customers.id) >= ?
            """)
            params.append(criteria["purchase_frequency"])

        if "preferences" in criteria and criteria["preferences"]:
            conditions.append(
                """
                EXISTS (
                    SELECT 1 FROM customer_preferences
                    WHERE customer_id = customers.id
                    AND preference IN ({})
                )
            """.format(
                    ",".join(["?"] * len(criteria["preferences"]))
                )  # noqa: B608 - safe, uses parameterized placeholders
            )
            params.extend(criteria["preferences"])

        if "gender" in criteria:
            conditions.append("gender = ?")
            params.append(criteria["gender"])

        if "age_range" in criteria:
            age_range = criteria["age_range"]
            if "min" in age_range:
                conditions.append("age >= ?")
                params.append(age_range["min"])
            if "max" in age_range:
                conditions.append("age <= ?")
                params.append(age_range["max"])

        if conditions:
            query += " AND " + " AND ".join(conditions)

        query += " LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cur = conn.execute(query, params)
        customers = [dict(row) for row in cur.fetchall()]

        # Get total count for pagination  # noqa: B608 - safe, uses same parameterized query
        count_query = (
            "SELECT COUNT(*) as total FROM ("
            + query.replace(" LIMIT ? OFFSET ?", "")
            + ")"
        )
        count_params = params[:-2]  # Remove limit and offset
        cur_count = conn.execute(count_query, count_params)
        total = cur_count.fetchone()["total"]

        return {
            "customers": customers,
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    finally:
        conn.close()


@router.post("/segments/{id}/refresh")
@router.post("/marketing/segments/{id}/refresh")
def refresh_segment(
    id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.users")
    db = get_db()
    conn = db.connect()

    try:
        conn.execute(
            "UPDATE marketing_segments SET last_updated = datetime('now') WHERE id = ?",
            (id,),
        )
        conn.commit()
        return {"status": "success", "message": "Segment refreshed"}
    finally:
        conn.close()


@router.delete("/segments/{id}")
@router.delete("/marketing/segments/{id}")
def delete_segment(
    id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.users")
    db = get_db()
    conn = db.connect()

    try:
        conn.execute("DELETE FROM marketing_segments WHERE id = ?", (id,))
        conn.commit()
        return {"status": "success", "message": "Segment deleted"}
    finally:
        conn.close()


@router.get("/campaigns")
def list_campaigns(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    db = get_db()
    conn = db.connect()
    rows = conn.execute(
        "SELECT * FROM marketing_campaigns ORDER BY created_at DESC"
    ).fetchall()
    return [dict(r) for r in rows]


@router.post("/campaigns")
def create_campaign(
    campaign: CampaignCreate,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    db = get_db()
    conn = db.connect()
    cursor = conn.execute(
        """
        INSERT INTO marketing_campaigns (name, segment_id, type, content, content_type, media_urls, caption, scheduled_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            campaign.name,
            campaign.segment_id,
            campaign.type,
            campaign.content,
            campaign.content_type,
            campaign.media_urls,
            campaign.caption,
            campaign.scheduled_at,
            "scheduled" if campaign.scheduled_at else "draft",
        ),
    )
    conn.commit()
    return {
        "id": cursor.lastrowid,
        "status": "scheduled" if campaign.scheduled_at else "draft",
    }


@router.post("/campaigns/{id}/send")
def send_campaign(
    id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    """
    Send campaign to all customers in the segment.
    Only sends to customers who have given marketing consent (marketing_allowed = 1).
    """
    check_permission(auth_result, "marketing.campaigns")
    db = get_db()
    conn = db.connect()

    try:
        # Get campaign details
        cur = conn.execute("SELECT * FROM marketing_campaigns WHERE id = ?", (id,))
        campaign = cur.fetchone()

        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        # Count customers with marketing consent
        cur = conn.execute(
            "SELECT COUNT(*) as count FROM customers WHERE marketing_allowed = 1"
        )
        consented_count = cur.fetchone()["count"]

        # Update campaign status
        conn.execute(
            "UPDATE marketing_campaigns SET status = 'sent', sent_at = datetime('now') WHERE id = ?",
            (id,),
        )
        conn.commit()

        # Queue messages for delivery based on content type
        customers = get_customers_with_consent()
        for customer in customers:
            if customer["telegram_id"]:
                if campaign.get("content_type") == "photo" and campaign.get(
                    "media_urls"
                ):
                    # Send photo message
                    celery_app.send_task(
                        "app.worker.send_photo_message",
                        kwargs={
                            "chat_id": customer["telegram_id"],
                            "photo_path": campaign["media_urls"],
                            "caption": campaign.get("caption", campaign["content"]),
                            "campaign_id": id,
                            "customer_id": customer["id"],
                        },
                    )
                elif campaign.get("content_type") == "video" and campaign.get(
                    "media_urls"
                ):
                    # Send video message
                    celery_app.send_task(
                        "app.worker.send_video_message",
                        kwargs={
                            "chat_id": customer["telegram_id"],
                            "video_path": campaign["media_urls"],
                            "caption": campaign.get("caption", campaign["content"]),
                            "campaign_id": id,
                            "customer_id": customer["id"],
                        },
                    )
                elif campaign.get("content_type") == "document" and campaign.get(
                    "media_urls"
                ):
                    # Send document message
                    celery_app.send_task(
                        "app.worker.send_document_message",
                        kwargs={
                            "chat_id": customer["telegram_id"],
                            "document_path": campaign["media_urls"],
                            "caption": campaign.get("caption", campaign["content"]),
                            "campaign_id": id,
                            "customer_id": customer["id"],
                        },
                    )
                elif campaign.get("content_type") == "media_group" and campaign.get(
                    "media_urls"
                ):
                    # Send media group (album)
                    import json

                    media_items = json.loads(campaign["media_urls"])
                    celery_app.send_task(
                        "app.worker.send_media_group_message",
                        kwargs={
                            "chat_id": customer["telegram_id"],
                            "media_items": media_items,
                            "campaign_id": id,
                            "customer_id": customer["id"],
                        },
                    )
                else:
                    # Default to text message
                    celery_app.send_task(
                        "app.worker.send_customer_message",
                        kwargs={
                            "chat_id": customer["telegram_id"],
                            "text": campaign["content"],
                            "campaign_id": id,
                            "customer_id": customer["id"],
                        },
                    )

            if customer["vk_id"]:
                # Send VK message
                if campaign.get("content_type") == "photo" and campaign.get(
                    "media_urls"
                ):
                    celery_app.send_task(
                        "app.worker.send_vk_photo_message",
                        kwargs={
                            "user_id": customer["vk_id"],
                            "photo_path": campaign["media_urls"],
                            "caption": campaign.get("caption", campaign["content"]),
                            "campaign_id": id,
                            "customer_id": customer["id"],
                        },
                    )
                else:
                    # Default to text message
                    celery_app.send_task(
                        "app.worker.send_vk_message",
                        kwargs={
                            "user_id": customer["vk_id"],
                            "text": campaign["content"],
                            "campaign_id": id,
                            "customer_id": customer["id"],
                        },
                    )

        return {
            "status": "sending",
            "recipients": consented_count,
            "note": "Only customers with marketing consent (152-ФЗ) were included",
        }
    finally:
        conn.close()


@router.get("/triggers")
@router.get("/marketing/triggers")
def list_triggers(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    db = get_db()
    conn = db.connect()
    rows = conn.execute(
        "SELECT * FROM marketing_triggers ORDER BY created_at DESC"
    ).fetchall()
    return [dict(r) for r in rows]


@router.get("/rate-limit/status")
@router.get("/marketing/rate-limit/status")
def get_rate_limit_status(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    from app.rate_limiter import get_rate_limit_config

    # Get rate limit config for all channels
    channels = ["telegram", "vk", "mobile"]
    configs = {}

    for channel in channels:
        config = get_rate_limit_config(channel)
        configs[channel] = {
            "per_chat": {
                "max_tokens": config["per_chat"]["max_tokens"],
                "refill_rate": config["per_chat"]["refill_rate"],
            },
            "global": {
                "max_tokens": config["global"]["max_tokens"],
                "refill_rate": config["global"]["refill_rate"],
            },
        }

    return {"rate_limits": configs}


@router.post("/triggers")
@router.post("/marketing/triggers")
def create_trigger(
    trigger: TriggerCreate,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    db = get_db()
    conn = db.connect()
    cursor = conn.execute(
        """
        INSERT INTO marketing_triggers (name, event_source, criteria_json, delay_hours, message_text, media_type, media_url, caption)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            trigger.name,
            trigger.event_source,
            json.dumps(trigger.criteria),
            trigger.delay_hours,
            trigger.message_text,
            trigger.media_type,
            trigger.media_url,
            trigger.caption,
        ),
    )
    conn.commit()
    return {"id": cursor.lastrowid, "status": "active"}


@router.get("/analytics/campaign/{id}")
@router.get("/marketing/analytics/campaign/{id}")
def get_campaign_analytics(
    id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    db = get_db()
    conn = db.connect()
    try:
        # Get campaign performance metrics
        cur = conn.execute(
            """
            SELECT
                COUNT(CASE WHEN event_type = 'sent' THEN 1 END) as sent,
                COUNT(CASE WHEN event_type = 'delivered' THEN 1 END) as delivered,
                COUNT(CASE WHEN event_type = 'opened' THEN 1 END) as opened,
                COUNT(CASE WHEN event_type = 'clicked' THEN 1 END) as clicked
            FROM marketing_events
            WHERE campaign_id = ?
        """,
            (id,),
        )
        metrics = cur.fetchone()

        # Get channel breakdown
        cur = conn.execute(
            """
            SELECT
                json_extract(event_data, '$.channel') as channel,
                COUNT(CASE WHEN event_type = 'sent' THEN 1 END) as sent,
                COUNT(CASE WHEN event_type = 'delivered' THEN 1 END) as delivered,
                COUNT(CASE WHEN event_type = 'opened' THEN 1 END) as opened,
                COUNT(CASE WHEN event_type = 'clicked' THEN 1 END) as clicked
            FROM marketing_events
            WHERE campaign_id = ?
            GROUP BY json_extract(event_data, '$.channel')
        """,
            (id,),
        )
        channel_breakdown = [dict(row) for row in cur.fetchall()]

        return {
            "id": id,
            "metrics": dict(metrics),
            "channel_breakdown": channel_breakdown,
        }
    finally:
        conn.close()


@router.get("/analytics/events")
@router.get("/marketing/analytics/events")
def get_events_breakdown(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("""
            SELECT
                event_type,
                COUNT(*) as count,
                json_extract(event_data, '$.channel') as channel
            FROM marketing_events
            GROUP BY event_type, json_extract(event_data, '$.channel')
            ORDER BY event_type
        """)
        events = [dict(row) for row in cur.fetchall()]

        return {"events": events}
    finally:
        conn.close()
