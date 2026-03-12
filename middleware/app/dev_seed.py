import json
import os
import random
from datetime import datetime, timedelta
from typing import Any

from .config import Settings
from .db import get_db


def _is_true(value: str | None) -> bool:
    return str(value or "").strip().lower() in ("1", "true", "yes", "on")


def should_auto_seed(settings: Settings) -> bool:
    explicit = os.getenv("AUTO_SEED_DATA")
    if explicit is not None:
        return _is_true(explicit)

    if _is_true(os.getenv("E2E_TEST_MODE")) or _is_true(os.getenv("TEST_MODE")):
        return True

    return settings.environment in ("development", "testing")


def _count(conn: Any, table: str) -> int:
    row = conn.execute(f"SELECT COUNT(*) AS cnt FROM {table}").fetchone()  # noqa: S608
    return int(row["cnt"] if row else 0)


def _seed_products(conn: Any) -> None:
    products = [
        ("ESP-001", "Espresso", "coffee", 150),
        ("CAP-001", "Cappuccino", "coffee", 240),
        ("LAT-001", "Latte", "coffee", 280),
        ("AMR-001", "Americano", "coffee", 200),
        ("TEA-001", "Green Tea", "tea", 140),
        ("DES-001", "Cheesecake", "dessert", 320),
        ("FOD-001", "Chicken Sandwich", "food", 360),
        ("DRK-001", "Berry Lemonade", "drink", 260),
    ]
    for code, name, kind, price in products:
        conn.execute(
            """
            INSERT OR IGNORE INTO products (code, name, kind, price, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
            """,
            (code, name, kind, price),
        )


def _seed_customers(conn: Any, rng: random.Random) -> list[int]:
    first_names = [
        "Ivan",
        "Maria",
        "Alexey",
        "Elena",
        "Dmitry",
        "Anna",
        "Sergey",
        "Olga",
        "Andrey",
        "Natalia",
    ]
    last_names = [
        "Petrov",
        "Smirnov",
        "Kuznetsov",
        "Popov",
        "Volkov",
        "Fedorov",
        "Morozov",
        "Sokolov",
        "Romanov",
        "Nikitin",
    ]
    ids: list[int] = []
    for i in range(36):
        full_name = f"{rng.choice(first_names)} {rng.choice(last_names)}"
        phone = (
            f"+7 (9{rng.randint(10,99)}) {rng.randint(100,999)}-{rng.randint(10,99)}"
        )
        qr_token = f"seed-{i:03d}-{rng.randint(1000,9999)}"
        marketing_allowed = 1 if rng.random() > 0.25 else 0
        birthday = (
            f"199{rng.randint(0,9)}-{rng.randint(1,12):02d}-{rng.randint(1,28):02d}"
        )
        created_days_ago = rng.randint(1, 180)
        conn.execute(
            """
            INSERT OR IGNORE INTO customers
            (phone, full_name, telegram_id, qr_token, balance_points, marketing_allowed, data_processing_allowed, birthday, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, datetime('now', ?), datetime('now'))
            """,
            (
                phone,
                full_name,
                7_000_000 + i,
                qr_token,
                rng.randint(0, 2500),
                marketing_allowed,
                birthday,
                f"-{created_days_ago} days",
            ),
        )
    rows = conn.execute("SELECT id FROM customers ORDER BY id").fetchall()
    ids = [int(r["id"]) for r in rows]
    return ids


