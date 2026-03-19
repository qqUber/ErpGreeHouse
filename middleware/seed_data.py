#!/usr/bin/env python3
"""
Data Seeding Script for Coffee Shop ERP System

Generates realistic test data for:
- Customers (50-100 with Russian/Serbian names)
- Products (coffee shop catalog)
- Transactions (500-1000 over 12 months)
- Analytics fields (LTV, average check, etc.)

Usage:
    python seed_data.py
    python seed_data.py --force  # Clear existing data first
"""

import argparse
import hashlib
import json
import os
import random
import sqlite3

# Import from existing db module to ensure consistent paths
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.db import DB, get_db, get_db_path
from app.utils.qr_codes import generate_unique_token

# Realistic Russian names (ФИО)
RUSSIAN_FIRST_NAMES_MALE = [
    "Иван",
    "Александр",
    "Дмитрий",
    "Михаил",
    "Сергей",
    "Андрей",
    "Владимир",
    "Николай",
    "Евгений",
    "Максим",
    "Юрий",
    "Олег",
    "Павел",
    "Артем",
    "Константин",
    "Илья",
    "Кирилл",
    "Макар",
    "Григорий",
    "Борис",
    "Виктор",
    "Станислав",
]

RUSSIAN_FIRST_NAMES_FEMALE = [
    "Анна",
    "Екатерина",
    "Мария",
    "Ольга",
    "Наталья",
    "Ирина",
    "Елена",
    "Татьяна",
    "Светлана",
    "Алена",
    "Дарья",
    "Ксения",
    "Алина",
    "Виктория",
    "Полина",
    "Елизавета",
    "Юлия",
    "Милана",
    "Алиса",
    "Оксана",
    "Людмила",
]

RUSSIAN_PATRONYMICS_MALE = [
    "Петрович",
    "Александрович",
    "Дмитриевич",
    "Михайлович",
    "Сергеевич",
    "Андреевич",
    "Владимирович",
    "Николаевич",
    "Евгеньевич",
    "Максимович",
    "Юрьевич",
    "Олегович",
    "Павлович",
    "Артемович",
    "Константинович",
]

RUSSIAN_PATRONYMICS_FEMALE = [
    "Петровна",
    "Александровна",
    "Дмитриевна",
    "Михайловна",
    "Сергеевна",
    "Андреевна",
    "Владимировна",
    "Николаевна",
    "Евгеньевна",
    "Максимовна",
    "Юрьевна",
    "Олеговна",
    "Павловна",
    "Артемовна",
    "Константиновна",
]

RUSSIAN_LAST_NAMES_MALE = [
    "Сидоров",
    "Козлов",
    "Волков",
    "Петров",
    "Иванов",
    "Смирнов",
    "Кузнецов",
    "Васильев",
    "Попов",
    "Соколов",
    "Лебедев",
    "Новиков",
    "Морозов",
    "Фёдоров",
    "Андреев",
    "Яковлев",
    "Григорьев",
    "Романов",
    "Осипов",
    "Никитин",
    "Захаров",
]

RUSSIAN_LAST_NAMES_FEMALE = [
    "Сидорова",
    "Козлова",
    "Волкова",
    "Петрова",
    "Иванова",
    "Смирнова",
    "Кузнецова",
    "Васильева",
    "Попова",
    "Соколова",
    "Лебедева",
    "Новикова",
    "Морозова",
    "Фёдорова",
    "Андреева",
    "Яковлева",
    "Григорьева",
    "Романова",
    "Осипова",
    "Никитина",
    "Захарова",
]

# Realistic Serbian names
SERBIAN_FIRST_NAMES_MALE = [
    "Милош",
    "Петар",
    "Ненад",
    "Драган",
    "Зоран",
    "Горан",
    "Слободан",
    "Душан",
    "Бранислав",
    "Владимир",
    "Саша",
    "Иван",
    "Марко",
    "Никола",
    "Стефан",
    "Александар",
    "Михајло",
    "Филип",
    "Лазар",
    "Андреа",
    "Борис",
]

SERBIAN_FIRST_NAMES_FEMALE = [
    "Драгана",
    "Милена",
    "Снежана",
    "Гордана",
    "Зорица",
    "Светлана",
    "Биљана",
    "Марија",
    "Јелена",
    "Наташа",
    "Ана",
    "Андреа",
    "Катарина",
    "Марина",
    "Мирјана",
    "Душица",
    "Лидија",
    "Весна",
    "Јованка",
    "Радмила",
    "Стана",
]

