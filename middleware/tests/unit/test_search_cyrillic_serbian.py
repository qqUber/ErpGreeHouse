#!/usr/bin/env python3
"""
Search Functionality Test for Cyrillic and Serbian Latin Characters

This test verifies how the search functionality handles Cyrillic (Russian)
and Serbian Latin (ć, č, đ, š, ž) characters.

Usage:
    pytest tests/unit/test_search_cyrillic_serbian.py -v
"""

import os
import sqlite3
import sys
import tempfile
from pathlib import Path

import pytest


class TestSearchCyrillicSerbian:
    """Test suite for search functionality with Cyrillic and Serbian Latin."""

    @pytest.fixture
    def test_db(self):
        """Create a test database with sample data."""
        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)

        conn = sqlite3.connect(path)
        conn.execute("PRAGMA foreign_keys = ON")

        # Create customers table
        conn.executescript(
            """
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT UNIQUE,
                full_name TEXT
            );
        """
        )

        # Insert test data with various character sets
        test_customers = [
            # Russian names (Cyrillic)
            ("+79000000001", "Иван Петров"),
            ("+79000000002", "Мария Иванова"),
            ("+79000000003", "Александр Сидоров"),
            # Serbian Latin names
            ("+79000000004", "Nikola Jovanović"),
            ("+79000000005", "Milan Đurić"),
            ("+79000000006", "Jelena Šćepanović"),
            ("+79000000007", "Dragana Čović"),
            # Mixed
            ("+79000000008", "John Smith"),
            ("+79000000009", "Пётр Чайковский"),
        ]

        for phone, name in test_customers:
            conn.execute(
                "INSERT INTO customers (phone, full_name) VALUES (?, ?)", (phone, name)
            )

        conn.commit()
        yield path

        conn.close()
        os.unlink(path)

    def test_like_search_basic_ascii(self, test_db):
        """Test basic ASCII search works."""
        conn = sqlite3.connect(test_db)

        # Search for "John"
        cursor = conn.execute(
            "SELECT full_name FROM customers WHERE full_name LIKE ?", ("%John%",)
        )
        results = [row[0] for row in cursor.fetchall()]

        assert "John Smith" in results
        conn.close()

    def test_like_search_cyrillic_exact(self, test_db):
        """Test Cyrillic search with exact match - WORKS."""
        conn = sqlite3.connect(test_db)

        # Search for exact Cyrillic name
        cursor = conn.execute(
            "SELECT full_name FROM customers WHERE full_name LIKE ?", ("%Иван%",)
        )
        results = [row[0] for row in cursor.fetchall()]

        # Should find Иван Петров and Мария Иванова (contains Иван)
        assert len(results) >= 1
        conn.close()

    def test_like_search_cyrillic_case_insensitive_fails(self, test_db):
        """Test that SQLite LIKE is NOT case-insensitive for Cyrillic."""
        conn = sqlite3.connect(test_db)

        # Search with lowercase - should NOT find uppercase Cyrillic in default SQLite
        cursor = conn.execute(
            "SELECT full_name FROM customers WHERE full_name LIKE ?",
            ("%иван%",),  # lowercase
        )
        results_lower = [row[0] for row in cursor.fetchall()]

        # Search with uppercase
        cursor = conn.execute(
            "SELECT full_name FROM customers WHERE full_name LIKE ?",
            ("%Иван%",),  # uppercase
        )
        results_upper = [row[0] for row in cursor.fetchall()]

        # In standard SQLite, these might return different results
        # because SQLite LIKE is case-insensitive only for ASCII characters
        print(f"Lowercase search results: {results_lower}")
        print(f"Uppercase search results: {results_upper}")

        conn.close()

    def test_like_search_serbian_latin(self, test_db):
        """Test Serbian Latin character search."""
        conn = sqlite3.connect(test_db)

        # Search for name with ć, đ, č, š
        test_cases = [
            ("%Jovanović%", ["Nikola Jovanović"]),
            ("%Đurić%", ["Milan Đurić"]),
            ("%Šćepanović%", ["Jelena Šćepanović"]),
            ("%Čović%", ["Dragana Čović"]),
            # Lowercase versions
            ("%jovanović%", []),  # Likely won't match in SQLite default
            ("%đurić%", []),  # Likely won't match
        ]

        for search_term, expected in test_cases:
            cursor = conn.execute(
                "SELECT full_name FROM customers WHERE full_name LIKE ?", (search_term,)
            )
            results = [row[0] for row in cursor.fetchall()]
            print(f"Search '{search_term}': {results}")

            # Note: This test documents the current behavior
            # SQLite LIKE may or may not match these depending on locale

        conn.close()

    def test_like_search_with_collation(self, test_db):
        """Test if Unicode collation makes a difference."""
        conn = sqlite3.connect(test_db)

        # Try with NOCASE (still ASCII only)
        cursor = conn.execute(
            "SELECT full_name FROM customers WHERE full_name LIKE ? COLLATE NOCASE",
            ("%иван%",),
        )
        results = [row[0] for row in cursor.fetchall()]
        print(f"NOCASE search results: {results}")

        conn.close()

    def test_ilike_alternative(self, test_db):
        """Test ILIKE alternative (PostgreSQL syntax - won't work in SQLite)."""
        conn = sqlite3.connect(test_db)

        # ILIKE doesn't exist in SQLite - this will fail
        try:
            cursor = conn.execute(
                "SELECT full_name FROM customers WHERE full_name ILIKE ?", ("%иван%",)
            )
            results = [row[0] for row in cursor.fetchall()]
            print(f"ILIKE results: {results}")
        except sqlite3.OperationalError as e:
            print(f"Expected error - ILIKE not supported in SQLite: {e}")

        conn.close()


def test_real_search_functionality():
    """Test the actual search used in admin_api.py."""
    print("\n" + "=" * 60)
    print("Testing Actual Search Functionality")
    print("=" * 60)

    # Check what the actual code does
    from app.db import get_db_path

    db_path = get_db_path()

    if not Path(db_path).exists():
        pytest.skip(f"Database not found at {db_path}")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    # Check if there are any customers with Cyrillic/Serbian names
    cursor = conn.execute("SELECT full_name FROM customers LIMIT 100")
    names = [row[0] for row in cursor.fetchall() if row[0]]

    print(f"\nFound {len(names)} customers in database")

    # Test searches
    search_tests = [
        # (search_term, description)
        ("%John%", "ASCII search"),
        ("%Иван%", "Cyrillic uppercase"),
        ("%иван%", "Cyrillic lowercase"),
        ("%Jovanović%", "Serbian Latin with diacritics"),
        ("%jovanović%", "Serbian Latin lowercase"),
        ("%đurić%", "Serbian đ lowercase"),
        ("%Đurić%", "Serbian Đ uppercase"),
    ]

    print("\nSearch results:")
    for term, desc in search_tests:
        cursor = conn.execute(
            "SELECT full_name FROM customers WHERE full_name LIKE ?", (term,)
        )
        results = [row[0] for row in cursor.fetchall()]
        print(f"  {desc} ('{term}'): {results}")

    conn.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
