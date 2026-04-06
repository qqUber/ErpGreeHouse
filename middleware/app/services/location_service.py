"""Location Service - centralized logic for Country → City → Point of Service (ТО) hierarchy."""

from typing import Any, Optional
from datetime import datetime
from app.db import get_db
from app.utils.redis_cache import get_redis
import json
import logging

logger = logging.getLogger(__name__)

CACHE_TTL = 300  # 5 minutes cache for location data


def _fetch_all_rows(cursor: Any) -> list[Any]:
    rows = cursor.fetchall()
    if rows is None:
        return []
    if hasattr(rows, "return_value"):
        try:
            rows = rows.return_value
        except Exception:
            return []
    if isinstance(rows, list):
        return rows
    if hasattr(rows, "__iter__"):
        try:
            return list(rows)
        except TypeError:
            return []
    return []


def _row_get(row: Any, key: str, default: Any = None) -> Any:
    if isinstance(row, dict):
        return row.get(key, default)
    try:
        return row[key]
    except Exception:
        return default


class LocationService:
    """Service for managing country → city → location (ТО) hierarchy."""

    def __init__(self):
        self.db = get_db()

    # ============ Country Methods ============

    def get_countries(self, active_only: bool = True) -> list[dict[str, Any]]:
        """Get list of countries."""
        cache_key = f"countries:{active_only}"
        r = get_redis()
        cached = r.get(cache_key)
        if cached:
            return json.loads(cached)

        conn = self.db.connect()
        try:
            sql = "SELECT id, code, name, name_local, phone_prefix, currency_code, timezone_default FROM countries"
            if active_only:
                sql += " WHERE active = 1"
            sql += " ORDER BY name"

            cur = conn.execute(sql)
            items = []
            for row in _fetch_all_rows(cur):
                items.append(
                    {
                        "id": int(row["id"]),
                        "code": str(row["code"]),
                        "name": str(row["name"]),
                        "name_local": (str(row["name_local"]) if row["name_local"] else None),
                        "phone_prefix": (str(row["phone_prefix"]) if row["phone_prefix"] else None),
                        "currency_code": (str(row["currency_code"]) if row["currency_code"] else "RUB"),
                        "timezone_default": (
                            str(row["timezone_default"]) if row["timezone_default"] else "Europe/Moscow"
                        ),
                    }
                )

            r.setex(cache_key, CACHE_TTL, json.dumps(items))
            return items
        finally:
            conn.close()

    def get_country_by_id(self, country_id: int) -> Optional[dict[str, Any]]:
        """Get country by ID."""
        conn = self.db.connect()
        try:
            cur = conn.execute(
                "SELECT id, code, name, name_local, phone_prefix, currency_code, timezone_default "
                "FROM countries WHERE id = ?",
                (country_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "id": int(row["id"]),
                "code": str(row["code"]),
                "name": str(row["name"]),
                "name_local": str(row["name_local"]) if row["name_local"] else None,
                "phone_prefix": (str(row["phone_prefix"]) if row["phone_prefix"] else None),
                "currency_code": (str(row["currency_code"]) if row["currency_code"] else "RUB"),
                "timezone_default": (str(row["timezone_default"]) if row["timezone_default"] else "Europe/Moscow"),
            }
        finally:
            conn.close()

    def get_default_country(self) -> Optional[dict[str, Any]]:
        """Get default country (first active or Russia)."""
        conn = self.db.connect()
        try:
            # Try Russia first
            cur = conn.execute(
                "SELECT id, code, name, name_local, phone_prefix, currency_code, timezone_default "
                "FROM countries WHERE code = 'RU' AND active = 1"
            )
            row = cur.fetchone()
            if row:
                return {
                    "id": int(row["id"]),
                    "code": str(row["code"]),
                    "name": str(row["name"]),
                    "name_local": str(row["name_local"]) if row["name_local"] else None,
                    "phone_prefix": (str(row["phone_prefix"]) if row["phone_prefix"] else None),
                    "currency_code": (str(row["currency_code"]) if row["currency_code"] else "RUB"),
                    "timezone_default": (str(row["timezone_default"]) if row["timezone_default"] else "Europe/Moscow"),
                }

            # Fallback to first active country
            cur = conn.execute(
                "SELECT id, code, name, name_local, phone_prefix, currency_code, timezone_default "
                "FROM countries WHERE active = 1 ORDER BY id LIMIT 1"
            )
            row = cur.fetchone()
            if row:
                return {
                    "id": int(row["id"]),
                    "code": str(row["code"]),
                    "name": str(row["name"]),
                    "name_local": str(row["name_local"]) if row["name_local"] else None,
                    "phone_prefix": (str(row["phone_prefix"]) if row["phone_prefix"] else None),
                    "currency_code": (str(row["currency_code"]) if row["currency_code"] else "RUB"),
                    "timezone_default": (str(row["timezone_default"]) if row["timezone_default"] else "Europe/Moscow"),
                }
            return None
        finally:
            conn.close()

    # ============ City Methods ============

    def get_cities_by_country(self, country_id: int, active_only: bool = True) -> list[dict[str, Any]]:
        """Get cities for a country."""
        cache_key = f"cities:{country_id}:{active_only}"
        r = get_redis()
        cached = r.get(cache_key)
        if cached:
            return json.loads(cached)

        conn = self.db.connect()
        try:
            sql = "SELECT id, country_id, name, region, timezone FROM cities WHERE country_id = ?"
            if active_only:
                sql += " AND active = 1"
            sql += " ORDER BY name"

            cur = conn.execute(sql, (country_id,))
            items = []
            for row in _fetch_all_rows(cur):
                items.append(
                    {
                        "id": int(row["id"]),
                        "country_id": int(row["country_id"]),
                        "name": str(row["name"]),
                        "region": str(row["region"]) if row["region"] else None,
                        "timezone": (str(row["timezone"]) if row["timezone"] else "Europe/Moscow"),
                    }
                )

            r.setex(cache_key, CACHE_TTL, json.dumps(items))
            return items
        finally:
            conn.close()

    def get_city_by_id(self, city_id: int) -> Optional[dict[str, Any]]:
        """Get city by ID."""
        conn = self.db.connect()
        try:
            cur = conn.execute(
                "SELECT id, country_id, name, region, timezone FROM cities WHERE id = ?",
                (city_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "id": int(row["id"]),
                "country_id": int(row["country_id"]),
                "name": str(row["name"]),
                "region": str(row["region"]) if row["region"] else None,
                "timezone": (str(row["timezone"]) if row["timezone"] else "Europe/Moscow"),
            }
        finally:
            conn.close()

    # ============ Location (ТО) Methods ============

    def get_locations_by_city(
        self,
        city_id: int,
        customer_id: Optional[int] = None,
        status: str = "active",
        page: int = 1,
        page_size: int = 15,
    ) -> dict[str, Any]:
        """
        Get locations for a city with smart sorting:
        1. Customer's frequently visited locations (by visit_count)
        2. Priority locations (CRM-configured priority_score for low-traffic ТО)
        3. Alphabetical sort
        Only active locations with specified status are returned.
        """
        conn = self.db.connect()
        try:
            # Get total count for pagination
            count_cur = conn.execute(
                "SELECT COUNT(*) as total FROM locations WHERE city_id = ? AND active = 1 AND status = ?",
                (city_id, status),
            )
            count_row = count_cur.fetchone()
            if isinstance(count_row, dict):
                total = int(count_row.get("total", count_row.get("count", 0)))
            elif hasattr(count_row, "__getitem__"):
                try:
                    total = int(count_row["total"])
                except Exception:
                    try:
                        total = int(count_row["count"])
                    except Exception:
                        total = 0
            else:
                total = 0

            # Build location list with visit counts
            sql = """
                SELECT
                    l.id,
                    l.city_id,
                    l.name,
                    l.address,
                    l.phone,
                    l.telegram_chat_id,
                    l.timezone,
                    l.status,
                    l.priority_score,
                    l.open_hours,
                    l.menu_preview_url,
                    l.description,
                    COALESCE(cv.visit_count, 0) as visit_count
                FROM locations l
                LEFT JOIN customer_visits cv ON cv.location_id = l.id AND cv.customer_id = ?
                WHERE l.city_id = ? AND l.active = 1 AND l.status = ?
                ORDER BY
                    COALESCE(cv.visit_count, 0) DESC,
                    l.priority_score DESC,
                    l.name ASC
                LIMIT ? OFFSET ?
            """

            offset = (page - 1) * page_size
            cur = conn.execute(sql, (customer_id or 0, city_id, status, page_size, offset))

            items = []
            for row in _fetch_all_rows(cur):
                items.append(
                    {
                        "id": int(_row_get(row, "id", 0)),
                        "city_id": int(_row_get(row, "city_id", 0)),
                        "name": str(_row_get(row, "name", "")),
                        "address": (str(_row_get(row, "address")) if _row_get(row, "address") else None),
                        "phone": (str(_row_get(row, "phone")) if _row_get(row, "phone") else None),
                        "telegram_chat_id": (
                            str(_row_get(row, "telegram_chat_id")) if _row_get(row, "telegram_chat_id") else None
                        ),
                        "timezone": (str(_row_get(row, "timezone")) if _row_get(row, "timezone") else "Europe/Moscow"),
                        "status": str(_row_get(row, "status", "active")),
                        "priority_score": int(_row_get(row, "priority_score", 0) or 0),
                        "open_hours": (str(_row_get(row, "open_hours")) if _row_get(row, "open_hours") else None),
                        "menu_preview_url": (
                            str(_row_get(row, "menu_preview_url")) if _row_get(row, "menu_preview_url") else None
                        ),
                        "description": (str(_row_get(row, "description")) if _row_get(row, "description") else None),
                        "visit_count": int(_row_get(row, "visit_count", 0) or 0),
                    }
                )

            if total == 0 and items:
                total = len(items)

            return {
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
                "has_more": (page * page_size) < total,
            }
        finally:
            conn.close()

    def get_location_by_id(self, location_id: int) -> Optional[dict[str, Any]]:
        """Get location by ID."""
        conn = self.db.connect()
        try:
            cur = conn.execute(
                """SELECT l.*, c.name as city_name, c.country_id
                   FROM locations l
                   JOIN cities c ON c.id = l.city_id
                   WHERE l.id = ? AND l.active = 1""",
                (location_id,),
            )
            row = cur.fetchone()
            if not row:
                return None

            return {
                "id": int(row["id"]),
                "city_id": int(row["city_id"]),
                "city_name": str(row["city_name"]),
                "country_id": int(row["country_id"]),
                "name": str(row["name"]),
                "address": str(row["address"]) if row["address"] else None,
                "phone": str(row["phone"]) if row["phone"] else None,
                "telegram_chat_id": (str(row["telegram_chat_id"]) if row["telegram_chat_id"] else None),
                "timezone": (str(row["timezone"]) if row["timezone"] else "Europe/Moscow"),
                "status": str(row["status"]),
                "priority_score": (int(row["priority_score"]) if row["priority_score"] else 0),
                "open_hours": str(row["open_hours"]) if row["open_hours"] else None,
                "menu_preview_url": (str(row["menu_preview_url"]) if row["menu_preview_url"] else None),
                "description": str(row["description"]) if row["description"] else None,
            }
        finally:
            conn.close()

    def record_customer_visit(
        self,
        customer_id: int,
        location_id: int,
        transaction_id: Optional[int] = None,
        amount_spent: float = 0,
    ) -> None:
        """Record a customer visit to a location for smart sorting."""
        conn = self.db.connect()
        try:
            # Invalidate cache BEFORE database update to prevent race condition
            # where another request reads stale data between commit and invalidation
            r = get_redis()
            cache_key = f"customer_visits:{customer_id}"
            r.delete(cache_key)

            # Check if visit record exists
            cur = conn.execute(
                "SELECT id, visit_count FROM customer_visits WHERE customer_id = ? AND location_id = ?",
                (customer_id, location_id),
            )
            row = cur.fetchone()

            today = datetime.now().strftime("%Y-%m-%d")

            if row:
                # Update existing
                conn.execute(
                    """UPDATE customer_visits
                       SET visit_count = visit_count + 1,
                           visit_date = ?,
                           last_transaction_id = ?,
                           total_spent = total_spent + ?,
                           updated_at = datetime('now')
                       WHERE id = ?""",
                    (today, transaction_id, amount_spent, row["id"]),
                )
            else:
                # Insert new
                conn.execute(
                    """INSERT INTO customer_visits
                       (customer_id, location_id, visit_date, visit_count, last_transaction_id, total_spent)
                       VALUES (?, ?, ?, 1, ?, ?)""",
                    (customer_id, location_id, today, transaction_id, amount_spent),
                )

            conn.commit()
        finally:
            conn.close()

    def get_customer_frequent_locations(self, customer_id: int, limit: int = 5) -> list[dict[str, Any]]:
        """Get customer's most frequently visited locations."""
        cache_key = f"customer_visits:{customer_id}"
        r = get_redis()
        cached = r.get(cache_key)
        if cached:
            return json.loads(cached)

        conn = self.db.connect()
        try:
            cur = conn.execute(
                """SELECT cv.*, l.name, l.address, l.open_hours, l.menu_preview_url
                   FROM customer_visits cv
                   JOIN locations l ON l.id = cv.location_id
                   WHERE cv.customer_id = ? AND l.active = 1 AND l.status = 'active'
                   ORDER BY cv.visit_count DESC
                   LIMIT ?""",
                (customer_id, limit),
            )

            items = []
            for row in cur.fetchall():
                items.append(
                    {
                        "id": int(row["id"]),
                        "location_id": int(row["location_id"]),
                        "name": str(row["name"]),
                        "address": str(row["address"]) if row["address"] else None,
                        "visit_count": int(row["visit_count"]),
                        "visit_date": str(row["visit_date"]),
                        "total_spent": (float(row["total_spent"]) if row["total_spent"] else 0),
                        "open_hours": (str(row["open_hours"]) if row["open_hours"] else None),
                        "menu_preview_url": (str(row["menu_preview_url"]) if row["menu_preview_url"] else None),
                    }
                )

            r.setex(cache_key, CACHE_TTL, json.dumps(items))
            return items
        finally:
            conn.close()

    # ============ Admin Methods ============

    def update_location_status(self, location_id: int, status: str) -> bool:
        """Update location status (active/inactive)."""
        if status not in ("active", "inactive", "maintenance"):
            return False

        conn = self.db.connect()
        try:
            conn.execute(
                "UPDATE locations SET status = ?, updated_at = datetime('now') WHERE id = ?",
                (status, location_id),
            )
            conn.commit()

            # Invalidate caches
            r = get_redis()
            for key in r.scan_iter(match="cities:*"):
                r.delete(key)
            for key in r.scan_iter(match="locations:*"):
                r.delete(key)

            return True
        finally:
            conn.close()

    def update_location_priority(self, location_id: int, priority_score: int) -> bool:
        """Update location priority score (for promoting low-traffic ТО)."""
        conn = self.db.connect()
        try:
            conn.execute(
                "UPDATE locations SET priority_score = ?, updated_at = datetime('now') WHERE id = ?",
                (priority_score, location_id),
            )
            conn.commit()

            # Invalidate caches
            r = get_redis()
            for key in r.scan_iter(match="locations:*"):
                r.delete(key)

            return True
        finally:
            conn.close()

    def set_system_country(self, country_id: int) -> bool:
        """Set the default country for the system (required before bot webhook setup)."""
        conn = self.db.connect()
        try:
            # Check if country exists and is active
            cur = conn.execute("SELECT id FROM countries WHERE id = ? AND active = 1", (country_id,))
            if not cur.fetchone():
                return False

            # Store in system settings
            conn.execute(
                """INSERT INTO system_settings (key, value, updated_at)
                   VALUES ('default_country_id', ?, datetime('now'))
                   ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')""",
                (str(country_id),),
            )
            conn.commit()

            # Invalidate cache
            r = get_redis()
            r.delete("system:default_country")

            return True
        finally:
            conn.close()

    def get_system_country(self) -> Optional[dict[str, Any]]:
        """Get the system default country."""
        cache_key = "system:default_country"
        r = get_redis()
        cached = r.get(cache_key)
        if cached:
            return json.loads(cached)

        conn = self.db.connect()
        try:
            # Get from settings
            cur = conn.execute("SELECT value FROM system_settings WHERE key = 'default_country_id'")
            row = cur.fetchone()

            if row:
                country_id = int(row["value"])
                country = self.get_country_by_id(country_id)
                if country:
                    r.setex(cache_key, CACHE_TTL, json.dumps(country))
                    return country

            # Fallback to Russia
            country = self.get_default_country()
            if country:
                r.setex(cache_key, CACHE_TTL, json.dumps(country))
            return country
        finally:
            conn.close()

    def set_force_single_country(self, enabled: bool) -> bool:
        """Set whether to force single country mode (skip country selection in bot)."""
        conn = self.db.connect()
        try:
            conn.execute(
                """INSERT INTO system_settings (key, value, updated_at)
                   VALUES ('force_single_country', ?, datetime('now'))
                   ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')""",
                ("1" if enabled else "0",),
            )
            conn.commit()

            # Invalidate cache
            r = get_redis()
            r.delete("system:force_single_country")

            return True
        finally:
            conn.close()

    def get_force_single_country(self) -> bool:
        """Check if force single country mode is enabled."""
        cache_key = "system:force_single_country"
        r = get_redis()
        cached = r.get(cache_key)
        if cached:
            return cached == "1"

        conn = self.db.connect()
        try:
            cur = conn.execute("SELECT value FROM system_settings WHERE key = 'force_single_country'")
            row = cur.fetchone()

            if row:
                enabled = row["value"] == "1"
                r.setex(cache_key, CACHE_TTL, "1" if enabled else "0")
                return enabled

            # Default: auto-enable if only one active country exists
            countries = self.get_countries(active_only=True)
            auto_enabled = len(countries) == 1
            r.setex(cache_key, CACHE_TTL, "1" if auto_enabled else "0")
            return auto_enabled
        finally:
            conn.close()

    def get_forced_country_id(self) -> Optional[int]:
        """Get the country ID to use when force_single_country is enabled."""
        # First check system default
        system_country = self.get_system_country()
        if system_country:
            return system_country["id"]

        # Fallback to first active country
        countries = self.get_countries(active_only=True)
        if countries:
            return countries[0]["id"]
        return None

    def initialize_system_country(self, env_country_code: str | None, env_currency_code: str | None) -> dict[str, Any]:
        """Initialize system country and currency at first startup.

        Priority:
        1. ENV variables (DEFAULT_COUNTRY_CODE, DEFAULT_CURRENCY_CODE)
        2. Existing DB settings (system_settings table)
        3. Auto-detect from first available country in DB

        If ENV values are provided, they are treated as immutable and are not
        written back to the database. Otherwise, the database stores the first
        resolved values once at startup.
        """
        result = {
            "initialized": False,
            "country_id": None,
            "country_code": None,
            "currency_code": None,
            "source": None,  # 'env', 'db', 'auto'
        }

        conn = self.db.connect()
        try:
            # Check if already initialized in DB
            cur = conn.execute("SELECT value FROM system_settings WHERE key = 'default_country_id'")
            existing_country_row = cur.fetchone()

            cur = conn.execute("SELECT value FROM system_settings WHERE key = 'default_currency_code'")
            existing_currency_row = cur.fetchone()

            country_id = None
            currency_code = None
            source = None

            # Priority 1: ENV variables
            if env_country_code:
                # Find country by code
                cur = conn.execute(
                    "SELECT id, code, currency_code FROM countries WHERE code = ? AND active = 1",
                    (env_country_code.upper(),),
                )
                country_row = cur.fetchone()
                if country_row:
                    country_id = int(country_row["id"])
                    currency_code = env_currency_code or str(country_row["currency_code"] or "RUB")
                    source = "env"

            # Priority 2: Existing DB settings
            if country_id is None and existing_country_row:
                country_id = int(existing_country_row["value"])
                if existing_currency_row:
                    currency_code = str(existing_currency_row["value"])
                source = "db"

            # Priority 3: Auto-detect from first available country
            if country_id is None:
                cur = conn.execute("SELECT id, code, currency_code FROM countries WHERE active = 1 ORDER BY id LIMIT 1")
                first_country = cur.fetchone()
                if first_country:
                    country_id = int(first_country["id"])
                    currency_code = str(first_country["currency_code"] or "RUB")
                    source = "auto"

            if country_id is not None:
                cur = conn.execute("SELECT COUNT(*) as count FROM countries WHERE active = 1")
                country_count = cur.fetchone()["count"]
                force_single = country_count == 1

                if not env_country_code and not env_currency_code:
                    conn.execute(
                        """INSERT INTO system_settings (key, value, updated_at)
                           VALUES ('default_country_id', ?, datetime('now'))
                           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')""",
                        (str(country_id),),
                    )

                    if currency_code:
                        conn.execute(
                            """INSERT INTO system_settings (key, value, updated_at)
                               VALUES ('default_currency_code', ?, datetime('now'))
                               ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')""",
                            (currency_code,),
                        )

                    conn.execute(
                        """INSERT INTO system_settings (key, value, updated_at)
                           VALUES ('force_single_country', ?, datetime('now'))
                           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')""",
                        ("1" if force_single else "0",),
                    )

                    conn.commit()

                    r = get_redis()
                    r.delete("system:default_country")
                    r.delete("system:default_currency_code")
                    r.delete("system:force_single_country")

                result.update(
                    {
                        "initialized": True,
                        "country_id": country_id,
                        "country_code": env_country_code if source == "env" else None,
                        "currency_code": currency_code,
                        "source": source,
                        "force_single_country": force_single,
                    }
                )

            return result
        finally:
            conn.close()

    def get_system_currency(self) -> str:
        """Get the system default currency code."""
        cache_key = "system:default_currency_code"
        r = get_redis()
        cached = r.get(cache_key)
        if cached:
            return cached

        conn = self.db.connect()
        try:
            cur = conn.execute("SELECT value FROM system_settings WHERE key = 'default_currency_code'")
            row = cur.fetchone()

            if row:
                currency_code = str(row["value"])
                r.setex(cache_key, CACHE_TTL, currency_code)
                return currency_code

            # Fallback to RUB
            r.setex(cache_key, CACHE_TTL, "RUB")
            return "RUB"
        finally:
            conn.close()


# Singleton instance
_location_service: Optional[LocationService] = None


def get_location_service() -> LocationService:
    """Get or create LocationService singleton."""
    global _location_service
    if _location_service is None:
        _location_service = LocationService()
    return _location_service