SERBIAN_LAST_NAMES_MALE = [
    "Јовановић",
    "Николић",
    "Петровић",
    "Марковић",
    "Стојковић",
    "Поповић",
    "Ивановић",
    "Миленковић",
    "Васиљевић",
    "Симоновић",
    "Павловић",
    "Миловановић",
    "Радовић",
    "Стаменковић",
    "Ћирић",
    "Димитријевић",
    "Андрејић",
    "Бојковић",
]

SERBIAN_LAST_NAMES_FEMALE = [
    "Јовановић",
    "Николић",
    "Петровић",
    "Марковић",
    "Стојковић",
    "Поповић",
    "Ивановић",
    "Миленковић",
    "Васиљевић",
    "Симоновић",
    "Павловић",
    "Миловановић",
    "Радовић",
    "Стаменковић",
    "Ћирић",
    "Димитријевић",
    "Андрејић",
    "Бојковић",
]

# Email domains
EMAIL_DOMAINS = ["yandex.ru", "mail.ru", "gmail.com"]

# Product categories and items
DRINKS = [
    ("Эспрессо", 80),
    ("Американо", 120),
    ("Латте", 180),
    ("Капучино", 170),
    ("Раф", 190),
    ("Мокачино", 200),
    ("Латте с корицей", 190),
    ("Какао", 150),
    ("Чай чёрный", 100),
    ("Чай зелёный", 100),
    ("Чай с мятой", 110),
    ("Морс ягодный", 130),
    ("Морс клюквенный", 140),
    ("Смузи банановый", 180),
    ("Смузи ягодный", 190),
    ("Компот", 80),
]

FOODS = [
    ("Круассан с шоколадом", 150),
    ("Круассан с маслом", 120),
    ("Маффин шоколадный", 130),
    ("Маффин ванильный", 120),
    ("Синabon классический", 180),
    ("Синabon с шоколадом", 200),
    ("Торт Наполеон", 250),
    ("Торт Медовик", 230),
    ("Пирожное Картошка", 100),
    ("Пирожное Эклер", 110),
    ("Пирожное Макарун", 130),
    ("Сэндвич с ветчиной", 220),
    ("Сэндвич с курицей", 230),
    ("Сэндвич вегетарианский", 200),
    ("Булочка с изюмом", 80),
    ("Пирог с яблоками", 140),
]

GOODS = [
    ("Стаканчики 350мл", 450),
    ("Стаканчики 500мл", 500),
    ("Крышки белые", 200),
    ("Крышки чёрные", 220),
    ("Сахар порционный", 150),
    ("Сироп ванильный", 380),
    ("Сироп карамельный", 380),
    ("Сироп ореховый", 400),
    ("Зёрна арабика 1кг", 1200),
    ("Зёрна смесь 1кг", 1000),
    ("Трубочки", 150),
    ("Салфетки", 100),
    ("Мешалки", 120),
]


def generate_phone(country: str = "RU") -> str:
    """Generate realistic phone number."""
    if country == "RU":
        # Russian: +7 (XXX) XXX-XX-XX
        area = random.choice(
            ["495", "499", "812", "921", "916", "917", "985", "903", "906", "999"]
        )
        first = f"{random.randint(100, 999)}"
        second = f"{random.randint(10, 99)}"
        return f"+7 ({area}) {first}-{second}"
    else:
        # Serbian: +381 XX XXX XXXX
        first = f"{random.randint(10, 69)}"
        second = f"{random.randint(100, 999)}"
        third = f"{random.randint(1000, 9999)}"
        return f"+381 {first} {second} {third}"


def generate_email(full_name: str, domain: str = None) -> str:
    """Generate realistic email from name."""
    if domain is None:
        domain = random.choice(EMAIL_DOMAINS)

    # Clean name for email
    name_part = (
        full_name.lower()
        .replace(" ", ".")
        .replace("ј", "j")
        .replace("ћ", "c")
        .replace("ђ", "dj")
    )
    name_part = (
        name_part.replace("ć", "c")
        .replace("č", "c")
        .replace("š", "s")
        .replace("ž", "z")
    )
    name_part = "".join(c for c in name_part if c.isalnum() or c == ".")
    name_part = name_part.strip(".")

    # Add random suffix to avoid duplicates
    suffix = random.randint(1, 999)
    return f"{name_part}{suffix}@{domain}"


