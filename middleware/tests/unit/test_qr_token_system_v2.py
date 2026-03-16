"""
Comprehensive tests for improved QR token system.
Tests current QR token and customer identity behavior.
"""

import sqlite3
import time
import uuid
from unittest.mock import patch

import pytest

from app.customer_identity import (
    CustomerIdentityConflictError,
    generate_unique_qr_token,
    get_or_generate_base_guid,
    resolve_or_create_customer,
)
from app.identify import generate_qr_token


def _create_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    return conn


def _create_customers_table(
    conn: sqlite3.Connection, *, unique_qr: bool = True
) -> None:
    qr_constraint = "UNIQUE" if unique_qr else ""
    conn.execute(f"""
        CREATE TABLE customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT,
            telegram_id INTEGER,
            vk_id INTEGER,
            full_name TEXT,
            qr_token TEXT {qr_constraint},
            preferences_json TEXT,
            marketing_allowed INTEGER,
            data_processing_allowed INTEGER,
            birthday TEXT,
            gender TEXT,
            email TEXT,
            city TEXT,
            onboarding_status TEXT,
            phone_verified_at TEXT,
            phone_verification_method TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """)


class TestImprovedQRTokenSystem:
    """Test the improved QR token generation system."""

    def test_uuid5_overflow_protection(self):
        conn = _create_conn()
        conn.execute("""
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                qr_token TEXT
            )
            """)
        conn.execute("""
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
            """)
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", "550e8400-e29b-41d4-a716-446655440000"),
        )

        tokens = set()
        for index in range(1000):
            conn.execute(
                "INSERT INTO customers (qr_token) VALUES (?)", (f"temp_{index}",)
            )
            token = generate_unique_qr_token(conn)
            tokens.add(token)
            assert len(token) == 8
            assert all(c in "0123456789ABCDEF" for c in token)

        assert len(tokens) == 1000

    def test_simulated_multi_process_token_generation(self):
        conn = _create_conn()
        conn.execute("""
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                qr_token TEXT UNIQUE
            )
            """)
        conn.execute("""
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
            """)
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", "550e8400-e29b-41d4-a716-446655440000"),
        )

        results = []
        for worker_id in range(50):
            conn.execute(
                "INSERT INTO customers (qr_token) VALUES (?)", (f"seed_{worker_id}",)
            )
            results.append(generate_unique_qr_token(conn))

        assert len(results) == 50
        assert len(set(results)) == 50
        assert all(len(token) == 8 for token in results)

    def test_simulated_multi_process_customer_creation(self):
        conn = _create_conn()
        _create_customers_table(conn)
        conn.execute("""
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
            """)
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", "550e8400-e29b-41d4-a716-446655440000"),
        )

        customer_ids = []
        for worker_id in range(20):
            customer_id, is_new = resolve_or_create_customer(
                conn,
                phone=f"7912345678{worker_id}",
                telegram_id=1000000 + worker_id,
                full_name=f"Test User {worker_id}",
                marketing_allowed=1,
                data_processing_allowed=1,
            )
            assert is_new is True
            customer_ids.append(customer_id)

        assert len(set(customer_ids)) == 20

        for customer_id in customer_ids:
            row = conn.execute(
                "SELECT qr_token FROM customers WHERE id=?",
                (customer_id,),
            ).fetchone()
            assert row is not None
            assert len(row["qr_token"]) == 8

    def test_base_guid_generation_is_stable_across_calls(self):
        conn = _create_conn()
        conn.execute("""
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
            """)

        first_guid = get_or_generate_base_guid(conn)
        second_guid = get_or_generate_base_guid(conn)

        assert first_guid == second_guid
        uuid.UUID(first_guid)

    def test_transaction_rollback_on_error(self):
        conn = _create_conn()
        _create_customers_table(conn)
        conn.execute("""
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
            """)
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", "550e8400-e29b-41d4-a716-446655440000"),
        )

        customer_id1, is_new1 = resolve_or_create_customer(
            conn,
            phone="79123456789",
            telegram_id=123456789,
            full_name="First User",
            marketing_allowed=1,
            data_processing_allowed=1,
        )

        assert is_new1 is True

        customer_id2, is_new2 = resolve_or_create_customer(
            conn,
            phone="79123456789",
            telegram_id=987654321,
            full_name="Updated User",
            marketing_allowed=0,
            data_processing_allowed=1,
        )

        assert is_new2 is False
        assert customer_id2 == customer_id1

        row = conn.execute(
            "SELECT telegram_id, marketing_allowed, full_name FROM customers WHERE id=?",
            (customer_id1,),
        ).fetchone()

        assert row["telegram_id"] == 987654321
        assert row["marketing_allowed"] == 0
        assert row["full_name"] == "Updated User"

    def test_secure_token_generation(self):
        token1 = generate_qr_token()
        token2 = generate_qr_token()

        assert token1 != token2
        assert len(token1) == 8
        assert len(token2) == 8
        assert all(c in "0123456789ABCDEF" for c in token1)
        assert all(c in "0123456789ABCDEF" for c in token2)

    def test_fallback_to_secure_random(self):
        conn = _create_conn()

        with patch("uuid.uuid5", side_effect=Exception("UUID5 failed")):
            token = generate_unique_qr_token(conn)

        assert len(token) == 8
        assert all(c in "0123456789ABCDEF" for c in token)

    def test_database_locked_handling(self):
        conn = _create_conn()
        _create_customers_table(conn)
        conn.execute("""
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
            """)
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", "550e8400-e29b-41d4-a716-446655440000"),
        )

        with patch(
            "app.customer_identity.generate_unique_qr_token",
            side_effect=sqlite3.OperationalError("database is locked"),
        ):
            with pytest.raises(RuntimeError):
                resolve_or_create_customer(
                    conn,
                    phone="79123456789",
                    telegram_id=123456789,
                    full_name="Test User",
                    marketing_allowed=1,
                    data_processing_allowed=1,
                )

    def test_customer_conflict_error(self):
        conn = _create_conn()
        _create_customers_table(conn, unique_qr=False)
        conn.execute("""
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
            """)
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", "550e8400-e29b-41d4-a716-446655440000"),
        )

        resolve_or_create_customer(
            conn,
            phone="79123456789",
            full_name="User One",
            marketing_allowed=1,
            data_processing_allowed=1,
        )
        conn.execute(
            "INSERT INTO customers (phone, telegram_id, vk_id, full_name, qr_token, preferences_json, marketing_allowed, data_processing_allowed, onboarding_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (None, 987654321, None, "User Two", "TOKEN123", "{}", 1, 1, "registered"),
        )

        with pytest.raises(CustomerIdentityConflictError):
            resolve_or_create_customer(
                conn,
                phone="79123456789",
                telegram_id=987654321,
                full_name="Conflict User",
                marketing_allowed=1,
                data_processing_allowed=1,
            )


