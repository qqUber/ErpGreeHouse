import json
from dataclasses import dataclass
from typing import Any, Optional

from fastapi import HTTPException

from .db import get_db
from .worker import celery_app

ALLOWED_CAMPAIGN_STATUSES = {
    "draft",
    "scheduled",
    "active",
    "paused",
    "completed",
    "cancelled",
}
EDITABLE_CAMPAIGN_STATUSES = {"draft", "scheduled", "paused"}
PAUSABLE_CAMPAIGN_STATUSES = {"scheduled", "active"}
RESUMABLE_CAMPAIGN_STATUSES = {"paused"}
CANCELLABLE_CAMPAIGN_STATUSES = {"draft", "scheduled", "active", "paused"}
SENDABLE_CAMPAIGN_STATUSES = {"draft", "scheduled", "paused"}


@dataclass
class CampaignCreatePayload:
    name: str
    segment_id: Optional[int]
    type: str
    content: str
    content_type: str = "text"
    media_urls: Optional[str] = None
    caption: Optional[str] = None
    scheduled_at: Optional[str] = None
    budget_limit: Optional[int] = None


class MarketingCampaignService:
    def __init__(self) -> None:
        self._db = get_db()

    def list_segments(self) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM marketing_segments ORDER BY created_at DESC"
            ).fetchall()
            return [dict(row) for row in rows]

    def create_segment(self, name: str, criteria: dict[str, Any]) -> dict[str, Any]:
        with self._db.connect() as conn:
            cursor = conn.execute(
                "INSERT INTO marketing_segments (name, criteria_json) VALUES (?, ?)",
                (name, json.dumps(criteria)),
            )
            conn.commit()
            return {"id": cursor.lastrowid, "name": name}

    def delete_segment(self, segment_id: int) -> dict[str, Any]:
        with self._db.connect() as conn:
            conn.execute("DELETE FROM marketing_segments WHERE id = ?", (segment_id,))
            conn.commit()
            return {"status": "success", "message": "Segment deleted"}

    def refresh_segment(self, segment_id: int) -> dict[str, Any]:
        with self._db.connect() as conn:
            conn.execute(
                "SELECT id FROM marketing_segments WHERE id = ?", (segment_id,)
            )
            return {"status": "success", "message": "Segment refreshed"}

    def list_triggers(self) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM marketing_triggers ORDER BY created_at DESC"
            ).fetchall()
            return [dict(row) for row in rows]

    def create_trigger(
        self,
        name: str,
        event_source: str,
        criteria: dict[str, Any],
        delay_hours: int,
        message_text: str,
        media_type: Optional[str],
        media_url: Optional[str],
        caption: Optional[str],
    ) -> dict[str, Any]:
        with self._db.connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO marketing_triggers (
                    name,
                    event_source,
                    criteria_json,
                    delay_hours,
                    message_text,
                    media_type,
                    media_url,
                    caption
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    name,
                    event_source,
                    json.dumps(criteria),
                    delay_hours,
                    message_text,
                    media_type,
                    media_url,
                    caption,
                ),
            )
            conn.commit()
            return {"id": cursor.lastrowid, "status": "active"}

    def get_campaign_analytics(self, campaign_id: int) -> dict[str, Any]:
        with self._db.connect() as conn:
            metrics = conn.execute(
                """
                SELECT
                    COUNT(CASE WHEN event_type = 'sent' THEN 1 END) as sent,
                    COUNT(CASE WHEN event_type = 'delivered' THEN 1 END) as delivered,
                    COUNT(CASE WHEN event_type = 'opened' THEN 1 END) as opened,
                    COUNT(CASE WHEN event_type = 'clicked' THEN 1 END) as clicked
                FROM marketing_events
                WHERE campaign_id = ?
                """,
                (campaign_id,),
            ).fetchone()
            channel_rows = conn.execute(
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
                (campaign_id,),
            ).fetchall()
            return {
                "id": campaign_id,
                "metrics": dict(metrics),
                "channel_breakdown": [dict(row) for row in channel_rows],
            }

    def get_events_breakdown(self) -> dict[str, Any]:
        with self._db.connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    event_type,
                    COUNT(*) as count,
                    json_extract(event_data, '$.channel') as channel
                FROM marketing_events
                GROUP BY event_type, json_extract(event_data, '$.channel')
                ORDER BY event_type
                """
            ).fetchall()
            return {"events": [dict(row) for row in rows]}

    def list_campaigns(self) -> list[dict[str, Any]]:
        with self._db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM marketing_campaigns ORDER BY created_at DESC, id DESC"
            ).fetchall()
            return [self._serialize_campaign(dict(row)) for row in rows]

    def create_campaign(self, payload: CampaignCreatePayload) -> dict[str, Any]:
        initial_status = "scheduled" if payload.scheduled_at else "draft"
        with self._db.connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO marketing_campaigns (
                    name,
                    segment_id,
                    type,
                    content,
                    content_type,
                    media_urls,
                    caption,
                    status,
                    scheduled_at,
                    budget_limit,
                    budget_spent,
                    audience_count,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, datetime('now'))
                """,
                (
                    payload.name,
                    payload.segment_id,
                    payload.type,
                    payload.content,
                    payload.content_type,
                    payload.media_urls,
                    payload.caption,
                    initial_status,
                    payload.scheduled_at,
                    payload.budget_limit,
                ),
            )
            conn.commit()
            row = conn.execute(
                "SELECT * FROM marketing_campaigns WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
            if not row:
                raise HTTPException(status_code=500, detail="Campaign creation failed")
            return self._serialize_campaign(dict(row))

    def send_campaign(self, campaign_id: int) -> dict[str, Any]:
        with self._db.connect() as conn:
            campaign = self._require_campaign(conn, campaign_id)
            status = self._get_campaign_status(campaign)
            if status not in SENDABLE_CAMPAIGN_STATUSES:
                raise HTTPException(
                    status_code=409,
                    detail=f"Campaign in status '{status}' cannot be sent",
                )

            customers = self._resolve_segment_customers(conn, campaign)
            audience_count = len(customers)
            self._assert_budget_capacity(campaign, audience_count)

            started_at = conn.execute("SELECT datetime('now') as now").fetchone()["now"]
            completed_at = started_at if audience_count == 0 else None
            final_status = "completed" if audience_count == 0 else "active"

            conn.execute(
                """
                UPDATE marketing_campaigns
                SET status = ?,
                    started_at = COALESCE(started_at, ?),
                    sent_at = ?,
                    completed_at = ?,
                    paused_at = NULL,
                    cancelled_at = NULL,
                    audience_count = ?,
                    budget_spent = COALESCE(budget_spent, 0) + ?,
                    updated_at = datetime('now')
                WHERE id = ?
                """,
                (
                    final_status,
                    started_at,
                    started_at,
                    completed_at,
                    audience_count,
                    audience_count,
                    campaign_id,
                ),
            )

            for customer in customers:
                self._queue_campaign_delivery(campaign, customer)
                channel = self._resolve_customer_channel(customer)
                conn.execute(
                    """
                    INSERT INTO marketing_events (campaign_id, user_id, event_type, event_data, created_at)
                    VALUES (?, ?, 'sent', ?, datetime('now'))
                    """,
                    (
                        campaign_id,
                        customer["id"],
                        json.dumps(
                            {
                                "channel": channel,
                                "status_after_send": final_status,
                                "customer_id": customer["id"],
                            }
                        ),
                    ),
                )

            conn.commit()
            refreshed = self._require_campaign(conn, campaign_id)
            return {
                "campaign": self._serialize_campaign(refreshed),
                "status": final_status,
                "recipients": audience_count,
                "note": "Only customers with marketing consent were included",
            }

    def pause_campaign(self, campaign_id: int) -> dict[str, Any]:
        return self._transition_campaign(
            campaign_id=campaign_id,
            allowed_statuses=PAUSABLE_CAMPAIGN_STATUSES,
            next_status="paused",
            timestamp_field="paused_at",
        )

    def resume_campaign(self, campaign_id: int) -> dict[str, Any]:
        with self._db.connect() as conn:
            campaign = self._require_campaign(conn, campaign_id)
            status = self._get_campaign_status(campaign)
            if status not in RESUMABLE_CAMPAIGN_STATUSES:
                raise HTTPException(
                    status_code=409,
                    detail=f"Campaign in status '{status}' cannot be resumed",
                )
            next_status = "scheduled" if campaign["scheduled_at"] else "active"
            conn.execute(
                """
                UPDATE marketing_campaigns
                SET status = ?,
                    paused_at = NULL,
                    cancelled_at = NULL,
                    updated_at = datetime('now')
                WHERE id = ?
                """,
                (next_status, campaign_id),
            )
            conn.commit()
            refreshed = self._require_campaign(conn, campaign_id)
            return self._serialize_campaign(refreshed)

    def cancel_campaign(self, campaign_id: int) -> dict[str, Any]:
        return self._transition_campaign(
            campaign_id=campaign_id,
            allowed_statuses=CANCELLABLE_CAMPAIGN_STATUSES,
            next_status="cancelled",
            timestamp_field="cancelled_at",
        )

    def update_budget(
        self, campaign_id: int, budget_limit: Optional[int]
    ) -> dict[str, Any]:
        normalized_budget = None if budget_limit is None else max(0, int(budget_limit))
        with self._db.connect() as conn:
            campaign = self._require_campaign(conn, campaign_id)
            spent = int(campaign["budget_spent"] or 0)
            if normalized_budget is not None and normalized_budget < spent:
                raise HTTPException(
                    status_code=409,
                    detail="Budget limit cannot be lower than already spent budget",
                )
            conn.execute(
                """
                UPDATE marketing_campaigns
                SET budget_limit = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                (normalized_budget, campaign_id),
            )
            conn.commit()
            refreshed = self._require_campaign(conn, campaign_id)
            return self._serialize_campaign(refreshed)

    def preview_segment(
        self, segment_id: int, limit: int = 50, offset: int = 0
    ) -> dict[str, Any]:
        with self._db.connect() as conn:
            criteria = self._get_segment_criteria(conn, segment_id)
            customers = self._resolve_customers_by_criteria(
                conn,
                criteria,
                limit=limit,
                offset=offset,
            )
            total = self._count_customers_by_criteria(conn, criteria)
            return {
                "customers": customers,
                "total": total,
                "limit": limit,
                "offset": offset,
            }

    def preview_campaign(self, payload: CampaignCreatePayload) -> dict[str, Any]:
        with self._db.connect() as conn:
            campaign = {
                "id": None,
                "segment_id": payload.segment_id,
                "type": payload.type,
                "content": payload.content,
                "content_type": payload.content_type,
                "media_urls": payload.media_urls,
                "caption": payload.caption,
                "scheduled_at": payload.scheduled_at,
                "status": "scheduled" if payload.scheduled_at else "draft",
                "budget_limit": payload.budget_limit,
                "budget_spent": 0,
            }
            customers = self._resolve_segment_customers(conn, campaign, limit=5)
            rendered = [
                self._render_customer_preview(payload.content, customer)
                for customer in customers
            ]
            return {
                "audience_preview": customers,
                "rendered_messages": rendered,
                "estimated_recipients": self._count_segment_customers(conn, campaign),
            }

    def _transition_campaign(
        self,
        campaign_id: int,
        allowed_statuses: set[str],
        next_status: str,
        timestamp_field: str,
    ) -> dict[str, Any]:
        with self._db.connect() as conn:
            campaign = self._require_campaign(conn, campaign_id)
            current_status = self._get_campaign_status(campaign)
            if current_status not in allowed_statuses:
                raise HTTPException(
                    status_code=409,
                    detail=f"Campaign in status '{current_status}' cannot transition to '{next_status}'",
                )
            conn.execute(
                f"""
                UPDATE marketing_campaigns
                SET status = ?,
                    {timestamp_field} = datetime('now'),
                    updated_at = datetime('now')
                WHERE id = ?
                """,
                (next_status, campaign_id),
            )
            conn.commit()
            refreshed = self._require_campaign(conn, campaign_id)
            return self._serialize_campaign(refreshed)

    def _require_campaign(self, conn: Any, campaign_id: int) -> dict[str, Any]:
        row = conn.execute(
            "SELECT * FROM marketing_campaigns WHERE id = ?",
            (campaign_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return dict(row)

    def _get_campaign_status(self, campaign: dict[str, Any]) -> str:
        return str(campaign.get("status") or "draft")

    def _resolve_segment_customers(
        self,
        conn: Any,
        campaign: dict[str, Any],
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        criteria: dict[str, Any] = {}
        if campaign.get("segment_id"):
            criteria = self._get_segment_criteria(conn, int(campaign["segment_id"]))

        return self._resolve_customers_by_criteria(
            conn,
            criteria,
            limit=limit,
            offset=offset,
        )

    def _count_segment_customers(self, conn: Any, campaign: dict[str, Any]) -> int:
        criteria: dict[str, Any] = {}
        if campaign.get("segment_id"):
            criteria = self._get_segment_criteria(conn, int(campaign["segment_id"]))
        return self._count_customers_by_criteria(conn, criteria)

    def _get_segment_criteria(self, conn: Any, segment_id: int) -> dict[str, Any]:
        row = conn.execute(
            "SELECT criteria_json FROM marketing_segments WHERE id = ?",
            (segment_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Segment not found")
        if not row["criteria_json"]:
            return {}
        return json.loads(row["criteria_json"])

    def _resolve_customers_by_criteria(
        self,
        conn: Any,
        criteria: dict[str, Any],
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        query, params = self._build_customer_query(criteria)
        query += " ORDER BY id DESC"
        if limit is not None:
            query += " LIMIT ? OFFSET ?"
            params.extend([limit, offset])

        rows = conn.execute(query, params).fetchall()
        customers: list[dict[str, Any]] = []
        for row in rows:
            customer = dict(row)
            preferences_raw = customer.get("preferences_json")
            if preferences_raw:
                try:
                    customer["preferences"] = json.loads(preferences_raw)
                except json.JSONDecodeError:
                    customer["preferences"] = {}
            else:
                customer["preferences"] = {}
            customers.append(customer)
        return customers

    def _count_customers_by_criteria(self, conn: Any, criteria: dict[str, Any]) -> int:
        query, params = self._build_customer_query(
            criteria, select_clause="SELECT COUNT(*) as total"
        )
        row = conn.execute(query, params).fetchone()
        return int(row["total"] or 0)

    def _build_customer_query(
        self,
        criteria: dict[str, Any],
        select_clause: str = """
            SELECT
                id,
                telegram_id,
                vk_id,
                phone,
                full_name,
                marketing_allowed,
                balance_points,
                city,
                gender,
                purchase_frequency,
                last_purchase_date,
                preferences_json
        """,
    ) -> tuple[str, list[Any]]:
        query = f"""
            {select_clause}
            FROM customers
            WHERE marketing_allowed = 1 AND (telegram_id IS NOT NULL OR vk_id IS NOT NULL)
        """
        params: list[Any] = []
        filters: list[str] = []

        if criteria.get("min_balance") is not None:
            filters.append("balance_points >= ?")
            params.append(int(criteria["min_balance"]))
        if criteria.get("days_since_visit") is not None:
            filters.append(
                "(last_purchase_date IS NOT NULL AND julianday('now') - julianday(last_purchase_date) >= ?)"
            )
            params.append(int(criteria["days_since_visit"]))
        if criteria.get("min_purchase_amount") is not None:
            filters.append(
                """
                EXISTS (
                    SELECT 1 FROM transactions
                    WHERE customer_id = customers.id
                    AND total_amount >= ?
                )
                """
            )
            params.append(int(criteria["min_purchase_amount"]))
        if criteria.get("purchase_frequency") is not None:
            filters.append("purchase_frequency >= ?")
            params.append(int(criteria["purchase_frequency"]))
        if criteria.get("city"):
            filters.append("LOWER(city) = LOWER(?)")
            params.append(str(criteria["city"]))
        if criteria.get("gender"):
            filters.append("gender = ?")
            params.append(str(criteria["gender"]))
        if criteria.get("time_of_day"):
            filters.append(self._build_time_of_day_clause(criteria["time_of_day"]))
        if filters:
            query += " AND " + " AND ".join(filters)

        return query, params

    def _build_time_of_day_clause(self, value: Any) -> str:
        normalized = str(value or "").strip().lower()
        if normalized == "morning":
            return (
                "CAST(strftime('%H', last_purchase_date) AS INTEGER) BETWEEN 6 AND 11"
            )
        if normalized == "lunch":
            return (
                "CAST(strftime('%H', last_purchase_date) AS INTEGER) BETWEEN 12 AND 15"
            )
        if normalized == "evening":
            return (
                "CAST(strftime('%H', last_purchase_date) AS INTEGER) BETWEEN 16 AND 22"
            )
        return "1 = 1"

    def _assert_budget_capacity(
        self, campaign: dict[str, Any], audience_count: int
    ) -> None:
        budget_limit = campaign.get("budget_limit")
        if budget_limit is None:
            return
        spent = int(campaign.get("budget_spent") or 0)
        projected = spent + audience_count
        if projected > int(budget_limit):
            raise HTTPException(
                status_code=409,
                detail="Campaign budget limit would be exceeded by this send",
            )

    def _queue_campaign_delivery(
        self, campaign: dict[str, Any], customer: dict[str, Any]
    ) -> None:
        campaign_id = campaign["id"]
        content_type = campaign.get("content_type") or "text"
        media_urls = campaign.get("media_urls")
        caption = campaign.get("caption") or campaign.get("content")
        if customer.get("telegram_id"):
            if content_type == "photo" and media_urls:
                celery_app.send_task(
                    "app.worker.send_photo_message",
                    kwargs={
                        "chat_id": customer["telegram_id"],
                        "photo_path": media_urls,
                        "caption": caption,
                        "campaign_id": campaign_id,
                        "customer_id": customer["id"],
                    },
                )
            elif content_type == "video" and media_urls:
                celery_app.send_task(
                    "app.worker.send_video_message",
                    kwargs={
                        "chat_id": customer["telegram_id"],
                        "video_path": media_urls,
                        "caption": caption,
                        "campaign_id": campaign_id,
                        "customer_id": customer["id"],
                    },
                )
            elif content_type == "document" and media_urls:
                celery_app.send_task(
                    "app.worker.send_document_message",
                    kwargs={
                        "chat_id": customer["telegram_id"],
                        "document_path": media_urls,
                        "caption": caption,
                        "campaign_id": campaign_id,
                        "customer_id": customer["id"],
                    },
                )
            elif content_type == "media_group" and media_urls:
                media_items = json.loads(media_urls)
                celery_app.send_task(
                    "app.worker.send_media_group_message",
                    kwargs={
                        "chat_id": customer["telegram_id"],
                        "media_items": media_items,
                        "campaign_id": campaign_id,
                        "customer_id": customer["id"],
                    },
                )
            else:
                celery_app.send_task(
                    "app.worker.send_customer_message",
                    kwargs={
                        "chat_id": customer["telegram_id"],
                        "text": campaign["content"],
                        "campaign_id": campaign_id,
                        "customer_id": customer["id"],
                    },
                )

        if customer.get("vk_id"):
            if content_type == "photo" and media_urls:
                celery_app.send_task(
                    "app.worker.send_vk_photo_message",
                    kwargs={
                        "user_id": customer["vk_id"],
                        "photo_path": media_urls,
                        "caption": caption,
                        "campaign_id": campaign_id,
                        "customer_id": customer["id"],
                    },
                )
            else:
                celery_app.send_task(
                    "app.worker.send_vk_message",
                    kwargs={
                        "user_id": customer["vk_id"],
                        "text": campaign["content"],
                        "campaign_id": campaign_id,
                        "customer_id": customer["id"],
                    },
                )

    def _resolve_customer_channel(self, customer: dict[str, Any]) -> str:
        if customer.get("telegram_id"):
            return "telegram"
        if customer.get("vk_id"):
            return "vk"
        return "unknown"

    def _render_customer_preview(
        self, content: str, customer: dict[str, Any]
    ) -> dict[str, Any]:
        name = (customer.get("full_name") or "Guest").strip() or "Guest"
        first_name = name.split()[0]
        favorite_drink = self._resolve_favorite_drink(customer)
        usual_time = self._resolve_usual_time(customer)
        points_balance = int(customer.get("balance_points") or 0)
        placeholders = {
            "{first_name}": first_name,
            "{favorite_drink}": favorite_drink,
            "{usual_time}": usual_time,
            "{points_balance}": str(points_balance),
            "{points_to_free_coffee}": str(max(0, 100 - points_balance)),
            "{last_visit_days}": self._resolve_last_visit_days(customer),
        }
        rendered = content
        for key, value in placeholders.items():
            rendered = rendered.replace(key, value)
        return {
            "customer_id": customer["id"],
            "customer_name": name,
            "message": rendered,
        }

    def _resolve_favorite_drink(self, customer: dict[str, Any]) -> str:
        preferences = customer.get("preferences") or {}
        if isinstance(preferences, dict):
            for key in ("favorite_drink", "drink", "preferred_drink"):
                value = preferences.get(key)
                if value:
                    return str(value)
            likes = preferences.get("likes")
            if isinstance(likes, list) and likes:
                return str(likes[0])
        return "coffee"

    def _resolve_usual_time(self, customer: dict[str, Any]) -> str:
        last_purchase_date = customer.get("last_purchase_date")
        if isinstance(last_purchase_date, str) and len(last_purchase_date) >= 13:
            try:
                hour = int(last_purchase_date[11:13])
                if hour < 12:
                    return "morning"
                if hour < 16:
                    return "lunch"
                return "evening"
            except ValueError:
                return "your usual time"
        return "your usual time"

    def _resolve_last_visit_days(self, customer: dict[str, Any]) -> str:
        last_purchase_date = customer.get("last_purchase_date")
        if not last_purchase_date:
            return "0"
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT CAST(julianday('now') - julianday(?) AS INTEGER) as diff",
                (last_purchase_date,),
            ).fetchone()
            return str(max(0, int(row["diff"] or 0)))

    def _serialize_campaign(self, campaign: dict[str, Any]) -> dict[str, Any]:
        stats_raw = campaign.get("stats_json")
        stats = None
        if stats_raw:
            try:
                stats = json.loads(stats_raw)
            except json.JSONDecodeError:
                stats = None
        return {
            **campaign,
            "status": campaign.get("status") or "draft",
            "budget_limit": campaign.get("budget_limit"),
            "budget_spent": int(campaign.get("budget_spent") or 0),
            "audience_count": int(campaign.get("audience_count") or 0),
            "stats": stats,
        }
