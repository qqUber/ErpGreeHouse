from __future__ import annotations

from datetime import datetime, timedelta
from sqlite3 import Connection
from typing import Any

from .loyalty import LoyaltyRules, get_next_tier, get_tier

DATETIME_FORMATS = (
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d",
)


def _parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    normalized = text.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        pass
    for fmt in DATETIME_FORMATS:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def _format_date(value: datetime | None) -> str:
    if not value:
        return "—"
    return value.strftime("%Y-%m-%d")


def build_customer_loyalty_profile(
    conn: Connection,
    customer_id: int,
    *,
    balance_override: int | None = None,
) -> dict[str, Any] | None:
    customer = conn.execute(
        """
        SELECT id, full_name, qr_token, balance_points, purchase_frequency,
               average_check, last_purchase_date, created_at
        FROM customers
        WHERE id=?
        """,
        (customer_id,),
    ).fetchone()
    if not customer:
        return None

    spent_row = conn.execute(
        "SELECT COALESCE(SUM(total_amount), 0) AS spent_amount FROM transactions WHERE customer_id=?",
        (customer_id,),
    ).fetchone()
    spent_amount = int(spent_row["spent_amount"] or 0) if spent_row else 0

    rules = LoyaltyRules()
    tier = get_tier(spent_amount, rules)
    next_tier = get_next_tier(spent_amount, rules)
    pay_up = max(0, (next_tier.min_spent - spent_amount) if next_tier else 0)

    tx_rows = conn.execute(
        """
        SELECT bonus_earned, bonus_used, created_at
        FROM transactions
        WHERE customer_id=?
        ORDER BY created_at ASC, id ASC
        """,
        (customer_id,),
    ).fetchall()

    nearest_expiration_date: datetime | None = None
    expiring_points = 0
    now = datetime.now()
    for row in tx_rows:
        created_at = _parse_datetime(row["created_at"])
        if not created_at:
            continue
        expires_at = created_at + timedelta(days=365)
        net_points = int(row["bonus_earned"] or 0) - int(row["bonus_used"] or 0)
        if net_points <= 0 or expires_at <= now:
            continue
        if nearest_expiration_date is None or expires_at < nearest_expiration_date:
            nearest_expiration_date = expires_at
            expiring_points = net_points
        elif expires_at.date() == nearest_expiration_date.date():
            expiring_points += net_points

    balance = int(balance_override if balance_override is not None else customer["balance_points"])
    average_check = float(customer["average_check"] or 0)
    orders_to_next_tier = 0
    if pay_up > 0:
        if average_check > 0:
            orders_to_next_tier = int((pay_up + average_check - 1) // average_check)
        else:
            orders_to_next_tier = 1

    return {
        "customer_id": int(customer["id"]),
        "customer_name": str(customer["full_name"] or ""),
        "full_name": str(customer["full_name"] or ""),
        "qr_token": str(customer["qr_token"] or ""),
        "balance": balance,
        "spent_amount": spent_amount,
        "tier_name": tier.name,
        "tier": tier.name,
        "loyalty_percent": tier.accrual_percent,
        "percent": tier.accrual_percent,
        "next_tier_name": next_tier.name if next_tier else None,
        "next_tier_spent": next_tier.min_spent if next_tier else None,
        "payUp": pay_up,
        "orders_to_next_tier": orders_to_next_tier,
        "date_to": _format_date(nearest_expiration_date),
        "balance_minus": expiring_points,
        "purchase_frequency": int(customer["purchase_frequency"] or 0),
        "last_purchase_date": str(customer["last_purchase_date"] or ""),
        "created_at": str(customer["created_at"] or ""),
    }