def generate_russian_name() -> str:
    """Generate full Russian name (ФИО)."""
    is_male = random.choice([True, False])

    if is_male:
        first = random.choice(RUSSIAN_FIRST_NAMES_MALE)
        patronymic = random.choice(RUSSIAN_PATRONYMICS_MALE)
        last = random.choice(RUSSIAN_LAST_NAMES_MALE)
    else:
        first = random.choice(RUSSIAN_FIRST_NAMES_FEMALE)
        patronymic = random.choice(RUSSIAN_PATRONYMICS_FEMALE)
        last = random.choice(RUSSIAN_LAST_NAMES_FEMALE)

    return f"{last} {first} {patronymic}"


def generate_serbian_name() -> str:
    """Generate full Serbian name."""
    is_male = random.choice([True, False])

    if is_male:
        first = random.choice(SERBIAN_FIRST_NAMES_MALE)
        last = random.choice(SERBIAN_LAST_NAMES_MALE)
    else:
        first = random.choice(SERBIAN_FIRST_NAMES_FEMALE)
        last = random.choice(SERBIAN_LAST_NAMES_FEMALE)

    return f"{first} {last}"


def generate_customer_name() -> str:
    """Generate customer name - mix of Russian and Serbian."""
    if random.random() < 0.75:  # 75% Russian names
        return generate_russian_name()
    else:  # 25% Serbian names
        return generate_serbian_name()


def generate_birthday() -> str:
    """Generate random birthday."""
    start = datetime(1970, 1, 1)
    end = datetime(2006, 12, 31)
    delta = end - start
    random_days = random.randint(0, delta.days)
    birthday = start + timedelta(days=random_days)
    return birthday.strftime("%Y-%m-%d")


def generate_qr_token(conn: sqlite3.Connection) -> str:
    """Generate unique numeric QR token."""
    return generate_unique_token(conn)


def generate_transaction_items(products: list) -> list:
    """Generate random transaction items."""
    num_items = random.randint(1, 5)
    items = []

    for _ in range(num_items):
        product = random.choice(products)
        quantity = random.randint(1, 3)
        items.append(
            {
                "product_id": product["id"],
                "code": product["code"],
                "name": product["name"],
                "price": product["price"],
                "qty": quantity,
                "total": product["price"] * quantity,
            }
        )

    return items


def generate_transaction_timestamp() -> datetime:
    """Generate realistic transaction timestamp."""
    # Generate over the last 12 months
    now = datetime.now()
    days_ago = random.randint(0, 365)
    base_date = now - timedelta(days=days_ago)

    # Distribution by time of day
    hour = random.choices(
        [random.randint(7, 11), random.randint(12, 14), random.randint(15, 21)],
        weights=[35, 30, 35],
    )[0]

    minute = random.randint(0, 59)
    second = random.randint(0, 59)

    return base_date.replace(hour=hour, minute=minute, second=second)


def calculate_analytics(conn: sqlite3.Connection) -> None:
    """Calculate analytics fields for all customers."""
    print("Calculating customer analytics...")

    # Get all customers with their transactions
    customers = conn.execute("""
        SELECT
            c.id,
            c.created_at,
            COUNT(t.id) as purchase_count,
            COALESCE(SUM(t.total_amount), 0) as total_revenue,
            COALESCE(AVG(t.total_amount), 0) as avg_check,
            MAX(t.created_at) as last_purchase
        FROM customers c
        LEFT JOIN transactions t ON c.id = t.customer_id
        GROUP BY c.id
    """).fetchall()

    for customer in customers:
        customer_id = customer["id"]
        purchase_count = customer["purchase_count"]
        total_revenue = customer["total_revenue"]
        avg_check = customer["avg_check"]
        created_at = customer["created_at"]
        last_purchase = customer["last_purchase"]

        # Cohort month is the month of first purchase
        cohort_month = created_at[:7] if created_at else None

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
                total_revenue,
                avg_check,
                purchase_count,
                last_purchase,
                cohort_month,
                customer_id,
            ),
        )

    conn.commit()
    print(f"Analytics calculated for {len(customers)} customers")


