"""
Dashboard API - Enterprise CRM Dashboard Endpoints

Provides comprehensive operational, marketing, customer, product, and integration
analytics for the admin dashboard.
"""

import json
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException

from .admin_api import _cache_get_json, _cache_set_json, check_permission
from .admin_auth_api import require_jwt_auth
from .dashboard_analytics_service import service as dashboard_analytics_service

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])

# Cache TTLs
OPERATIONAL_CACHE_TTL = 60
MARKETING_CACHE_TTL = 300
CUSTOMER_CACHE_TTL = 600
PRODUCT_CACHE_TTL = 300
INTEGRATION_CACHE_TTL = 60


@router.get("/operational")
def get_operational_data(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Get real-time operational data for dashboard."""
    check_permission(auth_result, "dashboard.read")

    today = datetime.now().strftime("%Y-%m-%d")
    cache_key = f"dashboard:operational:{today}"

    cached = _cache_get_json(cache_key)
    if isinstance(cached, dict):
        return cached

    data = dashboard_analytics_service.get_operational_data()
    _cache_set_json(cache_key, data, ttl_seconds=OPERATIONAL_CACHE_TTL)
    return data


@router.get("/marketing")
def get_marketing_data(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Get marketing analytics for dashboard."""
    check_permission(auth_result, "dashboard.read")

    cache_key = "dashboard:marketing:overview"
    cached = _cache_get_json(cache_key)
    if isinstance(cached, dict):
        return cached

    data = dashboard_analytics_service.get_marketing_data()
    _cache_set_json(cache_key, data, ttl_seconds=MARKETING_CACHE_TTL)
    return data


@router.get("/customers")
def get_customer_insights(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Get customer insights for dashboard."""
    check_permission(auth_result, "dashboard.read")

    cache_key = "dashboard:customers:insights"
    cached = _cache_get_json(cache_key)
    if isinstance(cached, dict):
        return cached

    data = dashboard_analytics_service.get_customer_insights()
    _cache_set_json(cache_key, data, ttl_seconds=CUSTOMER_CACHE_TTL)
    return data


@router.get("/products")
def get_product_analytics(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Get product analytics for dashboard."""
    check_permission(auth_result, "dashboard.read")

    cache_key = "dashboard:products:analytics"
    cached = _cache_get_json(cache_key)
    if isinstance(cached, dict):
        return cached

    data = dashboard_analytics_service.get_product_analytics()
    _cache_set_json(cache_key, data, ttl_seconds=PRODUCT_CACHE_TTL)
    return data


@router.get("/integrations")
def get_integration_health(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Get integration health status for dashboard."""
    check_permission(auth_result, "dashboard.read")

    cache_key = "dashboard:integrations:health"
    cached = _cache_get_json(cache_key)
    if isinstance(cached, dict):
        return cached

    data = dashboard_analytics_service.get_integration_health()
    _cache_set_json(cache_key, data, ttl_seconds=INTEGRATION_CACHE_TTL)
    return data


@router.get("/home")
def get_home_dashboard_data(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Get normalized owner-focused home dashboard data."""
    check_permission(auth_result, "dashboard.read")

    role = str(auth_result.get("role") or "unknown").lower()
    cache_key = f"dashboard:home:v1:{role}"
    cached = _cache_get_json(cache_key)
    if isinstance(cached, dict):
        return cached

    data = dashboard_analytics_service.get_home_dashboard_data()
    _cache_set_json(cache_key, data, ttl_seconds=OPERATIONAL_CACHE_TTL)
    return data