def _seed_transactions(conn: Any, customer_ids: list[int], rng: random.Random) -> None:
    products = conn.execute(
        "SELECT code, name, price FROM products WHERE active = 1"
    ).fetchall()
    if not products or not customer_ids:
        return

    for _ in range(480):
        customer_id = rng.choice(customer_ids)
        item_count = rng.randint(1, 4)
        items = []
        total = 0
        for _ in range(item_count):
            p = rng.choice(products)
            qty = rng.randint(1, 3)
            price = int(p["price"])
            total += price * qty
            items.append(
                {
                    "code": p["code"],
                    "name": p["name"],
                    "price": price,
                    "qty": qty,
                }
            )
        bonus_used = 0 if rng.random() > 0.25 else rng.randint(20, 150)
        bonus_earned = max(0, int((total - bonus_used) * 0.05))
        days_ago = rng.randint(0, 20)
        hour = rng.choice([8, 9, 10, 12, 13, 14, 17, 18, 19, 20, 21])
        conn.execute(
            """
            INSERT INTO transactions (customer_id, total_amount, bonus_used, bonus_earned, items_json, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now', ?, ?))
            """,
            (
                customer_id,
                total,
                bonus_used,
                bonus_earned,
                json.dumps(items, ensure_ascii=False),
                f"-{days_ago} days",
                f"+{hour} hours",
            ),
        )


