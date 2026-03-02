"""
Unit tests for handlers.py consent edge cases.

Tests cover edge cases for consent functions:
- _store_consent with different consent types
- _get_customer_consents for non-existent customers
- _update_consent partial updates
- Consent audit trail
"""

import pytest
from datetime import datetime


class TestStoreConsentEdgeCases:
    """Test _store_consent with different scenarios."""

    def test_store_consent_data_processing_type(self, clean_database):
        """Test storing data processing consent."""
        from app.db import get_db
        from app.handlers import _store_consent

        db = get_db()
        conn = db.connect()

        # Create test customer
        conn.execute("""
            INSERT INTO customers (phone, full_name, telegram_id, qr_token, 
                                marketing_allowed, data_processing_allowed)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("+79991234567", "Test User", 123456, "test_qr", 1, 1))
        conn.commit()
        
        cur = conn.execute("SELECT id FROM customers WHERE telegram_id = 123456")
        customer_id = cur.fetchone()["id"]

        # Store data processing consent
        _store_consent(
            customer_id, 
            "Consent to process personal data v2.0",
            "2.0.0",
            "data_processing"
        )

        # Verify consent was stored
        cur = conn.execute(
            "SELECT * FROM consents WHERE customer_id = ? AND consent_type = ?",
            (customer_id, "data_processing")
        )
        consent = cur.fetchone()
        
        assert consent is not None
        assert consent["consent_type"] == "data_processing"
        assert consent["consent_version"] == "2.0.0"
        
        conn.close()

    def test_store_consent_marketing_type(self, clean_database):
        """Test storing marketing consent."""
        from app.db import get_db
        from app.handlers import _store_consent

        db = get_db()
        conn = db.connect()

        # Create test customer
        conn.execute("""
            INSERT INTO customers (phone, full_name, telegram_id, qr_token, 
                                marketing_allowed, data_processing_allowed)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("+79991234567", "Test User", 123456, "test_qr", 1, 1))
        conn.commit()
        
        cur = conn.execute("SELECT id FROM customers WHERE telegram_id = 123456")
        customer_id = cur.fetchone()["id"]

        # Store marketing consent
        _store_consent(
            customer_id, 
            "Consent to receive marketing messages",
            "1.0.0",
            "marketing"
        )

        # Verify consent was stored
        cur = conn.execute(
            "SELECT * FROM consents WHERE customer_id = ? AND consent_type = ?",
            (customer_id, "marketing")
        )
        consent = cur.fetchone()
        
        assert consent is not None
        assert consent["consent_type"] == "marketing"
        
        conn.close()

    def test_store_consent_default_type(self, clean_database):
        """Test storing consent with default type."""
        from app.db import get_db
        from app.handlers import _store_consent

        db = get_db()
        conn = db.connect()

        # Create test customer
        conn.execute("""
            INSERT INTO customers (phone, full_name, telegram_id, qr_token, 
                                marketing_allowed, data_processing_allowed)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("+79991234567", "Test User", 123456, "test_qr", 1, 1))
        conn.commit()
        
        cur = conn.execute("SELECT id FROM customers WHERE telegram_id = 123456")
        customer_id = cur.fetchone()["id"]

        # Store consent without specifying type (should default to data_processing)
        _store_consent(
            customer_id, 
            "Default consent",
            "1.0.0"
        )

        # Verify consent was stored with default type
        cur = conn.execute(
            "SELECT * FROM consents WHERE customer_id = ?",
            (customer_id,)
        )
        consent = cur.fetchone()
        
        assert consent is not None
        assert consent["consent_type"] == "data_processing"
        
        conn.close()


class TestGetCustomerConsentsEdgeCases:
    """Test _get_customer_consents edge cases."""

    def test_get_consents_nonexistent_customer(self, clean_database):
        """Test getting consents for non-existent customer."""
        from app.handlers import _get_customer_consents

        result = _get_customer_consents(999999)

        assert result["marketing_allowed"] is False
        assert result["data_processing_allowed"] is False

    def test_get_consents_partial_consent(self, clean_database):
        """Test getting consents when customer has partial consent."""
        from app.db import get_db
        from app.handlers import _get_customer_consents

        db = get_db()
        conn = db.connect()

        # Create customer with only data processing consent
        conn.execute("""
            INSERT INTO customers (phone, full_name, telegram_id, qr_token,
                                marketing_allowed, data_processing_allowed)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("+79991234567", "Test User", 777777, "test_qr", 0, 1))
        conn.commit()

        consents = _get_customer_consents(777777)
        
        assert consents["marketing_allowed"] is False
        assert consents["data_processing_allowed"] is True
        
        conn.close()


class TestUpdateConsentEdgeCases:
    """Test _update_consent edge cases."""

    def test_update_only_marketing_consent(self, clean_database):
        """Test updating only marketing consent."""
        from app.db import get_db
        from app.handlers import _update_consent, _get_customer_consents

        db = get_db()
        conn = db.connect()

        # Create test customer with both consents
        conn.execute("""
            INSERT INTO customers (phone, full_name, telegram_id, qr_token,
                                marketing_allowed, data_processing_allowed)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("+79991234567", "Test User", 777777, "test_qr", 1, 1))
        conn.commit()

        # Update only marketing consent
        _update_consent(777777, marketing_allowed=0)

        # Verify only marketing was updated
        consents = _get_customer_consents(777777)
        assert consents["marketing_allowed"] is False
        assert consents["data_processing_allowed"] is True
        
        conn.close()

    def test_update_only_data_processing_consent(self, clean_database):
        """Test updating only data processing consent."""
        from app.db import get_db
        from app.handlers import _update_consent, _get_customer_consents

        db = get_db()
        conn = db.connect()

        # Create test customer with both consents
        conn.execute("""
            INSERT INTO customers (phone, full_name, telegram_id, qr_token,
                                marketing_allowed, data_processing_allowed)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("+79991234567", "Test User", 777777, "test_qr", 1, 1))
        conn.commit()

        # Update only data processing consent
        _update_consent(777777, data_processing_allowed=0)

        # Verify only data processing was updated
        consents = _get_customer_consents(777777)
        assert consents["marketing_allowed"] is True
        assert consents["data_processing_allowed"] is False
        
        conn.close()

    def test_update_consent_nonexistent_customer(self, clean_database):
        """Test updating consent for non-existent customer (should not raise)."""
        from app.handlers import _update_consent

        # Should not raise even though customer doesn't exist
        _update_consent(999999, marketing_allowed=0)

    def test_update_both_consents(self, clean_database):
        """Test updating both consents at once."""
        from app.db import get_db
        from app.handlers import _update_consent, _get_customer_consents

        db = get_db()
        conn = db.connect()

        # Create test customer with both consents
        conn.execute("""
            INSERT INTO customers (phone, full_name, telegram_id, qr_token,
                                marketing_allowed, data_processing_allowed)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("+79991234567", "Test User", 777777, "test_qr", 1, 1))
        conn.commit()

        # Update both consents
        _update_consent(777777, marketing_allowed=0, data_processing_allowed=0)

        # Verify both were updated
        consents = _get_customer_consents(777777)
        assert consents["marketing_allowed"] is False
        assert consents["data_processing_allowed"] is False
        
        conn.close()


class TestConsentConstants:
    """Test consent-related constants."""

    def test_policy_version_constant_exists(self):
        """Test that CURRENT_POLICY_VERSION is defined."""
        from app.handlers import CURRENT_POLICY_VERSION
        
        assert CURRENT_POLICY_VERSION is not None
        assert isinstance(CURRENT_POLICY_VERSION, str)
        assert len(CURRENT_POLICY_VERSION) > 0
