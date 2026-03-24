"""Unit tests for QR token generation system."""

import sqlite3
from unittest.mock import patch

from app.customer_identity import generate_unique_qr_token, get_or_generate_base_guid
from app.utils.qr_codes import generate_unique_token


class TestQRTokenGeneration:
    """Test QR token generation functionality."""

    def test_generate_unique_token_format(self):
        """Test QR token format - should be 8 numeric characters"""
        conn = sqlite3.connect(":memory:")
        conn.execute(
            "CREATE TABLE customers (id INTEGER PRIMARY KEY, qr_token TEXT UNIQUE)"
        )

        token = generate_unique_token(conn)

        assert len(token) == 8
        assert token.isdigit()  # Should be numeric
        assert 10_000_000 <= int(token) <= 99_999_999  # Valid range

    def test_generate_unique_token_uniqueness(self):
        conn = sqlite3.connect(":memory:")
        conn.execute(
            "CREATE TABLE customers (id INTEGER PRIMARY KEY, qr_token TEXT UNIQUE)"
        )

        tokens = [generate_unique_token(conn) for _ in range(10)]
        assert len(set(tokens)) == 10  # All should be unique

    @patch("uuid.uuid4")
    def test_get_or_generate_base_guid_new(self, mock_uuid):
        mock_uuid.return_value = "550e8400-e29b-41d4-a716-446655440000"

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

        base_guid = get_or_generate_base_guid(conn)

        assert base_guid == "550e8400-e29b-41d4-a716-446655440000"
        mock_uuid.assert_called_once()

    def test_get_or_generate_base_guid_existing(self):
        existing_guid = "12345678-1234-5678-9abc-123456789012"

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
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", existing_guid),
        )

        assert get_or_generate_base_guid(conn) == existing_guid

    @patch("app.customer_identity.get_or_generate_base_guid")
    def test_generate_unique_qr_token_with_guid(self, mock_get_guid):
        mock_get_guid.return_value = "550e8400-e29b-41d4-a716-446655440000"

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

        token1 = generate_unique_qr_token(conn)
        assert len(token1) == 8
        assert all(c in "0123456789" for c in token1)  # Only digits now
        assert token1.isdigit()

        conn.execute("INSERT INTO customers (qr_token) VALUES (?)", (token1,))
        token2 = generate_unique_qr_token(conn)

        assert token1 != token2
        assert len(token2) == 8
        assert all(c in "0123456789" for c in token2)  # Only digits now
        assert token2.isdigit()

    def test_generate_unique_qr_token_empty_database(self):
        conn = sqlite3.connect(":memory:")

        token = generate_unique_qr_token(conn)

        assert len(token) == 8
        assert all(c in "0123456789" for c in token)  # Only digits now
        assert token.isdigit()

    def test_qr_token_incremental_pattern(self):
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
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            ("qr_token_base_guid", "550e8400-e29b-41d4-a716-446655440000"),
        )

        tokens = []
        for _ in range(5):
            conn.execute(
                "INSERT INTO customers (qr_token) VALUES (?)", ("placeholder",)
            )
            tokens.append(generate_unique_qr_token(conn))

        assert len(set(tokens)) == len(tokens)
        assert all(len(token) == 8 for token in tokens)


class TestQRTokenIntegration:
    """Integration tests for QR token system."""

    def test_generate_unique_token_consistency(self):
        """Test QR token consistency - should always be 8 numeric characters"""
        conn = sqlite3.connect(":memory:")
        conn.execute(
            "CREATE TABLE customers (id INTEGER PRIMARY KEY, qr_token TEXT UNIQUE)"
        )

        tokens = [generate_unique_token(conn) for _ in range(20)]

        for token in tokens:
            assert len(token) == 8
            assert token.isdigit()  # Should be numeric
            assert 10_000_000 <= int(token) <= 99_999_999  # Valid range

    def test_generate_unique_token_no_collisions_large_sample(self):
        conn = sqlite3.connect(":memory:")
        conn.execute(
            "CREATE TABLE customers (id INTEGER PRIMARY KEY, qr_token TEXT UNIQUE)"
        )

        tokens = [generate_unique_token(conn) for _ in range(1000)]
        uniqueness_ratio = len(set(tokens)) / len(tokens)
        assert uniqueness_ratio >= 0.99  # Should be almost unique