def seed_products(conn: sqlite3.Connection) -> list:
    """Seed products table."""
    print("Seeding products...")

    # Check if products already exist
    existing = conn.execute("SELECT COUNT(*) as cnt FROM products").fetchone()
    if existing["cnt"] > 0:
        print(f"Products already exist ({existing['cnt']}), skipping...")
        return conn.execute("SELECT * FROM products WHERE active = 1").fetchall()

    products = []
    sku_counter = {"DRINK": 1, "FOOD": 1, "GOODS": 1}

    # Insert drinks
    for name, price in DRINKS:
        sku = f"DRINK-{sku_counter['DRINK']:03d}"
        sku_counter["DRINK"] += 1
        conn.execute(
            """
            INSERT INTO products (code, name, kind, price, active)
            VALUES (?, ?, 'drink', ?, 1)
        """,
            (sku, name, price),
        )
        products.append(
            {
                "id": conn.execute("SELECT last_insert_rowid()").fetchone()[0],
                "name": name,
                "price": price,
            }
        )

    # Insert foods
    for name, price in FOODS:
        sku = f"FOOD-{sku_counter['FOOD']:03d}"
        sku_counter["FOOD"] += 1
        conn.execute(
            """
            INSERT INTO products (code, name, kind, price, active)
            VALUES (?, ?, 'food', ?, 1)
        """,
            (sku, name, price),
        )
        products.append(
            {
                "id": conn.execute("SELECT last_insert_rowid()").fetchone()[0],
                "name": name,
                "price": price,
            }
        )

    # Insert goods
    for name, price in GOODS:
        sku = f"GOODS-{sku_counter['GOODS']:03d}"
        sku_counter["GOODS"] += 1
        conn.execute(
            """
            INSERT INTO products (code, name, kind, price, active)
            VALUES (?, ?, 'goods', ?, 1)
        """,
            (sku, name, price),
        )
        products.append(
            {
                "id": conn.execute("SELECT last_insert_rowid()").fetchone()[0],
                "name": name,
                "price": price,
            }
        )

    conn.commit()

    # Fetch all products
    products = conn.execute("SELECT * FROM products WHERE active = 1").fetchall()
    print(f"Created {len(products)} products")
    return products


