#!/usr/bin/env python3
"""Database initialization and seeding module.

Runs migrations and seeds data idempotently.
Called by init container or manually.
"""

import argparse
import json
import logging
import os
import sys
import hashlib
from pathlib import Path
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def run_migrations() -> None:
    """Run all database migrations."""
    from app.db import init_db

    init_db()
    logger.info("Migrations completed")


def discover_seed_files(seed_dir: str | None = None) -> list[Path]:
    """Discover ordered seed files in the seed directory.

    Only files matching the `00-*.json` convention are considered seed migrations.
    """
    if seed_dir is None:
        seed_dir = os.getenv("SEED_DIR_PATH", "/app/seed")

    path = Path(seed_dir)
    if not path.exists():
        logger.error("Seed directory not found: %s", seed_dir)
        raise SystemExit(1)

    seed_files = sorted(
        p
        for p in path.glob("*.json")
        if p.is_file()
        and len(p.name) >= 4
        and p.name[0:2].isdigit()
        and p.name[2] == "-"
    )
    if not seed_files:
        logger.warning("No ordered seed files found in %s", seed_dir)
    return seed_files


def load_seed_file(seed_file: Path) -> dict[str, Any]:
    """Load a single seed file."""
    with seed_file.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError(f"Seed file must contain a JSON object: {seed_file.name}")
    data["__seed_file"] = seed_file.name
    return data


def checksum_seed_file(seed_file: Path) -> str:
    return hashlib.sha256(seed_file.read_bytes()).hexdigest()


def get_applied_seed_files() -> dict[str, str]:
    from app.db import get_db

    db = get_db()
    conn = db.connect()
    try:
        rows = conn.execute(
            "SELECT filename, checksum FROM seed_migrations ORDER BY filename"
        ).fetchall()
        return {str(row[0]): str(row[1] or "") for row in rows}
    finally:
        conn.close()


