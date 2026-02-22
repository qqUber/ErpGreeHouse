#!/usr/bin/env python3
"""
Database Compatibility Check Script for ERP GreenHouse

This script validates the database schema against expected models,
checks Foreign Key constraints, and reports PostgreSQL compatibility issues.

Usage:
    python check_db_compatibility.py
"""

import sqlite3
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# Add parent directory to path to import from app
sys.path.insert(0, str(Path(__file__).parent.parent))
from app.db import get_db, get_db_path


# Expected table definitions from db.py
EXPECTED_TABLES = {
    "customers": {
        "columns": [
            ("id", "INTEGER", "PRIMARY KEY AUTOINCREMENT"),
            ("phone", "TEXT", "UNIQUE"),
            ("full_name", "TEXT", ""),
            ("telegram_id", "INTEGER", "UNIQUE"),
            ("qr_token", "TEXT", "UNIQUE"),
            ("balance_points", "INTEGER", "NOT NULL DEFAULT 0"),
            ("preferences_json", "TEXT", "NOT NULL DEFAULT '{}'"),
            ("marketing_allowed", "INTEGER", "NOT NULL DEFAULT 0"),
            ("data_processing_allowed", "INTEGER", "NOT NULL DEFAULT 0"),
            ("birthday", "TEXT", ""),
            ("created_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
            ("updated_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
        ],
        "indexes": [
            "idx_customers_phone",
            "idx_customers_telegram_id",
            "idx_customers_qr_token",
        ],
    },
    "transactions": {
        "columns": [
            ("id", "INTEGER", "PRIMARY KEY AUTOINCREMENT"),
            ("customer_id", "INTEGER", "NOT NULL"),
            ("total_amount", "INTEGER", "NOT NULL"),
            ("bonus_used", "INTEGER", "NOT NULL"),
            ("bonus_earned", "INTEGER", "NOT NULL"),
            ("items_json", "TEXT", "NOT NULL"),
            ("receipt_pdf_path", "TEXT", ""),
            ("external_erp_ref", "TEXT", ""),
            ("pos_receipt_id", "TEXT", ""),
            ("created_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
        ],
        "indexes": [
            "idx_transactions_customer_id",
            "idx_transactions_created_at",
            "idx_transactions_pos_receipt_id",
        ],
        "foreign_keys": [
            ("customer_id", "customers", "id"),
        ],
    },
    "products": {
        "columns": [
            ("id", "INTEGER", "PRIMARY KEY AUTOINCREMENT"),
            ("code", "TEXT", "NOT NULL UNIQUE"),
            ("name", "TEXT", "NOT NULL"),
            ("kind", "TEXT", "NOT NULL"),
            ("price", "INTEGER", "NOT NULL DEFAULT 0"),
            ("active", "INTEGER", "NOT NULL DEFAULT 1"),
            ("created_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
            ("updated_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
        ],
        "indexes": [
            "idx_products_active",
            "idx_products_kind",
            "idx_products_code",
            "idx_products_name",
        ],
    },
    "integrations": {
        "columns": [
            ("id", "INTEGER", "PRIMARY KEY AUTOINCREMENT"),
            ("name", "TEXT", "NOT NULL"),
            ("kind", "TEXT", "NOT NULL"),
            ("enabled", "INTEGER", "NOT NULL DEFAULT 1"),
            ("secret", "TEXT", "NOT NULL"),
            ("config_json", "TEXT", "NOT NULL DEFAULT '{}'"),
            ("created_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
            ("updated_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
        ],
        "indexes": [
            "idx_integrations_kind",
            "idx_integrations_enabled",
        ],
    },
    "admin_users": {
        "columns": [
            ("id", "INTEGER", "PRIMARY KEY AUTOINCREMENT"),
            ("username", "TEXT", "NOT NULL UNIQUE"),
            ("password_hash", "TEXT", "NOT NULL"),
            ("password_salt", "TEXT", "NOT NULL"),
            ("password_iter", "INTEGER", "NOT NULL"),
            ("role", "TEXT", "NOT NULL DEFAULT 'owner'"),
            ("disabled", "INTEGER", "NOT NULL DEFAULT 0"),
            ("must_change_password", "INTEGER", "NOT NULL DEFAULT 1"),
            ("created_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
            ("updated_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
        ],
        "indexes": [
            "idx_admin_users_username",
        ],
    },
    "admin_tokens": {
        "columns": [
            ("id", "INTEGER", "PRIMARY KEY AUTOINCREMENT"),
            ("admin_user_id", "INTEGER", "NOT NULL"),
            ("token", "TEXT", "NOT NULL UNIQUE"),
            ("expires_at", "TEXT", "NOT NULL"),
            ("created_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
        ],
        "indexes": [
            "idx_admin_tokens_admin_user_id",
            "idx_admin_tokens_token",
        ],
        "foreign_keys": [
            ("admin_user_id", "admin_users", "id"),
        ],
    },
    "role_permissions": {
        "columns": [
            ("id", "INTEGER", "PRIMARY KEY AUTOINCREMENT"),
            ("role", "TEXT", "NOT NULL"),
            ("permission", "TEXT", "NOT NULL"),
            ("is_allowed", "INTEGER", "NOT NULL DEFAULT 0"),
            ("created_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
            ("updated_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
        ],
        "indexes": [
            "idx_role_permissions_role",
        ],
    },
    "consents": {
        "columns": [
            ("id", "INTEGER", "PRIMARY KEY AUTOINCREMENT"),
            ("customer_id", "INTEGER", "NOT NULL"),
            ("source", "TEXT", "NOT NULL"),
            ("consent_version", "TEXT", "NOT NULL"),
            ("consent_text", "TEXT", "NOT NULL"),
            ("accepted_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
        ],
        "foreign_keys": [
            ("customer_id", "customers", "id"),
        ],
    },
    "sync_log": {
        "columns": [
            ("id", "INTEGER", "PRIMARY KEY AUTOINCREMENT"),
            ("entity_type", "TEXT", "NOT NULL"),
            ("entity_id", "TEXT", "NOT NULL"),
            ("status", "TEXT", "NOT NULL"),
            ("message", "TEXT", ""),
            ("created_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
        ],
    },
    "integration_deliveries": {
        "columns": [
            ("id", "INTEGER", "PRIMARY KEY AUTOINCREMENT"),
            ("integration_id", "INTEGER", "NOT NULL"),
            ("event_type", "TEXT", "NOT NULL"),
            ("status", "TEXT", "NOT NULL"),
            ("http_status", "INTEGER", ""),
            ("response_body", "TEXT", ""),
            ("created_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
        ],
        "foreign_keys": [
            ("integration_id", "integrations", "id"),
        ],
    },
    "marketing_segments": {
        "columns": [
            ("id", "INTEGER", "PRIMARY KEY AUTOINCREMENT"),
            ("name", "TEXT", "NOT NULL"),
            ("criteria_json", "TEXT", "NOT NULL"),
            ("created_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
        ],
    },
    "marketing_campaigns": {
        "columns": [
            ("id", "INTEGER", "PRIMARY KEY AUTOINCREMENT"),
            ("name", "TEXT", "NOT NULL"),
            ("segment_id", "INTEGER", ""),
            ("type", "TEXT", "NOT NULL"),
            ("content", "TEXT", "NOT NULL"),
            ("status", "TEXT", "DEFAULT 'draft'"),
            ("scheduled_at", "TEXT", ""),
            ("sent_at", "TEXT", ""),
            ("stats_json", "TEXT", ""),
            ("created_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
        ],
        "foreign_keys": [
            ("segment_id", "marketing_segments", "id"),
        ],
    },
    "marketing_events": {
        "columns": [
            ("id", "INTEGER", "PRIMARY KEY AUTOINCREMENT"),
            ("campaign_id", "INTEGER", ""),
            ("user_id", "INTEGER", ""),
            ("event_type", "TEXT", "NOT NULL"),
            ("created_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
        ],
        "foreign_keys": [
            ("campaign_id", "marketing_campaigns", "id"),
        ],
    },
    "marketing_triggers": {
        "columns": [
            ("id", "INTEGER", "PRIMARY KEY AUTOINCREMENT"),
            ("name", "TEXT", "NOT NULL"),
            ("event_source", "TEXT", "NOT NULL"),
            ("criteria_json", "TEXT", "NOT NULL DEFAULT '{}'"),
            ("delay_hours", "INTEGER", "NOT NULL DEFAULT 0"),
            ("message_text", "TEXT", "NOT NULL"),
            ("active", "INTEGER", "NOT NULL DEFAULT 1"),
            ("created_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
        ],
    },
    "marketing_trigger_events": {
        "columns": [
            ("id", "INTEGER", "PRIMARY KEY AUTOINCREMENT"),
            ("trigger_id", "INTEGER", "NOT NULL"),
            ("customer_id", "INTEGER", "NOT NULL"),
            ("source_tx_id", "INTEGER", ""),
            ("status", "TEXT", "NOT NULL DEFAULT 'pending'"),
            ("scheduled_for", "TEXT", "NOT NULL"),
            ("sent_at", "TEXT", ""),
            ("created_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
        ],
        "foreign_keys": [
            ("trigger_id", "marketing_triggers", "id"),
            ("customer_id", "customers", "id"),
        ],
    },
    "vk_settings": {
        "columns": [
            ("id", "INTEGER", "PRIMARY KEY AUTOINCREMENT"),
            ("access_token", "TEXT", "NOT NULL"),
            ("group_id", "INTEGER", "NOT NULL"),
            ("api_version", "TEXT", "NOT NULL DEFAULT '5.131'"),
            ("enabled", "INTEGER", "NOT NULL DEFAULT 0"),
            ("webhook_secret", "TEXT", ""),
            ("created_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
            ("updated_at", "TEXT", "NOT NULL DEFAULT (datetime('now'))"),
        ],
    },
}


# SQLite-specific types that need PostgreSQL migration
SQLITE_TO_POSTGRES_TYPES = {
    "INTEGER": "BIGINT",
    "TEXT": "TEXT",  # or VARCHAR
    "REAL": "DOUBLE PRECISION",
}


class CompatibilityChecker:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.issues: List[str] = []
        self.warnings: List[str] = []
        self.passed: List[str] = []

    def close(self):
        self.conn.close()

    def check_foreign_keys_enabled(self) -> bool:
        """Check if foreign keys are enabled in the database."""
        cursor = self.conn.execute("PRAGMA foreign_keys")
        result = cursor.fetchone()
        fk_enabled = result[0] == 1
        if fk_enabled:
            self.passed.append("Foreign Keys are ENABLED")
        else:
            self.issues.append("Foreign Keys are DISABLED - data integrity may be compromised")
        return fk_enabled

    def get_existing_tables(self) -> List[str]:
        """Get list of all tables in the database."""
        cursor = self.conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        return [row[0] for row in cursor.fetchall()]

    def get_table_columns(self, table_name: str) -> List[Dict]:
        """Get column information for a table."""
        cursor = self.conn.execute(f"PRAGMA table_info({table_name})")
        return [
            {
                "name": row[1],
                "type": row[2],
                "notnull": row[3],
                "default": row[4],
                "pk": row[5],
            }
            for row in cursor.fetchall()
        ]

    def get_table_indexes(self, table_name: str) -> List[str]:
        """Get index names for a table."""
        cursor = self.conn.execute(f"PRAGMA index_list({table_name})")
        return [row[1] for row in cursor.fetchall()]

    def get_foreign_keys(self, table_name: str) -> List[Dict]:
        """Get foreign key information for a table."""
        cursor = self.conn.execute(f"PRAGMA foreign_key_list({table_name})")
        return [
            {
                "from": row[3],
                "to": row[2],
                "table": row[2],
            }
            for row in cursor.fetchall()
        ]

    def check_table_exists(self, table_name: str) -> bool:
        """Check if a table exists."""
        tables = self.get_existing_tables()
        if table_name in tables:
            self.passed.append(f"Table '{table_name}' exists")
            return True
        else:
            self.issues.append(f"Table '{table_name}' is MISSING")
            return False

    def check_table_columns(self, table_name: str, expected_columns: List[Tuple]) -> bool:
        """Check if table has expected columns."""
        if not self.check_table_exists(table_name):
            return False

        actual_columns = {col["name"]: col for col in self.get_table_columns(table_name)}
        all_good = True

        for col_name, col_type, col_extra in expected_columns:
            if col_name in actual_columns:
                actual_type = actual_columns[col_name]["type"]
                # Basic type check (SQLite is loose with types)
                if col_type in actual_type or actual_type in col_type:
                    pass  # Type is compatible
                else:
                    self.warnings.append(
                        f"Table '{table_name}': Column '{col_name}' type mismatch - "
                        f"expected {col_type}, got {actual_type}"
                    )
            else:
                self.issues.append(
                    f"Table '{table_name}': Column '{col_name}' is MISSING"
                )
                all_good = False

        if all_good:
            self.passed.append(f"Table '{table_name}': All expected columns present")

        return all_good

    def check_table_indexes(self, table_name: str, expected_indexes: List[str]) -> bool:
        """Check if table has expected indexes."""
        if not self.check_table_exists(table_name):
            return False

        actual_indexes = self.get_table_indexes(table_name)
        all_good = True

        for idx_name in expected_indexes:
            if idx_name in actual_indexes:
                self.passed.append(f"Index '{idx_name}' exists on '{table_name}'")
            else:
                self.issues.append(
                    f"Index '{idx_name}' is MISSING on '{table_name}'"
                )
                all_good = False

        return all_good

    def check_foreign_keys(self, table_name: str, expected_fks: List[Tuple]) -> bool:
        """Check foreign key constraints."""
        if not self.check_table_exists(table_name):
            return False

        actual_fks = self.get_foreign_keys(table_name)
        actual_fk_map = {fk["from"]: fk for fk in actual_fks}
        all_good = True

        for fk_col, fk_table, fk_id in expected_fks:
            if fk_col in actual_fk_map:
                actual = actual_fk_map[fk_col]
                if actual["table"] == fk_table:
                    self.passed.append(
                        f"Foreign Key '{table_name}.{fk_col}' -> '{fk_table}({fk_id})' exists"
                    )
                else:
                    self.issues.append(
                        f"Foreign Key '{table_name}.{fk_col}' points to wrong table - "
                        f"expected '{fk_table}', got '{actual['table']}'"
                    )
                    all_good = False
            else:
                self.issues.append(
                    f"Foreign Key '{table_name}.{fk_col}' -> '{fk_table}({fk_id})' is MISSING"
                )
                all_good = False

        return all_good

    def check_postgres_compatibility(self) -> List[str]:
        """Check for PostgreSQL compatibility issues."""
        issues = []

        # Check for SQLite-specific datetime() function
        for table_name in self.get_existing_tables():
            columns = self.get_table_columns(table_name)
            for col in columns:
                default = col.get("default", "")
                if default and "datetime(" in str(default).lower():
                    issues.append(
                        f"PostgreSQL Incompatibility: Table '{table_name}' column '{col['name']}' "
                        f"uses SQLite datetime() function in DEFAULT. "
                        f"PostgreSQL uses CURRENT_TIMESTAMP or NOW()"
                    )

                # Check for INTEGER PRIMARY KEY (should be BIGSERIAL in PostgreSQL)
                if col["pk"] and col["type"] == "INTEGER":
                    issues.append(
                        f"PostgreSQL Incompatibility: Table '{table_name}' uses INTEGER PRIMARY KEY. "
                        f"PostgreSQL should use BIGSERIAL or SERIAL"
                    )

        # Check for JSON storage as TEXT (should be JSONB in PostgreSQL)
        for table_name in self.get_existing_tables():
            columns = self.get_table_columns(table_name)
            for col in columns:
                if "json" in col["name"].lower() and col["type"] == "TEXT":
                    issues.append(
                        f"PostgreSQL Incompatibility: Table '{table_name}' column '{col['name']}' "
                        f"stores JSON as TEXT. PostgreSQL should use JSONB for better performance"
                    )

        # Check for lack of ILIKE (PostgreSQL-specific case-insensitive search)
        # This is informational - not an error

        if not issues:
            self.passed.append("No critical PostgreSQL compatibility issues found")

        return issues

    def run_full_check(self) -> Dict:
        """Run all compatibility checks."""
        print("=" * 60)
        print("ERP GreenHouse Database Compatibility Check")
        print("=" * 60)
        print(f"\nDatabase: {self.db_path}\n")

        # Check foreign keys
        print("1. Checking Foreign Key Constraints...")
        self.check_foreign_keys_enabled()

        # Check each expected table
        print("\n2. Checking Tables and Columns...")
        for table_name, table_def in EXPECTED_TABLES.items():
            self.check_table_columns(table_name, table_def["columns"])

        # Check indexes
        print("\n3. Checking Indexes...")
        for table_name, table_def in EXPECTED_TABLES.items():
            if "indexes" in table_def:
                self.check_table_indexes(table_name, table_def["indexes"])

        # Check foreign keys
        print("\n4. Checking Foreign Key Constraints...")
        for table_name, table_def in EXPECTED_TABLES.items():
            if "foreign_keys" in table_def:
                self.check_foreign_keys(table_name, table_def["foreign_keys"])

        # Check PostgreSQL compatibility
        print("\n5. Checking PostgreSQL Compatibility...")
        pg_issues = self.check_postgres_compatibility()
        for issue in pg_issues:
            self.issues.append(issue)

        # Print summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)

        print(f"\n✓ PASSED: {len(self.passed)}")
        for p in self.passed[:5]:
            print(f"  - {p}")
        if len(self.passed) > 5:
            print(f"  ... and {len(self.passed) - 5} more")

        print(f"\n⚠ WARNINGS: {len(self.warnings)}")
        for w in self.warnings[:5]:
            print(f"  - {w}")
        if len(self.warnings) > 5:
            print(f"  ... and {len(self.warnings) - 5} more")

        print(f"\n✗ ISSUES: {len(self.issues)}")
        for i in self.issues[:10]:
            print(f"  - {i}")
        if len(self.issues) > 10:
            print(f"  ... and {len(self.issues) - 10} more")

        return {
            "passed": self.passed,
            "warnings": self.warnings,
            "issues": self.issues,
        }


def main():
    db_path = get_db_path()
    
    if not Path(db_path).exists():
        print(f"Database file not found: {db_path}")
        print("Please run the application first to create the database.")
        sys.exit(1)
    
    checker = CompatibilityChecker(db_path)
    try:
        results = checker.run_full_check()
        
        # Exit with error code if there are critical issues
        if results["issues"]:
            print("\n" + "=" * 60)
            print("RECOMMENDATION: Fix critical issues before migrating to PostgreSQL")
            print("=" * 60)
            sys.exit(1)
        else:
            print("\n" + "=" * 60)
            print("All checks passed! Database is ready for review.")
            print("=" * 60)
            sys.exit(0)
    finally:
        checker.close()


if __name__ == "__main__":
    main()
