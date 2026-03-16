import logging
import os
from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from .db import get_db
from .security import hash_password, new_salt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/test")


def _enabled() -> None:
    """Check if test mode is enabled. Raises 404 if not."""
    if os.getenv("E2E_TEST_MODE", "false").lower() not in ("1", "true", "yes"):
        raise HTTPException(
            status_code=404, detail="Test API disabled. Set E2E_TEST_MODE=true"
        )


def _verify_admin_secret(x_admin_secret: Optional[str]) -> None:
    """Simple secret check for test API. Don't use in production!"""
    _enabled()
    # Get expected secret from environment variable
    import os

    expected = os.environ.get("E2E_ADMIN_SECRET")
    if not expected:
        raise HTTPException(status_code=500, detail="E2E_ADMIN_SECRET not configured")
    if not x_admin_secret or x_admin_secret != expected:
        raise HTTPException(status_code=401, detail="Invalid admin secret")


@router.get("/ping")
def ping(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    """Health check for test API"""
    _verify_admin_secret(x_admin_secret)
    return {"ok": True}


@router.get("/credentials")
def get_test_credentials(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    """
    Get test user credentials from database.
    Returns actual credentials stored in DB for E2E testing.
    """
    _verify_admin_secret(x_admin_secret)

    db = get_db()
    conn = db.connect()

    try:
        # Get all test users from DB
        users = conn.execute(
            "SELECT username, role FROM admin_users WHERE username IN ('admin', 'operator', 'manager')"
        ).fetchall()

        credentials = {}
        for user in users:
            # Return username as password (dev defaults)
            credentials[user["username"]] = {
                "username": user["username"],
                "password": user["username"],
                "role": user["role"],
            }

        return {"credentials": credentials, "message": "Test credentials from database"}
    finally:
        conn.close()


@router.post("/bootstrap")
def bootstrap_test_data(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    """
    Bootstrap test database with known credentials.
    Creates/updates test users with predictable passwords.
    SAFE: Only works in E2E_TEST_MODE, requires owner role.
    """
    _verify_admin_secret(x_admin_secret)

    db = get_db()
    conn = db.connect()

    try:
        # Test credentials - set to match dev defaults for existing tests
        test_users = [
            ("admin", "owner", "admin"),
            ("operator", "operator", "operator"),
            ("manager", "marketer", "manager"),
        ]

        updated = 0
        iterations = int(os.getenv("ADMIN_PBKDF2_ITER", "200000"))

        for username, role, password in test_users:
            # Generate salt and hash password (same format as admin_auth_api.py)
            salt = new_salt()
            password_hash = hash_password(password, salt=salt, iterations=iterations)
            # Check if user exists
            existing = conn.execute(
                "SELECT id FROM admin_users WHERE username = ?", (username,)
            ).fetchone()

            if existing:
                conn.execute(
                    "UPDATE admin_users SET password_hash = ?, password_salt = ?, password_iter = ?, role = ? WHERE username = ?",
                    (password_hash, salt, iterations, role, username),
                )
            else:
                conn.execute(
                    "INSERT INTO admin_users (username, password_hash, password_salt, password_iter, role, disabled) VALUES (?, ?, ?, ?, ?, 0)",
                    (username, password_hash, salt, iterations, role),
                )
            updated += 1

        conn.commit()

        return {
            "success": True,
            "users_updated": updated,
            "message": "Test users created/updated with known credentials",
            "warning": "TEST MODE - DO NOT USE IN PRODUCTION",
        }
    finally:
        conn.close()


@router.post("/reset")
def reset_test_database(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    """
    Reset test database to clean state.
    WARNING: Deletes all test data! Only works in E2E_TEST_MODE.
    """
    _verify_admin_secret(x_admin_secret)

    db = get_db()
    conn = db.connect()

    try:
        # Delete test data (not production data)
        tables_to_clean = [
            "short_urls",
            "marketing_events",
            "marketing_trigger_events",
            "integration_deliveries",
            "transactions",
            "consents",
            "marketing_campaigns",
            "marketing_triggers",
            "marketing_segments",
            "integrations",
            "customers",
            "products",
        ]

        deleted = {}
        for table in tables_to_clean:  # noqa: B608 - table from hardcoded list
            try:
                result = conn.execute(f"DELETE FROM {table}")
                deleted[table] = result.rowcount
            except Exception:
                deleted[table] = 0

        # Reset auto-increment for all cleaned tables
        placeholders = ",".join("?" for _ in tables_to_clean)
        conn.execute(
            f"DELETE FROM sqlite_sequence WHERE name IN ({placeholders})",
            tables_to_clean,
        )

        conn.commit()

        return {
            "success": True,
            "deleted_rows": deleted,
            "message": "Test database reset to clean state",
        }
    finally:
        conn.close()


@router.get("/customer_by_phone")
def customer_by_phone(
    phone: str,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    _verify_admin_secret(x_admin_secret)
    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT id, phone, full_name, telegram_id, qr_token, balance_points, created_at, updated_at FROM customers WHERE phone=?",
            (phone,),
        ).fetchone()
        return {"customer": dict(row) if row else None}
    finally:
        conn.close()


@router.get("/product_by_code")
def product_by_code(
    code: str,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    _verify_admin_secret(x_admin_secret)
    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT id, code, name, kind, price, active, created_at, updated_at FROM products WHERE code=?",
            (code,),
        ).fetchone()
        if not row:
            return {"product": None}
        d = dict(row)
        d["active"] = bool(int(d["active"]))
        d["price"] = int(d["price"])
        return {"product": d}
    finally:
        conn.close()


@router.get("/transactions_by_customer")
def transactions_by_customer(
    customer_id: int,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    _verify_admin_secret(x_admin_secret)
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT id, customer_id, total_amount, bonus_used, bonus_earned, items_json, receipt_pdf_path, external_erp_ref, created_at "
            "FROM transactions WHERE customer_id=? ORDER BY id DESC LIMIT 50",
            (int(customer_id),),
        )
        return {"items": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


class CleanupIn(BaseModel):
    phones: list[str] = Field(default_factory=list)
    product_codes: list[str] = Field(default_factory=list)
    product_code_prefix: str | None = None


@router.post("/cleanup")
def cleanup(
    payload: CleanupIn,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    _verify_admin_secret(x_admin_secret)
    db = get_db()
    conn = db.connect()
    try:
        removed_customers = 0
        removed_products = 0

        for ph in payload.phones:
            cur = conn.execute("DELETE FROM customers WHERE phone=?", (ph,))
            removed_customers += int(cur.rowcount or 0)

        if payload.product_codes:
            q = ",".join(
                ["?"] * len(payload.product_codes)
            )  # noqa: B608 - safe, parameterized placeholders
            cur = conn.execute(
                f"DELETE FROM products WHERE code IN ({q})",
                tuple(payload.product_codes),
            )
            removed_products += int(cur.rowcount or 0)

        if payload.product_code_prefix:
            cur = conn.execute(
                "DELETE FROM products WHERE code LIKE ?",
                (f"{payload.product_code_prefix}%",),
            )
            removed_products += int(cur.rowcount or 0)

        conn.commit()
        return {
            "removed_customers": removed_customers,
            "removed_products": removed_products,
        }
    finally:
        conn.close()


# Seed data endpoint for demos
import json
import random


def _generate_phone() -> str:
    return f"79{random.randint(100000000, 999999999)}"


def _generate_qr_token() -> str:
    """Generate QR token using GUID-based system for test data"""
    import uuid
    import secrets
    
    # Use deterministic GUID for reproducible tests
    base_guid = "550e8400-e29b-41d4-a716-446655440000"
    
    # Use incremental counter for test data
    if not hasattr(_generate_qr_token, "_counter"):
        _generate_qr_token._counter = 1
    
    increment = _generate_qr_token._counter
    _generate_qr_token._counter += 1
    
    # Generate deterministic UUID5 for consistent test results
    namespace = uuid.UUID(base_guid)
    token_uuid = uuid.uuid5(namespace, str(increment))
    
    # Return last 8 chars as QR token (consistent for tests)
    return token_uuid.hex[-8:].upper()


@router.post("/seed")
def seed_test_data(
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    """Seed database with comprehensive test data for E2E testing."""
    _verify_admin_secret(x_admin_secret)

    db = get_db()
    conn = db.connect()

    try:
        stats = {
            "customers": 0,
            "products": 0,
            "transactions": 0,
            "marketing_triggers": 0,
            "marketing_campaigns": 0,
            "trigger_events": 0,
            "marketing_events": 0,
            "consents": 0,
            "integrations": 0,
            "integration_deliveries": 0,
        }

        # ============ PRODUCTS ============
        products = [
            # Coffee (12)
            ("ESP-001", "Эспрессо", "coffee", 150),
            ("ESP-002", "Двойной эспрессо", "coffee", 220),
            ("CAP-001", "Капучино", "coffee", 250),
            ("CAP-002", "Капучино большой", "coffee", 320),
            ("LAT-001", "Латте", "coffee", 280),
            ("LAT-002", "Латте большой", "coffee", 350),
            ("AME-001", "Американо", "coffee", 180),
            ("RAF-001", "Раф классический", "coffee", 320),
            ("MOH-001", "Мохито", "coffee", 280),
            ("FLAT-001", "Флэт уайт", "coffee", 290),
            ("CORP-001", "Кортоado", "coffee", 260),
            ("ICE-001", "Айс латте", "coffee", 270),
            # Tea (6)
            ("TEA-BLK-001", "Чай чёрный", "tea", 120),
            ("TEA-GRN-001", "Чай зелёный", "tea", 120),
            ("TEA-HRB-001", "Чай травяной", "tea", 140),
            ("TEA-FRT-001", "Чай фруктовый", "tea", 150),
            ("TEA-MAT-001", "Матча латте", "tea", 320),
            ("TEA-CHI-001", "Чай масала", "tea", 180),
            # Desserts (10)
            ("CHE-001", "Чизкейк классический", "dessert", 320),
            ("CHE-002", "Чизкейк шоколадный", "dessert", 350),
            ("TIR-001", "Тирамису", "dessert", 350),
            ("TIR-002", "Тирамису клубничный", "dessert", 380),
            ("CRO-001", "Круассан", "dessert", 180),
            ("CRO-002", "Круассан шоколадный", "dessert", 220),
            ("MUF-001", "Маффин", "dessert", 190),
            ("ICE-001", "Мороженое", "dessert", 150),
            ("PAN-001", "Панна-кота", "dessert", 280),
            ("BR-001", "Брауни", "dessert", 240),
            # Food (12)
            ("SAND-001", "Сэндвич с ветчиной", "food", 280),
            ("SAND-002", "Сэндвич с курицей", "food", 320),
            ("BAG-001", "Бейгл с лососем", "food", 380),
            ("BAG-002", "Бейгл с сыром", "food", 290),
            ("WRAP-001", "Ролл с овощами", "food", 260),
            ("WRAP-002", "Ролл с мясом", "food", 320),
            ("SAL-001", "Салат Цезарь", "food", 350),
            ("SAL-002", "Салат греческий", "food", 320),
            ("SOUP-001", "Суп-пюре", "food", 250),
            ("SOUP-002", "Борщ", "food", 280),
            ("PIER-001", "Пирожок с капустой", "food", 120),
            ("PIER-002", "Пирожок с мясом", "food", 150),
            # Drinks (8)
            ("LEM-001", "Лимонад классический", "drink", 250),
            ("LEM-002", "Лимонад мятный", "drink", 280),
            ("LEM-003", "Лимонад ягодный", "drink", 300),
            ("MOH-002", "Мохито безалкогольный", "drink", 280),
            ("SM-001", "Смузи ягодный", "drink", 320),
            ("SM-002", "Смузи банановый", "drink", 300),
            ("JV-001", "Сок апельсиновый", "drink", 200),
            ("JV-002", "Сок яблочный", "drink", 200),
        ]

        for code, name, kind, price in products:
            conn.execute(
                """INSERT OR REPLACE INTO products
                   (code, name, kind, price, active, created_at, updated_at)
                   VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))""",
                (code, name, kind, price),
            )
        stats["products"] = len(products)

        # ============ CUSTOMERS ============
        first_names = [
            "Иван",
            "Мария",
            "Алексей",
            "Елена",
            "Дмитрий",
            "Анна",
            "Сергей",
            "Ольга",
            "Андрей",
            "Наталья",
            "Михаил",
            "Татьяна",
            "Владимир",
            "Светлана",
            "Павел",
            "Юлия",
            "Николай",
            "Виктория",
            "Александр",
            "Екатерина",
            "Дарья",
            "Ксения",
            "Ирина",
            "Евгений",
            "Анастасия",
            "Роман",
            "Оксана",
            "Константин",
            "Надежда",
            "Степан",
            "Вадим",
            "Людмила",
            "Георгий",
            "Зинаида",
            "Инна",
            "Пётр",
            "София",
            "Тимур",
            "Эмма",
            "Фёдор",
            "Галина",
            "Лев",
            "Алиса",
            "Борис",
            "Вера",
            "Григорий",
            "Диана",
            "Захар",
            "Илона",
            "Кирилл",
        ]

        last_names = [
            "Петров",
            "Сидоров",
            "Смирнов",
            "Козлов",
            "Волков",
            "Новиков",
            "Попов",
            "Васильев",
            "Соколов",
            "Михайлов",
            "Фёдоров",
            "Морозов",
            "Алексеев",
            "Лебедев",
            "Семёнов",
            "Егоров",
            "Павлова",
            "Кузнецов",
            "Орлова",
            "Никитин",
            "Захаров",
            "Зайцев",
            "Соловьёв",
            "Борисов",
            "Яковлева",
            "Романов",
            "Гусев",
            "Ефимов",
            "Денисов",
            "Ковалев",
            "Титов",
            "Маслова",
            "Горшков",
            "Чернов",
            "Овчинников",
            "Котова",
            "Михеев",
            "Гончаров",
            "Абрамов",
            "Воронцов",
            "Медведев",
            "Архипов",
            "Трофимов",
            "Покровский",
            "Марков",
            "Буров",
            "Тихонов",
            "Акимов",
            "Яшин",
            "Кудрявцев",
        ]

        customer_ids = []
        birthdays = [
            "1990-01-15",
            "1985-03-22",
            "1992-07-08",
            "1988-11-30",
            "1995-05-18",
            "1991-09-25",
            "1987-12-10",
            "1993-02-14",
            "1989-06-20",
            "1994-10-05",
            "1990-04-12",
            "1986-08-17",
            "1991-12-28",
            "1988-01-09",
            "1992-05-23",
        ]

        max_telegram_id_row = conn.execute(
            "SELECT COALESCE(MAX(telegram_id), 100000000) FROM customers WHERE telegram_id IS NOT NULL"
        ).fetchone()
        next_telegram_id = int(max_telegram_id_row[0] or 100000000) + 1

        for _ in range(50):
            first = random.choice(first_names)
            last = random.choice(last_names)
            phone = _generate_phone()
            full_name = f"{first} {last}"
            qr = _generate_qr_token()
            balance = random.randint(0, 5000)
            birthday = random.choice(birthdays) if random.random() > 0.3 else None
            marketing_allowed = 1 if random.random() > 0.2 else 0
            telegram_id = next_telegram_id
            next_telegram_id += 1

            cur = conn.execute(
                """INSERT INTO customers
                   (phone, full_name, telegram_id, qr_token, balance_points, birthday,
                    marketing_allowed, data_processing_allowed, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now', ?), datetime('now'))""",
                (
                    phone,
                    full_name,
                    telegram_id,
                    qr,
                    balance,
                    birthday,
                    marketing_allowed,
                    f"-{random.randint(1, 365)} days",
                ),
            )
            customer_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            customer_ids.append(customer_id)

            # Add consent records
            conn.execute(
                """INSERT INTO consents (customer_id, source, consent_version, consent_text, consent_type, accepted_at)
                   VALUES (?, 'admin_panel', '1.0', 'Согласие на обработку персональных данных', 'data_processing', datetime('now', ?))""",
                (customer_id, f"-{random.randint(1, 365)} days"),
            )
            stats["consents"] += 1

            if marketing_allowed:
                conn.execute(
                    """INSERT INTO consents (customer_id, source, consent_version, consent_text, consent_type, accepted_at)
                       VALUES (?, 'telegram_bot', '1.0', 'Согласие на маркетинговые рассылки', 'marketing', datetime('now', ?))""",
                    (customer_id, f"-{random.randint(1, 365)} days"),
                )
                stats["consents"] += 1

        stats["customers"] = len(customer_ids)

        # ============ TRANSACTIONS ============
        product_codes = [p[0] for p in products]

        for customer_id in customer_ids:
            for _ in range(random.randint(5, 15)):
                total = random.randint(150, 2000)
                bonus_used = (
                    random.choice([0, 0, 0, 50, 100, 200, 300])
                    if random.random() > 0.3
                    else 0
                )
                bonus_earned = int(total * 0.1)

                items = []
                for _ in range(random.randint(1, 4)):
                    code = random.choice(product_codes)
                    p_info = next(p for p in products if p[0] == code)
                    items.append(
                        {
                            "code": code,
                            "name": p_info[1],
                            "price": p_info[3],
                            "qty": random.randint(1, 2),
                        }
                    )

                # Peak hours distribution
                hour = random.choices(
                    [8, 9, 10, 12, 13, 14, 17, 18, 19, 20],
                    weights=[8, 10, 8, 12, 10, 8, 10, 12, 10, 6],
                )[0]

                conn.execute(
                    """INSERT INTO transactions
                       (customer_id, total_amount, bonus_used, bonus_earned, items_json, created_at)
                       VALUES (?, ?, ?, ?, ?, datetime('now', '+' || ? || ' hours', ?))""",
                    (
                        customer_id,
                        total,
                        bonus_used,
                        bonus_earned,
                        json.dumps(items),
                        hour,
                        f"-{random.randint(0, 2)} days",  # Last 2 days (including today)
                    ),
                )
                stats["transactions"] += 1

        # ============ MARKETING TRIGGERS ============
        triggers = [
            (
                "Добро пожаловать",
                "transaction.created",
                "{}",
                0,
                "Спасибо за первый заказ! Вот ваш бонус:",
                1,
            ),
            (
                "С днём рождения",
                "customer.birthday",
                "{}",
                0,
                "С днём рождения! Вот подарок:",
                1,
            ),
            (
                "Повышение статуса",
                "loyalty.tier_upgraded",
                "{}",
                0,
                "Поздравляем с повышением статуса!",
                1,
            ),
            (
                "Возвращайтесь!",
                "customer.inactive_30d",
                "{}",
                24,
                "Мы скучаем! Вот бонус для вас:",
                1,
            ),
            (
                "Большая покупка",
                "transaction.amount_exceeded",
                "{}",
                0,
                "Спасибо за большой заказ!",
                1,
            ),
            (
                "После 5 покупок",
                "transaction.count_5",
                "{}",
                0,
                "Спасибо за 5 покупок! Вот бонус:",
                1,
            ),
        ]

        trigger_ids = []
        for name, event, criteria, delay, msg, active in triggers:
            conn.execute(
                """INSERT INTO marketing_triggers
                   (name, event_source, criteria_json, delay_hours, message_text, active, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, datetime('now'))""",
                (name, event, criteria, delay, msg, active),
            )
            trigger_ids.append(conn.execute("SELECT last_insert_rowid()").fetchone()[0])

        stats["marketing_triggers"] = len(triggers)

        # ============ MARKETING CAMPAIGN ============
        campaigns = [
            (
                "Весенний кофейный фестиваль",
                None,
                "push",
                "Приходите на наш весенний фестиваль!",
                "active",
                None,
                None,
            ),
            (
                "Новинка: Латте с корицей",
                None,
                "push",
                "Попробуйте наш новый латте!",
                "scheduled",
                None,
                "+3 days",
            ),
            (
                "Эксклюзив для VIP",
                "VIP Customers",
                "push",
                "Только для вас, дорогие гости!",
                "active",
                None,
                None,
            ),
            (
                "Возвращайтесь!",
                "At Risk",
                "push",
                "Мы скучаем! Вернитесь к нам.",
                "draft",
                None,
                None,
            ),
        ]

        campaign_ids = []
        for name, segment, ctype, content, status, sent_at, scheduled in campaigns:
            conn.execute(
                """INSERT INTO marketing_campaigns
                   (name, segment_id, type, content, status, scheduled_at, sent_at, created_at)
                   VALUES (?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?), datetime('now'))""",
                (
                    name,
                    None,
                    ctype,
                    content,
                    status,
                    scheduled,
                    sent_at if sent_at else "-30 days",
                ),
            )
            campaign_ids.append(
                conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            )

        stats["marketing_campaigns"] = len(campaigns)

        # ============ TRIGGER EVENTS ============
        for _ in range(250):
            trigger_id = random.choice(trigger_ids)
            customer_id = random.choice(customer_ids)
            status = random.choices(
                ["processed", "pending", "failed"], weights=[70, 20, 10]
            )[0]

            conn.execute(
                """INSERT INTO marketing_trigger_events
                   (trigger_id, customer_id, source_tx_id, status, scheduled_for, sent_at, created_at)
                   VALUES (?, ?, ?, ?, datetime('now', ?), datetime('now', ?), datetime('now', ?))""",
                (
                    trigger_id,
                    customer_id,
                    random.randint(1, stats["transactions"]),
                    status,
                    f"-{random.randint(0, 7)} days",
                    f"-{random.randint(0, 7)} days",
                    f"-{random.randint(0, 14)} days",
                ),
            )
            stats["trigger_events"] += 1

        # ============ MARKETING EVENTS ============
        for campaign_id in campaign_ids:
            recipient_count = random.randint(20, 50)

            for _ in range(recipient_count):
                customer_id = random.choice(customer_ids)
                event_type = random.choices(
                    ["sent", "delivered", "open", "click"], weights=[100, 90, 60, 15]
                )[0]

                conn.execute(
                    """INSERT INTO marketing_events
                       (campaign_id, user_id, event_type, created_at)
                       VALUES (?, ?, ?, datetime('now', ?))""",
                    (
                        campaign_id,
                        customer_id,
                        event_type,
                        f"-{random.randint(1, 14)} days",
                    ),
                )
                stats["marketing_events"] += 1

        # ============ INTEGRATIONS ============
        integrations = [
            ("Telegram Bot", "telegram", "bot_token_xxx", '{"bot_token": "xxx"}'),
            ("VK Community", "vk", "vk_token_xxx", '{"group_id": 123456}'),
            (
                "ERP Система",
                "erp",
                "erp_secret_xxx",
                '{"api_url": "https://erp.example.com"}',
            ),
        ]

        integration_ids = []
        for name, kind, secret, config in integrations:
            conn.execute(
                """INSERT INTO integrations
                   (name, kind, secret, config_json, enabled, created_at, updated_at)
                   VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))""",
                (name, kind, secret, config),
            )
            integration_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            integration_ids.append(integration_id)

        stats["integrations"] = len(integrations)

        # ============ INTEGRATION DELIVERIES ============
        event_types = [
            "customer.created",
            "transaction.completed",
            "loyalty.points_added",
            "birthday.reminder",
        ]

        for _ in range(400):
            integration_id = random.choice(integration_ids)
            event_type = random.choice(event_types)
            status = random.choices(
                ["success", "failed", "pending"], weights=[80, 15, 5]
            )[0]
            http_status = (
                200 if status == "success" else (500 if status == "failed" else None)
            )

            conn.execute(
                """INSERT INTO integration_deliveries
                   (integration_id, event_type, status, http_status, response_body, created_at)
                   VALUES (?, ?, ?, ?, ?, datetime('now', ?))""",
                (
                    integration_id,
                    event_type,
                    status,
                    http_status,
                    '{"ok": true}' if status == "success" else '{"error": "failed"}',
                    f"-{random.randint(0, 7)} days",
                ),
            )
            stats["integration_deliveries"] += 1

        conn.commit()

        return {
            "success": True,
            "seeded": stats,
            "message": f"""Created:
- {stats["products"]} products
- {stats["customers"]} customers
- {stats["transactions"]} transactions
- {stats["marketing_triggers"]} marketing triggers
- {stats["marketing_campaigns"]} campaigns
- {stats["trigger_events"]} trigger events
- {stats["marketing_events"]} marketing events
- {stats["consents"]} consent records
- {stats["integrations"]} integrations
- {stats["integration_deliveries"]} webhook deliveries""",
        }

    except Exception as exc:
        import traceback

        logger.error(f"[SEED] seed_test_data failed: {exc}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Seed failed: {type(exc).__name__}: {exc}",
        )
    finally:
        conn.close()
