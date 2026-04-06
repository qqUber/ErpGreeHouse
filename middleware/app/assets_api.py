"""
Asset Serving API
Serve tenant logos, favicons, and other static assets
"""

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import FileResponse
import os
from pathlib import Path

router = APIRouter(prefix="/api/v1/assets", tags=["assets"])

ASSETS_DIR = Path(os.getenv("ASSETS_DIR", "/app/assets"))

# MIME type mapping
MIME_TYPES = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "svg": "image/svg+xml",
    "ico": "image/x-icon",
    "gif": "image/gif",
    "webp": "image/webp",
}


def get_mime_type(filename: str) -> str:
    """Get MIME type from filename extension"""
    ext = filename.split(".")[-1].lower()
    return MIME_TYPES.get(ext, "application/octet-stream")


@router.get("/{tenant_id}/logo")
async def serve_logo(tenant_id: str):
    """Serve tenant logo"""
    tenant_dir = ASSETS_DIR / tenant_id

    # Try common logo filenames
    for ext in ["svg", "png", "jpg", "jpeg"]:
        logo_path = tenant_dir / f"logo.{ext}"
        if logo_path.exists():
            return FileResponse(
                logo_path,
                media_type=get_mime_type(f"logo.{ext}"),
                headers={
                    "Cache-Control": "public, max-age=86400",  # 24 hours
                    "ETag": f'"{logo_path.stat().st_mtime}"',
                },
            )

    raise HTTPException(404, "Logo not found")


@router.get("/{tenant_id}/favicon")
async def serve_favicon(tenant_id: str):
    """Serve tenant favicon"""
    tenant_dir = ASSETS_DIR / tenant_id

    for ext in ["ico", "png", "svg"]:
        favicon_path = tenant_dir / f"favicon.{ext}"
        if favicon_path.exists():
            return FileResponse(
                favicon_path,
                media_type=get_mime_type(f"favicon.{ext}"),
                headers={
                    "Cache-Control": "public, max-age=86400",
                    "ETag": f'"{favicon_path.stat().st_mtime}"',
                },
            )

    raise HTTPException(404, "Favicon not found")


@router.get("/{tenant_id}/custom.css")
async def serve_custom_css(tenant_id: str):
    """Serve tenant custom CSS"""
    css_path = ASSETS_DIR / tenant_id / "custom.css"

    if not css_path.exists():
        # Return empty CSS with proper headers
        return Response(
            content="/* No custom CSS */",
            media_type="text/css",
            headers={
                "Cache-Control": "public, max-age=3600",  # 1 hour
            },
        )

    return FileResponse(
        css_path,
        media_type="text/css",
        headers={
            "Cache-Control": "public, max-age=3600",
            "ETag": f'"{css_path.stat().st_mtime}"',
        },
    )
