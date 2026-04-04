"""
Tenant Theming API
Design Token API v2 for per-tenant customization
"""

from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.auth import require_admin
from app.db import DB
import os
import shutil
from pathlib import Path

router = APIRouter(prefix="/api/v1/tenant", tags=["tenant"])

# Asset storage path
ASSETS_DIR = Path(os.getenv("ASSETS_DIR", "/app/assets"))
ASSETS_DIR.mkdir(parents=True, exist_ok=True)


class ThemeConfig(BaseModel):
    """Tenant theme configuration"""
    primary_color: str = Field(default="#3b82f6", pattern="^#[0-9a-fA-F]{6}$")
    secondary_color: str = Field(default="#6366f1", pattern="^#[0-9a-fA-F]{6}$")
    accent_color: str = Field(default="#f59e0b", pattern="^#[0-9a-fA-F]{6}$")
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    brand_name: str = "Coffee Shop CRM"
    border_radius: str = Field(default="md", pattern="^(sm|md|lg|xl)$")
    font_family: str = Field(default="system", pattern="^(system|inter|roboto|custom)$")


class TenantConfigResponse(BaseModel):
    theme: ThemeConfig
    features: dict


class AssetUploadResponse(BaseModel):
    asset_type: str
    url: str
    filename: str


def get_tenant_config(tenant_id: str = "default") -> dict:
    """Get tenant configuration from database"""
    db = DB()
    with db.conn() as conn:
        cursor = conn.execute(
            "SELECT config FROM tenant_configs WHERE tenant_id = ?",
            (tenant_id,)
        )
        row = cursor.fetchone()
        if row:
            import json
            return json.loads(row[0])
        return {}


def save_tenant_config(tenant_id: str, config: dict):
    """Save tenant configuration to database"""
    db = DB()
    import json
    with db.conn() as conn:
        conn.execute(
            """
            INSERT INTO tenant_configs (tenant_id, config, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(tenant_id) DO UPDATE SET
                config = excluded.config,
                updated_at = excluded.updated_at
            """,
            (tenant_id, json.dumps(config))
        )
        conn.commit()


@router.get("/theme", response_model=ThemeConfig)
async def get_tenant_theme(tenant_id: str = "default"):
    """Get tenant theme configuration"""
    config = get_tenant_config(tenant_id)
    theme = config.get("theme", {})
    return ThemeConfig(**theme)


@router.put("/theme", response_model=ThemeConfig)
async def update_tenant_theme(
    theme: ThemeConfig,
    tenant_id: str = "default",
    admin = Depends(require_admin)
):
    """Update tenant theme configuration (admin only)"""
    config = get_tenant_config(tenant_id)
    config["theme"] = theme.model_dump()
    save_tenant_config(tenant_id, config)
    return theme


@router.post("/assets/logo", response_model=AssetUploadResponse)
async def upload_logo(
    file: UploadFile = File(...),
    tenant_id: str = "default",
    admin = Depends(require_admin)
):
    """Upload tenant logo (admin only)"""
    # Validate file type
    allowed_types = {"image/png", "image/jpeg", "image/svg+xml"}
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Only PNG, JPEG, or SVG files allowed")
    
    # Create tenant directory
    tenant_dir = ASSETS_DIR / tenant_id
    tenant_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    ext = file.filename.split(".")[-1].lower()
    filename = f"logo.{ext}"
    file_path = tenant_dir / filename
    
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    # Update config with logo URL
    config = get_tenant_config(tenant_id)
    config["theme"] = config.get("theme", {})
    config["theme"]["logo_url"] = f"/api/v1/assets/{tenant_id}/logo"
    save_tenant_config(tenant_id, config)
    
    return AssetUploadResponse(
        asset_type="logo",
        url=f"/api/v1/assets/{tenant_id}/logo",
        filename=filename
    )


@router.post("/assets/favicon", response_model=AssetUploadResponse)
async def upload_favicon(
    file: UploadFile = File(...),
    tenant_id: str = "default",
    admin = Depends(require_admin)
):
    """Upload tenant favicon (admin only)"""
    allowed_types = {"image/png", "image/x-icon", "image/svg+xml"}
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Only PNG, ICO, or SVG files allowed")
    
    tenant_dir = ASSETS_DIR / tenant_id
    tenant_dir.mkdir(parents=True, exist_ok=True)
    
    ext = file.filename.split(".")[-1].lower()
    filename = f"favicon.{ext}"
    file_path = tenant_dir / filename
    
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    config = get_tenant_config(tenant_id)
    config["theme"] = config.get("theme", {})
    config["theme"]["favicon_url"] = f"/api/v1/assets/{tenant_id}/favicon"
    save_tenant_config(tenant_id, config)
    
    return AssetUploadResponse(
        asset_type="favicon",
        url=f"/api/v1/assets/{tenant_id}/favicon",
        filename=filename
    )


@router.get("/config", response_model=TenantConfigResponse)
async def get_full_tenant_config(tenant_id: str = "default"):
    """Get full tenant configuration including theme and features"""
    config = get_tenant_config(tenant_id)
    return TenantConfigResponse(
        theme=ThemeConfig(**config.get("theme", {})),
        features=config.get("features", {})
    )
