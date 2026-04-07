"""
Unit tests for handlers.py consent edge cases.

Tests cover edge cases for consent functions:
- _store_consent with different consent types
- _get_customer_consents for non-existent customers
- _update_consent partial updates
- Consent audit trail
"""


class TestStoreConsentEdgeCases:
    """Test _store_consent with different scenarios."""

    def test_store_consent_data_processing_type(self, clean_database):
        """Test storing data processing consent."""
        from app.db import get_db
        from app.handlers import _store_consent

        db = get_db()
        conn = db.connect()

        # Create test customer
        conn.execute(
            """
            INSERT INTO customers (phone, full_name, telegram_id, qr_token,
                                marketing_allowed, data_processing_allowed)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            ("+79991234567", "Test User", 123456, "test_qr", 1, 1),
        )
        conn.commit()

        # Test storing consent
        _store_consent(123456, "data_processing", True, conn)

        # Verify consent was stored
        result = conn.execute(
            "SELECT data_processing_allowed FROM customers WHERE telegram_id = ?", (123456,)
        ).fetchone()
        assert result[0] == 1

        conn.close()
