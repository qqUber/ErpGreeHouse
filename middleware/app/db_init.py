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
        p for p in path.glob("*.json") if p.is_file() and p.name[:3].isdigit() and p.name[2] == "-"
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


def get_applied_seed_files() -> set[str]:
    from app.db import get_db

    db = get_db()
    conn = db.connect()
    try:
        rows = conn.execute("SELECT filename FROM seed_migrations ORDER BY filename").fetchall()
        return {str(row[0]) for row in rows}
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
        existing = {row[0] for row in conn.execute("SELECT username FROM admin_users").fetchall()}
        
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
                    1 if admin.get("disabled", False) else 0
                ),
            )
            created.append(username)
            logger.info("Created admin user: %s (role=%s)", username, admin.get("role", "owner"))
        
        conn.commit()
        return created
    finally:
        conn.close()


def bootstrap_reference_data_from_seed(seed_data: list[dict[str, Any]]) -> dict[str, int]:
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
        # Check existing product SKUs
        existing = {row[0] for row in conn.execute("SELECT sku FROM products").fetchall()}
        
        for product in seed_data.get("products", []):
            sku = product.get("sku")
            if not sku or sku in existing:
                logger.info("Product '%s' already exists or missing SKU, skipping", sku)
                continue
            
            conn.execute(
                """
                INSERT INTO products (sku, name, price, category, stock, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
                """,
                (
                    sku,
                    product.get("name", sku),
                    product.get("price", 0.0),
                    product.get("category", "general"),
                    product.get("stock", 0),
                ),
            )
            created.append(sku)
            logger.info("Created product: %s (%s)", sku, product.get("name"))
        
        conn.commit()
        return created
    finally:
        conn.close()


def main() -> int:
    """Main entry point for init container."""
    parser = argparse.ArgumentParser(
        description="Database initialization and seeding"
    )
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
        if seed_file.name in applied_files:
            skipped.append(seed_file.name)
            logger.info("Seed already applied, skipping: %s", seed_file.name)
            continue

        payload = load_seed_file(seed_file)
        created_admins = bootstrap_admins_from_seed(payload)
        created_products = bootstrap_products_from_seed(payload)
        reference_result = bootstrap_reference_data_from_seed([payload])

        logger.info(
            "Applied seed file %s (admins=%d, products=%d, reference=%s)",
            seed_file.name,
            len(created_admins),
            len(created_products),
            reference_result,
        )
        mark_seed_file_applied(seed_file, checksum)
        applied.append(seed_file.name)

    logger.info("Database initialization complete (applied=%d, skipped=%d)", len(applied), len(skipped))

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
