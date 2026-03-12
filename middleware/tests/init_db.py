#!/usr/bin/env python3
"""Initialize test database for E2E tests."""

import os
import sqlite3
import sys


def main():
    db_path = "test_telegram_crm.db"

    # Ensure clean state
    if os.path.exists(db_path):
        os.remove(db_path)

    conn = sqlite3.connect(db_path)

    # Create admin_users table
    conn.execute("""
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

    # Seed test users (password: test123 for all)
    # This is the bcrypt hash of 'test123'
    password_hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqPLUzC7J2"

    conn.execute(
        "INSERT OR IGNORE INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)",
        ("admin", password_hash, "admin"),
    )
    conn.execute(
        "INSERT OR IGNORE INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)",
        ("manager", password_hash, "manager"),
    )
    conn.execute(
        "INSERT OR IGNORE INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)",
        ("operator", password_hash, "operator"),
    )

    conn.commit()
    conn.close()

    print(f"Database {db_path} created and seeded successfully")
    return 0


if __name__ == "__main__":
    sys.exit(main())
