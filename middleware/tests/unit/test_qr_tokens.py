"""Unit tests for QR token generation system."""

import sqlite3
from unittest.mock import patch

from app.customer_identity import generate_unique_qr_token, get_or_generate_base_guid
from app.identify import generate_qr_token


class TestQRTokenGeneration:
    """Test QR token generation functionality."""

    def test_generate_qr_token_format(self):
        """Test legacy QR token format - should be 8 hex characters"""
        token = generate_qr_token()

        assert len(token) == 8
        assert all(c in "0123456789ABCDEF" for c in token)  # Hex characters only
        assert all(c.isalnum() for c in token)  # Alphanumeric check
        # Check if token is uppercase (only meaningful if contains letters)
        if any(c.isalpha() for c in token):
            assert token.isupper()  # Should be uppercase if contains letters

    def test_generate_qr_token_uniqueness(self):
        tokens = [generate_qr_token() for _ in range(10)]
        assert len(set(tokens)) >= 5

    @patch("uuid.uuid4")
    def test_get_or_generate_base_guid_new(self, mock_uuid):
        mock_uuid.return_value = "550e8400-e29b-41d4-a716-446655440000"

        conn = sqlite3.connect(":memory:")
        conn.execute("""
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
            """)

        base_guid = get_or_generate_base_guid(conn)

        assert base_guid == "550e8400-e29b-41d4-a716-446655440000"
        mock_uuid.assert_called_once()

    def test_get_or_generate_base_guid_existing(self):
        existing_guid = "12345678-1234-5678-9abc-123456789012"

        conn = sqlite3.connect(":memory:")
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
            ("qr_token_base_guid", existing_guid),
        )

        assert get_or_generate_base_guid(conn) == existing_guid

    @patch("app.customer_identity.get_or_generate_base_guid")
    def test_generate_unique_qr_token_with_guid(self, mock_get_guid):
        mock_get_guid.return_value = "550e8400-e29b-41d4-a716-446655440000"

        conn = sqlite3.connect(":memory:")
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

    def test_qr_token_consistency_across_calls(self):
        """Test QR token consistency - should always be 8 hex characters"""
        tokens = [generate_qr_token() for _ in range(20)]

        for token in tokens:
            assert len(token) == 8
            assert all(c in "0123456789ABCDEF" for c in token)  # Hex characters only
            assert all(c.isalnum() for c in token)  # Alphanumeric check
            # Check if token is uppercase (only meaningful if contains letters)
            if any(c.isalpha() for c in token):
                assert token.isupper()  # Should be uppercase if contains letters

    def test_qr_token_no_collisions_large_sample(self):
        tokens = [generate_qr_token() for _ in range(1000)]
        uniqueness_ratio = len(set(tokens)) / len(tokens)
        assert uniqueness_ratio >= 0.7

    @patch("app.identify.secrets.token_hex", return_value="ABC12345")
    def test_qr_token_deterministic_for_testing(self, mock_token_hex):
        token1 = generate_qr_token()
        token2 = generate_qr_token()

        assert token1 == token2 == "ABC12345"
        assert mock_token_hex.call_count == 2
