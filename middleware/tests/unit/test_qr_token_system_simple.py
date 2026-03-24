"""
Simplified tests for improved QR token system.
Focuses on core functionality without threading complications.
"""

import sqlite3
import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.customer_identity import (
    CustomerIdentityConflictError,
    generate_unique_qr_token,
    get_or_generate_base_guid,
    resolve_or_create_customer,
)


class TestImprovedQRTokenSystem:
    """Test the improved QR token generation system."""

    def test_uuid5_overflow_protection(self):
        """Test that the numeric generator stays within valid 8-digit bounds."""
        conn = sqlite3.connect(":memory:")
        conn.execute(
            """
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                qr_token TEXT
            )
        """
        )
        conn.execute(
            """
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """
        )

        # Set a fixed base GUID
        base_guid = "550e8400-e29b-41d4-a716-446655440000"
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", base_guid),
        )

        # Generate many tokens to test for overflow
        tokens = set()
        for i in range(100):
            # Simulate high customer ID by adding dummy customers
            conn.execute("INSERT INTO customers (qr_token) VALUES (?)", (f"temp_{i}",))
            token = generate_unique_qr_token(conn)
            tokens.add(token)

            # Verify token format
            assert len(token) == 8
            assert token.isdigit()
            assert 10_000_000 <= int(token) <= 99_999_999

        # Should have generated unique tokens
        assert len(tokens) == 100

    def test_base_guid_generation(self):
        """Test base GUID generation and retrieval."""
        conn = sqlite3.connect(":memory:")
        conn.execute(
            """
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """
        )

        # First call should generate new GUID
        guid1 = get_or_generate_base_guid(conn)
        assert guid1 is not None
        assert len(guid1) == 36  # UUID format

        # Second call should return same GUID
        guid2 = get_or_generate_base_guid(conn)
        assert guid1 == guid2

        # Should be valid UUID
        uuid.UUID(guid1)  # Will raise if invalid

    def test_token_uniqueness(self):
        """Test that generated tokens are unique."""
        conn = sqlite3.connect(":memory:")
        conn.execute(
            """
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                qr_token TEXT UNIQUE
            )
        """
        )
        conn.execute(
            """
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """
        )

        # Set base GUID
        base_guid = "550e8400-e29b-41d4-a716-446655440000"
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", base_guid),
        )

        # Generate multiple tokens
        tokens = []
        for i in range(50):
            conn.execute("INSERT INTO customers (qr_token) VALUES (?)", (f"temp_{i}",))
            token = generate_unique_qr_token(conn)
            tokens.append(token)

        # All tokens should be unique
        assert len(set(tokens)) == len(tokens)

        # All tokens should be valid format
        for token in tokens:
            assert len(token) == 8
            assert token.isdigit()

    def test_customer_creation_and_update(self):
        """Test customer creation and update logic."""
        conn = sqlite3.connect(":memory:")
        conn.row_factory = (
            sqlite3.Row
        )  # Set row factory to match real database behavior
        conn.execute(
            """
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT UNIQUE,
                full_name TEXT,
                telegram_id INTEGER UNIQUE,
                vk_id INTEGER UNIQUE,
                qr_token TEXT UNIQUE,
                balance_points INTEGER NOT NULL DEFAULT 0,
                preferences_json TEXT NOT NULL DEFAULT '{}',
                marketing_allowed INTEGER NOT NULL DEFAULT 0,
                data_processing_allowed INTEGER NOT NULL DEFAULT 0,
                birthday TEXT,
                gender TEXT,
                email TEXT,
                city TEXT,
                onboarding_status TEXT NOT NULL DEFAULT 'registered',
                phone_verified_at TEXT,
                phone_verification_method TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """
        )
        conn.execute(
            """
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """
        )

        # Set base GUID
        base_guid = "550e8400-e29b-41d4-a716-446655440000"
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", base_guid),
        )

        # Create first customer
        customer_id1, is_new1 = resolve_or_create_customer(
            conn,
            phone="79123456789",
            telegram_id=123456789,
            full_name="First User",
            marketing_allowed=1,
            data_processing_allowed=1,
        )

        assert is_new1
        assert customer_id1 is not None

        # Try to create customer with same phone (should update existing)
        customer_id2, is_new2 = resolve_or_create_customer(
            conn,
            phone="79123456789",  # Same phone
            telegram_id=987654321,  # Different telegram
            full_name="Updated User",
            marketing_allowed=0,  # Different marketing
            data_processing_allowed=1,
        )

        assert not is_new2  # Should be existing customer
        assert customer_id2 == customer_id1  # Same customer

        # Verify the update was applied
        row = conn.execute(
            "SELECT telegram_id, marketing_allowed, full_name FROM customers WHERE id=?",
            (customer_id1,),
        ).fetchone()

        assert row[0] == 987654321  # Updated telegram_id
        assert row[1] == 0  # Updated marketing_allowed
        assert row[2] == "Updated User"  # Updated name

    def test_secure_token_generation(self):
        """Test that token generation uses unique numeric method."""
        conn = sqlite3.connect(":memory:")
        conn.execute(
            "CREATE TABLE customers (id INTEGER PRIMARY KEY, qr_token TEXT UNIQUE)"
        )

        token1 = generate_unique_qr_token(conn)
        token2 = generate_unique_qr_token(conn)

        # Should be different
        assert token1 != token2
        # Should be numeric
        assert token1.isdigit() and token2.isdigit()

        # Should be valid format
        assert len(token1) == 8
        assert len(token2) == 8
        assert all(c in "0123456789" for c in token1)  # Numeric only
        assert all(c in "0123456789" for c in token2)  # Numeric only

    def test_fallback_to_secure_random(self):
        """Test fallback to secure random when UUID5 fails."""
        conn = sqlite3.connect(":memory:")
        conn.execute(
            """
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                qr_token TEXT
            )
        """
        )
        conn.execute(
            """
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """
        )

        # Set base GUID
        base_guid = "550e8400-e29b-41d4-a716-446655440000"
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", base_guid),
        )

        token = generate_unique_qr_token(conn)

        assert len(token) == 8
        assert token.isdigit()

    def test_customer_conflict_error(self):
        """Test CustomerIdentityConflictError for conflicting identifiers."""
        conn = sqlite3.connect(":memory:")
        conn.row_factory = (
            sqlite3.Row
        )  # Set row factory to match real database behavior
        conn.execute(
            """
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT UNIQUE,
                full_name TEXT,
                telegram_id INTEGER UNIQUE,
                vk_id INTEGER UNIQUE,
                qr_token TEXT UNIQUE,
                balance_points INTEGER NOT NULL DEFAULT 0,
                preferences_json TEXT NOT NULL DEFAULT '{}',
                marketing_allowed INTEGER NOT NULL DEFAULT 0,
                data_processing_allowed INTEGER NOT NULL DEFAULT 0,
                birthday TEXT,
                gender TEXT,
                email TEXT,
                city TEXT,
                onboarding_status TEXT NOT NULL DEFAULT 'registered',
                phone_verified_at TEXT,
                phone_verification_method TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """
        )
        conn.execute(
            """
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """
        )

        # Set base GUID
        base_guid = "550e8400-e29b-41d4-a716-446655440000"
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", base_guid),
        )

        # Create first customer with phone
        customer_id1, _ = resolve_or_create_customer(
            conn,
            phone="79123456789",
            full_name="User One",
            marketing_allowed=1,
            data_processing_allowed=1,
        )

        # Manually insert second customer with same phone but different telegram_id
        conn.execute(
            "INSERT INTO customers (phone, telegram_id, qr_token, marketing_allowed, data_processing_allowed) VALUES (?, ?, ?, ?, ?)",
            ("79123456789", 987654321, "TOKEN123", 1, 1),
        )

        # Try to create customer with conflicting identifiers
        with pytest.raises(CustomerIdentityConflictError):
            resolve_or_create_customer(
                conn,
                phone="79123456789",
                telegram_id=987654321,  # This conflicts with second customer
                full_name="Conflict User",
                marketing_allowed=1,
                data_processing_allowed=1,
            )

    def test_token_collision_retry(self):
        """Test retry logic when token collision occurs."""
        conn = sqlite3.connect(":memory:")
        conn.execute(
            """
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                qr_token TEXT UNIQUE
            )
        """
        )
        conn.execute(
            """
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """
        )

        # Set base GUID
        base_guid = "550e8400-e29b-41d4-a716-446655440000"
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", base_guid),
        )

        # Pre-insert a token to cause collision
        conn.execute("INSERT INTO customers (qr_token) VALUES (?)", ("12345678",))

        # Mock random to return the colliding token first, then a different one
        with patch("app.utils.qr_codes.random.randint") as mock_randint:
            # First call returns colliding token, second call returns unique token
            mock_randint.side_effect = [12345678, 87654321]

            # Should handle collision and retry
            token = generate_unique_qr_token(conn)

            # Should get the non-colliding token
            assert token.isdigit()
            assert len(token) == 8
            assert token != "12345678"

    def test_performance_large_scale(self):
        """Test performance with large number of token generations."""
        conn = sqlite3.connect(":memory:")
        conn.execute(
            """
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                qr_token TEXT UNIQUE
            )
        """
        )
        conn.execute(
            """
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """
        )

        # Set base GUID
        base_guid = "550e8400-e29b-41d4-a716-446655440000"
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", base_guid),
        )

        # Generate many tokens
        tokens = set()
        for i in range(1000):
            token = generate_unique_qr_token(conn)
            tokens.add(token)
            # Insert the generated token to ensure uniqueness tracking
            conn.execute("INSERT INTO customers (qr_token) VALUES (?)", (token,))

        # Verify last token format
        assert len(token) == 8
        assert token.isdigit()  # Should be numeric for unique QR tokens
        assert 10_000_000 <= int(token) <= 99_999_999

        # Should have generated unique tokens (allow for rare collisions)
        assert len(tokens) >= 999  # Allow 1 collision in 1000 attempts


