"""
Unit tests for marketing_api.py consent filtering functions.

Tests cover:
- get_customers_with_consent function
- Marketing consent filtering logic
"""

import pytest
from datetime import datetime


class TestGetCustomersWithConsent:
    """Test get_customers_with_consent function."""

    def test_get_customers_with_consent_returns_only_consented(self, clean_database):
        """Test that only customers with marketing consent are returned."""
        from app.db import get_db
        from app.marketing_api import get_customers_with_consent

        db = get_db()
        conn = db.connect()

        # Create customers - some with consent, some without
        conn.execute("""
            INSERT INTO customers (phone, full_name, telegram_id, qr_token, marketing_allowed)
            VALUES (?, ?, ?, ?, ?)
        """, ("+79991234567", "User With Consent", 111111, "qr1", 1))
        
        conn.execute("""
            INSERT INTO customers (phone, full_name, telegram_id, qr_token, marketing_allowed)
            VALUES (?, ?, ?, ?, ?)
        """, ("+79991234568", "User Without Consent", 111112, "qr2", 0))
        
        conn.commit()
        conn.close()

        result = get_customers_with_consent()

        assert len(result) == 1
        assert result[0]["telegram_id"] == 111111
        assert result[0]["marketing_allowed"] == 1

    def test_get_customers_with_consent_filters_vk_id(self, clean_database):
        """Test that customers with VK but no Telegram are included if they have consent."""
        from app.db import get_db
        from app.marketing_api import get_customers_with_consent

        db = get_db()
        conn = db.connect()

        # Create customer with VK only
        conn.execute("""
            INSERT INTO customers (phone, full_name, vk_id, qr_token, marketing_allowed)
            VALUES (?, ?, ?, ?, ?)
        """, ("+79991234567", "VK User", 222222, "qr_vk", 1))
        
        conn.commit()
        conn.close()

        result = get_customers_with_consent()

        assert len(result) == 1
        assert result[0]["vk_id"] == 222222

    def test_get_customers_with_consent_excludes_no_channel(self, clean_database):
        """Test that customers with no social channel are excluded."""
        from app.db import get_db
        from app.marketing_api import get_customers_with_consent

        db = get_db()
        conn = db.connect()

        # Create customer with no telegram_id or vk_id but has consent
        conn.execute("""
            INSERT INTO customers (phone, full_name, qr_token, marketing_allowed)
            VALUES (?, ?, ?, ?)
        """, ("+79991234567", "No Channel User", "qr_no_channel", 1))
        
        conn.commit()
        conn.close()

        result = get_customers_with_consent()

        assert len(result) == 0

    def test_get_customers_with_consent_respects_limit(self, clean_database):
        """Test that limit parameter is respected."""
        from app.db import get_db
        from app.marketing_api import get_customers_with_consent

        db = get_db()
        conn = db.connect()

        # Create multiple customers with consent
        for i in range(5):
            conn.execute("""
                INSERT INTO customers (phone, full_name, telegram_id, qr_token, marketing_allowed)
                VALUES (?, ?, ?, ?, ?)
            """, (f"+799912345{i:02d}", f"User {i}", 111100 + i, f"qr{i}", 1))
        
        conn.commit()
        conn.close()

        result = get_customers_with_consent(limit=3)

        assert len(result) == 3

    def test_get_customers_with_consent_respects_offset(self, clean_database):
        """Test that offset parameter is respected."""
        from app.db import get_db
        from app.marketing_api import get_customers_with_consent

        db = get_db()
        conn = db.connect()

        # Create multiple customers with consent
        for i in range(5):
            conn.execute("""
                INSERT INTO customers (phone, full_name, telegram_id, qr_token, marketing_allowed)
                VALUES (?, ?, ?, ?, ?)
            """, (f"+799912345{i:02d}", f"User {i}", 111100 + i, f"qr{i}", 1))
        
        conn.commit()
        conn.close()

        result = get_customers_with_consent(limit=10, offset=3)

        assert len(result) == 2
        assert result[0]["telegram_id"] == 111103

    def test_get_customers_with_consent_empty_database(self, clean_database):
        """Test that empty list is returned when no customers exist."""
        from app.marketing_api import get_customers_with_consent

        result = get_customers_with_consent()

        assert result == []

    def test_get_customers_with_consent_returns_required_fields(self, clean_database):
        """Test that returned customers have required fields."""
        from app.db import get_db
        from app.marketing_api import get_customers_with_consent

        db = get_db()
        conn = db.connect()

        conn.execute("""
            INSERT INTO customers (phone, full_name, telegram_id, qr_token, marketing_allowed)
            VALUES (?, ?, ?, ?, ?)
        """, ("+79991234567", "Test User", 111111, "qr1", 1))
        
        conn.commit()
        conn.close()

        result = get_customers_with_consent()

        assert len(result) == 1
        customer = result[0]
        # Check required fields
        assert "id" in customer
        assert "telegram_id" in customer
        assert "phone" in customer
        assert "full_name" in customer
        assert "marketing_allowed" in customer