def bootstrap_operational_demo_from_seed(seed_data: dict) -> dict[str, int]:
    """Create richer demo data for marketing, integrations, and operational views."""
    from app.db import get_db

    db = get_db()
    conn = db.connect()
    created = {
        "segments": 0,
        "campaigns": 0,
        "triggers": 0,
        "trigger_events": 0,
        "integrations": 0,
        "delivery_events": 0,
        "short_urls": 0,
        "customer_visits": 0,
    }

    try:
        customers = conn.execute(
            "SELECT id, qr_token, balance_points, created_at FROM customers"
        ).fetchall()
        customer_ids = [int(row["id"]) for row in customers]
        tx_rows = conn.execute(
            "SELECT id, customer_id, total_amount, created_at FROM transactions ORDER BY id DESC"
        ).fetchall()

        if customer_ids:
            # Segments are simple and stable, based on criteria already supported by analytics.
            for segment in seed_data.get("marketing_segments", []):
                name = str(segment.get("name") or "").strip()
                criteria = segment.get("criteria_json") or segment.get("criteria") or {}
                if not name:
                    continue
                exists = conn.execute(
                    "SELECT id FROM marketing_segments WHERE name = ?",
                    (name,),
                ).fetchone()
                if exists:
                    continue
                conn.execute(
                    "INSERT INTO marketing_segments (name, criteria_json, created_at) VALUES (?, ?, datetime('now'))",
                    (name, json.dumps(criteria, ensure_ascii=False)),
                )
                created["segments"] += 1

            segment_ids = {
                str(row["name"]): int(row["id"])
                for row in conn.execute(
                    "SELECT id, name FROM marketing_segments ORDER BY id"
                ).fetchall()
            }

            for campaign in seed_data.get("marketing_campaigns", []):
                name = str(campaign.get("name") or "").strip()
                if not name:
                    continue
                segment_id = segment_ids.get(str(campaign.get("segment_name") or ""))
                exists = conn.execute(
                    "SELECT id FROM marketing_campaigns WHERE name = ?",
                    (name,),
                ).fetchone()
                if exists:
                    continue
                conn.execute(
                    """
                    INSERT INTO marketing_campaigns
                    (name, segment_id, type, content, content_type, media_urls, caption, status, scheduled_at, sent_at, budget_limit, budget_spent, audience_count, stats_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    """,
                    (
                        name,
                        segment_id,
                        str(campaign.get("type") or "push"),
                        str(campaign.get("content") or ""),
                        str(campaign.get("content_type") or "text"),
                        (
                            json.dumps(
                                campaign.get("media_urls") or [], ensure_ascii=False
                            )
                            if campaign.get("media_urls") is not None
                            else None
                        ),
                        campaign.get("caption"),
                        str(campaign.get("status") or "draft"),
                        campaign.get("scheduled_at"),
                        campaign.get("sent_at"),
                        campaign.get("budget_limit"),
                        int(campaign.get("budget_spent", 0)),
                        int(campaign.get("audience_count", 0)),
                        json.dumps(
                            campaign.get("stats_json") or {}, ensure_ascii=False
                        ),
                    ),
                )
                created["campaigns"] += 1

            for trigger in seed_data.get("marketing_triggers", []):
                name = str(trigger.get("name") or "").strip()
                if not name:
                    continue
                exists = conn.execute(
                    "SELECT id FROM marketing_triggers WHERE name = ?",
                    (name,),
                ).fetchone()
                if exists:
                    continue
                conn.execute(
                    """
                    INSERT INTO marketing_triggers
                    (name, event_source, criteria_json, delay_hours, message_text, active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                    """,
                    (
                        name,
                        str(trigger.get("event_source") or "transaction.completed"),
                        json.dumps(
                            trigger.get("criteria_json") or {}, ensure_ascii=False
                        ),
                        int(trigger.get("delay_hours", 0)),
                        str(trigger.get("message_text") or ""),
                        1 if trigger.get("active", True) else 0,
                    ),
                )
                created["triggers"] += 1

            trigger_ids = {
                str(row["name"]): int(row["id"])
                for row in conn.execute(
                    "SELECT id, name FROM marketing_triggers ORDER BY id"
                ).fetchall()
            }
            tx_by_customer = {}
            for row in tx_rows:
                tx_by_customer.setdefault(int(row["customer_id"]), []).append(
                    int(row["id"])
                )

            for event in seed_data.get("marketing_trigger_events", []):
                trigger_id = trigger_ids.get(str(event.get("trigger_name") or ""))
                if not trigger_id:
                    continue
                customer_id = int(event.get("customer_id") or 0)
                if customer_id not in customer_ids:
                    continue
                exists = conn.execute(
                    "SELECT id FROM marketing_trigger_events WHERE trigger_id = ? AND customer_id = ? AND scheduled_for = ?",
                    (trigger_id, customer_id, str(event.get("scheduled_for") or "")),
                ).fetchone()
                if exists:
                    continue
                source_tx_id = event.get("source_tx_id")
                if source_tx_id == "latest":
                    source_tx_id = tx_by_customer.get(customer_id, [None])[0]
                conn.execute(
                    """
                    INSERT INTO marketing_trigger_events
                    (trigger_id, customer_id, source_tx_id, status, scheduled_for, sent_at, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                    """,
                    (
                        trigger_id,
                        customer_id,
                        source_tx_id,
                        str(event.get("status") or "pending"),
                        str(event.get("scheduled_for") or "datetime('now')"),
                        event.get("sent_at"),
                    ),
                )
                created["trigger_events"] += 1

            for integration in seed_data.get("integrations", []):
                name = str(integration.get("name") or "").strip()
                if not name:
                    continue
                exists = conn.execute(
                    "SELECT id FROM integrations WHERE name = ?", (name,)
                ).fetchone()
                if exists:
                    continue
                conn.execute(
                    """
                    INSERT INTO integrations (name, kind, enabled, secret, config_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    """,
                    (
                        name,
                        str(integration.get("kind") or "telegram"),
                        1 if integration.get("enabled", True) else 0,
                        str(
                            integration.get("secret")
                            or f"seed-{name.lower().replace(' ', '-')}"
                        ),
                        json.dumps(
                            integration.get("config_json")
                            or integration.get("config")
                            or {},
                            ensure_ascii=False,
                        ),
                    ),
                )
                created["integrations"] += 1

            integration_ids = {
                str(row["name"]): int(row["id"])
                for row in conn.execute(
                    "SELECT id, name FROM integrations ORDER BY id"
                ).fetchall()
            }
            for delivery in seed_data.get("integration_deliveries", []):
                integration_id = integration_ids.get(
                    str(delivery.get("integration_name") or "")
                )
                if not integration_id:
                    continue
                exists = conn.execute(
                    "SELECT id FROM integration_deliveries WHERE integration_id = ? AND event_type = ? AND created_at LIKE ?",
                    (
                        integration_id,
                        str(delivery.get("event_type") or "customer.created"),
                        f"{str(delivery.get('created_at_like') or '%')}%",
                    ),
                ).fetchone()
                if exists:
                    continue
                conn.execute(
                    """
                    INSERT INTO integration_deliveries
                    (integration_id, event_type, status, http_status, response_body, created_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now', ?))
                    """,
                    (
                        integration_id,
                        str(delivery.get("event_type") or "customer.created"),
                        str(delivery.get("status") or "success"),
                        delivery.get("http_status"),
                        json.dumps(
                            delivery.get("response_body") or {"ok": True},
                            ensure_ascii=False,
                        ),
                        str(delivery.get("created_at_offset") or "-1 day"),
                    ),
                )
                created["delivery_events"] += 1

            for url in seed_data.get("short_urls", []):
                short_code = str(url.get("short_code") or "").strip()
                original_url = str(url.get("original_url") or "").strip()
                if not short_code or not original_url:
                    continue
                exists = conn.execute(
                    "SELECT id FROM short_urls WHERE short_code = ?",
                    (short_code,),
                ).fetchone()
                if exists:
                    continue
                campaign_id = None
                if url.get("campaign_name"):
                    campaign_id = conn.execute(
                        "SELECT id FROM marketing_campaigns WHERE name = ?",
                        (url.get("campaign_name"),),
                    ).fetchone()
                    campaign_id = int(campaign_id[0]) if campaign_id else None
                customer_id = None
                if url.get("customer_qr_token"):
                    customer_id_row = conn.execute(
                        "SELECT id FROM customers WHERE qr_token = ?",
                        (url.get("customer_qr_token"),),
                    ).fetchone()
                    customer_id = int(customer_id_row[0]) if customer_id_row else None
                conn.execute(
                    "INSERT INTO short_urls (short_code, original_url, campaign_id, customer_id, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
                    (short_code, original_url, campaign_id, customer_id),
                )
                created["short_urls"] += 1

            for visit in seed_data.get("customer_visits", []):
                customer_qr = str(visit.get("customer_qr_token") or "").strip()
                location_name = str(visit.get("location_name") or "").strip()
                if not customer_qr or not location_name:
                    continue
                customer_row = conn.execute(
                    "SELECT id FROM customers WHERE qr_token = ?", (customer_qr,)
                ).fetchone()
                location_row = conn.execute(
                    "SELECT id FROM locations WHERE name = ?", (location_name,)
                ).fetchone()
                if not customer_row or not location_row:
                    continue
                exists = conn.execute(
                    "SELECT id FROM customer_visits WHERE customer_id = ? AND location_id = ?",
                    (int(customer_row[0]), int(location_row[0])),
                ).fetchone()
                if exists:
                    continue
                conn.execute(
                    """
                    INSERT INTO customer_visits
                    (customer_id, location_id, visit_date, visit_count, last_transaction_id, total_spent, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    """,
                    (
                        int(customer_row[0]),
                        int(location_row[0]),
                        str(visit.get("visit_date") or "2025-03-25"),
                        int(visit.get("visit_count", 1)),
                        visit.get("last_transaction_id") or None,
                        float(visit.get("total_spent", 0)),
                    ),
                )
                created["customer_visits"] += 1

        conn.commit()
        return created
    finally:
        conn.close()


