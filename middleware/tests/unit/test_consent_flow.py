"""
Unit tests for 152-ФЗ consent flow functionality.

Tests cover:
- Consent storage and retrieval
- Marketing consent management
- Revocation logic
- Database schema migrations
"""

import os
import tempfile

import pytest


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
    conn.execute(
        """
        INSERT INTO customers (phone, full_name, telegram_id, qr_token,
                            marketing_allowed, data_processing_allowed)
        VALUES (?, ?, ?, ?, ?, ?)
    """,
        ("+79991234567", "Test User", 123456, "test_qr", 1, 1),
    )
    conn.commit()

    cur = conn.execute("SELECT id FROM customers WHERE telegram_id = 123456")
    customer_id = cur.fetchone()["id"]

    # Store data processing consent
    _store_consent(customer_id, "Consent to process personal data", "1.0.0", "data_processing")

    # Store marketing consent
    _store_consent(customer_id, "Consent to receive marketing messages", "1.0.0", "marketing")

    # Verify both consents were stored
    cur = conn.execute(
        "SELECT consent_type, consent_text FROM consents WHERE customer_id = ?",
        (customer_id,),
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

    # Create test customer with marketing consent
    conn.execute(
        """
        INSERT INTO customers (phone, full_name, telegram_id, qr_token,
                            marketing_allowed, data_processing_allowed)
        VALUES (?, ?, ?, ?, ?, ?)
    """,
        ("+79991234568", "Test User 2", 654321, "test_qr2", 1, 1),
    )
    conn.commit()

    # Should find customer with consent
    has_consent = _get_customer_consents(654321)
    assert has_consent["marketing_allowed"] is True
    assert has_consent["data_processing_allowed"] is True

    conn.close()


def test_update_consent(setup_test_db):
    """Test updating customer consent status."""
    from app.db import get_db
    from app.handlers import _get_customer_consents, _update_consent

    db = get_db()
    conn = db.connect()

    # Create test customer with marketing consent
    conn.execute(
        """
        INSERT INTO customers (phone, full_name, telegram_id, qr_token,
                            marketing_allowed, data_processing_allowed)
        VALUES (?, ?, ?, ?, ?, ?)
    """,
        ("+79991234569", "Test User 3", 777777, "test_qr3", 1, 1),
    )
    conn.commit()

    # Update to revoke consent
    _update_consent(777777, marketing_allowed=0)

    # Verify consent status is updated in DB
    consent_status = _get_customer_consents(777777)
    assert consent_status["marketing_allowed"] is False

    # Update to grant consent again
    _update_consent(777777, marketing_allowed=1)

    # Verify consent is granted
    consent_status = _get_customer_consents(777777)
    assert consent_status["marketing_allowed"] is True

    conn.close()


def test_customers_table_has_required_columns(setup_test_db):
    """Test that customers table has marketing_allowed and data_processing_allowed columns."""
    from app.db import get_db

    db = get_db()
    conn = db.connect()

    cur = conn.execute("PRAGMA table_info(customers)")
    columns = {row["name"] for row in cur.fetchall()}

    assert "marketing_allowed" in columns, "customers table must have marketing_allowed column"
    assert "data_processing_allowed" in columns, "customers table must have data_processing_allowed column"
    conn.close()


def test_policy_version_constant():
    """Test that CURRENT_POLICY_VERSION constant is defined and in correct format."""
    from app.handlers import CURRENT_POLICY_VERSION

    assert isinstance(CURRENT_POLICY_VERSION, str), "CURRENT_POLICY_VERSION must be a string"

    # Verify semver format (major.minor.patch)
    parts = CURRENT_POLICY_VERSION.split(".")
    assert len(parts) == 3, "CURRENT_POLICY_VERSION should be in semver format (x.y.z)"
    assert all(part.isdigit() for part in parts), "All parts of version must be numeric"
    assert int(parts[0]) >= 1, "Major version should be at least 1"


def test_consent_audit_trail(setup_test_db):
    """Test that consent actions create audit trail entries."""
    from app.db import get_db
    from app.handlers import _store_consent, _update_consent

    db = get_db()
    conn = db.connect()

    # Create test customer
    conn.execute(
        """
        INSERT INTO customers (phone, full_name, telegram_id, qr_token,
                            marketing_allowed, data_processing_allowed)
        VALUES (?, ?, ?, ?, ?, ?)
    """,
        ("+79991234567", "Test User", 555555, "audit_qr", 1, 1),
    )
    conn.commit()

    cur = conn.execute("SELECT id FROM customers WHERE telegram_id = 555555")
    customer_id = cur.fetchone()["id"]

    # Store initial consent
    _store_consent(
        customer_id,
        "Consent to receive marketing messages",
        "1.0.0",
        "marketing",
        conn=conn,
    )

    # Revoke consent - should create audit entry
    _update_consent(555555, marketing_allowed=0, conn=conn)

    # Verify audit entry
    cur = conn.execute(
        "SELECT * FROM consents WHERE customer_id = ? AND consent_type = 'marketing' ORDER BY accepted_at ASC",
        (customer_id,),
    )
    consents = cur.fetchall()

    # Print consents for debugging
    print("Consents:", [c["consent_text"] for c in consents])

    # Should have original consent + revocation entry
    assert len(consents) >= 2, "Revocation should be logged"

    # Most recent should indicate revocation
    latest = consents[-1]
    assert "отзыв" in latest["consent_text"].lower(), "Consent should be revoked"
    # Original consent text is preserved for 152-ФЗ compliance
    assert any(
        "marketing" in consent["consent_text"].lower() for consent in consents
    ), "Marketing consent should be present"

    conn.close()
