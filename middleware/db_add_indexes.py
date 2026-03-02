#!/usr/bin/env python3
"""
Database Index Migration Script for ERP GreenHouse

This script adds performance indexes to improve query performance.

Usage:
    python db_add_indexes.py          # Apply indexes
    python db_add_indexes.py --check # Check if indexes exist
    python db_add_indexes.py --sql   # Output SQL only (no execution)
"""

import sqlite3
import sys
from pathlib import Path
from typing import List, Tuple

# Add parent directory to path to import from app
sys.path.insert(0, str(Path(__file__).parent.parent))
from app.db import get_db, get_db_path


# Index definitions to add
# NOTE: Some indexes reference columns that may not exist yet (email, vk_id, preferred_channel)
# The script will skip indexes on non-existent columns gracefully
INDEXES_TO_ADD: List[Tuple[str, str, str]] = [
    # customers table indexes
    ("idx_customers_phone", "customers", "phone"),
    ("idx_customers_full_name", "customers", "full_name"),
    ("idx_customers_created_at", "customers", "created_at"),
    ("idx_customers_telegram_id", "customers", "telegram_id"),
    # NOTE: vk_id column migration happens in db.py
    ("idx_customers_vk_id", "customers", "vk_id"),
    # NOTE: preferred_channel column migration happens in db.py
    ("idx_customers_preferred_channel", "customers", "preferred_channel"),
    ("idx_customers_marketing_allowed", "customers", "marketing_allowed"),
    ("idx_customers_balance_points", "customers", "balance_points"),
    ("idx_customers_qr_token", "customers", "qr_token"),
    
    # products table indexes
    ("idx_products_code", "products", "code"),
    ("idx_products_name", "products", "name"),
    ("idx_products_kind", "products", "kind"),
    
    # transactions table indexes
    ("idx_transactions_customer_id", "transactions", "customer_id"),
    ("idx_transactions_created_at", "transactions", "created_at"),
    ("idx_transactions_external_erp_ref", "transactions", "external_erp_ref"),
    
    # admin_users table indexes
    ("idx_admin_users_username", "admin_users", "username"),
    ("idx_admin_users_role", "admin_users", "role"),
    
    # admin_tokens indexes
    ("idx_admin_tokens_token", "admin_tokens", "token"),
    ("idx_admin_tokens_expires_at", "admin_tokens", "expires_at"),
    
    # consents table indexes
    ("idx_consents_customer_id", "consents", "customer_id"),
    ("idx_consents_source", "consents", "source"),
    
    # marketing indexes
    ("idx_marketing_campaigns_status", "marketing_campaigns", "status"),
    ("idx_marketing_campaigns_segment_id", "marketing_campaigns", "segment_id"),
    ("idx_marketing_campaigns_created_at", "marketing_campaigns", "created_at"),
    ("idx_marketing_trigger_events_status", "marketing_trigger_events", "status"),
    ("idx_marketing_trigger_events_trigger_id", "marketing_trigger_events", "trigger_id"),
    ("idx_marketing_trigger_events_customer_id", "marketing_trigger_events", "customer_id"),
    ("idx_marketing_trigger_events_created_at", "marketing_trigger_events", "created_at"),
    ("idx_marketing_triggers_active", "marketing_triggers", "active"),
    ("idx_marketing_triggers_event_source", "marketing_triggers", "event_source"),
]