def bootstrap_demo_data_from_seed(seed_data: dict) -> dict[str, int]:
    """Create synchronized demo customers, consents, and transactions from seed data.

    The seed format is intentionally explicit so the same dataset can be replayed
    deterministically across development environments.
    """
    from app.db import get_db

    db = get_db()
    conn = db.connect()
    created = {"customers": 0, "consents": 0, "transactions": 0}

    try:
        customers = seed_data.get("demo_customers", [])
        if isinstance(customers, list):
            for customer in customers:
                phone = str(customer.get("phone") or "").strip()
                full_name = str(customer.get("full_name") or "").strip()
                qr_token = str(customer.get("qr_token") or "").strip()
                if not phone or not full_name or not qr_token:
                    continue

                exists = conn.execute(
                    "SELECT id FROM customers WHERE phone = ? OR qr_token = ?",
                    (phone, qr_token),
                ).fetchone()
                if exists:
                    continue

                conn.execute(
                    """
                    INSERT INTO customers
                    (phone, full_name, telegram_id, qr_token, balance_points, birthday,
                     marketing_allowed, data_processing_allowed, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
                    """,
                    (
                        phone,
                        full_name,
                        customer.get("telegram_id"),
                        qr_token,
                        int(customer.get("balance_points", 0)),
                        customer.get("birthday"),
                        1 if customer.get("marketing_allowed", True) else 0,
                    ),
                )
                customer_id = int(
                    conn.execute("SELECT last_insert_rowid()").fetchone()[0]
                )
                created["customers"] += 1

                consents = customer.get("consents", [])
                if isinstance(consents, list):
                    for consent in consents:
                        source = (
                            str(consent.get("source") or "admin_panel").strip()
                            or "admin_panel"
                        )
                        consent_type = (
                            str(
                                consent.get("consent_type") or "data_processing"
                            ).strip()
                            or "data_processing"
                        )
                        consent_text = str(consent.get("consent_text") or "").strip()
                        if not consent_text:
                            continue
                        conn.execute(
                            """
                            INSERT INTO consents
                            (customer_id, source, consent_version, consent_text, consent_type, accepted_at)
                            VALUES (?, ?, ?, ?, ?, datetime('now'))
                            """,
                            (
                                customer_id,
                                source,
                                str(consent.get("consent_version") or "1.0"),
                                consent_text,
                                consent_type,
                            ),
                        )
                        created["consents"] += 1

        transactions = seed_data.get("demo_transactions", [])
        if isinstance(transactions, list):
            customer_rows = conn.execute(
                "SELECT id, qr_token FROM customers"
            ).fetchall()
            customer_by_qr = {
                str(row["qr_token"]): int(row["id"])
                for row in customer_rows
                if row["qr_token"]
            }
            product_rows = conn.execute(
                "SELECT code, name, price FROM products"
            ).fetchall()
            product_by_code = {
                str(row["code"]): row for row in product_rows if row["code"]
            }

            for tx in transactions:
                customer_qr = str(tx.get("customer_qr_token") or "").strip()
                customer_id = customer_by_qr.get(customer_qr)
                if not customer_id:
                    continue

                items = tx.get("items", [])
                if not isinstance(items, list) or not items:
                    continue

                normalized_items: list[dict[str, Any]] = []
                total_amount = 0
                for item in items:
                    code = str(item.get("code") or "").strip()
                    qty = int(item.get("qty", 1))
                    product_row = product_by_code.get(code)
                    if not product_row or qty < 1:
                        continue
                    price = int(item.get("price") or product_row["price"])
                    total_amount += price * qty
                    normalized_items.append(
                        {
                            "code": code,
                            "name": str(item.get("name") or product_row["name"]),
                            "price": price,
                            "qty": qty,
                        }
                    )

                if not normalized_items:
                    continue

                bonus_used = int(tx.get("bonus_used", 0))
                bonus_earned = int(
                    tx.get("bonus_earned", max(0, int(total_amount * 0.05)))
                )
                created_at_days = int(tx.get("days_ago", 0))
                created_at_hours = int(tx.get("hours_ago", 0))
                conn.execute(
                    """
                    INSERT INTO transactions
                    (customer_id, total_amount, bonus_used, bonus_earned, items_json, created_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now', ?, ?))
                    """,
                    (
                        customer_id,
                        total_amount,
                        bonus_used,
                        bonus_earned,
                        json.dumps(normalized_items, ensure_ascii=False),
                        f"-{created_at_days} days",
                        f"-{created_at_hours} hours",
                    ),
                )
                created["transactions"] += 1

        conn.commit()
        return created
    finally:
        conn.close()


