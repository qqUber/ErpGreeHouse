"""Configuration API endpoints for theme, user preferences, and feature flags."""

from typing import Any, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from .auth import require_admin
from .db import get_db

router = APIRouter(prefix="/api/v1/config", tags=["config"])

# === Design Tokens / Theme ===


class ThemeTokens(BaseModel):
    """Design token configuration for tenant theming."""

    primary: str = Field(default="#10b981", description="Primary brand color")
    primaryDark: str = Field(default="#059669", description="Primary color for dark mode")
    secondary: str = Field(default="#3b82f6", description="Secondary accent color")
    secondaryDark: str = Field(default="#2563eb", description="Secondary color for dark mode")
    success: str = Field(default="#22c55e")
    warning: str = Field(default="#f59e0b")
    error: str = Field(default="#ef4444")
    info: str = Field(default="#3b82f6")
    background: str = Field(default="#ffffff")
    backgroundDark: str = Field(default="#0f172a")
    surface: str = Field(default="#f8fafc")
    surfaceDark: str = Field(default="#1e293b")
    text: str = Field(default="#0f172a")
    textDark: str = Field(default="#f8fafc")
    textMuted: str = Field(default="#64748b")
    textMutedDark: str = Field(default="#94a3b8")
    border: str = Field(default="#e2e8f0")
    borderDark: str = Field(default="#334155")


class ThemeConfigResponse(BaseModel):
    """Complete theme configuration response."""

    tenantId: str = Field(default="default")
    brandName: str = Field(default="Coffee Shop CRM")
    logoUrl: str | None = Field(default=None)
    faviconUrl: str | None = Field(default=None)
    tokens: ThemeTokens = Field(default_factory=ThemeTokens)
    fontFamily: str = Field(default="system-ui, -apple-system, sans-serif")
    borderRadius: Literal["none", "small", "medium", "large", "full"] = Field(default="medium")


@router.get("/theme", response_model=ThemeConfigResponse)
async def get_theme_config() -> ThemeConfigResponse:
    """
    Get tenant-level theme configuration including design tokens.

    Returns brand colors, typography, and visual design tokens
    that can be used to customize the UI per tenant.
    """
    # TODO: Load from tenant config in database
    # For now, return default theme
    return ThemeConfigResponse()


# === User Preferences ===


class UserPreferences(BaseModel):
    """User preference settings."""

    theme: Literal["light", "dark", "auto"] = Field(default="auto")
    density: Literal["compact", "comfortable", "spacious"] = Field(default="comfortable")
    locale: Literal["en", "ru", "srb"] = Field(default="en")
    sidebarCollapsed: bool = Field(default=False)
    dashboardLayout: dict[str, Any] = Field(default_factory=dict)


class PreferencesResponse(BaseModel):
    """User preferences response."""

    userId: int
    preferences: UserPreferences


@router.get("/preferences", response_model=PreferencesResponse)
async def get_user_preferences(
    user: dict = Depends(require_admin),
) -> PreferencesResponse:
    """
    Get current user's preferences (theme, density, locale, etc.).
    """
    db = get_db()
    conn = db.connect()
    try:
        cursor = conn.execute("SELECT preferences FROM admin_users WHERE id = ?", (user["id"],))
        row = cursor.fetchone()

        prefs = UserPreferences()
        if row and row[0]:
            import json

            try:
                data = json.loads(row[0])
                prefs = UserPreferences(**data)
            except (json.JSONDecodeError, ValueError):
                pass

        return PreferencesResponse(userId=user["id"], preferences=prefs)
    finally:
        conn.close()


@router.put("/preferences", response_model=PreferencesResponse)
async def update_user_preferences(
    preferences: UserPreferences, user: dict = Depends(require_admin)
) -> PreferencesResponse:
    """
    Update current user's preferences.
    """
    db = get_db()
    conn = db.connect()
    try:
        import json

        prefs_json = json.dumps(preferences.model_dump(), ensure_ascii=False)

        conn.execute(
            "UPDATE admin_users SET preferences = ? WHERE id = ?",
            (prefs_json, user["id"]),
        )
        conn.commit()

        return PreferencesResponse(userId=user["id"], preferences=preferences)
    finally:
        conn.close()


# === Feature Flags ===


class FeatureFlagsResponse(BaseModel):
    """Feature flags configuration."""

    flags: dict[str, bool] = Field(default_factory=dict)
    tenantId: str = Field(default="default")
    version: str = Field(default="1.0.0")


# Default feature flags - can be overridden per tenant
DEFAULT_FEATURES = {
    "marketing.enabled": True,
    "marketing.campaigns": True,
    "marketing.segments": True,
    "marketing.triggers": True,
    "analytics.enabled": True,
    "analytics.dashboard": True,
    "analytics.reports": True,
    "integrations.enabled": True,
    "integrations.telegram": True,
    "integrations.vk": True,
    "integrations.erp": True,
    "compliance.enabled": True,
    "compliance.consents": True,
    "compliance.deletion": True,
    "products.import": True,
    "products.bulkEdit": False,  # Beta feature
    "pos.devMode": False,
    "ui.experimental": False,
}


@router.get("/features", response_model=FeatureFlagsResponse)
async def get_feature_flags() -> FeatureFlagsResponse:
    """
    Get feature flags for the current tenant.

    Returns which UI features are enabled/disabled.
    Can be used to enable features per tenant without redeploy.
    """
    # TODO: Load tenant-specific overrides from database
    return FeatureFlagsResponse(flags=DEFAULT_FEATURES.copy())


# === Dashboard Widget Preferences ===


class WidgetPreferences(BaseModel):
    """Dashboard widget configuration."""

    visible: list[str] = Field(default_factory=list)
    order: list[str] = Field(default_factory=list)
    layouts: dict[str, dict[str, Any]] = Field(default_factory=dict)


class DashboardPreferences(BaseModel):
    """Complete dashboard preferences."""

    widgets: WidgetPreferences = Field(default_factory=WidgetPreferences)
    refreshInterval: int = Field(default=300, description="Auto-refresh interval in seconds")


@router.get("/preferences/dashboard", response_model=DashboardPreferences)
async def get_dashboard_preferences(
    user: dict = Depends(require_admin),
) -> DashboardPreferences:
    """
    Get user's dashboard widget preferences.
    """
    db = get_db()
    conn = db.connect()
    try:
        cursor = conn.execute("SELECT dashboard_prefs FROM admin_users WHERE id = ?", (user["id"],))
        row = cursor.fetchone()

        prefs = DashboardPreferences()
        if row and row[0]:
            import json

            try:
                data = json.loads(row[0])
                prefs = DashboardPreferences(**data)
            except (json.JSONDecodeError, ValueError):
                pass

        return prefs
    finally:
        conn.close()


@router.put("/preferences/dashboard", response_model=DashboardPreferences)
async def update_dashboard_preferences(
    preferences: DashboardPreferences, user: dict = Depends(require_admin)
) -> DashboardPreferences:
    """
    Update user's dashboard widget preferences.
    """
    db = get_db()
    conn = db.connect()
    try:
        import json

        prefs_json = json.dumps(preferences.model_dump(), ensure_ascii=False)

        conn.execute(
            "UPDATE admin_users SET dashboard_prefs = ? WHERE id = ?",
            (prefs_json, user["id"]),
        )
        conn.commit()

        return preferences
    finally:
        conn.close()
