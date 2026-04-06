from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from .admin_auth_api import require_jwt_auth
from .auth import check_permission
from .db import get_db
from .marketing_service import CampaignCreatePayload, MarketingCampaignService

router = APIRouter(prefix="/api/v1/marketing")


def get_customers_with_consent(limit: int = 1000, offset: int = 0) -> List[Dict[str, Any]]:
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
    segment_id: Optional[int] = None
    type: str
    content: str
    content_type: str = "text"
    media_urls: Optional[str] = None
    caption: Optional[str] = None
    scheduled_at: Optional[str] = None
    budget_limit: Optional[int] = None


class CampaignBudgetUpdate(BaseModel):
    budget_limit: Optional[int] = None


class TriggerCreate(BaseModel):
    name: str
    event_source: str
    criteria: dict[str, Any]
    delay_hours: int
    message_text: str
    media_type: Optional[str] = None
    media_url: Optional[str] = None
    caption: Optional[str] = None


def _to_campaign_payload(campaign: CampaignCreate) -> CampaignCreatePayload:
    return CampaignCreatePayload(
        name=campaign.name,
        segment_id=campaign.segment_id,
        type=campaign.type,
        content=campaign.content,
        content_type=campaign.content_type,
        media_urls=campaign.media_urls,
        caption=campaign.caption,
        scheduled_at=campaign.scheduled_at,
        budget_limit=campaign.budget_limit,
    )


@router.get("/segments")
def list_segments(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.users")
    service = MarketingCampaignService()
    return service.list_segments()


@router.post("/segments")
def create_segment(
    segment: SegmentCreate,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.users")
    service = MarketingCampaignService()
    return service.create_segment(segment.name, segment.criteria)


@router.get("/segments/{id}/preview")
@router.get("/marketing/segments/{id}/preview")
def preview_segment(
    id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
    limit: int = 50,
    offset: int = 0,
):
    check_permission(auth_result, "marketing.users")
    service = MarketingCampaignService()
    return service.preview_segment(id, limit=limit, offset=offset)


@router.post("/segments/{id}/refresh")
@router.post("/marketing/segments/{id}/refresh")
def refresh_segment(
    id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.users")
    service = MarketingCampaignService()
    return service.refresh_segment(id)


@router.delete("/segments/{id}")
@router.delete("/marketing/segments/{id}")
def delete_segment(
    id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.users")
    service = MarketingCampaignService()
    return service.delete_segment(id)


@router.get("/campaigns")
def list_campaigns(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    service = MarketingCampaignService()
    return {"items": service.list_campaigns()}


@router.post("/campaigns")
def create_campaign(
    campaign: CampaignCreate,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    service = MarketingCampaignService()
    created = service.create_campaign(_to_campaign_payload(campaign))
    return {"id": created["id"], "status": created["status"], "campaign": created}


@router.post("/campaigns/preview")
def preview_campaign(
    campaign: CampaignCreate,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    service = MarketingCampaignService()
    return service.preview_campaign(_to_campaign_payload(campaign))


@router.post("/campaigns/{id}/send")
def send_campaign(
    id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    service = MarketingCampaignService()
    return service.send_campaign(id)


@router.put("/campaigns/{id}/pause")
def pause_campaign(
    id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    service = MarketingCampaignService()
    return {"campaign": service.pause_campaign(id)}


@router.put("/campaigns/{id}/resume")
def resume_campaign(
    id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    service = MarketingCampaignService()
    return {"campaign": service.resume_campaign(id)}


@router.put("/campaigns/{id}/cancel")
def cancel_campaign(
    id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    service = MarketingCampaignService()
    return {"campaign": service.cancel_campaign(id)}


@router.put("/campaigns/{id}/budget")
def update_campaign_budget(
    id: int,
    payload: CampaignBudgetUpdate,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    service = MarketingCampaignService()
    return {"campaign": service.update_budget(id, payload.budget_limit)}


@router.get("/triggers")
@router.get("/marketing/triggers")
def list_triggers(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    service = MarketingCampaignService()
    return service.list_triggers()


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
    service = MarketingCampaignService()
    return service.create_trigger(
        name=trigger.name,
        event_source=trigger.event_source,
        criteria=trigger.criteria,
        delay_hours=trigger.delay_hours,
        message_text=trigger.message_text,
        media_type=trigger.media_type,
        media_url=trigger.media_url,
        caption=trigger.caption,
    )


@router.get("/analytics/campaign/{id}")
@router.get("/marketing/analytics/campaign/{id}")
def get_campaign_analytics(
    id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    service = MarketingCampaignService()
    return service.get_campaign_analytics(id)


@router.get("/analytics/events")
@router.get("/marketing/analytics/events")
def get_events_breakdown(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
):
    check_permission(auth_result, "marketing.campaigns")
    service = MarketingCampaignService()
    return service.get_events_breakdown()
