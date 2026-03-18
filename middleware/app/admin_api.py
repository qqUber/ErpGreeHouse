import csv
import io
import json
import os
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from .admin_auth_api import require_jwt_auth
from .auth import (
    ALL_PERMISSIONS,
    check_permission,
    check_roles,
    get_default_permissions,
)
from .customer_identity import generate_unique_qr_token, resolve_or_create_customer
from .db import get_db
from .identify import normalize_name, normalize_phone
from .utils.currency import format_currency
from .integration_events import dispatch_event
from .integrations.pos.erpnext_client import ERPClient
from .loyalty import LoyaltyRules, calc_earned_points, clamp_redeem_points
from .pdfgen import ReceiptLine, write_simple_receipt_pdf
from .runtime import is_debug
from .storage import get_redis
from .trigger_engine import evaluate_and_queue_triggers
from .worker import send_customer_message

router = APIRouter(prefix="/api/v1")
public_router = APIRouter(prefix="/api/v1/public")


def _parse_items_json(items_json: Optional[str]) -> list[dict[str, Any]]:
    """Parse items_json field safely"""
    if not items_json:
        return []
    try:
        return json.loads(items_json)  # type: ignore[no-any-return]
    except (json.JSONDecodeError, TypeError):
        return []


def _get_product_names(items_json: str | None, max_items: int = 2) -> str:
    """Extract product names from items_json"""
    items = _parse_items_json(items_json)
    if not items:
        return "—"
    names = [item.get("name", "Товар") for item in items[:max_items]]
    if len(items) > max_items:
        return f"{', '.join(names)} +{len(items) - max_items}"
    return ", ".join(names)


@public_router.get("/status")
def public_status() -> dict[str, Any]:
    admin_configured = bool(os.getenv("ADMIN_SECRET", ""))
    return {
        "api": "ok",
        "admin_auth_configured": admin_configured,
        "debug_mode": is_debug(),
        "erp_sync_enabled": os.getenv("ERP_SYNC_ENABLED", "false").lower()
        in ("1", "true", "yes"),
    }


# Cache TTL constants (in seconds)
# Dashboard: 60s - real-time data, refreshed on each POS sale
# Analytics: 300s (5 min) - aggregated data changes less frequently
# Sales stats: 180s (3 min) - moderate freshness requirement
DASHBOARD_CACHE_TTL = 60
ANALYTICS_CACHE_TTL = 300
SALES_STATS_CACHE_TTL = 180
CUSTOMERS_LIST_CACHE_TTL = 5


def _cache_get_json(key: str) -> Any | None:
    try:
        r = get_redis()
        raw = r.get(key)
        return json.loads(raw) if raw else None  # type: ignore[arg-type]
    except Exception:
        return None


def _cache_set_json(key: str, value: Any, ttl_seconds: int) -> None:
    try:
        r = get_redis()
        r.set(key, json.dumps(value, ensure_ascii=False), ex=ttl_seconds)
    except Exception:
        return


def _cache_del_prefix(prefix: str) -> None:
    """Delete all keys matching prefix using SCAN for production safety.

    Uses SCAN instead of KEYS to avoid blocking Redis in production.
    """
    try:
        r = get_redis()
        cursor = 0
        pattern = prefix + "*"
        while True:
            cursor, keys = r.scan(cursor, match=pattern, count=100)
            if keys:
                r.delete(*keys)  # type: ignore[misc]
            if cursor == 0:
                break
    except Exception:
        return


def _warm_dashboard_cache() -> None:
    """Pre-warm dashboard cache with today's data"""
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        cache_key = f"crm:cache:dashboard:{today}"
        # Check if already cached
        if _cache_get_json(cache_key):
            return

        db = get_db()
        conn = db.connect()
        try:
            cur = conn.execute(
                "SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount),0) as sum_total, COALESCE(SUM(bonus_earned),0) as sum_earned, COALESCE(SUM(bonus_used),0) as sum_used FROM transactions WHERE date(created_at)=?",
                (today,),
            )
            row = cur.fetchone()
            cur2 = conn.execute("SELECT COUNT(*) as cnt FROM customers")
            customers_total = int(cur2.fetchone()[0])
            cur_tx = conn.execute(
                "SELECT t.id, t.created_at, t.total_amount, t.bonus_earned, t.bonus_used, t.items_json, c.full_name as customer_name, t.customer_id "
                "FROM transactions t "
                "JOIN customers c ON t.customer_id = c.id "
                "ORDER BY t.created_at DESC LIMIT 10"
            )
            txs = []
            for r in cur_tx.fetchall():
                tx = dict(r)
                tx["customer_name"] = tx.get("customer_name") or "Клиент"
                tx["product_names"] = _get_product_names(tx.get("items_json"))
                tx.pop("items_json", None)
                txs.append(tx)
            cur_tr = conn.execute(
                "SELECT e.id, e.created_at, e.status, t.name as trigger_name "
                "FROM marketing_trigger_events e "
                "JOIN marketing_triggers t ON e.trigger_id = t.id "
                "ORDER BY e.created_at DESC LIMIT 5"
            )
            trevents = [dict(r) for r in cur_tr.fetchall()]
            data = {
                "today": today,
                "sales_count": int(row["cnt"]),
                "sales_total": int(row["sum_total"]),
                "bonus_earned": int(row["sum_earned"]),
                "bonus_used": int(row["sum_used"]),
                "customers_total": customers_total,
                "recent_activity": {"transactions": txs, "marketing_events": trevents},
            }
            _cache_set_json(cache_key, data, ttl_seconds=DASHBOARD_CACHE_TTL)
        finally:
            conn.close()
    except Exception:
        pass  # Silent fail for cache warming


