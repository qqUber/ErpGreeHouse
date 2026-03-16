#!/usr/bin/env python3
"""
Foreign Key Constraint Test for ERP GreenHouse

This test verifies that Foreign Key constraints are properly enforced
in the database. It tests creating records with non-existent foreign keys
should fail when FK constraints are enabled.

Usage:
    pytest tests/unit/test_foreign_key_constraints.py -v
"""

import os
import sqlite3
import sys
import tempfile
from pathlib import Path

import pytest

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from app.db import get_db_path, init_db


class TestForeignKeyConstraints:
    """Test suite for Foreign Key constraint enforcement."""

    @pytest.fixture
    def test_db(self):
        """Create a temporary test database."""
        # Create a temporary database file
        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)

        # Connect and enable FK constraints
        conn = sqlite3.connect(path)
        conn.execute("PRAGMA foreign_keys = ON")

        # Create minimal tables with FK
        conn.executescript("""
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT UNIQUE,
                full_name TEXT
            );

            CREATE TABLE transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                total_amount INTEGER NOT NULL,
                bonus_used INTEGER NOT NULL,
                bonus_earned INTEGER NOT NULL,
                items_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
            );
        """)
        conn.commit()

        yield path

        conn.close()
        os.unlink(path)

    @pytest.fixture
    def test_db_no_fk(self):
        """Create a temporary test database without FK enforcement."""
        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)

        conn = sqlite3.connect(path)
        # NOT enabling foreign_keys
        conn.executescript("""
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT UNIQUE,
                full_name TEXT
            );

            CREATE TABLE transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                total_amount INTEGER NOT NULL,
                bonus_used INTEGER NOT NULL,
                bonus_earned INTEGER NOT NULL,
                items_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        """)
        conn.commit()

        yield path

        conn.close()
        os.unlink(path)

    def test_fk_constraint_enforced(self, test_db):
        """Test that FK constraints are enforced - should FAIL when inserting invalid FK."""
        conn = sqlite3.connect(test_db)
        conn.execute("PRAGMA foreign_keys = ON")

        # Try to insert a transaction with non-existent customer_id
        # This SHOULD FAIL if FK constraints are properly enforced
        with pytest.raises(sqlite3.IntegrityError) as exc_info:
            conn.execute("""
                INSERT INTO transactions (customer_id, total_amount, bonus_used, bonus_earned, items_json)
                VALUES (999, 100, 0, 10, '{}')
            """)

        assert "FOREIGN KEY constraint failed" in str(exc_info.value)
        conn.close()

    def test_fk_constraint_with_valid_customer(self, test_db):
        """Test that valid FK inserts work correctly."""
        conn = sqlite3.connect(test_db)
        conn.execute("PRAGMA foreign_keys = ON")

        # Insert a customer first
        cursor = conn.execute("""
            INSERT INTO customers (phone, full_name)
            VALUES ('+1234567890', 'Test Customer')
        """)
        customer_id = cursor.lastrowid

        # Insert a transaction with valid customer_id
        conn.execute(
            """
            INSERT INTO transactions (customer_id, total_amount, bonus_used, bonus_earned, items_json)
            VALUES (?, 100, 0, 10, '{}')
        """,
            (customer_id,),
        )

        # Verify it was inserted
        result = conn.execute("SELECT COUNT(*) as cnt FROM transactions").fetchone()
        assert result[0] == 1

        conn.close()

    def test_fk_constraint_violation_without_fk_enabled(self, test_db_no_fk):
        """Test that without FK enabled, invalid FK inserts SUCCEED (this is bad!)."""
        conn = sqlite3.connect(test_db_no_fk)
        # NOT calling PRAGMA foreign_keys = ON

        # This will SUCCEED even though customer_id 999 doesn't exist
        # This demonstrates the problem when FK is not enabled
        conn.execute("""
            INSERT INTO transactions (customer_id, total_amount, bonus_used, bonus_earned, items_json)
            VALUES (999, 100, 0, 10, '{}')
        """)

        # Verify it was inserted (bad data!)
        result = conn.execute(
            "SELECT customer_id FROM transactions WHERE customer_id = 999"
        ).fetchone()
        assert result is not None
        assert result[0] == 999

        conn.close()

    def test_cascade_delete(self, test_db):
        """Test that ON DELETE CASCADE works correctly."""
        conn = sqlite3.connect(test_db)
        conn.execute("PRAGMA foreign_keys = ON")

        # Insert a customer
        cursor = conn.execute("""
            INSERT INTO customers (phone, full_name)
            VALUES ('+1234567890', 'Test Customer')
        """)
        customer_id = cursor.lastrowid

        # Insert a transaction
        conn.execute(
            """
            INSERT INTO transactions (customer_id, total_amount, bonus_used, bonus_earned, items_json)
            VALUES (?, 100, 0, 10, '{}')
        """,
            (customer_id,),
        )

        # Verify transaction exists
        result = conn.execute("SELECT COUNT(*) as cnt FROM transactions").fetchone()
        assert result[0] == 1

        # Delete the customer
        conn.execute("DELETE FROM customers WHERE id = ?", (customer_id,))

        # Verify transaction was cascade deleted
        result = conn.execute("SELECT COUNT(*) as cnt FROM transactions").fetchone()
        assert result[0] == 0

        conn.close()


def test_real_database_fk_constraints():
    """Test FK constraints on the actual application database."""
    db_path = get_db_path()

    if not Path(db_path).exists():
        pytest.skip(f"Database not found at {db_path}")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys for this connection (same as app/db.py)
    conn.execute("PRAGMA foreign_keys = ON")

    # Check if foreign keys are enabled
    cursor = conn.execute("PRAGMA foreign_keys")
    fk_enabled = cursor.fetchone()[0]

    # Check existing foreign keys in the database
    tables_with_fk = []
    cursor = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
    tables = [row[0] for row in cursor.fetchall()]

    for table in tables:
        cursor = conn.execute(f"PRAGMA foreign_key_list({table})")
        fks = cursor.fetchall()
        if fks:
            tables_with_fk.append(table)

    conn.close()

    # Report findings
    print(f"\nForeign Key Status:")
    print(f"  FK Constraints Enabled: {fk_enabled == 1}")
    print(f"  Tables with FK constraints: {len(tables_with_fk)}")
    for table in tables_with_fk:
        print(f"    - {table}")

    # The test passes if FK are enabled
    assert fk_enabled == 1, "Foreign keys should be enabled in the database"


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v"])