def _seed_marketing(conn: Any, customer_ids: list[int], rng: random.Random) -> None:
    triggers = [
        ("Welcome", "transaction.created", "{}", 0, "Thanks for your first order!", 1),
        (
            "Birthday Gift",
            "customer.birthday",
            "{}",
            0,
            "Happy birthday! Gift for you.",
            1,
        ),
        (
            "Come Back",
            "customer.inactive_30d",
            "{}",
            24,
            "We miss you. Here is a bonus.",
            1,
        ),
    ]
    for trigger in triggers:
        conn.execute(
            """
            INSERT OR IGNORE INTO marketing_triggers
            (name, event_source, criteria_json, delay_hours, message_text, active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            trigger,
        )

    campaigns = [
        ("Spring Promo", "push", "New seasonal menu is live!", "active"),
        ("Weekend Bonus", "push", "Weekend 10% bonus points", "scheduled"),
    ]
    for name, ctype, content, status in campaigns:
        conn.execute(
            """
            INSERT INTO marketing_campaigns
            (name, segment_id, type, content, status, scheduled_at, created_at)
            VALUES (?, NULL, ?, ?, ?, datetime('now', '+2 days'), datetime('now'))
            """,
            (name, ctype, content, status),
        )

    trigger_rows = conn.execute(
        "SELECT id FROM marketing_triggers ORDER BY id"
    ).fetchall()
    trigger_ids = [int(r["id"]) for r in trigger_rows]
    tx_rows = conn.execute(
        "SELECT id FROM transactions ORDER BY id DESC LIMIT 200"
    ).fetchall()
    tx_ids = [int(r["id"]) for r in tx_rows]
    if not trigger_ids or not customer_ids:
        return

    for _ in range(120):
        status = rng.choices(["processed", "pending", "failed"], weights=[70, 20, 10])[
            0
        ]
        days_ago = rng.randint(0, 7)
        conn.execute(
            """
            INSERT INTO marketing_trigger_events
            (trigger_id, customer_id, source_tx_id, status, scheduled_for, sent_at, created_at)
            VALUES (?, ?, ?, ?, datetime('now', ?), datetime('now', ?), datetime('now', ?))
            """,
            (
                rng.choice(trigger_ids),
                rng.choice(customer_ids),
                rng.choice(tx_ids) if tx_ids else None,
                status,
                f"-{days_ago} days",
                f"-{days_ago} days",
                f"-{days_ago} days",
            ),
        )


def _seed_integrations(conn: Any, rng: random.Random) -> None:
    integrations = [
        ("Telegram Bot", "telegram", "seed-telegram", '{"channel":"telegram"}'),
        ("VK Community", "vk", "seed-vk", '{"channel":"vk"}'),
        ("ERP Webhook", "erp", "seed-erp", '{"endpoint":"erp.local"}'),
    ]
    for row in integrations:
        conn.execute(
            """
            INSERT OR IGNORE INTO integrations
            (name, kind, enabled, secret, config_json, created_at, updated_at)
            VALUES (?, ?, 1, ?, ?, datetime('now'), datetime('now'))
            """,
            row,
        )

    ids = [
        int(r["id"])
        for r in conn.execute("SELECT id FROM integrations ORDER BY id").fetchall()
    ]
    if not ids:
        return
    event_types = [
        "customer.created",
        "transaction.completed",
        "marketing.sent",
        "loyalty.updated",
    ]
    for _ in range(180):
        status = rng.choices(["success", "failed", "pending"], weights=[78, 14, 8])[0]
        http_status = (
            200 if status == "success" else (500 if status == "failed" else None)
        )
        conn.execute(
            """
            INSERT INTO integration_deliveries
            (integration_id, event_type, status, http_status, response_body, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now', ?))
            """,
            (
                rng.choice(ids),
                rng.choice(event_types),
                status,
                http_status,
                '{"ok": true}' if status == "success" else '{"ok": false}',
                f"-{rng.randint(0, 7)} days",
            ),
        )


def _refresh_customer_analytics(conn: Any) -> None:
    rows = conn.execute("SELECT id, created_at FROM customers").fetchall()
    for row in rows:
        customer_id = int(row["id"])
        tx = conn.execute(
            """
            SELECT
                COALESCE(SUM(total_amount), 0) AS ltv,
                COALESCE(AVG(total_amount), 0) AS avg_check,
                COUNT(*) AS purchase_frequency,
                MAX(created_at) AS last_purchase_date,
                MIN(created_at) AS first_purchase_date
            FROM transactions
            WHERE customer_id = ?
            """,
            (customer_id,),
        ).fetchone()
        cohort_month = None
        if tx and tx["first_purchase_date"]:
            cohort_month = str(tx["first_purchase_date"])[:7]
        elif row["created_at"]:
            cohort_month = str(row["created_at"])[:7]

        conn.execute(
            """
            UPDATE customers
            SET ltv = ?, average_check = ?, purchase_frequency = ?, last_purchase_date = ?, cohort_month = ?
            WHERE id = ?
            """,
            (
                float(tx["ltv"] if tx else 0),
                float(tx["avg_check"] if tx else 0),
                int(tx["purchase_frequency"] if tx else 0),
                tx["last_purchase_date"] if tx else None,
                cohort_month,
                customer_id,
            ),
        )


def ensure_seed_data() -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    rng = random.Random(42)
    try:
        before = {
            "customers": _count(conn, "customers"),
            "products": _count(conn, "products"),
            "transactions": _count(conn, "transactions"),
            "marketing_campaigns": _count(conn, "marketing_campaigns"),
            "marketing_triggers": _count(conn, "marketing_triggers"),
            "marketing_trigger_events": _count(conn, "marketing_trigger_events"),
            "integrations": _count(conn, "integrations"),
            "integration_deliveries": _count(conn, "integration_deliveries"),
        }

        if before["products"] == 0:
            _seed_products(conn)
        if before["customers"] == 0:
            customer_ids = _seed_customers(conn, rng)
        else:
            rows = conn.execute("SELECT id FROM customers ORDER BY id").fetchall()
            customer_ids = [int(r["id"]) for r in rows]
        if before["transactions"] == 0:
            _seed_transactions(conn, customer_ids, rng)
        if (
            before["marketing_triggers"] == 0
            or before["marketing_campaigns"] == 0
            or before["marketing_trigger_events"] == 0
        ):
            _seed_marketing(conn, customer_ids, rng)
        if before["integrations"] == 0 or before["integration_deliveries"] == 0:
            _seed_integrations(conn, rng)

        _refresh_customer_analytics(conn)
        conn.commit()

        after = {
            "customers": _count(conn, "customers"),
            "products": _count(conn, "products"),
            "transactions": _count(conn, "transactions"),
            "marketing_campaigns": _count(conn, "marketing_campaigns"),
            "marketing_triggers": _count(conn, "marketing_triggers"),
            "marketing_trigger_events": _count(conn, "marketing_trigger_events"),
            "integrations": _count(conn, "integrations"),
            "integration_deliveries": _count(conn, "integration_deliveries"),
        }
        return {"before": before, "after": after}
    finally:
        conn.close()
