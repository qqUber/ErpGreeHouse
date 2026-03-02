"""
Unit tests for 152-ФЗ consent flow functionality.

Tests cover:
- Consent storage and retrieval
- Marketing consent management
- Revocation logic
- Database schema migrations
"""

import pytest
import os
import tempfile
import sqlite3
from datetime import datetime


# Set test database path before importing app modules
@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Set up a temporary test database for consent tests."""
    # Create temp database
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.environ["CRM_DB_PATH"] = db_path
    
    yield db_path
    
    # Cleanup
    os.close(db_fd)
    if os.path.exists(db_path):
        os.unlink(db_path)


def test_consents_table_has_consent_type_column(setup_test_db):
    """Test that consents table has consent_type column for 152-ФЗ."""
    from app.db import get_db
    
    db = get_db()
    conn = db.connect()
    
    # Check column exists
    cur = conn.execute("PRAGMA table_info(consents)")
    columns = {row["name"] for row in cur.fetchall()}
    
    assert "consent_type" in columns, "consents table must have consent_type column"
    conn.close()


def test_store_consent_with_type(setup_test_db):
    """Test storing consent with different types."""
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
        "Consent to process personal data",
        "1.0.0",
        "data_processing"
    )
    
    # Store marketing consent
    _store_consent(
        customer_id,
        "Consent to receive marketing messages",
        "1.0.0",
        "marketing"
    )
    
    # Verify both consents were stored
    cur = conn.execute(
        "SELECT consent_type, consent_text FROM consents WHERE customer_id = ?",
        (customer_id,)
    )
    consents = cur.fetchall()
    
    consent_types = {c["consent_type"] for c in consents}
    assert "data_processing" in consent_types
    assert "marketing" in consent_types
    
    conn.close()


def test_get_customer_consents(setup_test_db):
    """Test retrieving customer consent status."""
    from app.db import get_db
    from app.handlers import _get_customer_consents
    
    db = get_db()
    conn = db.connect()
    
    # Create test customer with specific consent settings
    conn.execute("""
        INSERT INTO customers (phone, full_name, telegram_id, qr_token,
                            marketing_allowed, data_processing_allowed)
        VALUES (?, ?, ?, ?, ?, ?)
    """, ("+79991234567", "Test User", 999999, "test_qr2", 1, 1))
    conn.commit()
    
    # Get consents
    consents = _get_customer_consents(999999)
    
    assert consents["marketing_allowed"] is True
    assert consents["data_processing_allowed"] is True
    
    # Create another customer without marketing consent
    conn.execute("""
        INSERT INTO customers (phone, full_name, telegram_id, qr_token,
                            marketing_allowed, data_processing_allowed)
        VALUES (?, ?, ?, ?, ?, ?)
    """, ("+79991234568", "Test User 2", 999998, "test_qr3", 0, 1))
    conn.commit()
    
    consents2 = _get_customer_consents(999998)
    assert consents2["marketing_allowed"] is False
    assert consents2["data_processing_allowed"] is True
    
    conn.close()


def test_update_consent(setup_test_db):
    """Test updating customer consent status."""
    from app.db import get_db
    from app.handlers import _update_consent, _get_customer_consents
    
    db = get_db()
    conn = db.connect()
    
    # Create test customer
    conn.execute("""
        INSERT INTO customers (phone, full_name, telegram_id, qr_token,
                            marketing_allowed, data_processing_allowed)
        VALUES (?, ?, ?, ?, ?, ?)
    """, ("+79991234567", "Test User", 777777, "test_qr4", 1, 1))
    conn.commit()
    
    # Revoke marketing consent
    _update_consent(777777, marketing_allowed=0)
    
    # Verify
    consents = _get_customer_consents(777777)
    assert consents["marketing_allowed"] is False
    assert consents["data_processing_allowed"] is True
    
    # Re-enable marketing consent
    _update_consent(777777, marketing_allowed=1)
    
    consents = _get_customer_consents(777777)
    assert consents["marketing_allowed"] is True
    
    conn.close()


def test_customers_table_has_required_columns(setup_test_db):
    """Test that customers table has all required 152-ФЗ columns."""
    from app.db import get_db
    
    db = get_db()
    conn = db.connect()
    
    # Check required columns
    cur = conn.execute("PRAGMA table_info(customers)")
    columns = {row["name"] for row in cur.fetchall()}
    
    required = {"marketing_allowed", "data_processing_allowed", "telegram_id"}
    missing = required - columns
    
    assert not missing, f"Missing required columns: {missing}"
    conn.close()


def test_policy_version_constant():
    """Test that policy version constant is defined."""
    from app.handlers import CURRENT_POLICY_VERSION
    
    assert CURRENT_POLICY_VERSION is not None
    assert isinstance(CURRENT_POLICY_VERSION, str)
    assert len(CURRENT_POLICY_VERSION) > 0


def test_get_customers_with_consent(setup_test_db):
    """Test getting customers with marketing consent."""
    from app.db import get_db
    from app.marketing_api import get_customers_with_consent
    
    db = get_db()
    conn = db.connect()
    
    # Create customers - some with consent, some without
    customers_with_consent = [
        ("+79991234567", "User 1", 111111, "qr1", 1),
        ("+79991234568", "User 2", 111112, "qr2", 1),
    ]
    
    customers_without_consent = [
        ("+79991234569", "User 3", 111113, "qr3", 0),
    ]
    
    for phone, name, tg_id, qr, marketing in customers_with_consent + customers_without_consent:
        conn.execute("""
            INSERT INTO customers (phone, full_name, telegram_id, qr_token, marketing_allowed)
            VALUES (?, ?, ?, ?, ?)
        """, (phone, name, tg_id, qr, marketing))
    conn.commit()
    
    # Get customers with consent
    result = get_customers_with_consent()
    
    assert len(result) == 2, "Should return only customers with marketing consent"
    assert all(r["marketing_allowed"] == 1 for r in result)
    
    conn.close()


def test_consent_audit_trail(setup_test_db):
    """Test that consent actions create audit trail entries."""
    from app.db import get_db
    from app.handlers import _update_consent, _store_consent
    
    db = get_db()
    conn = db.connect()
    
    # Create test customer
    conn.execute("""
        INSERT INTO customers (phone, full_name, telegram_id, qr_token,
                            marketing_allowed, data_processing_allowed)
        VALUES (?, ?, ?, ?, ?, ?)
    """, ("+79991234567", "Test User", 555555, "audit_qr", 1, 1))
    conn.commit()
    
    cur = conn.execute("SELECT id FROM customers WHERE telegram_id = 555555")
    customer_id = cur.fetchone()["id"]
    
    # Store initial consent
    _store_consent(
        customer_id,
        "Consent to receive marketing messages",
        "1.0.0",
        "marketing",
        conn=conn
    )
    
    # Revoke consent - should create audit entry
    _update_consent(555555, marketing_allowed=0, conn=conn)
    
    # Verify audit entry
    cur = conn.execute(
        "SELECT * FROM consents WHERE customer_id = ? AND consent_type = 'marketing' ORDER BY accepted_at DESC",
        (customer_id,)
    )
    consents = cur.fetchall()
    
    # Should have original consent + revocation entry
    assert len(consents) >= 2, "Revocation should be logged"
    
    # Most recent should indicate revocation (accepted=0)
    latest = consents[0]
    assert latest["accepted"] == 0, "Consent should be revoked (accepted=0)"
    # Original consent text is preserved for 152-ФЗ compliance
    assert "marketing" in latest["consent_text"].lower()
    
    conn.close()