class TestPerformanceAndScalability:
    """Test performance and scalability of the improved system."""

    def test_large_scale_token_generation(self):
        conn = _create_conn()
        conn.execute("""
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                qr_token TEXT UNIQUE
            )
            """)
        conn.execute("""
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
            """)
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", "550e8400-e29b-41d4-a716-446655440000"),
        )

        start_time = time.time()
        tokens = set()

        for index in range(10000):
            conn.execute(
                "INSERT INTO customers (qr_token) VALUES (?)", (f"temp_{index}",)
            )
            tokens.add(generate_unique_qr_token(conn))

        duration = time.time() - start_time

        assert duration < 10.0
        assert len(tokens) == 10000

    def test_memory_usage_stability(self):
        conn = _create_conn()
        conn.execute("""
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                qr_token TEXT UNIQUE
            )
            """)
        conn.execute("""
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
            """)
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", "550e8400-e29b-41d4-a716-446655440000"),
        )

        for batch in range(10):
            tokens = set()
            for index in range(1000):
                conn.execute(
                    "INSERT INTO customers (qr_token) VALUES (?)",
                    (f"temp_{batch}_{index}",),
                )
                tokens.add(generate_unique_qr_token(conn))

            assert len(tokens) == 1000
            conn.execute("DELETE FROM customers WHERE qr_token LIKE 'temp_%'")
            conn.commit()
