import os
import sqlite3
from dataclasses import dataclass
from pathlib import Path


@dataclass
class DB:
    path: str

    def connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.execute("PRAGMA temp_store = MEMORY")
        conn.execute("PRAGMA mmap_size = 268435456")
        return conn


def get_db_path() -> str:
    p = os.getenv("CRM_DB_PATH", "crm.db")
    if os.path.isabs(p):
        return p
    base = Path(__file__).resolve().parent.parent
    return str((base / p).resolve())


def get_db() -> DB:
    return DB(path=get_db_path())


def init_db() -> None:
    db = get_db()
    Path(db.path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db.path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT UNIQUE,
                full_name TEXT,
                telegram_id INTEGER UNIQUE,
                qr_token TEXT UNIQUE,
                balance_points INTEGER NOT NULL DEFAULT 0,
                preferences_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS consents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                source TEXT NOT NULL,
                consent_version TEXT NOT NULL,
                consent_text TEXT NOT NULL,
                accepted_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                total_amount INTEGER NOT NULL,
                bonus_used INTEGER NOT NULL,
                bonus_earned INTEGER NOT NULL,
                items_json TEXT NOT NULL,
                receipt_pdf_path TEXT,
                external_erp_ref TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

            CREATE TABLE IF NOT EXISTS sync_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                status TEXT NOT NULL,
                message TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS integrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                kind TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                secret TEXT NOT NULL,
                config_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_integrations_kind ON integrations(kind);
            CREATE INDEX IF NOT EXISTS idx_integrations_enabled ON integrations(enabled);

            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                kind TEXT NOT NULL,
                price INTEGER NOT NULL DEFAULT 0,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
            CREATE INDEX IF NOT EXISTS idx_products_kind ON products(kind);

            CREATE TABLE IF NOT EXISTS integration_deliveries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                integration_id INTEGER NOT NULL,
                event_type TEXT NOT NULL,
                status TEXT NOT NULL,
                http_status INTEGER,
                response_body TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(integration_id) REFERENCES integrations(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_integration_deliveries_integration_id ON integration_deliveries(integration_id);

            CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                password_iter INTEGER NOT NULL,
                role TEXT NOT NULL DEFAULT 'owner',
                disabled INTEGER NOT NULL DEFAULT 0,
                must_change_password INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS admin_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_user_id INTEGER NOT NULL,
                token TEXT NOT NULL UNIQUE,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_admin_tokens_admin_user_id ON admin_tokens(admin_user_id);

            CREATE TABLE IF NOT EXISTS role_permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                permission TEXT NOT NULL,
                is_allowed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(role, permission)
            );
            CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

            CREATE TABLE IF NOT EXISTS marketing_segments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                criteria_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS marketing_campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                segment_id INTEGER,
                type TEXT NOT NULL,
                content TEXT NOT NULL,
                status TEXT DEFAULT 'draft',
                scheduled_at TEXT,
                sent_at TEXT,
                stats_json TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(segment_id) REFERENCES marketing_segments(id)
            );

            CREATE TABLE IF NOT EXISTS marketing_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER,
                user_id INTEGER,
                event_type TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(campaign_id) REFERENCES marketing_campaigns(id)
            );
            """
        )
        conn.commit()
        cols = [r["name"] for r in conn.execute("PRAGMA table_info(transactions)").fetchall()]
        if "pos_receipt_id" not in cols:
            conn.execute("ALTER TABLE transactions ADD COLUMN pos_receipt_id TEXT")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_transactions_pos_receipt_id ON transactions(pos_receipt_id)")
            conn.commit()
        admin_cols = [r["name"] for r in conn.execute("PRAGMA table_info(admin_users)").fetchall()]
        if "role" not in admin_cols:
            conn.execute("ALTER TABLE admin_users ADD COLUMN role TEXT NOT NULL DEFAULT 'owner'")
            conn.commit()
        if "disabled" not in admin_cols:
            conn.execute("ALTER TABLE admin_users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0")
            conn.commit()
    finally:
        conn.close()