def seed_customers(conn: sqlite3.Connection, num_customers: int = 75) -> list:
    """Seed customers table."""
    print(f"Seeding {num_customers} customers...")

    # Check existing customers
    existing = conn.execute("SELECT COUNT(*) as cnt FROM customers").fetchone()
    if existing["cnt"] > 0:
        print(f"Customers already exist ({existing['cnt']}), skipping...")
        return conn.execute("SELECT * FROM customers").fetchall()

    customers = []
    used_phones = set()

    for i in range(num_customers):
        # Generate unique phone
        while True:
            country = "RU" if random.random() < 0.8 else "RS"
            phone = generate_phone(country)
            if phone not in used_phones:
                used_phones.add(phone)
                break

        full_name = generate_customer_name()
        email = generate_email(full_name)
        birthday = generate_birthday() if random.random() < 0.7 else None
        marketing_allowed = 1 if random.random() < 0.4 else 0
        data_processing_allowed = 1 if random.random() < 0.6 else 0

        conn.execute(
            """
            INSERT INTO customers (
                phone, full_name, qr_token, birthday,
                marketing_allowed, data_processing_allowed,
                balance_points
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (
                phone,
                full_name,
                generate_qr_token(conn),
                birthday,
                marketing_allowed,
                data_processing_allowed,
                random.randint(0, 500),
            ),
        )

        if (i + 1) % 25 == 0:
            print(f"  Created {i + 1}/{num_customers} customers...")

    conn.commit()
    customers = conn.execute("SELECT * FROM customers").fetchall()
    print(f"Created {len(customers)} customers")
    return customers


def seed_transactions(
    conn: sqlite3.Connection,
    customers: list,
    products: list,
    num_transactions: int = 750,
) -> None:
    """Seed transactions table."""
    print(f"Seeding {num_transactions} transactions...")

    # Check existing transactions
    existing = conn.execute("SELECT COUNT(*) as cnt FROM transactions").fetchone()
    if existing["cnt"] > 0:
        print(f"Transactions already exist ({existing['cnt']}), skipping...")
        return

    if not customers or not products:
        print("No customers or products available, cannot create transactions")
        return

    customer_ids = [c["id"] for c in customers]

    for i in range(num_transactions):
        # 70% have customer, 30% anonymous (use random customer anyway for analytics)
        customer_id = random.choice(customer_ids)

        # Generate items
        items = generate_transaction_items(products)
        total_amount = sum(item["total"] for item in items)

        # Realistic amounts: 150-2500 RUB
        if total_amount < 150:
            # Add extra item to reach minimum
            extra = random.choice(products)
            items.append(
                {
                    "product_id": extra["id"],
                    "code": extra["code"],
                    "name": extra["name"],
                    "price": extra["price"],
                    "qty": 1,
                    "total": extra["price"],
                }
            )
            total_amount = sum(item["total"] for item in items)

        # Calculate bonuses
        bonus_earned = int(total_amount * 0.05)  # 5% bonus earned
        bonus_used = (
            0
            if random.random() > 0.3
            else random.randint(10, min(100, total_amount // 2))
        )

        # Generate timestamp
        created_at = generate_transaction_timestamp()

        conn.execute(
            """
            INSERT INTO transactions (
                customer_id, total_amount, bonus_used, bonus_earned,
                items_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        """,
            (
                customer_id,
                total_amount,
                bonus_used,
                bonus_earned,
                json.dumps(items, ensure_ascii=False),
                created_at.strftime("%Y-%m-%d %H:%M:%S"),
            ),
        )

        if (i + 1) % 100 == 0:
            print(f"  Created {i + 1}/{num_transactions} transactions...")

    conn.commit()
    print(f"Created {num_transactions} transactions")


def seed_admin_users(conn: sqlite3.Connection) -> None:
    """Seed admin users if not exist."""
    print("Checking admin users...")

    existing = conn.execute("SELECT COUNT(*) as cnt FROM admin_users").fetchone()
    if existing["cnt"] > 0:
        print(f"Admin users already exist ({existing['cnt']}), skipping...")
        return

    # Create default admin user (password: admin123)
    # This is a placeholder - in production, use proper password hashing
    salt = hashlib.sha256(os.urandom(32)).hexdigest()[:16]
    password = "admin123"
    password_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), 200000
    ).hex()

    conn.execute(
        """
        INSERT INTO admin_users (username, password_hash, password_salt, password_iter, role, disabled)
        VALUES (?, ?, ?, ?, 'owner', 0)
    """,
        ("admin", password_hash, salt, 200000),
    )

    # Create manager user
    salt2 = hashlib.sha256(os.urandom(32)).hexdigest()[:16]
    password_hash2 = hashlib.pbkdf2_hmac(
        "sha256", "manager123".encode(), salt2.encode(), 200000
    ).hex()

    conn.execute(
        """
        INSERT INTO admin_users (username, password_hash, password_salt, password_iter, role, disabled)
        VALUES (?, ?, ?, ?, 'manager', 0)
    """,
        ("manager", password_hash2, salt2, 200000),
    )

    conn.commit()
    print("Created admin users: admin/admin123, manager/manager123")


def clear_existing_data(conn: sqlite3.Connection) -> None:
    """Clear all existing data from tables."""
    print("Clearing existing data...")
    conn.execute("DELETE FROM transactions")
    conn.execute("DELETE FROM customers")
    conn.execute("DELETE FROM products")
    conn.commit()
    print("Data cleared")


def main():
    parser = argparse.ArgumentParser(
        description="Seed database with realistic test data"
    )
    parser.add_argument(
        "--force", action="store_true", help="Clear existing data before seeding"
    )
    parser.add_argument(
        "--customers",
        type=int,
        default=75,
        help="Number of customers to create (default: 75)",
    )
    parser.add_argument(
        "--transactions",
        type=int,
        default=750,
        help="Number of transactions to create (default: 750)",
    )
    args = parser.parse_args()

    db_path = get_db_path()
    print(f"Using database: {db_path}")

    # Ensure database exists and is initialized
    if not os.path.exists(db_path):
        print("Database does not exist, initializing...")
        import sys

        sys.path.insert(
            0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
        )
        from app.db import init_db

        init_db()

    db = get_db()
    conn = db.connect()

    try:
        if args.force:
            clear_existing_data(conn)

        # Seed data
        products = seed_products(conn)
        customers = seed_customers(conn, args.customers)
        seed_transactions(conn, customers, products, args.transactions)
        seed_admin_users(conn)

        # Calculate analytics
        calculate_analytics(conn)

        # Print summary
        print("\n" + "=" * 50)
        print("SEEDING COMPLETE")
        print("=" * 50)

        stats = {
            "products": conn.execute("SELECT COUNT(*) as cnt FROM products").fetchone()[
                "cnt"
            ],
            "customers": conn.execute(
                "SELECT COUNT(*) as cnt FROM customers"
            ).fetchone()["cnt"],
            "transactions": conn.execute(
                "SELECT COUNT(*) as cnt FROM transactions"
            ).fetchone()["cnt"],
            "admin_users": conn.execute(
                "SELECT COUNT(*) as cnt FROM admin_users"
            ).fetchone()["cnt"],
        }

        for table, count in stats.items():
            print(f"  {table}: {count}")

        print("\nAdmin credentials:")
        print("  Username: admin, Password: admin123")
        print("  Username: manager, Password: manager123")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
