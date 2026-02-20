from typing import List, Optional, Any
from fastapi import APIRouter, Header, HTTPException, Body
from pydantic import BaseModel
import json
from .db import get_db
from .auth import require_permission

router = APIRouter(prefix="/api/v1/marketing")

class SegmentCreate(BaseModel):
    name: str
    criteria: dict[str, Any]

class CampaignCreate(BaseModel):
    name: str
    segment_id: int
    type: str
    content: str
    scheduled_at: Optional[str] = None

@router.get("/marketing/segments")
def list_segments(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret")
):
    require_permission(x_admin_secret, "marketing.users")
    db = get_db()
    conn = db.connect()
    rows = conn.execute("SELECT * FROM marketing_segments ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]

@router.post("/marketing/segments")
def create_segment(
    segment: SegmentCreate,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret")
):
    require_permission(x_admin_secret, "marketing.users")
    db = get_db()
    conn = db.connect()
    cursor = conn.execute(
        "INSERT INTO marketing_segments (name, criteria_json) VALUES (?, ?)",
        (segment.name, json.dumps(segment.criteria))
    )
    conn.commit()
    return {"id": cursor.lastrowid, "name": segment.name}

@router.get("/marketing/campaigns")
def list_campaigns(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret")
):
    require_permission(x_admin_secret, "marketing.campaigns")
    db = get_db()
    conn = db.connect()
    rows = conn.execute("SELECT * FROM marketing_campaigns ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]

@router.post("/marketing/campaigns")
def create_campaign(
    campaign: CampaignCreate,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret")
):
    require_permission(x_admin_secret, "marketing.campaigns")
    db = get_db()
    conn = db.connect()
    cursor = conn.execute(
        """
        INSERT INTO marketing_campaigns (name, segment_id, type, content, scheduled_at, status)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (campaign.name, campaign.segment_id, campaign.type, campaign.content, campaign.scheduled_at, 
         'scheduled' if campaign.scheduled_at else 'draft')
    )
    conn.commit()
    return {"id": cursor.lastrowid, "status": 'scheduled' if campaign.scheduled_at else 'draft'}

@router.post("/campaigns/{id}/send")
def send_campaign(
    id: int,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret")
):
    require_permission(x_admin_secret, "marketing.campaigns")
    db = get_db()
    conn = db.connect()
    # In a real system, this would trigger a background task
    conn.execute("UPDATE marketing_campaigns SET status = 'sent', sent_at = datetime('now') WHERE id = ?", (id,))
    conn.commit()
    return {"status": "sent"}
