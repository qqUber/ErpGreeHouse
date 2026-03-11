"""
Dashboard API - Enterprise CRM Dashboard Endpoints

Provides comprehensive operational, marketing, customer, product, and integration
analytics for the admin dashboard.
"""

import json
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException

from .admin_api import check_permission
from .admin_auth_api import require_jwt_auth
from .admin_api import _cache_get_json, _cache_set_json
from .db import get_db

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

    db = get_db()
    conn = db.connect()

    try:
        hourly_data = []
        for hour in range(8, 23):
            start_time = f"{today} {hour:02d}:00:00"
            end_time = f"{today} {hour:02d}:59:59"

            cur = conn.execute(
                """SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as revenue
                   FROM transactions WHERE created_at BETWEEN ? AND ?""",
                (start_time, end_time),
            )
            row = cur.fetchone()
            hourly_data.append(
                {
                    "hour": hour,
                    "transactions": int(row["cnt"]),
                    "revenue": int(row["revenue"]),
                }
            )

        cur = conn.execute(
            """SELECT json_extract(value, '$.code') as code,
                   json_extract(value, '$.name') as name,
                   SUM(COALESCE(json_extract(value, '$.qty'), json_extract(value, '$.quantity'), 0)) as total_qty,
                   SUM(
                     COALESCE(json_extract(value, '$.price'), 0) *
                     COALESCE(json_extract(value, '$.qty'), json_extract(value, '$.quantity'), 0)
                   ) as total_revenue
               FROM transactions, json_each(transactions.items_json)
               WHERE date(created_at) = ?
               GROUP BY code ORDER BY total_qty DESC LIMIT 5""",
            (today,),
        )
        top_products = [
            {
                "code": row["code"],
                "name": row["name"],
                "quantity": int(row["total_qty"]),
                "revenue": int(row["total_revenue"]),
            }
            for row in cur.fetchall()
        ]

        cur = conn.execute(
            "SELECT COUNT(*) as active_staff FROM admin_users WHERE disabled = 0"
        )
        active_staff = int(cur.fetchone()["active_staff"])

        cur = conn.execute(
            """SELECT COUNT(*) as total_tx, COALESCE(SUM(total_amount), 0) as total_revenue,
                   COALESCE(AVG(total_amount), 0) as avg_check
               FROM transactions WHERE date(created_at) = ?""",
            (today,),
        )
        row = cur.fetchone()

        peak_hour = (
            max(hourly_data, key=lambda x: x["transactions"]) if hourly_data else None
        )

        data = {
            "date": today,
            "hourly_breakdown": hourly_data,
            "top_products": top_products,
            "active_staff": active_staff,
            "total_transactions": int(row["total_tx"]),
            "total_revenue": int(row["total_revenue"]),
            "average_check": round(float(row["avg_check"]), 2),
            "peak_hour": peak_hour["hour"] if peak_hour else None,
            "peak_hour_transactions": peak_hour["transactions"] if peak_hour else 0,
        }

        _cache_set_json(cache_key, data, ttl_seconds=OPERATIONAL_CACHE_TTL)
        return data
    finally:
        conn.close()


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

    db = get_db()
    conn = db.connect()

    try:
        cur = conn.execute(
            "SELECT COUNT(*) as cnt FROM marketing_campaigns WHERE status = 'active'"
        )
        active_campaigns = int(cur.fetchone()["cnt"])

        yesterday = (datetime.now() - timedelta(hours=24)).isoformat()
        cur = conn.execute(
            """SELECT e.id, e.status, e.created_at, t.name as trigger_name, c.full_name as customer_name
               FROM marketing_trigger_events e
               JOIN marketing_triggers t ON e.trigger_id = t.id
               LEFT JOIN customers c ON e.customer_id = c.id
               WHERE e.created_at > ? ORDER BY e.created_at DESC LIMIT 10""",
            (yesterday,),
        )
        recent_events = [
            {
                "id": row["id"],
                "trigger_name": row["trigger_name"],
                "customer_name": row["customer_name"] or "Unknown",
                "status": row["status"],
                "created_at": row["created_at"],
            }
            for row in cur.fetchall()
        ]

        cur = conn.execute(
            "SELECT status, COUNT(*) as cnt FROM marketing_trigger_events WHERE created_at > ? GROUP BY status",
            (yesterday,),
        )
        trigger_stats = {row["status"]: int(row["cnt"]) for row in cur.fetchall()}

        data = {
            "active_campaigns": active_campaigns,
            "recent_trigger_events": recent_events,
            "trigger_stats_24h": trigger_stats,
            "campaign_performance": [],
            "upcoming_campaigns": [],
        }

        _cache_set_json(cache_key, data, ttl_seconds=MARKETING_CACHE_TTL)
        return data
    finally:
        conn.close()


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

    db = get_db()
    conn = db.connect()

    try:
        today = datetime.now().strftime("%Y-%m-%d")
        week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        month_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

        cur = conn.execute(
            """SELECT SUM(CASE WHEN date(created_at) = ? THEN 1 ELSE 0 END) as today,
                   SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as this_week,
                   SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as this_month
               FROM customers""",
            (today, week_ago, month_ago),
        )
        row = cur.fetchone()
        new_customers = {
            "today": int(row["today"] or 0),
            "this_week": int(row["this_week"] or 0),
            "this_month": int(row["this_month"] or 0),
        }

        timeline = []
        for i in range(6, -1, -1):
            date_str = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            cur = conn.execute(
                "SELECT COUNT(*) as cnt FROM customers WHERE date(created_at) = ?",
                (date_str,),
            )
            timeline.append({"date": date_str, "count": int(cur.fetchone()["cnt"])})

        cur = conn.execute(
            """SELECT c.id, c.full_name, c.phone, COALESCE(SUM(t.total_amount), 0) as total_spent,
                   COUNT(t.id) as transaction_count
               FROM customers c LEFT JOIN transactions t ON c.id = t.customer_id
               GROUP BY c.id ORDER BY total_spent DESC LIMIT 5"""
        )
        top_customers = [
            {
                "id": row["id"],
                "name": row["full_name"],
                "phone": row["phone"],
                "total_spent": int(row["total_spent"]),
                "transactions": int(row["transaction_count"]),
            }
            for row in cur.fetchall()
        ]

        cur = conn.execute(
            """SELECT CASE WHEN total_spent >= 50000 THEN 'Gold'
                       WHEN total_spent >= 20000 THEN 'Silver'
                       WHEN total_spent >= 5000 THEN 'Bronze' ELSE 'Member' END as tier,
                   COUNT(*) as customer_count
               FROM (SELECT c.id, COALESCE(SUM(t.total_amount), 0) as total_spent
                     FROM customers c LEFT JOIN transactions t ON c.id = t.customer_id GROUP BY c.id)
               GROUP BY tier ORDER BY CASE tier WHEN 'Gold' THEN 1 WHEN 'Silver' THEN 2 WHEN 'Bronze' THEN 3 ELSE 4 END"""
        )
        loyalty_tiers = [
            {"tier": row["tier"], "count": int(row["customer_count"])}
            for row in cur.fetchall()
        ]

        data = {
            "new_customers": new_customers,
            "new_customers_timeline": timeline,
            "top_customers": top_customers,
            "birthdays_this_week": [],
            "loyalty_tiers": loyalty_tiers,
            "total_customers": sum(t["count"] for t in loyalty_tiers),
        }

        _cache_set_json(cache_key, data, ttl_seconds=CUSTOMER_CACHE_TTL)
        return data
    finally:
        conn.close()


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

    db = get_db()
    conn = db.connect()

    try:
        today = datetime.now().strftime("%Y-%m-%d")

        cur = conn.execute(
            """SELECT json_extract(value, '$.code') as code, json_extract(value, '$.name') as name,
                   SUM(COALESCE(json_extract(value, '$.qty'), json_extract(value, '$.quantity'), 0)) as qty,
                   SUM(
                     COALESCE(json_extract(value, '$.price'), 0) *
                     COALESCE(json_extract(value, '$.qty'), json_extract(value, '$.quantity'), 0)
                   ) as revenue
               FROM transactions, json_each(transactions.items_json)
               WHERE date(created_at) = ? GROUP BY code ORDER BY qty DESC LIMIT 10""",
            (today,),
        )
        top_today = [
            {
                "code": row["code"],
                "name": row["name"],
                "quantity": int(row["qty"]),
                "revenue": int(row["revenue"]),
            }
            for row in cur.fetchall()
        ]

        cur = conn.execute(
            """SELECT p.kind, COUNT(DISTINCT t.id) as transaction_count,
                   SUM(COALESCE(json_extract(value, '$.qty'), json_extract(value, '$.quantity'), 0)) as items_sold,
                   SUM(
                     COALESCE(json_extract(value, '$.price'), 0) *
                     COALESCE(json_extract(value, '$.qty'), json_extract(value, '$.quantity'), 0)
                   ) as revenue
               FROM transactions t JOIN json_each(t.items_json) ON 1=1
               JOIN products p ON p.code = json_extract(value, '$.code')
               WHERE date(t.created_at) = ? GROUP BY p.kind ORDER BY revenue DESC""",
            (today,),
        )
        category_performance = [
            {
                "category": row["kind"],
                "transactions": int(row["transaction_count"]),
                "items_sold": int(row["items_sold"]),
                "revenue": int(row["revenue"]),
            }
            for row in cur.fetchall()
        ]

        data = {
            "top_products_today": top_today,
            "category_performance": category_performance,
            "trending_products": [],
            "date": today,
        }

        _cache_set_json(cache_key, data, ttl_seconds=PRODUCT_CACHE_TTL)
        return data
    finally:
        conn.close()


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

    db = get_db()
    conn = db.connect()

    try:
        cur = conn.execute(
            "SELECT name, kind, enabled FROM integrations WHERE enabled = 1"
        )
        integrations = [
            {
                "name": row["name"],
                "kind": row["kind"],
                "status": "online" if row["enabled"] else "offline",
            }
            for row in cur.fetchall()
        ]

        yesterday = (datetime.now() - timedelta(hours=24)).isoformat()
        cur = conn.execute(
            """SELECT id, event_type, status, http_status, created_at FROM integration_deliveries
               WHERE created_at > ? ORDER BY created_at DESC LIMIT 10""",
            (yesterday,),
        )
        recent_deliveries = [
            {
                "id": row["id"],
                "event_type": row["event_type"],
                "status": row["status"],
                "http_status": row["http_status"],
                "created_at": row["created_at"],
            }
            for row in cur.fetchall()
        ]

        cur = conn.execute(
            "SELECT status, COUNT(*) as cnt FROM integration_deliveries WHERE created_at > ? GROUP BY status",
            (yesterday,),
        )
        delivery_stats = {row["status"]: int(row["cnt"]) for row in cur.fetchall()}
        total = sum(delivery_stats.values())
        success_rate = (
            round(delivery_stats.get("success", 0) / total * 100, 1) if total > 0 else 0
        )

        data = {
            "integrations": integrations,
            "recent_deliveries": recent_deliveries,
            "delivery_stats_24h": delivery_stats,
            "success_rate": success_rate,
            "pending_count": 0,
            "last_syncs": {},
        }

        _cache_set_json(cache_key, data, ttl_seconds=INTEGRATION_CACHE_TTL)
        return data
    finally:
        conn.close()