class IdentifyPhoneIn(BaseModel):
    phone: str


class IdentifyNameIn(BaseModel):
    name: str


class IdentifyQrIn(BaseModel):
    qr: str


class CreateCustomerIn(BaseModel):
    full_name: str
    phone: str | None = None
    notes: str | None = None
    birthday: str | None = None  # YYYY-MM-DD
    gender: str | None = None
    email: str | None = None
    city: str | None = None
    marketing_allowed: int = 1
    data_processing_allowed: int = 1


class SaleItem(BaseModel):
    code: str = Field(min_length=1)
    name: str = Field(min_length=1)
    price: int = Field(ge=0)
    qty: int = Field(ge=1)


class CreateSaleIn(BaseModel):
    customer_id: int
    items: list[SaleItem]
    requested_bonus: int = Field(default=0, ge=0)


class PermissionUpdate(BaseModel):
    role: str
    permission: str
    is_allowed: bool


@router.get("/roles/permissions")
def list_permissions(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    # Owner only for managing permissions
    check_roles(auth_result, roles=("owner",))

    db = get_db()
    conn = db.connect()
    try:
        # Get all configured permissions
        cur = conn.execute(
            "SELECT role, permission, is_allowed FROM role_permissions ORDER BY role, permission"
        )
        items = [dict(r) for r in cur.fetchall()]

        # Ensure we return a structure that includes defaults if not in DB?
        # For now, let's just return what's in DB. The UI can handle "undefined means default false/true based on role".
        # But actually, the UI needs to know the full list of available permissions to show checkboxes.

        # Use the single source of truth from auth.py
        known_permissions = ALL_PERMISSIONS

        known_roles = ["operator", "manager", "marketer"]  # Owner has all

        # Build a complete matrix
        matrix = []
        configured = {
            (r["role"], r["permission"]): bool(r["is_allowed"]) for r in items
        }

        for role in known_roles:
            role_defaults = get_default_permissions(role)
            for perm in known_permissions:
                is_allowed = configured.get((role, perm), False)
                # Apply defaults for operator if not configured
                if (role, perm) not in configured:
                    if perm in role_defaults:
                        is_allowed = True

                matrix.append(
                    {"role": role, "permission": perm, "is_allowed": is_allowed}
                )

        return {"items": matrix}
    finally:
        conn.close()


@router.post("/roles/permissions")
def update_permission(
    payload: PermissionUpdate,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_roles(auth_result, roles=("owner",))

    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "INSERT INTO role_permissions(role, permission, is_allowed, updated_at) VALUES(?,?,?, datetime('now')) "
            "ON CONFLICT(role, permission) DO UPDATE SET is_allowed=excluded.is_allowed, updated_at=excluded.updated_at",
            (payload.role, payload.permission, 1 if payload.is_allowed else 0),
        )
        conn.commit()
        return {"status": "ok"}
    finally:
        conn.close()


@router.get("/dashboard")
def dashboard(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_permission(auth_result, "dashboard.read")
    today = datetime.now().strftime("%Y-%m-%d")
    cache_key = f"crm:cache:dashboard:{today}"
    cached = _cache_get_json(cache_key)
    if isinstance(cached, dict):
        return cached
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount),0) as sum_total, COALESCE(SUM(bonus_earned),0) as sum_earned, COALESCE(SUM(bonus_used),0) as sum_used FROM transactions WHERE date(created_at)=?",
            (today,),
        )
        row = cur.fetchone()
        cur2 = conn.execute("SELECT COUNT(*) as cnt FROM customers")
        customers_total = int(cur2.fetchone()[0])
        # Recent Activity (Transactions) with customer name and product names
        cur_tx = conn.execute(
            "SELECT t.id, t.created_at, t.total_amount, t.bonus_earned, t.bonus_used, t.items_json, c.full_name as customer_name, t.customer_id "
            "FROM transactions t "
            "JOIN customers c ON t.customer_id = c.id "
            "ORDER BY t.created_at DESC LIMIT 10"
        )
        txs = []
        for r in cur_tx.fetchall():
            tx = dict(r)
            tx["customer_name"] = tx.get("customer_name") or "Клиент"
            tx["product_names"] = _get_product_names(tx.get("items_json"))
            tx.pop("items_json", None)  # Remove raw JSON from response
            txs.append(tx)

        # Recent Marketing Triggers (Events)
        cur_tr = conn.execute(
            "SELECT e.id, e.created_at, e.status, t.name as trigger_name "
            "FROM marketing_trigger_events e "
            "JOIN marketing_triggers t ON e.trigger_id = t.id "
            "ORDER BY e.created_at DESC LIMIT 5"
        )
        trevents = [dict(r) for r in cur_tr.fetchall()]

        # Get detailed customer KPIs
        cur_customers = conn.execute(
            "SELECT id, full_name, phone, telegram_id, vk_id, marketing_allowed, balance_points, created_at "
            "FROM customers ORDER BY created_at DESC LIMIT 100"
        )
        all_customers = [dict(r) for r in cur_customers.fetchall()]

        # Calculate customer metrics
        new_this_week = 0
        for c in all_customers:
            if c["created_at"]:
                try:
                    created_dt = datetime.fromisoformat(
                        c["created_at"].replace("Z", "+00:00")
                        if c["created_at"].endswith("Z")
                        else c["created_at"]
                    )
                    if (datetime.now(created_dt.tzinfo) - created_dt).days <= 7:
                        new_this_week += 1
                except:
                    pass  # Skip invalid dates

        telegram_reachable = len([c for c in all_customers if c["telegram_id"]])
        vk_reachable = len([c for c in all_customers if c["vk_id"]])
        marketing_consent = len(
            [c for c in all_customers if c["marketing_allowed"] == 1]
        )

        # Get products count
        cur_products = conn.execute("SELECT COUNT(*) as cnt FROM products")
        products_total = int(cur_products.fetchone()["cnt"])

        # Get integrations count
        cur_integrations = conn.execute("SELECT COUNT(*) as cnt FROM integrations")
        integrations_total = int(cur_integrations.fetchone()["cnt"])

        data = {
            "today": today,
            "sales_count": int(row["cnt"]),
            "sales_total": int(row["sum_total"]),
            "bonus_earned": int(row["sum_earned"]),
            "bonus_used": int(row["sum_used"]),
            "customers_total": customers_total,
            "new_customers": {"this_week": new_this_week},
            "top_customers": all_customers[:20],  # Top 20 customers
            "telegram_reachable": telegram_reachable,
            "vk_reachable": vk_reachable,
            "marketing_consent": marketing_consent,
            "products_total": products_total,
            "integrations_total": integrations_total,
            "recent_activity": {"transactions": txs, "marketing_events": trevents},
        }
        _cache_set_json(cache_key, data, ttl_seconds=DASHBOARD_CACHE_TTL)
        return data
    finally:
        conn.close()