def mark_seed_file_applied(seed_file: Path, checksum: str) -> None:
    from app.db import get_db

    db = get_db()
    conn = db.connect()
    try:
        conn.execute(
            "INSERT OR REPLACE INTO seed_migrations (filename, checksum, applied_at) VALUES (?, ?, datetime('now'))",
            (seed_file.name, checksum),
        )
        conn.commit()
    finally:
        conn.close()


def bootstrap_admins_from_seed(seed_data: dict) -> list[str]:
    """Create admin users from seed data.

    Idempotent: skips if admins already exist.
    Returns list of created usernames.
    """
    from app.db import get_db
    import hashlib

    db = get_db()
    conn = db.connect()
    created = []

    try:
        # Check existing admins
        existing = {
            row[0]
            for row in conn.execute("SELECT username FROM admin_users").fetchall()
        }

        for admin in seed_data.get("admins", []):
            username = admin.get("username")
            if not username or username in existing:
                logger.info("Admin '%s' already exists or invalid, skipping", username)
                continue

            # Hash password
            salt = hashlib.sha256(os.urandom(32)).hexdigest()[:16]
            password = admin.get("password", "admin123")
            password_hash = hashlib.pbkdf2_hmac(
                "sha256", password.encode(), salt.encode(), 200000
            ).hex()

            conn.execute(
                """
                INSERT INTO admin_users (username, password_hash, password_salt, password_iter, role, disabled, created_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                """,
                (
                    username,
                    password_hash,
                    salt,
                    200000,
                    admin.get("role", "owner"),
                    1 if admin.get("disabled", False) else 0,
                ),
            )
            created.append(username)
            logger.info(
                "Created admin user: %s (role=%s)", username, admin.get("role", "owner")
            )

        conn.commit()
        return created
    finally:
        conn.close()


