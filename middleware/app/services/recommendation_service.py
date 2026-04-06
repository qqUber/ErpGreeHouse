"""Product Recommendation Service - centralized logic for smart product recommendations."""

import json
import logging
from datetime import datetime
from typing import Any, Optional

from app.constants import (
    CACHE_TTL_LONG_SECONDS,
    CACHE_TTL_SHORT_SECONDS,
    DAILY_PUSH_COOLDOWN_SECONDS,
    DAILY_PUSH_CUSTOMERS_LIMIT,
    DEFAULT_RECOMMENDATIONS_LIMIT,
    MAX_TRANSACTION_HISTORY,
    PREFERRED_CATEGORIES_COUNT,
    RECENT_PURCHASE_WINDOW_DAYS,
    RECOMMENDATION_SCORE_DECAY,
    TOP_CATEGORIES_COUNT,
    TOP_PRODUCTS_COUNT,
)
from app.db import get_db
from app.utils.redis_cache import get_redis

logger = logging.getLogger(__name__)


class ProductRecommendationService:
    """Service for analyzing customer preferences and generating product recommendations."""

    def __init__(self):
        self.db = get_db()

    # ============ Preference Analysis ============

    def analyze_customer_preferences(self, customer_id: int) -> dict[str, Any]:
        """
        Analyze customer purchase history and generate preference profile.
        Considers: frequency, loyalty points, visit time, categories.
        """
        cache_key = f"customer_prefs:{customer_id}"
        r = get_redis()
        cached = r.get(cache_key)
        if cached:
            return json.loads(cached)

        conn = self.db.connect()
        try:
            # Get customer basic stats
            cur = conn.execute(
                """SELECT purchase_frequency, average_check, last_purchase_date,
                          balance_points, preferred_channel
                   FROM customers WHERE id = ?""",
                (customer_id,),
            )
            customer = cur.fetchone()

            if not customer:
                return {"error": "Customer not found"}

            # Get purchase history with products
            cur = conn.execute(
                """SELECT t.id, t.created_at, t.total_amount,
                          t.items_json, t.bonus_earned, t.bonus_used
                   FROM transactions t
                   WHERE t.customer_id = ?
                   ORDER BY t.created_at DESC
                   LIMIT ?""",
                (customer_id, MAX_TRANSACTION_HISTORY),
            )

            transactions = []
            product_frequency = {}
            category_preferences = {}
            total_spent = 0
            peak_hours = {}

            for row in cur.fetchall():
                try:
                    items = json.loads(row["items_json"]) if row["items_json"] else []
                    tx_time = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
                    hour = tx_time.hour
                    peak_hours[hour] = peak_hours.get(hour, 0) + 1

                    for item in items:
                        product_code = item.get("code", "unknown")
                        product_frequency[product_code] = product_frequency.get(product_code, 0) + 1

                        # Track category if available
                        category = item.get("kind", "general")
                        if category not in category_preferences:
                            category_preferences[category] = {"count": 0, "total": 0}
                        category_preferences[category]["count"] += 1
                        category_preferences[category]["total"] += item.get("price", 0) * item.get("qty", 1)

                    transactions.append(
                        {
                            "id": int(row["id"]),
                            "date": str(row["created_at"]),
                            "total": int(row["total_amount"]),
                            "bonus_earned": int(row["bonus_earned"]),
                            "bonus_used": int(row["bonus_used"]),
                        }
                    )
                    total_spent += int(row["total_amount"])
                except Exception as e:
                    logger.warning(f"Error parsing transaction: {e}")
                    continue

            # Calculate preferred visit time
            preferred_hour = max(peak_hours, key=peak_hours.get) if peak_hours else None

            # Get top products
            sorted_products = sorted(product_frequency.items(), key=lambda x: x[1], reverse=True)
            top_products = [{"code": code, "count": count} for code, count in sorted_products[:TOP_PRODUCTS_COUNT]]

            # Get top categories
            sorted_categories = sorted(category_preferences.items(), key=lambda x: x[1]["count"], reverse=True)
            top_categories = [
                {"category": cat, "count": data["count"], "total_spent": data["total"]}
                for cat, data in sorted_categories[:TOP_CATEGORIES_COUNT]
            ]

            result = {
                "customer_id": customer_id,
                "purchase_frequency": (int(customer["purchase_frequency"]) if customer["purchase_frequency"] else 0),
                "average_check": (float(customer["average_check"]) if customer["average_check"] else 0),
                "balance_points": (int(customer["balance_points"]) if customer["balance_points"] else 0),
                "total_spent": total_spent,
                "transaction_count": len(transactions),
                "preferred_visit_hour": preferred_hour,
                "top_products": top_products,
                "top_categories": top_categories,
                "last_purchase": (str(customer["last_purchase_date"]) if customer["last_purchase_date"] else None),
                "preferred_channel": (str(customer["preferred_channel"]) if customer["preferred_channel"] else None),
            }

            r.setex(cache_key, CACHE_TTL_LONG_SECONDS, json.dumps(result))
            return result
        finally:
            conn.close()

    def update_product_preference(
        self,
        customer_id: int,
        product_id: int,
        category: str,
        purchase_count: int = 1,
        score_boost: float = 1.0,
    ) -> None:
        """Update customer's product preference score after purchase."""
        conn = self.db.connect()
        try:
            today = datetime.now().strftime("%Y-%m-%d")

            # Check existing
            cur = conn.execute(
                "SELECT id, purchase_count, preference_score FROM customer_product_preferences "
                "WHERE customer_id = ? AND product_id = ?",
                (customer_id, product_id),
            )
            row = cur.fetchone()

            if row:
                # Calculate new score with decay
                old_score = float(row["preference_score"]) if row["preference_score"] else 0
                new_score = (old_score * RECOMMENDATION_SCORE_DECAY) + score_boost  # Decay old scores

                conn.execute(
                    """UPDATE customer_product_preferences
                       SET purchase_count = purchase_count + ?,
                           preference_score = ?,
                           last_purchased_at = ?,
                           category_preference = ?,
                           updated_at = datetime('now')
                       WHERE id = ?""",
                    (purchase_count, new_score, today, category, row["id"]),
                )
            else:
                conn.execute(
                    """INSERT INTO customer_product_preferences
                       (customer_id, product_id, preference_score, purchase_count, last_purchased_at, category_preference)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (
                        customer_id,
                        product_id,
                        score_boost,
                        purchase_count,
                        today,
                        category,
                    ),
                )

            conn.commit()

            # Invalidate cache
            r = get_redis()
            r.delete(f"customer_prefs:{customer_id}")
            r.delete(f"recommendations:{customer_id}")
        finally:
            conn.close()

    # ============ Recommendation Generation ============

    def get_recommendations(
        self,
        customer_id: int,
        context: str = "general",
        limit: int = DEFAULT_RECOMMENDATIONS_LIMIT,
        exclude_recent: bool = True,
    ) -> list[dict[str, Any]]:
        """
        Get personalized product recommendations.
        Contexts: 'post_order', 'menu_open', 'daily_push', 'general'
        """
        cache_key = f"recommendations:{customer_id}:{context}:{limit}:{int(exclude_recent)}"
        r = get_redis()
        cached = r.get(cache_key)
        if cached:
            return json.loads(cached)

        prefs = self.analyze_customer_preferences(customer_id)
        if "error" in prefs:
            return []

        conn = self.db.connect()
        try:
            # Get recently purchased products to exclude
            recent_products = set()
            if exclude_recent:
                cur = conn.execute(
                    f"""SELECT DISTINCT json_extract(value, '$.code') as code
                       FROM transactions, json_each(transactions.items_json)
                       WHERE customer_id = ? AND created_at > datetime('now', '-{RECENT_PURCHASE_WINDOW_DAYS} days')""",
                    (customer_id,),
                )
                recent_products = {row["code"] for row in cur.fetchall() if row["code"]}

            # Get customer's preferred categories
            preferred_categories = [c["category"] for c in prefs.get("top_categories", [])[:PREFERRED_CATEGORIES_COUNT]]

            # Get products from preferred categories
            recommendations = []

            # First: products from preferred categories they haven't bought recently
            if preferred_categories:
                placeholders = ",".join("?" * len(preferred_categories))
                cur = conn.execute(
                    f"""SELECT p.id, p.code, p.name, p.kind, p.price
                        FROM products p
                        WHERE p.kind IN ({placeholders})
                        AND p.active = 1
                        AND p.code NOT IN ({','.join(['?'] * len(recent_products)) if recent_products else "''"})
                        ORDER BY RANDOM()
                        LIMIT ?""",
                    tuple(preferred_categories) + tuple(recent_products) + (limit,),
                )

                try:
                    rows = cur.fetchall()
                except Exception:
                    rows = []

                if not isinstance(rows, (list, tuple)):
                    rows = []

                for row in rows:
                    recommendations.append(
                        {
                            "id": int(row["id"]),
                            "code": str(row["code"]),
                            "name": str(row["name"]),
                            "category": str(row["kind"]),
                            "price": int(row["price"]),
                            "reason": f"Based on your love for {row['kind']}",
                            "context": context,
                        }
                    )

            # Fill with popular products if needed
            if len(recommendations) < limit:
                needed = limit - len(recommendations)
                existing_codes = {r["code"] for r in recommendations} | recent_products

                cur = conn.execute(
                    """SELECT p.id, p.code, p.name, p.kind, p.price,
                              (SELECT COUNT(*) FROM transactions t
                               JOIN json_each(t.items_json) je ON json_extract(je.value, '$.code') = p.code) as popularity
                        FROM products p
                        WHERE p.active = 1
                        AND p.code NOT IN ({0})
                        ORDER BY popularity DESC
                        LIMIT ?""".format(",".join(["?"] * len(existing_codes)) if existing_codes else "''"),
                    tuple(existing_codes) + (needed,),
                )

                try:
                    rows = cur.fetchall()
                except Exception:
                    rows = []

                if not isinstance(rows, (list, tuple)):
                    rows = []

                for row in rows:
                    recommendations.append(
                        {
                            "id": int(row["id"]),
                            "code": str(row["code"]),
                            "name": str(row["name"]),
                            "category": str(row["kind"]),
                            "price": int(row["price"]),
                            "reason": "Popular choice",
                            "context": context,
                        }
                    )

            # Generate personalized message
            for rec in recommendations:
                rec["message"] = self._generate_recommendation_message(rec["name"], rec["category"], prefs, context)

            # Cache result
            r.setex(cache_key, CACHE_TTL_SHORT_SECONDS, json.dumps(recommendations))
            return recommendations
        finally:
            conn.close()

    def _generate_recommendation_message(
        self, product_name: str, category: str, prefs: dict[str, Any], context: str
    ) -> str:
        """Generate personalized recommendation message."""
        top_categories = prefs.get("top_categories", [])
        top_cats = [c["category"] for c in top_categories[:2]]

        if context == "post_order":
            if category in top_cats:
                return f"☕ Based on your love for {category}, we recommend our {product_name} for your next visit!"
            return f"🌟 Customers who bought similar items also enjoyed {product_name}"

        elif context == "menu_open":
            if category in top_cats:
                return f"☕ Your favorite {category} is calling! Try {product_name} today"
            return f"🌟 Discover {product_name} — our customers' top pick"

        elif context == "daily_push":
            hour = prefs.get("preferred_visit_hour")
            if hour and 6 <= hour <= 11:
                return f"☀️ Good morning! Start your day with {product_name}"
            elif hour and 17 <= hour <= 21:
                return f"🌙 Evening treat: unwind with {product_name}"
            return f"☕ Perfect time for {product_name}!"

        else:  # general
            if category in top_cats:
                return f"Based on your preference for {category}, try {product_name}"
            return f"We think you'll love {product_name}"

    # ============ Trigger Methods ============

    def get_post_order_recommendations(self, customer_id: int, order_items: list[dict]) -> list[dict[str, Any]]:
        """Get recommendations after successful order."""
        # Update preferences based on order
        for item in order_items:
            self.update_product_preference(
                customer_id=customer_id,
                product_id=item.get("product_id", 0),
                category=item.get("kind", "general"),
                purchase_count=item.get("qty", 1),
                score_boost=2.0,  # Higher score for actual purchase
            )

        return self.get_recommendations(customer_id, context="post_order", limit=2)

    def get_menu_recommendations(self, customer_id: int) -> list[dict[str, Any]]:
        """Get recommendations when user opens menu."""
        return self.get_recommendations(customer_id, context="menu_open", limit=3)

    def get_daily_recommendations(self, customer_id: int) -> Optional[dict[str, Any]]:
        """Get daily personalized push recommendation."""
        # Check if we already sent today
        r = get_redis()
        cache_key = f"daily_push:{customer_id}:{datetime.now().strftime('%Y-%m-%d')}"
        if r.get(cache_key):
            return None  # Already sent today

        recommendations = self.get_recommendations(customer_id, context="daily_push", limit=1)
        if recommendations:
            r.setex(cache_key, DAILY_PUSH_COOLDOWN_SECONDS, "1")  # Mark as sent for 24 hours
            return {
                "customer_id": customer_id,
                "recommendation": recommendations[0],
                "sent_at": datetime.now().isoformat(),
            }
        return None

    def get_customers_for_daily_push(self, limit: int = DAILY_PUSH_CUSTOMERS_LIMIT) -> list[int]:
        """Get list of customers eligible for daily push (active, opted-in)."""
        conn = self.db.connect()
        try:
            cur = conn.execute(
                """SELECT id FROM customers
                   WHERE marketing_allowed = 1
                   AND data_processing_allowed = 1
                   AND telegram_id IS NOT NULL
                   AND purchase_frequency > 0
                   ORDER BY last_purchase_date DESC
                   LIMIT ?""",
                (limit,),
            )
            return [int(row["id"]) for row in cur.fetchall()]
        finally:
            conn.close()


# Singleton instance
_recommendation_service: Optional[ProductRecommendationService] = None


def get_recommendation_service() -> ProductRecommendationService:
    """Get or create ProductRecommendationService singleton."""
    global _recommendation_service
    if _recommendation_service is None:
        _recommendation_service = ProductRecommendationService()
    return _recommendation_service