@router.get("/stats/sales")
def sales_stats(
    days: int = 7,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_permission(auth_result, "dashboard.read")

    # Cache key includes days parameter for different time ranges
    cache_key = f"crm:cache:stats:sales:{days}"
    cached = _cache_get_json(cache_key)
    if isinstance(cached, dict):
        return cached

    db = get_db()
    conn = db.connect()
    try:
        # Aggregate daily sales for the trend line
        cur = conn.execute(
            """
            SELECT date(created_at) as day, COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as total
            FROM transactions
            WHERE created_at >= date('now', ?)
            GROUP BY day
            ORDER BY day ASC
            """,
            (f"-{days} days",),
        )
        stats = [dict(r) for r in cur.fetchall()]
        data = {"stats": stats}
        _cache_set_json(cache_key, data, ttl_seconds=SALES_STATS_CACHE_TTL)
        return data
    finally:
        conn.close()


@router.get("/analytics/sales-by-day")
def analytics_sales_by_day(
    days: int = Query(default=30, ge=1, le=365),
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Get sales dynamics by day for charts"""
    check_permission(auth_result, "dashboard.read")

    # Cache key includes days parameter
    cache_key = f"crm:cache:analytics:sales-by-day:{days}"
    cached = _cache_get_json(cache_key)
    if isinstance(cached, dict):
        return cached

    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            """
            SELECT
                date(created_at) as date,
                COUNT(*) as transactions_count,
                COALESCE(SUM(total_amount), 0) as total_amount,
                COALESCE(SUM(bonus_earned), 0) as bonus_earned
            FROM transactions
            WHERE created_at >= date('now', ?)
            GROUP BY date(created_at)
            ORDER BY date ASC
            """,
            (f"-{days} days",),
        )
        data = [dict(r) for r in cur.fetchall()]
        result = {"sales_by_day": data}
        _cache_set_json(cache_key, result, ttl_seconds=ANALYTICS_CACHE_TTL)
        return result
    finally:
        conn.close()


@router.get("/analytics/top-products")
def analytics_top_products(
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=10, ge=1, le=100),
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Get top products by sales for bar chart"""
    check_permission(auth_result, "dashboard.read")

    # Cache key includes days and limit parameters
    cache_key = f"crm:cache:analytics:top-products:{days}:{limit}"
    cached = _cache_get_json(cache_key)
    if isinstance(cached, dict):
        return cached

    db = get_db()
    conn = db.connect()
    try:
        # Parse items_json to extract product info
        cur = conn.execute(
            """
            SELECT
                t.items_json
            FROM transactions t
            WHERE t.created_at >= date('now', ?)
            """,
            (f"-{days} days",),
        )

        # Aggregate product sales
        product_sales: dict[str, dict[str, Any]] = {}
        for row in cur.fetchall():
            items = json.loads(row["items_json"] or "[]")
            for item in items:
                name = item.get("name", "Unknown")
                qty = item.get("qty", 1)
                price = item.get("price", 0)
                if name in product_sales:
                    product_sales[name]["qty"] += qty
                    product_sales[name]["revenue"] += price * qty
                else:
                    product_sales[name] = {"qty": qty, "revenue": price * qty}

        # Sort by revenue and take top N
        sorted_products = sorted(
            product_sales.items(), key=lambda x: x[1]["revenue"], reverse=True
        )[:limit]
        data = [
            {"name": name, "qty": stats["qty"], "revenue": stats["revenue"]}
            for name, stats in sorted_products
        ]
        result = {"top_products": data}
        _cache_set_json(cache_key, result, ttl_seconds=ANALYTICS_CACHE_TTL)
        return result
    finally:
        conn.close()


@router.get("/analytics/category-distribution")
def analytics_category_distribution(
    days: int = Query(default=30, ge=1, le=365),
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Get category distribution for pie/donut chart"""
    check_permission(auth_result, "dashboard.read")

    # Cache key includes days parameter
    cache_key = f"crm:cache:analytics:category-dist:{days}"
    cached = _cache_get_json(cache_key)
    if isinstance(cached, dict):
        return cached

    db = get_db()
    conn = db.connect()
    try:
        # Get products to map codes to categories
        cur_products = conn.execute("SELECT code, kind FROM products WHERE active = 1")
        product_categories = {
            row["code"]: row["kind"] for row in cur_products.fetchall()
        }

        # Get transactions
        cur = conn.execute(
            """
            SELECT items_json
            FROM transactions
            WHERE created_at >= date('now', ?)
            """,
            (f"-{days} days",),
        )

        # Aggregate by category
        category_sales: dict[str, dict[str, Any]] = {}
        for row in cur.fetchall():
            items = json.loads(row["items_json"] or "[]")
            for item in items:
                code = item.get("code", "")
                category = product_categories.get(code, "Other")
                qty = item.get("qty", 1)
                price = item.get("price", 0)
                if category in category_sales:
                    category_sales[category]["qty"] += qty
                    category_sales[category]["revenue"] += price * qty
                else:
                    category_sales[category] = {"qty": qty, "revenue": price * qty}

        data = [
            {"name": cat, "qty": stats["qty"], "revenue": stats["revenue"]}
            for cat, stats in category_sales.items()
        ]
        result = {"category_distribution": data}
        _cache_set_json(cache_key, result, ttl_seconds=ANALYTICS_CACHE_TTL)
        return result
    finally:
        conn.close()


@router.post("/analytics/recalculate")
def analytics_recalculate(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Recalculate customer analytics (LTV, average_check, etc.)"""
    check_permission(auth_result, "dashboard.read")

    db = get_db()
    conn = db.connect()
    try:
        # Get all customers with transactions
        cur = conn.execute("""
            SELECT
                c.id,
                COALESCE(SUM(t.total_amount), 0) as ltv,
                COUNT(t.id) as purchase_count,
                MAX(t.created_at) as last_purchase_date,
                MIN(t.created_at) as first_purchase_date
            FROM customers c
            LEFT JOIN transactions t ON c.id = t.customer_id
            GROUP BY c.id
            """)

        updated = 0
        for row in cur.fetchall():
            customer_id = row["id"]
            ltv = row["ltv"] or 0
            purchase_count = row["purchase_count"] or 0
            last_purchase_date = row["last_purchase_date"]
            first_purchase_date = row["first_purchase_date"]

            # Calculate average check
            average_check = ltv / purchase_count if purchase_count > 0 else 0

            # Get cohort month from first purchase
            cohort_month = None
            if first_purchase_date:
                cohort_month = first_purchase_date[:7]  # YYYY-MM

            conn.execute(
                """
                UPDATE customers SET
                    ltv = ?,
                    average_check = ?,
                    purchase_frequency = ?,
                    last_purchase_date = ?,
                    cohort_month = ?
                WHERE id = ?
                """,
                (
                    ltv,
                    average_check,
                    purchase_count,
                    last_purchase_date,
                    cohort_month,
                    customer_id,
                ),
            )
            updated += 1

        conn.commit()
        return {"recalculated": updated}
    finally:
        conn.close()


@router.get("/customers")
def list_customers(
    q: str | None = None,
    min_balance: int | None = None,
    max_balance: int | None = None,
    has_orders: bool | None = None,
    created_after: str | None = None,
    created_before: str | None = None,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_permission(auth_result, "customer.list")

    # Cache key depends on all filters and pagination
    filters_key = f"{q or ''}:{min_balance}:{max_balance}:{has_orders}:{created_after}:{created_before}:{page}:{limit}"
    cache_key = f"crm:cache:customers:filter:{filters_key}"

    cached = _cache_get_json(cache_key)
    if isinstance(cached, dict) and isinstance(cached.get("items"), list):
        return cached

    db = get_db()
    conn = db.connect()
    try:
        where = []
        args = []

        if q:
            qs = normalize_name(q)
            qp = normalize_phone(q)
            where.append("(full_name LIKE ? OR phone LIKE ?)")
            args.extend([f"%{qs}%", f"%{qp}%"])

        if min_balance is not None:
            where.append("balance_points >= ?")
            args.append(min_balance)  # type: ignore[arg-type]

        if max_balance is not None:
            where.append("balance_points <= ?")
            args.append(max_balance)  # type: ignore[arg-type]

        if created_after:
            where.append("date(created_at) >= ?")
            args.append(created_after)

        if created_before:
            where.append("date(created_at) <= ?")
            args.append(created_before)

        if has_orders:
            where.append(
                "EXISTS (SELECT 1 FROM transactions WHERE transactions.customer_id = customers.id)"
            )

        # Get total count
        count_sql = "SELECT COUNT(*) as total FROM customers"
        if where:
            count_sql += " WHERE " + " AND ".join(where)
        count_cur = conn.execute(count_sql, tuple(args))
        count_result = count_cur.fetchone()
        total = count_result["total"] if count_result else 0

        # Get paginated data
        offset = (page - 1) * limit
        sql = "SELECT id, phone, full_name, telegram_id, qr_token, balance_points, birthday, gender, email, city, onboarding_status, created_at FROM customers"
        if where:
            sql += " WHERE " + " AND ".join(where)
        sql += " ORDER BY id DESC LIMIT ? OFFSET ?"
        args.extend([limit, offset])

        cur = conn.execute(sql, tuple(args))
        items = [dict(r) for r in cur.fetchall()]

        # Calculate pagination info
        total_pages = (total + limit - 1) // limit if limit > 0 else 0
        data = {
            "items": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            },
        }

        # Cache for shorter time if filtered
        _cache_set_json(cache_key, data, ttl_seconds=5)
        return data
    finally:
        conn.close()


@router.get("/compliance/consents")
def list_consents(
    customer_id: Optional[int] = Query(None),
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Get consent records with optional customer filtering"""
    check_permission(auth_result, "customer.read")
    db = get_db()
    conn = db.connect()
    try:
        where = []
        params = []

        if customer_id is not None:
            where.append("customer_id = ?")
            params.append(customer_id)

        sql = "SELECT * FROM consents"
        if where:
            sql += " WHERE " + " AND ".join(where)
        sql += " ORDER BY accepted_at DESC"

        cur = conn.execute(sql, tuple(params))
        items = [dict(r) for r in cur.fetchall()]
        return {"items": items}
    finally:
        conn.close()


@router.get("/compliance/consents/{customer_id}")
def get_customer_consents(
    customer_id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Get consent history for a specific customer"""
    check_permission(auth_result, "customer.read")
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT * FROM consents WHERE customer_id = ? ORDER BY accepted_at DESC",
            (customer_id,),
        )
        items = [dict(r) for r in cur.fetchall()]
        return {"items": items}
    finally:
        conn.close()


@router.delete("/compliance/customers/{customer_id}")
def delete_customer(
    customer_id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """Delete customer profile and all associated data"""
    check_permission(auth_result, "customer.delete")
    db = get_db()
    conn = db.connect()
    try:
        # Check if customer exists
        cur = conn.execute("SELECT id FROM customers WHERE id = ?", (customer_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Customer not found")

        # Delete all consents for customer
        conn.execute("DELETE FROM consents WHERE customer_id = ?", (customer_id,))

        # Delete all transactions for customer
        conn.execute("DELETE FROM transactions WHERE customer_id = ?", (customer_id,))

        # Delete customer
        conn.execute("DELETE FROM customers WHERE id = ?", (customer_id,))

        conn.commit()

        # Invalidate cache
        _cache_del_prefix("crm:cache:customers:")

        return {"status": "deleted"}
    finally:
        conn.close()


@router.get("/customers/{customer_id}")
def get_customer(
    customer_id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_permission(auth_result, "customer.read")
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT id, phone, full_name, telegram_id, qr_token, balance_points, preferences_json, birthday, gender, email, city, onboarding_status, phone_verified_at, phone_verification_method, created_at FROM customers WHERE id=?",
            (customer_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Customer not found")
        cust = dict(row)
        cust["preferences"] = json.loads(cust.pop("preferences_json") or "{}")
        cur2 = conn.execute(
            "SELECT id, total_amount, bonus_used, bonus_earned, items_json, receipt_pdf_path, external_erp_ref, created_at FROM transactions WHERE customer_id=? ORDER BY id DESC LIMIT 50",
            (customer_id,),
        )
        tx = []
        for r in cur2.fetchall():
            d = dict(r)
            d["items"] = json.loads(d.pop("items_json") or "[]")
            tx.append(d)
        return {"customer": cust, "transactions": tx}
    finally:
        conn.close()


@router.post("/customers")
def create_customer(
    payload: CreateCustomerIn,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_permission(auth_result, "customer.create")
    if not payload.full_name:
        raise HTTPException(status_code=400, detail="Name required")

    db = get_db()
    conn = db.connect()
    try:
        phone = normalize_phone(payload.phone) if payload.phone else None
        if phone:
            cur = conn.execute("SELECT id FROM customers WHERE phone=?", (phone,))
            if cur.fetchone():
                raise HTTPException(
                    status_code=400, detail="Customer with this phone already exists"
                )

        token = generate_unique_qr_token(conn)
        prefs = json.dumps({"notes": payload.notes} if payload.notes else {})

        cur = conn.execute(
            """
            INSERT INTO customers(full_name, phone, qr_token, preferences_json, balance_points, birthday, gender, email, city, onboarding_status, marketing_allowed, data_processing_allowed)
            VALUES(?,?,?,?,0,?,?,?,?,?,?,?)
            """,
            (
                payload.full_name,
                phone,
                token,
                prefs,
                payload.birthday,
                payload.gender,
                payload.email,
                payload.city,
                "completed",
                payload.marketing_allowed,
                payload.data_processing_allowed,
            ),
        )
        conn.commit()
        cid = cur.lastrowid
        _cache_del_prefix("crm:cache:customers:")
        return {"id": cid, "qr_token": token}
    finally:
        conn.close()


@router.get("/transactions/{transaction_id}/receipt")
def get_receipt(
    transaction_id: int,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> FileResponse:
    check_permission(auth_result, "transaction.read")
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT receipt_pdf_path FROM transactions WHERE id=?", (transaction_id,)
        )
        row = cur.fetchone()
        if not row or not row["receipt_pdf_path"]:
            raise HTTPException(status_code=404, detail="Receipt not found")
        path = str(row["receipt_pdf_path"])
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="Receipt file missing")
        return FileResponse(
            path, media_type="application/pdf", filename=os.path.basename(path)
        )
    finally:
        conn.close()


@router.post("/identify/phone")
def identify_phone(
    payload: IdentifyPhoneIn,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_permission(auth_result, "customer.create")
    phone = normalize_phone(payload.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="Invalid phone")
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("SELECT id FROM customers WHERE phone=?", (phone,))
        row = cur.fetchone()
        if row:
            return {"customer_id": int(row[0])}
        customer_id, _ = resolve_or_create_customer(
            conn,
            phone=phone,
            preferred_channel=None,
            onboarding_status="identified",
        )
        conn.commit()
        _cache_del_prefix("crm:cache:customers:")
        return {"customer_id": customer_id}
    finally:
        conn.close()


@router.post("/identify/name")
def identify_name(
    payload: IdentifyNameIn,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_permission(auth_result, "customer.search")
    name = normalize_name(payload.name)
    if not name:
        raise HTTPException(status_code=400, detail="Invalid name")
    db = get_db()
    conn = db.connect()
    try:
        like = f"%{name}%"
        cur = conn.execute(
            "SELECT id, phone, full_name, balance_points FROM customers WHERE full_name LIKE ? ORDER BY id DESC LIMIT 20",
            (like,),
        )
        return {"items": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


@router.post("/identify/qr")
def identify_qr(
    payload: IdentifyQrIn,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_permission(auth_result, "customer.search")
    token = payload.qr.strip()
    if not token:
        raise HTTPException(status_code=400, detail="Invalid qr")
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("SELECT id FROM customers WHERE qr_token=?", (token,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Customer not found")
        return {"customer_id": int(row[0])}
    finally:
        conn.close()


@router.post("/pos/sale")
def create_sale(
    payload: CreateSaleIn,
    background_tasks: BackgroundTasks,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_permission(auth_result, "pos.sale")
    if not payload.items:
        raise HTTPException(status_code=400, detail="items required")

    total = sum(i.price * i.qty for i in payload.items)
    tx_id = 0
    result: dict[str, Any] | None = None

    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT id, balance_points, telegram_id, phone, full_name, qr_token FROM customers WHERE id=?",
            (payload.customer_id,),
        )
        cust = cur.fetchone()
        if not cust:
            raise HTTPException(status_code=404, detail="Customer not found")

        spent_row = conn.execute(
            "SELECT SUM(total_amount) FROM transactions WHERE customer_id=?",
            (payload.customer_id,),
        ).fetchone()
        spent_amount = int(spent_row[0]) if spent_row and spent_row[0] else 0

        rules = LoyaltyRules()
        bonus_used = clamp_redeem_points(
            total,
            spent_amount,
            payload.requested_bonus,
            int(cust["balance_points"]),
            rules,
        )
        payable = total - bonus_used
        bonus_earned = calc_earned_points(payable, spent_amount, rules)

        receipt_dir = os.getenv("RECEIPTS_DIR", "receipts")
        receipt_name = (
            f"receipt_{payload.customer_id}_{int(datetime.now().timestamp())}.pdf"
        )
        receipt_path = os.path.join(os.path.dirname(db.path), receipt_dir, receipt_name)
        lines = []
        for it in payload.items:
            lines.append(
                ReceiptLine(
                    text=f"{it.name} x{it.qty} = {format_currency(it.price * it.qty)}"
                )
            )
        lines.append(ReceiptLine(text=f"Сумма: {format_currency(total)}"))
        lines.append(ReceiptLine(text=f"Списано: {bonus_used}"))
        lines.append(ReceiptLine(text=f"К оплате: {format_currency(payable)}"))
        lines.append(ReceiptLine(text=f"Начислено: {bonus_earned}"))
        lines.append(ReceiptLine(text=f"Баланс до: {int(cust['balance_points'])}"))
        lines.append(
            ReceiptLine(
                text=f"Баланс после: {int(cust['balance_points']) - bonus_used + bonus_earned}"
            )
        )
        write_simple_receipt_pdf(receipt_path, title="Coffee CRM Receipt", lines=lines)

        new_balance = int(cust["balance_points"]) - bonus_used + bonus_earned

        items_json = json.dumps(
            [i.model_dump() for i in payload.items], ensure_ascii=False
        )
        cur2 = conn.execute(
            "INSERT INTO transactions(customer_id, total_amount, bonus_used, bonus_earned, items_json, receipt_pdf_path) VALUES(?,?,?,?,?,?)",
            (
                payload.customer_id,
                total,
                bonus_used,
                bonus_earned,
                items_json,
                receipt_path,
            ),
        )
        conn.execute(
            "UPDATE customers SET balance_points=?, updated_at=datetime('now') WHERE id=?",
            (new_balance, payload.customer_id),
        )
        conn.commit()
        tx_id = int(cur2.lastrowid)  # type: ignore[arg-type]
        # Invalidate all dashboard-related caches on new transaction
        _cache_del_prefix("crm:cache:dashboard:")
        _cache_del_prefix("crm:cache:stats:")
        _cache_del_prefix("crm:cache:analytics:")
        _cache_del_prefix("crm:cache:customers:")

        # Evaluate triggers
        event_data = {
            "transaction_id": tx_id,
            "total_amount": total,
            "bonus_used": bonus_used,
            "bonus_earned": bonus_earned,
        }
        background_tasks.add_task(
            evaluate_and_queue_triggers, payload.customer_id, "pos.sale", event_data
        )

        tg_id = cust["telegram_id"]
        if tg_id:
            msg_lines = [
                f"Покупка: {format_currency(total)}",
                f"Списано: {bonus_used}",
                f"Начислено: {bonus_earned}",
                f"Баланс: {new_balance}",
            ]
            send_customer_message.delay(int(tg_id), "\n".join(msg_lines))

        erp_ref = _maybe_sync_to_erpnext(
            int(cust["telegram_id"] or 0), payload.items, bonus_used
        )
        if erp_ref:
            conn.execute(
                "UPDATE transactions SET external_erp_ref=? WHERE id=?",
                (erp_ref, tx_id),
            )
            conn.commit()

        result = {
            "transaction_id": tx_id,
            "total": total,
            "bonus_used": bonus_used,
            "bonus_earned": bonus_earned,
            "payable": payable,
            "balance": new_balance,
            "receipt_pdf_path": receipt_path,
            "external_erp_ref": erp_ref,
        }
    finally:
        conn.close()

    if result:
        dispatch_event(
            "transaction.created",
            {
                "transaction_id": int(result["transaction_id"]),
                "customer_id": payload.customer_id,
                "total": int(result["total"]),
                "bonus_used": int(result["bonus_used"]),
                "bonus_earned": int(result["bonus_earned"]),
            },
        )
        return result

    raise HTTPException(status_code=500, detail="Transaction not created")


def _maybe_sync_to_erpnext(
    telegram_id: int, items: list[SaleItem], bonus_used: int
) -> str | None:
    enabled = os.getenv("ERP_SYNC_ENABLED", "false").lower() in ("1", "true", "yes")
    if not enabled:
        return None
    if not telegram_id:
        return None
    client = ERPClient()

    async def runner() -> str | None:
        tg = await client.get_customer_by_telegram_id(telegram_id)
        if not tg:
            return None
        mapped = [
            {"code": i.code, "qty": i.qty, "price": i.price, "name": i.name}
            for i in items
        ]
        res = await client.create_order(tg["name"], mapped, bonus_used)
        return res.get("order_id")

    import asyncio

    try:
        return asyncio.run(runner())
    except Exception:
        return None


@router.get("/exports/transactions.csv")
def export_transactions_csv(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> StreamingResponse:
    check_permission(auth_result, "report.export")
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT t.id, t.created_at, c.phone, c.full_name, t.total_amount, t.bonus_used, t.bonus_earned, t.external_erp_ref FROM transactions t JOIN customers c ON c.id=t.customer_id ORDER BY t.id DESC LIMIT 2000"
        )
        out = io.StringIO()
        w = csv.writer(out)
        w.writerow(
            [
                "id",
                "created_at",
                "phone",
                "full_name",
                "total_amount",
                "bonus_used",
                "bonus_earned",
                "external_erp_ref",
            ]
        )
        for r in cur.fetchall():
            w.writerow(
                [
                    r["id"],
                    r["created_at"],
                    r["phone"],
                    r["full_name"],
                    r["total_amount"],
                    r["bonus_used"],
                    r["bonus_earned"],
                    r["external_erp_ref"],
                ]
            )
        data = out.getvalue().encode("utf-8")
        return StreamingResponse(
            io.BytesIO(data),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=transactions.csv"},
        )
    finally:
        conn.close()


class MarketingPushIn(BaseModel):
    """Request model for marketing push endpoint."""

    message: str = Field(min_length=1, max_length=1000)
    min_balance_points: int = Field(default=100, ge=0)
    channel_filter: str | None = Field(
        default=None, pattern="^(tg|vk|telegram|vkontakte)$"
    )


@router.post("/marketing/push")
def marketing_push(
    payload: MarketingPushIn,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    """
    Send marketing push to customers.

    Filters customers where:
    - marketing_allowed == 1
    - balance_points > min_balance_points (default: 100)

    Sends message via preferred_channel (TG or VK).
    """
    check_permission(auth_result, "marketing.send")

    db = get_db()
    conn = db.connect()

    try:
        # Build query with optional channel filter
        query = """
            SELECT id, telegram_id, vk_id, phone, full_name, preferred_channel, balance_points
            FROM customers
            WHERE marketing_allowed = 1
            AND balance_points > ?
        """
        params = [payload.min_balance_points]

        if payload.channel_filter:
            # Normalize channel filter
            channel = payload.channel_filter.lower()
            if channel in ("telegram", "tg"):
                query += " AND preferred_channel = 'tg' AND telegram_id IS NOT NULL"
            elif channel in ("vkontakte", "vk"):
                query += " AND preferred_channel = 'vk' AND vk_id IS NOT NULL"
        else:
            # Default: get customers with any channel
            query += " AND (telegram_id IS NOT NULL OR vk_id IS NOT NULL)"

        cur = conn.execute(query, tuple(params))
        customers = cur.fetchall()

        sent_tg = 0
        sent_vk = 0
        failed = 0

        # Import async message sending functions
        import asyncio

        import aiohttp

        # Get VK settings for sending messages
        from .config import get_settings
        from .worker import send_customer_message

        settings = get_settings()
        vk_token = getattr(settings, "vk_group_token", None) or os.getenv(
            "VK_GROUP_TOKEN"
        )
        vk_group_id = getattr(settings, "vk_group_id", None) or os.getenv("VK_GROUP_ID")

        for customer in customers:
            customer_id = int(customer["id"])
            telegram_id = customer["telegram_id"]
            vk_id = customer["vk_id"]
            preferred = customer["preferred_channel"]

            try:
                # Send via preferred channel
                if preferred == "tg" and telegram_id:
                    # Use worker task for async sending
                    result = send_customer_message.delay(
                        int(telegram_id), payload.message
                    )
                    sent_tg += 1
                elif preferred == "vk" and vk_id and vk_token:
                    # Send via VK API directly
                    async def send_vk_message():
                        async with aiohttp.ClientSession() as session:
                            params = {
                                "access_token": vk_token,
                                "v": "5.131",
                                "user_id": int(vk_id),
                                "message": payload.message,
                                "random_id": int(
                                    asyncio.get_event_loop().time() * 1000
                                ),
                            }
                            async with session.post(
                                "https://api.vk.com/method/messages.send", params=params
                            ) as resp:
                                return await resp.json()

                    # Run async VK send
                    try:
                        asyncio.run(send_vk_message())
                        sent_vk += 1
                    except Exception as vk_err:
                        print(f"VK send error: {vk_err}")
                        failed += 1
                else:
                    # Fallback: try telegram if available
                    if telegram_id:
                        send_customer_message.delay(int(telegram_id), payload.message)
                        sent_tg += 1
                    else:
                        failed += 1
            except Exception as e:
                print(f"Error sending to customer {customer_id}: {e}")
                failed += 1

        return {
            "status": "completed",
            "total_customers": len(customers),
            "sent_telegram": sent_tg,
            "sent_vk": sent_vk,
            "failed": failed,
            "message": (
                payload.message[:50] + "..."
                if len(payload.message) > 50
                else payload.message
            ),
        }

    finally:
        conn.close()
