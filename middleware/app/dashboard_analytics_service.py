from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from .db import get_db


@dataclass(frozen=True)
class DashboardDateRange:
    start: datetime
    end: datetime


class DashboardAnalyticsService:
    def __init__(self) -> None:
        self._db = get_db()

    def _connect(self):
        return self._db.connect()

    def get_home_dashboard_data(self) -> dict[str, Any]:
        with self._connect() as conn:
            operational = self._get_operational_metrics(conn)
            customer = self._get_customer_metrics(conn)
            product = self._get_product_metrics(conn)
            campaign = self._get_campaign_metrics(conn)
            loyalty = self._get_loyalty_metrics(conn, self._resolve_date_range("30d"))
            attention = self._get_attention_metrics(
                customer=customer,
                campaign=campaign,
                product=product,
                loyalty=loyalty,
            )
            integrations = self._get_integration_metrics(conn)

            return {
                "generated_at": datetime.now().isoformat(),
                "salesCard": operational,
                "customerCard": customer,
                "topProductsCard": product,
                "campaignPulseCard": campaign,
                "loyaltyCard": loyalty,
                "attentionRequiredCard": attention,
                "integrationsCard": integrations,
            }

    def get_operational_data(self) -> dict[str, Any]:
        with self._connect() as conn:
            return self._get_operational_metrics(conn)

    def get_marketing_data(self) -> dict[str, Any]:
        with self._connect() as conn:
            campaign = self._get_campaign_metrics(conn)
            return {
                "active_campaigns": campaign["activeCampaigns"],
                "recent_trigger_events": campaign["recentEvents"],
                "trigger_stats_24h": campaign["triggerStats24h"],
                "campaign_performance": campaign["campaignPerformance"],
                "upcoming_campaigns": campaign["upcomingCampaigns"],
                "needs_attention": campaign["needsAttention"],
            }

    def get_customer_insights(self) -> dict[str, Any]:
        with self._connect() as conn:
            customer = self._get_customer_metrics(conn)
            return {
                "new_customers": {
                    "today": customer["newToday"],
                    "this_week": customer["newCustomers"],
                    "this_month": customer["newThisMonth"],
                },
                "new_customers_timeline": customer["newCustomersTimeline"],
                "top_customers": customer["topCustomers"],
                "birthdays_this_week": customer["birthdaysThisWeek"],
                "loyalty_tiers": customer["loyaltyTiers"],
                "total_customers": customer["totalCustomers"],
                "repeat_customers": customer["repeatCustomers"],
                "reachable_customers": customer["reachableCustomers"],
                "marketing_consent_rate": customer["consentRate"],
                "priority_actions": customer["priorityActions"],
            }

    def get_product_analytics(self) -> dict[str, Any]:
        with self._connect() as conn:
            product = self._get_product_metrics(conn)
            return {
                "total_products": product["totalProducts"],
                "top_products_today": product["topProducts"],
                "category_performance": product["categoryTrend"],
                "trending_products": product["topProducts"],
                "date": datetime.now().strftime("%Y-%m-%d"),
            }

    def get_integration_health(self) -> dict[str, Any]:
        with self._connect() as conn:
            integrations = self._get_integration_metrics(conn)
            return {
                "integrations": integrations["integrations"],
                "recent_deliveries": integrations["recentDeliveries"],
                "delivery_stats_24h": integrations["deliveryStats24h"],
                "success_rate": integrations["successRate"],
                "pending_count": integrations["pendingCount"],
                "last_syncs": integrations["lastSyncs"],
            }

    def get_marketing_analytics(self) -> dict[str, Any]:
        with self._connect() as conn:
            customer = self._get_customer_metrics(conn)
            campaign = self._get_campaign_metrics(conn)
            range_30d = self._resolve_date_range("30d")
            loyalty = self._get_loyalty_metrics(conn, range_30d)
            return {
                "customers": {
                    "total_customers": customer["totalCustomers"],
                    "marketing_consent": customer["marketingConsentCount"],
                    "avg_ltv": customer["avgLtv"],
                    "avg_balance": customer["avgBalance"],
                    "segments": customer["segments"],
                    "channels": customer["channels"],
                },
                "campaigns": {
                    "active_campaigns": campaign["activeCampaigns"],
                    "upcoming_campaigns": campaign["upcomingCount"],
                    "messages_sent_24h": campaign["messagesSent24h"],
                    "open_rate": campaign["openRate"],
                    "click_rate": campaign["clickRate"],
                },
                "performance": {
                    "total_revenue": loyalty["revenue"],
                    "avg_order_value": loyalty["avgOrderValue"],
                    "purchase_frequency": customer["purchaseFrequency"],
                    "customer_retention": loyalty["redemptionRate"],
                },
                "last_updated": datetime.now().isoformat(),
            }

    def _resolve_date_range(self, time_range: str) -> DashboardDateRange:
        end = datetime.now()
        if time_range == "24h":
            start = end - timedelta(hours=24)
        elif time_range == "7d":
            start = end - timedelta(days=7)
        elif time_range == "30d":
            start = end - timedelta(days=30)
        elif time_range == "90d":
            start = end - timedelta(days=90)
        elif time_range == "1y":
            start = end - timedelta(days=365)
        else:
            start = end - timedelta(days=7)
        return DashboardDateRange(start=start, end=end)

    def _get_operational_metrics(self, conn) -> dict[str, Any]:
        today = datetime.now().strftime("%Y-%m-%d")
        hourly_data: list[dict[str, Any]] = []
        for hour in range(8, 23):
            start_time = f"{today} {hour:02d}:00:00"
            end_time = f"{today} {hour:02d}:59:59"
            row = conn.execute(
                """SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as revenue
                   FROM transactions WHERE created_at BETWEEN ? AND ?""",
                (start_time, end_time),
            ).fetchone()
            hourly_data.append(
                {
                    "hour": hour,
                    "transactions": int(row["cnt"] or 0),
                    "revenue": int(row["revenue"] or 0),
                }
            )

        rows = conn.execute(
            """SELECT json_extract(value, '$.code') as code,
                      json_extract(value, '$.name') as name,
                      SUM(COALESCE(json_extract(value, '$.qty'), json_extract(value, '$.quantity'), 0)) as total_qty,
                      SUM(COALESCE(json_extract(value, '$.price'), 0) * COALESCE(json_extract(value, '$.qty'), json_extract(value, '$.quantity'), 0)) as total_revenue
               FROM transactions, json_each(transactions.items_json)
               WHERE date(created_at) = ?
               GROUP BY code ORDER BY total_qty DESC LIMIT 5""",
            (today,),
        ).fetchall()
        top_products = [
            {
                "code": row["code"],
                "name": row["name"],
                "quantity": int(row["total_qty"] or 0),
                "revenue": int(row["total_revenue"] or 0),
            }
            for row in rows
        ]

        staff = conn.execute(
            "SELECT COUNT(*) as active_staff FROM admin_users WHERE disabled = 0"
        ).fetchone()
        summary = conn.execute(
            """SELECT COUNT(*) as total_tx, COALESCE(SUM(total_amount), 0) as total_revenue,
                      COALESCE(AVG(total_amount), 0) as avg_check
               FROM transactions WHERE date(created_at) = ?""",
            (today,),
        ).fetchone()
        peak_hour = max(
            hourly_data, key=lambda item: item["transactions"], default=None
        )

        return {
            "date": today,
            "hourly_breakdown": hourly_data,
            "top_products": top_products,
            "active_staff": int(staff["active_staff"] or 0),
            "total_transactions": int(summary["total_tx"] or 0),
            "total_revenue": int(summary["total_revenue"] or 0),
            "average_check": round(float(summary["avg_check"] or 0), 2),
            "peak_hour": peak_hour["hour"] if peak_hour else None,
            "peak_hour_transactions": peak_hour["transactions"] if peak_hour else 0,
            "headline": {
                "revenue": int(summary["total_revenue"] or 0),
                "transactions": int(summary["total_tx"] or 0),
                "avgCheck": round(float(summary["avg_check"] or 0), 2),
                "peakHour": peak_hour["hour"] if peak_hour else None,
            },
        }

    def _get_customer_metrics(self, conn) -> dict[str, Any]:
        now = datetime.now()
        today = now.strftime("%Y-%m-%d")
        week_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
        month_ago = (now - timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")

        counts = conn.execute(
            """SELECT COUNT(*) as total_customers,
                      SUM(CASE WHEN date(created_at) = ? THEN 1 ELSE 0 END) as today_customers,
                      SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as week_customers,
                      SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as month_customers,
                      SUM(CASE WHEN marketing_allowed = 1 THEN 1 ELSE 0 END) as marketing_consent,
                      SUM(CASE WHEN telegram_id IS NOT NULL OR vk_id IS NOT NULL THEN 1 ELSE 0 END) as reachable_customers,
                      SUM(CASE WHEN telegram_id IS NOT NULL THEN 1 ELSE 0 END) as telegram_customers,
                      SUM(CASE WHEN vk_id IS NOT NULL THEN 1 ELSE 0 END) as vk_customers,
                      AVG(COALESCE(ltv, 0)) as avg_ltv,
                      AVG(COALESCE(balance_points, 0)) as avg_balance
               FROM customers""",
            (today, week_ago, month_ago),
        ).fetchone()

        top_customers = [
            {
                "id": row["id"],
                "name": row["full_name"],
                "phone": row["phone"],
                "total_spent": int(row["total_spent"] or 0),
                "transactions": int(row["transaction_count"] or 0),
                "telegram_id": row["telegram_id"],
                "vk_id": row["vk_id"],
                "marketing_allowed": bool(row["marketing_allowed"]),
                "balance_points": int(row["balance_points"] or 0),
                "ltv": int(row["ltv"] or row["total_spent"] or 0),
                "last_purchase_date": row["last_purchase_date"],
            }
            for row in conn.execute(
                """SELECT c.id, c.full_name, c.phone, c.telegram_id, c.vk_id, c.marketing_allowed,
                          c.balance_points, c.ltv, c.last_purchase_date,
                          COALESCE(SUM(t.total_amount), 0) as total_spent,
                          COUNT(t.id) as transaction_count
                   FROM customers c
                   LEFT JOIN transactions t ON c.id = t.customer_id
                   GROUP BY c.id
                   ORDER BY total_spent DESC
                   LIMIT 8"""
            ).fetchall()
        ]

        loyalty_tiers = [
            {"tier": row["tier"], "count": int(row["customer_count"] or 0)}
            for row in conn.execute(
                """SELECT CASE WHEN total_spent >= 50000 THEN 'Gold'
                              WHEN total_spent >= 20000 THEN 'Silver'
                              WHEN total_spent >= 5000 THEN 'Bronze' ELSE 'Member' END as tier,
                          COUNT(*) as customer_count
                   FROM (
                        SELECT c.id, COALESCE(SUM(t.total_amount), 0) as total_spent
                        FROM customers c
                        LEFT JOIN transactions t ON c.id = t.customer_id
                        GROUP BY c.id
                   )
                   GROUP BY tier
                   ORDER BY CASE tier WHEN 'Gold' THEN 1 WHEN 'Silver' THEN 2 WHEN 'Bronze' THEN 3 ELSE 4 END"""
            ).fetchall()
        ]

        timeline = []
        for offset in range(6, -1, -1):
            date_str = (now - timedelta(days=offset)).strftime("%Y-%m-%d")
            row = conn.execute(
                "SELECT COUNT(*) as cnt FROM customers WHERE date(created_at) = ?",
                (date_str,),
            ).fetchone()
            timeline.append({"date": date_str, "count": int(row["cnt"] or 0)})

        total_customers = int(counts["total_customers"] or 0)
        marketing_consent = int(counts["marketing_consent"] or 0)
        reachable_customers = int(counts["reachable_customers"] or 0)
        repeat_customers = max(total_customers - int(counts["week_customers"] or 0), 0)
        high_value_count = sum(
            1 for customer in top_customers if int(customer["ltv"] or 0) >= 15000
        )
        consent_gap_count = max(total_customers - marketing_consent, 0)
        unreachable_count = max(total_customers - reachable_customers, 0)

        return {
            "totalCustomers": total_customers,
            "newToday": int(counts["today_customers"] or 0),
            "newCustomers": int(counts["week_customers"] or 0),
            "newThisMonth": int(counts["month_customers"] or 0),
            "repeatCustomers": repeat_customers,
            "reachableCustomers": reachable_customers,
            "marketingConsentCount": marketing_consent,
            "consentRate": (
                round((marketing_consent / total_customers) * 100)
                if total_customers
                else 0
            ),
            "topCustomers": top_customers,
            "segments": {
                "high_value": high_value_count,
                "active": repeat_customers,
                "new_customers": int(counts["week_customers"] or 0),
            },
            "channels": {
                "telegram": int(counts["telegram_customers"] or 0),
                "vk": int(counts["vk_customers"] or 0),
                "mixed": sum(
                    1
                    for customer in top_customers
                    if customer["telegram_id"] and customer["vk_id"]
                ),
            },
            "avgLtv": round(float(counts["avg_ltv"] or 0), 0),
            "avgBalance": round(float(counts["avg_balance"] or 0), 0),
            "newCustomersTimeline": timeline,
            "birthdaysThisWeek": [],
            "loyaltyTiers": loyalty_tiers,
            "purchaseFrequency": (
                round(
                    sum(
                        int(customer["transactions"] or 0) for customer in top_customers
                    )
                    / len(top_customers),
                    1,
                )
                if top_customers
                else 0
            ),
            "priorityActions": [
                {
                    "id": "consent-gap",
                    "title": "Customers without consent",
                    "count": consent_gap_count,
                    "tone": "warning",
                },
                {
                    "id": "reachability-gap",
                    "title": "Customers unreachable via TG/VK",
                    "count": unreachable_count,
                    "tone": "danger",
                },
            ],
        }

    def _get_product_metrics(self, conn) -> dict[str, Any]:
        today = datetime.now().strftime("%Y-%m-%d")
        total_products_row = conn.execute(
            "SELECT COUNT(*) as cnt FROM products WHERE active = 1"
        ).fetchone()
        top_products = [
            {
                "code": row["code"],
                "name": row["name"],
                "quantity": int(row["qty"] or 0),
                "revenue": int(row["revenue"] or 0),
            }
            for row in conn.execute(
                """SELECT json_extract(value, '$.code') as code, json_extract(value, '$.name') as name,
                          SUM(COALESCE(json_extract(value, '$.qty'), json_extract(value, '$.quantity'), 0)) as qty,
                          SUM(COALESCE(json_extract(value, '$.price'), 0) * COALESCE(json_extract(value, '$.qty'), json_extract(value, '$.quantity'), 0)) as revenue
                   FROM transactions, json_each(transactions.items_json)
                   WHERE date(created_at) = ?
                   GROUP BY code
                   ORDER BY qty DESC
                   LIMIT 3""",
                (today,),
            ).fetchall()
        ]
        category_trend = [
            {
                "category": row["kind"],
                "transactions": int(row["transaction_count"] or 0),
                "items_sold": int(row["items_sold"] or 0),
                "revenue": int(row["revenue"] or 0),
            }
            for row in conn.execute(
                """SELECT p.kind, COUNT(DISTINCT t.id) as transaction_count,
                          SUM(COALESCE(json_extract(value, '$.qty'), json_extract(value, '$.quantity'), 0)) as items_sold,
                          SUM(COALESCE(json_extract(value, '$.price'), 0) * COALESCE(json_extract(value, '$.qty'), json_extract(value, '$.quantity'), 0)) as revenue
                   FROM transactions t
                   JOIN json_each(t.items_json) ON 1=1
                   JOIN products p ON p.code = json_extract(value, '$.code')
                   WHERE date(t.created_at) = ?
                   GROUP BY p.kind
                   ORDER BY revenue DESC""",
                (today,),
            ).fetchall()
        ]

        return {
            "totalProducts": int(total_products_row["cnt"] or 0),
            "topProducts": top_products,
            "categoryTrend": category_trend,
            "topProductName": top_products[0]["name"] if top_products else "—",
        }

    def _get_campaign_metrics(self, conn) -> dict[str, Any]:
        active_count = conn.execute(
            "SELECT COUNT(*) as cnt FROM marketing_campaigns WHERE status = 'active'"
        ).fetchone()
        upcoming_count = conn.execute(
            "SELECT COUNT(*) as cnt FROM marketing_campaigns WHERE status = 'scheduled'"
        ).fetchone()
        yesterday = (datetime.now() - timedelta(hours=24)).isoformat()
        recent_events = [
            {
                "id": row["id"],
                "trigger_name": row["trigger_name"],
                "customer_name": row["customer_name"] or "Unknown",
                "status": row["status"],
                "created_at": row["created_at"],
            }
            for row in conn.execute(
                """SELECT e.id, e.status, e.created_at, t.name as trigger_name, c.full_name as customer_name
                   FROM marketing_trigger_events e
                   JOIN marketing_triggers t ON e.trigger_id = t.id
                   LEFT JOIN customers c ON e.customer_id = c.id
                   WHERE e.created_at > ? ORDER BY e.created_at DESC LIMIT 10""",
                (yesterday,),
            ).fetchall()
        ]
        trigger_stats = {
            row["status"]: int(row["cnt"] or 0)
            for row in conn.execute(
                "SELECT status, COUNT(*) as cnt FROM marketing_trigger_events WHERE created_at > ? GROUP BY status",
                (yesterday,),
            ).fetchall()
        }
        needs_attention = int(trigger_stats.get("failed", 0) or 0) + int(
            trigger_stats.get("pending", 0) or 0
        )
        messages_sent = sum(trigger_stats.values())
        return {
            "activeCampaigns": int(active_count["cnt"] or 0),
            "upcomingCount": int(upcoming_count["cnt"] or 0),
            "recentEvents": recent_events,
            "triggerStats24h": trigger_stats,
            "campaignPerformance": [],
            "upcomingCampaigns": [],
            "needsAttention": needs_attention,
            "messagesSent24h": messages_sent,
            "openRate": 87,
            "clickRate": 23,
        }

    def _get_loyalty_metrics(
        self, conn, date_range: DashboardDateRange
    ) -> dict[str, Any]:
        start_str = date_range.start.strftime("%Y-%m-%d %H:%M:%S")
        end_str = date_range.end.strftime("%Y-%m-%d %H:%M:%S")
        points_earned = conn.execute(
            "SELECT COALESCE(SUM(bonus_earned), 0) FROM transactions WHERE created_at BETWEEN ? AND ?",
            (start_str, end_str),
        ).fetchone()[0]
        points_redeemed = conn.execute(
            "SELECT COALESCE(SUM(bonus_used), 0) FROM transactions WHERE created_at BETWEEN ? AND ?",
            (start_str, end_str),
        ).fetchone()[0]
        revenue = conn.execute(
            "SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE created_at BETWEEN ? AND ?",
            (start_str, end_str),
        ).fetchone()[0]
        avg_order_value = conn.execute(
            "SELECT COALESCE(AVG(total_amount), 0) FROM transactions WHERE created_at BETWEEN ? AND ?",
            (start_str, end_str),
        ).fetchone()[0]
        total_customers = conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
        customers_redeeming = conn.execute(
            """SELECT COUNT(DISTINCT customer_id)
               FROM transactions
               WHERE bonus_used > 0 AND created_at BETWEEN ? AND ?""",
            (start_str, end_str),
        ).fetchone()[0]
        redemption_rate = (
            (customers_redeeming / total_customers) * 100 if total_customers else 0
        )
        return {
            "pointsEarned": int(points_earned or 0),
            "pointsRedeemed": int(points_redeemed or 0),
            "redemptionRate": round(redemption_rate, 1),
            "avgOrderValue": round(float(avg_order_value or 0), 2),
            "revenue": int(revenue or 0),
        }

    def _get_attention_metrics(
        self,
        *,
        customer: dict[str, Any],
        campaign: dict[str, Any],
        product: dict[str, Any],
        loyalty: dict[str, Any],
    ) -> dict[str, Any]:
        product_gap = max(0, product["totalProducts"] - len(product["topProducts"]))
        items = [
            {
                "id": "reachable-audience",
                "title": "Reachable audience today",
                "value": customer["reachableCustomers"],
                "tone": "info",
            },
            {
                "id": "campaigns-needing-attention",
                "title": "Campaigns need attention",
                "value": campaign["needsAttention"],
                "tone": "danger" if campaign["needsAttention"] else "good",
            },
            {
                "id": "product-watchlist",
                "title": "Products missing traction",
                "value": product_gap,
                "tone": "warning" if product_gap else "good",
            },
            {
                "id": "loyalty-redemption",
                "title": "Loyalty redemption rate",
                "value": loyalty["redemptionRate"],
                "tone": "info",
                "suffix": "%",
            },
        ]
        priority = max(items, key=lambda item: float(item["value"])) if items else None
        return {
            "items": items,
            "priority": priority,
        }

    def _get_integration_metrics(self, conn) -> dict[str, Any]:
        integrations = [
            {
                "name": row["name"],
                "kind": row["kind"],
                "status": "online" if row["enabled"] else "offline",
            }
            for row in conn.execute(
                "SELECT name, kind, enabled FROM integrations WHERE enabled = 1"
            ).fetchall()
        ]
        yesterday = (datetime.now() - timedelta(hours=24)).isoformat()
        recent_deliveries = [
            {
                "id": row["id"],
                "event_type": row["event_type"],
                "status": row["status"],
                "http_status": row["http_status"],
                "created_at": row["created_at"],
            }
            for row in conn.execute(
                """SELECT id, event_type, status, http_status, created_at FROM integration_deliveries
                   WHERE created_at > ? ORDER BY created_at DESC LIMIT 10""",
                (yesterday,),
            ).fetchall()
        ]
        delivery_stats = {
            row["status"]: int(row["cnt"] or 0)
            for row in conn.execute(
                "SELECT status, COUNT(*) as cnt FROM integration_deliveries WHERE created_at > ? GROUP BY status",
                (yesterday,),
            ).fetchall()
        }
        total = sum(delivery_stats.values())
        pending_count = int(delivery_stats.get("pending", 0) or 0)
        success_rate = (
            round((delivery_stats.get("success", 0) / total) * 100, 1) if total else 0
        )
        return {
            "integrations": integrations,
            "recentDeliveries": recent_deliveries,
            "deliveryStats24h": delivery_stats,
            "successRate": success_rate,
            "pendingCount": pending_count,
            "lastSyncs": {},
        }


service = DashboardAnalyticsService()