def bootstrap_reference_data_from_seed(
    seed_data: list[dict[str, Any]],
) -> dict[str, int]:
    """Create country, city, location and system setting records from seed files."""
    from app.db import get_db

    db = get_db()
    conn = db.connect()
    created = {"countries": 0, "cities": 0, "locations": 0, "system_settings": 0}

    try:
        for payload in seed_data:
            if "countries" in payload:
                for country in payload.get("countries", []):
                    code = str(country.get("code", "")).strip().upper()
                    name = str(country.get("name", "")).strip()
                    if not code or not name:
                        continue
                    exists = conn.execute(
                        "SELECT id FROM countries WHERE code = ?", (code,)
                    ).fetchone()
                    if exists:
                        continue
                    conn.execute(
                        """
                        INSERT INTO countries (code, name, name_local, phone_prefix, currency_code, timezone_default, active, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                        """,
                        (
                            code,
                            name,
                            country.get("name_local"),
                            country.get("phone_prefix"),
                            country.get("currency_code", "RUB"),
                            country.get("timezone_default", "Europe/Moscow"),
                            1 if country.get("active", True) else 0,
                        ),
                    )
                    created["countries"] += 1

            if "cities" in payload:
                for city in payload.get("cities", []):
                    country_code = str(city.get("country_code", "")).strip().upper()
                    city_name = str(city.get("name", "")).strip()
                    if not country_code or not city_name:
                        continue
                    country_row = conn.execute(
                        "SELECT id FROM countries WHERE code = ?", (country_code,)
                    ).fetchone()
                    if not country_row:
                        logger.warning(
                            "Skipping city %s: unknown country code %s",
                            city_name,
                            country_code,
                        )
                        continue
                    exists = conn.execute(
                        "SELECT id FROM cities WHERE country_id = ? AND name = ?",
                        (int(country_row["id"]), city_name),
                    ).fetchone()
                    if exists:
                        continue
                    conn.execute(
                        """
                        INSERT INTO cities (country_id, name, region, timezone, active, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                        """,
                        (
                            int(country_row["id"]),
                            city_name,
                            city.get("region"),
                            city.get("timezone", "Europe/Moscow"),
                            1 if city.get("active", True) else 0,
                        ),
                    )
                    created["cities"] += 1

            if "locations" in payload:
                for location in payload.get("locations", []):
                    city_name = str(location.get("city", "")).strip()
                    location_name = str(location.get("name", "")).strip()
                    if not city_name or not location_name:
                        continue
                    city_row = conn.execute(
                        "SELECT id FROM cities WHERE name = ?", (city_name,)
                    ).fetchone()
                    if not city_row:
                        logger.warning(
                            "Skipping location %s: unknown city %s",
                            location_name,
                            city_name,
                        )
                        continue
                    exists = conn.execute(
                        "SELECT id FROM locations WHERE city_id = ? AND name = ?",
                        (int(city_row["id"]), location_name),
                    ).fetchone()
                    if exists:
                        continue
                    conn.execute(
                        """
                        INSERT INTO locations (city_id, name, address, phone, telegram_chat_id, timezone, status, priority_score, open_hours, menu_preview_url, description, active, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                        """,
                        (
                            int(city_row["id"]),
                            location_name,
                            location.get("address"),
                            location.get("phone"),
                            location.get("telegram_chat_id"),
                            location.get("timezone", "Europe/Moscow"),
                            location.get("status", "active"),
                            int(location.get("priority_score", 0)),
                            location.get("open_hours"),
                            location.get("menu_preview_url"),
                            location.get("description"),
                            1 if location.get("active", True) else 0,
                        ),
                    )
                    created["locations"] += 1

            if "system_settings" in payload:
                for key, value in payload.get("system_settings", {}).items():
                    if key == "default_country_id" and str(value).lower() == "auto":
                        continue
                    conn.execute(
                        """
                        INSERT INTO system_settings (key, value, created_at, updated_at)
                        VALUES (?, ?, datetime('now'), datetime('now'))
                        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
                        """,
                        (str(key), str(value)),
                    )
                    created["system_settings"] += 1

        conn.commit()
        return created
    finally:
        conn.close()