class IndexMigration:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        
    def close(self):
        self.conn.close()
    
    def get_existing_indexes(self, table_name: str) -> List[str]:
        """Get list of existing indexes for a table."""
        cursor = self.conn.execute(f"PRAGMA index_list({table_name})")
        return [row[1] for row in cursor.fetchall()]
    
    def get_all_indexes(self) -> List[str]:
        """Get all indexes in the database."""
        cursor = self.conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index' ORDER BY name"
        )
        return [row[0] for row in cursor.fetchall()]
    
    def index_exists(self, index_name: str) -> bool:
        """Check if an index exists."""
        cursor = self.conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name=?",
            (index_name,)
        )
        return cursor.fetchone() is not None
    
    def column_exists(self, table_name: str, column_name: str) -> bool:
        """Check if a column exists in a table."""
        try:
            cursor = self.conn.execute(f"PRAGMA table_info({table_name})")
            columns = [row[1] for row in cursor.fetchall()]
            return column_name in columns
        except sqlite3.Error:
            return False
    
    def create_index(self, index_name: str, table_name: str, column_name: str, 
                     unique: bool = False, if_not_exists: bool = True) -> bool:
        """Create an index."""
        # Check if column exists before creating index
        if not self.column_exists(table_name, column_name):
            print(f"⚠ Skipping index {index_name}: column {column_name} does not exist in table {table_name}")
            return False
        
        try:
            unique_str = "UNIQUE" if unique else ""
            if_str = "IF NOT EXISTS" if if_not_exists else ""
            
            sql = f"CREATE {unique_str} INDEX {if_str} {index_name} ON {table_name}({column_name})"
            print(f"Executing: {sql}")
            self.conn.execute(sql)
            self.conn.commit()
            return True
        except sqlite3.Error as e:
            print(f"Error creating index {index_name}: {e}")
            return False
    
    def check_indexes(self) -> Tuple[List[str], List[str]]:
        """Check which indexes exist and which are missing."""
        existing = self.get_all_indexes()
        missing = []
        
        for index_name, table_name, column_name in INDEXES_TO_ADD:
            if index_name not in existing:
                missing.append(f"{index_name} on {table_name}({column_name})")
        
        return existing, missing
    
    def apply_indexes(self, dry_run: bool = False) -> Tuple[int, int, int]:
        """Apply all missing indexes. Returns (applied, skipped_existing, skipped_no_column)."""
        existing = self.get_all_indexes()
        applied = 0
        skipped_existing = 0
        skipped_no_column = 0
        
        for index_name, table_name, column_name in INDEXES_TO_ADD:
            if index_name in existing:
                print(f"[SKIP] Index {index_name} already exists, skipping")
                skipped_existing += 1
                continue
            
            # Check if column exists
            if not self.column_exists(table_name, column_name):
                print(f"[WARN] Skipping {index_name}: column {column_name} does not exist in {table_name}")
                skipped_no_column += 1
                continue
            
            if dry_run:
                print(f"[WOULD] Create index: {index_name} on {table_name}({column_name})")
                applied += 1
            else:
                if self.create_index(index_name, table_name, column_name):
                    print(f"[OK] Created index {index_name}")
                    applied += 1
                else:
                    print(f"[ERROR] Failed to create index {index_name}")
        
        return applied, skipped_existing, skipped_no_column
    
    def generate_sql(self) -> List[str]:
        """Generate SQL for all indexes."""
        existing = self.get_all_indexes()
        sql_statements = []
        
        for index_name, table_name, column_name in INDEXES_TO_ADD:
            if index_name in existing:
                continue
            sql = f"CREATE INDEX {index_name} ON {table_name}({column_name});"
            sql_statements.append(sql)
        
        return sql_statements


def main():
    db_path = get_db_path()
    
    if not Path(db_path).exists():
        print(f"Database file not found: {db_path}")
        print("Please run the application first to create the database.")
        sys.exit(1)
    
    migration = IndexMigration(db_path)
    
    # Parse arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == "--check":
            # Check mode
            existing, missing = migration.check_indexes()
            print("=" * 60)
            print("Index Check Results")
            print("=" * 60)
            print(f"\nExisting indexes ({len(existing)}):")
            for idx in sorted(existing):
                print(f"  - {idx}")
            
            print(f"\nMissing indexes ({len(missing)}):")
            for idx in sorted(missing):
                print(f"  - {idx}")
            
            if missing:
                print(f"\nRun 'python db_add_indexes.py' to add missing indexes")
            else:
                print("\n✓ All indexes are in place")
            migration.close()
            sys.exit(0)
        
        elif sys.argv[1] == "--sql":
            # SQL output mode
            sql_statements = migration.generate_sql()
            print("-- Index Migration SQL for ERP GreenHouse")
            print("-- Run these statements against your PostgreSQL database\n")
            for sql in sql_statements:
                # Convert SQLite syntax to PostgreSQL
                pg_sql = sql.replace("CREATE INDEX", "CREATE INDEX IF NOT EXISTS")
                print(pg_sql)
            migration.close()
            sys.exit(0)
    
    # Default: Apply indexes
    print("=" * 60)
    print("Database Index Migration")
    print("=" * 60)
    print(f"\nDatabase: {db_path}\n")
    
    existing, missing = migration.check_indexes()
    print(f"Existing indexes: {len(existing)}")
    print(f"Missing indexes: {len(missing)}\n")
    
    if not missing:
        print("✓ All indexes are already in place!")
        migration.close()
        sys.exit(0)
    
    print("Applying indexes...\n")
    applied, skipped_existing, skipped_no_column = migration.apply_indexes()
    
    print(f"\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Applied: {applied}")
    print(f"Skipped (already exist): {skipped_existing}")
    print(f"Skipped (column not found): {skipped_no_column}")
    
    migration.close()
    
    if applied > 0:
        print("\n[OK] Index migration completed successfully!")
    else:
        print("\n[OK] No indexes needed to be added.")


if __name__ == "__main__":
    main()
