"""
Unit tests for marketing_api.py consent filtering functions.

Tests cover:
- get_customers_with_consent function
- Marketing consent filtering logic
"""


class TestGetCustomersWithConsent:
    """Test get_customers_with_consent function."""

    def test_get_customers_with_consent_returns_only_consented(self, clean_database):
        """Test that only customers with marketing consent are returned."""
        from app.db import get_db
        from app.marketing_api import get_customers_with_consent

        db = get_db()
        conn = db.connect()

        # Create test customers with different consent statuses
        conn.execute(
            """
            INSERT INTO customers (phone, full_name, telegram_id, qr_token,
                                marketing_allowed, data_processing_allowed)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            ("+79991234567", "User 1", 123456, "test_qr1", 1, 1),
        )
        conn.execute(
            """
            INSERT INTO customers (phone, full_name, vk_id, qr_token,
                                marketing_allowed, data_processing_allowed)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            ("+79991234568", "User 2", 789012, "test_qr2", 0, 1),
        )
        conn.commit()

        # Test filtering by marketing consent
        result = get_customers_with_consent(marketing_consent=True, limit=10, offset=0)

        # Only customer with marketing consent should be returned
        assert len(result) == 1
        assert result[0]["telegram_id"] == 123456

        conn.close()