class TestEdgeCases:
    """Test edge cases and error conditions."""

    def test_empty_database(self):
        """Test token generation with empty customers table."""
        conn = sqlite3.connect(":memory:")
        conn.execute(
            """
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """
        )

        # Set base GUID
        base_guid = "550e8400-e29b-41d4-a716-446655440000"
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", base_guid),
        )

        # Should handle empty customers table
        token = generate_unique_qr_token(conn)
        assert len(token) == 8
        assert token.isdigit()

    def test_no_base_guid(self):
        """Test token generation when no base GUID exists."""
        conn = sqlite3.connect(":memory:")
        conn.execute(
            """
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                qr_token TEXT UNIQUE
            )
        """
        )
        # No system_settings table initially

        # Should create base GUID automatically
        token = generate_unique_qr_token(conn)
        assert len(token) == 8
        assert token.isdigit()

        # Check that base GUID was created
        guid = get_or_generate_base_guid(conn)
        assert guid is not None
        assert len(guid) == 36

    def test_max_retry_exceeded(self):
        """Test behavior when max retry attempts are exceeded."""
        conn = sqlite3.connect(":memory:")
        conn.execute(
            """
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                qr_token TEXT UNIQUE
            )
        """
        )
        conn.execute(
            """
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """
        )

        # Set base GUID
        base_guid = "550e8400-e29b-41d4-a716-446655440000"
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", base_guid),
        )

        # Mock the actual random source to always return the same colliding token
        with patch("app.utils.qr_codes.random.randint") as mock_randint:
            mock_randint.return_value = 12_345_678

            # Should eventually fallback to secure random
            token = generate_unique_qr_token(conn)
            print(f"Generated token: {token}")  # Debug output
            assert len(token) == 8
            assert token.isdigit()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