def bootstrap_products_from_seed(seed_data: dict) -> list[str]:
    """Create products from seed data.

    Idempotent: skips products with existing SKU.
    Returns list of created product SKUs.
    """
    from app.db import get_db

    db = get_db()
    conn = db.connect()
    created = []

    try:
        # Check existing product codes (legacy seed payloads may call this field sku)
        existing = {
            row[0] for row in conn.execute("SELECT code FROM products").fetchall()
        }

        for product in seed_data.get("products", []):
            code = str(product.get("code") or product.get("sku") or "").strip()
            if not code or code in existing:
                logger.info(
                    "Product '%s' already exists or missing code, skipping", code
                )
                continue

            conn.execute(
                """
                INSERT INTO products (code, name, kind, price, active, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
                """,
                (
                    code,
                    product.get("name", code),
                    product.get("kind") or product.get("category", "general"),
                    product.get("price", 0),
                ),
            )
            created.append(code)
            logger.info("Created product: %s (%s)", code, product.get("name"))

        conn.commit()
        return created
    finally:
        conn.close()


def main() -> int:
    """Main entry point for init container."""
    parser = argparse.ArgumentParser(description="Database initialization and seeding")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-seeding (clears existing data, DANGER)",
    )
    parser.parse_args()

    logger.info("Starting database initialization...")

    # Run migrations
    run_migrations()

    seed_files = discover_seed_files()
    applied_files = get_applied_seed_files()
    applied: list[str] = []
    skipped: list[str] = []

    for seed_file in seed_files:
        checksum = checksum_seed_file(seed_file)
        previously_applied_checksum = applied_files.get(seed_file.name)
        if previously_applied_checksum == checksum:
            skipped.append(seed_file.name)
            logger.info("Seed already applied, skipping: %s", seed_file.name)
            continue
        if previously_applied_checksum and previously_applied_checksum != checksum:
            logger.info(
                "Seed changed since last apply, reprocessing: %s (old_checksum=%s, new_checksum=%s)",
                seed_file.name,
                previously_applied_checksum,
                checksum,
            )

        payload = load_seed_file(seed_file)
        created_admins = bootstrap_admins_from_seed(payload)
        created_products = bootstrap_products_from_seed(payload)
        reference_result = bootstrap_reference_data_from_seed([payload])
        demo_result = bootstrap_demo_data_from_seed(payload)
        operational_result = bootstrap_operational_demo_from_seed(payload)

        logger.info(
            "Applied seed file %s (admins=%d, products=%d, reference=%s, demo=%s, operational=%s)",
            seed_file.name,
            len(created_admins),
            len(created_products),
            reference_result,
            demo_result,
            operational_result,
        )
        mark_seed_file_applied(seed_file, checksum)
        applied.append(seed_file.name)

    logger.info(
        "Database initialization complete (applied=%d, skipped=%d)",
        len(applied),
        len(skipped),
    )

    print(
        json.dumps(
            {
                "applied": applied,
                "skipped": skipped,
            },
            indent=2,
            ensure_ascii=False,
        )
    )

    return 0


if __name__ == "__main__":
    sys.exit(main())
