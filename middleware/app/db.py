import os
import sqlite3
from dataclasses import dataclass
from pathlib import Path


@dataclass
class DB:
    path: str

    def connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, check_same_thread=False)
        # Migration for compliance fields
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN marketing_allowed INTEGER NOT NULL DEFAULT 0")
        except sqlite3.OperationalError:  # Column already exists
            pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN data_processing_allowed INTEGER NOT NULL DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN birthday TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN gender TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN email TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN city TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN onboarding_status TEXT DEFAULT 'registered'")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN phone_verified_at TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN phone_verification_method TEXT")
        except sqlite3.OperationalError:
            pass
        # Migration for country_id and city_id columns (location service)
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN country_id INTEGER")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN city_id INTEGER")
        except sqlite3.OperationalError:
            pass
        # Analytics fields for customers
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN ltv REAL NOT NULL DEFAULT 0")  # Lifetime Value
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute(
                "ALTER TABLE customers ADD COLUMN average_check REAL NOT NULL DEFAULT 0"
            )  # Average transaction amount
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute(
                "ALTER TABLE customers ADD COLUMN purchase_frequency INTEGER NOT NULL DEFAULT 0"
            )  # Number of purchases
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN last_purchase_date TEXT")  # Date of last purchase
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN cohort_month TEXT")  # Month of first purchase (YYYY-MM)
        except sqlite3.OperationalError:
            pass
        conn.commit()

        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.execute("PRAGMA temp_store = MEMORY")
        conn.execute("PRAGMA mmap_size = 268435456")

        # Media message fields migration
        try:
            conn.execute("ALTER TABLE marketing_campaigns ADD COLUMN content_type TEXT DEFAULT 'text'")
        except sqlite3.OperationalError:  # Column already exists
            pass
        try:
            conn.execute("ALTER TABLE marketing_campaigns ADD COLUMN media_urls TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE marketing_campaigns ADD COLUMN caption TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE marketing_triggers ADD COLUMN media_type TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE marketing_triggers ADD COLUMN media_url TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE marketing_triggers ADD COLUMN caption TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE marketing_events ADD COLUMN event_data TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE marketing_trigger_events ADD COLUMN delivery_data TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE marketing_trigger_events ADD COLUMN delivered_at TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE marketing_trigger_events ADD COLUMN opened_at TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE marketing_trigger_events ADD COLUMN clicked_at TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE marketing_campaigns ADD COLUMN budget_limit INTEGER")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE marketing_campaigns ADD COLUMN budget_spent INTEGER NOT NULL DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE marketing_campaigns ADD COLUMN audience_count INTEGER NOT NULL DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE marketing_campaigns ADD COLUMN started_at TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE marketing_campaigns ADD COLUMN paused_at TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE marketing_campaigns ADD COLUMN completed_at TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE marketing_campaigns ADD COLUMN cancelled_at TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute(
                "ALTER TABLE marketing_campaigns ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))"
            )
        except sqlite3.OperationalError:
            pass
        conn.commit()

        # Migration for vk_id column
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN vk_id INTEGER UNIQUE")
        except sqlite3.OperationalError:  # Column already exists
            pass

        # Migration for preferred_channel column
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN preferred_channel TEXT")
        except sqlite3.OperationalError:  # Column already exists
            pass

        # Migration for tg_id alias column (for clarity, points to telegram_id)
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN tg_id INTEGER")
        except sqlite3.OperationalError:  # Column already exists
            pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN preferred_language TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN current_tier_id INTEGER")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN referral_code TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN referred_by INTEGER")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN welcome_bonus_awarded INTEGER NOT NULL DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE customers ADD COLUMN birthday_bonus_last_year INTEGER")
        except sqlite3.OperationalError:
            pass

        # Migration for consent_type column
        try:
            conn.execute("ALTER TABLE consents ADD COLUMN consent_type TEXT DEFAULT 'data_processing'")
        except sqlite3.OperationalError:  # Column already exists
            pass

        # Migration for additional consent fields (effective_date, ip_address)
        try:
            conn.execute("ALTER TABLE consents ADD COLUMN effective_date TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE consents ADD COLUMN ip_address TEXT")
        except sqlite3.OperationalError:
            pass

        # Add indexes for consents table
        try:
            conn.execute("CREATE INDEX IF NOT EXISTS idx_consents_customer_id ON consents(customer_id)")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("CREATE INDEX IF NOT EXISTS idx_consents_accepted_at ON consents(accepted_at)")
        except sqlite3.OperationalError:
            pass

        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS points_ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                amount INTEGER NOT NULL,
                source TEXT NOT NULL,
                source_ref_id INTEGER,
                expires_at TEXT,
                expired INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_points_ledger_customer_id ON points_ledger(customer_id);
            CREATE INDEX IF NOT EXISTS idx_points_ledger_expires_at ON points_ledger(expires_at);

            CREATE TABLE IF NOT EXISTS loyalty_tiers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                min_spent INTEGER NOT NULL,
                accrual_percent INTEGER NOT NULL,
                max_redeem_percent INTEGER NOT NULL,
                min_referrals INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_sort_order ON loyalty_tiers(sort_order);

            CREATE TABLE IF NOT EXISTS referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                referrer_id INTEGER NOT NULL,
                referred_id INTEGER,
                referral_code TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'invited',
                bonus_awarded INTEGER NOT NULL DEFAULT 0,
                first_purchase_tx_id INTEGER,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(referrer_id) REFERENCES customers(id) ON DELETE CASCADE,
                FOREIGN KEY(referred_id) REFERENCES customers(id) ON DELETE SET NULL,
                FOREIGN KEY(first_purchase_tx_id) REFERENCES transactions(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
            CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);
            CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);

            CREATE TABLE IF NOT EXISTS certificates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                type TEXT NOT NULL,
                value INTEGER NOT NULL,
                currency TEXT NOT NULL DEFAULT 'RUB',
                status TEXT NOT NULL DEFAULT 'active',
                sender_id INTEGER,
                recipient_id INTEGER,
                recipient_phone TEXT,
                message TEXT,
                expires_at TEXT,
                redeemed_at TEXT,
                redeemed_tx_id INTEGER,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(sender_id) REFERENCES customers(id) ON DELETE SET NULL,
                FOREIGN KEY(recipient_id) REFERENCES customers(id) ON DELETE SET NULL,
                FOREIGN KEY(redeemed_tx_id) REFERENCES transactions(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(code);
            CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);

            CREATE TABLE IF NOT EXISTS reward_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                points_cost INTEGER NOT NULL,
                stock_limit INTEGER,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_reward_items_product_id ON reward_items(product_id);
            CREATE INDEX IF NOT EXISTS idx_reward_items_active ON reward_items(active);

            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                transaction_id INTEGER,
                location_id INTEGER,
                rating INTEGER NOT NULL,
                comment TEXT,
                status TEXT NOT NULL DEFAULT 'new',
                admin_reply TEXT,
                replied_at TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
                FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
                FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);
            CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
            CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);

            CREATE TABLE IF NOT EXISTS news_articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                image_url TEXT,
                type TEXT NOT NULL DEFAULT 'news',
                published_at TEXT,
                valid_from TEXT,
                valid_until TEXT,
                promo_code TEXT,
                status TEXT NOT NULL DEFAULT 'draft',
                author_id INTEGER,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(author_id) REFERENCES admin_users(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_news_articles_status ON news_articles(status);
            CREATE INDEX IF NOT EXISTS idx_news_articles_type ON news_articles(type);

            CREATE TABLE IF NOT EXISTS security_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_type TEXT NOT NULL,
                severity TEXT NOT NULL DEFAULT 'medium',
                details_json TEXT NOT NULL DEFAULT '{}',
                resolved INTEGER NOT NULL DEFAULT 0,
                resolved_by INTEGER,
                resolved_at TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(resolved_by) REFERENCES admin_users(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved);
            CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);

            CREATE TABLE IF NOT EXISTS employee_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL,
                metric_type TEXT NOT NULL,
                value REAL NOT NULL,
                period TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(employee_id, metric_type, period)
            );
            CREATE INDEX IF NOT EXISTS idx_employee_metrics_period ON employee_metrics(period);
            """
        )

        defaults = [
            ("welcome_bonus_points", "100"),
            ("birthday_bonus_points", "200"),
            ("birthday_bonus_days_before", "0"),
            ("points_ttl_months", "12"),
            ("points_extend_on_purchase", "1"),
            ("loyalty_mode", "cashback"),
            ("base_accrual_percent", "5"),
            ("max_pay_by_points_percent", "30"),
            ("referral_bonus_referrer", "100"),
            ("referral_bonus_referred", "100"),
            ("referral_min_purchase", "1"),
            ("auto_reply_enabled", "0"),
            ("auto_reply_delay_minutes", "10"),
        ]
        for key, value in defaults:
            conn.execute(
                """
                INSERT INTO system_settings (key, value, updated_at)
                VALUES (?, ?, datetime('now'))
                ON CONFLICT(key) DO NOTHING
                """,
                (key, value),
            )

        tier_count = conn.execute("SELECT COUNT(*) FROM loyalty_tiers").fetchone()[0]
        if int(tier_count or 0) == 0:
            conn.executemany(
                """
                INSERT INTO loyalty_tiers (name, min_spent, accrual_percent, max_redeem_percent, min_referrals, sort_order, active)
                VALUES (?, ?, ?, ?, ?, ?, 1)
                """,
                [
                    ("Базовый", 0, 5, 30, 0, 1),
                    ("Серебро", 10000, 7, 50, 0, 2),
                    ("Золото", 50000, 10, 100, 0, 3),
                    ("Платина", 100000, 15, 100, 0, 4),
                ],
            )

        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_referral_code ON customers(referral_code)")

        conn.commit()

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
                vk_id INTEGER UNIQUE,
                qr_token TEXT UNIQUE,
                balance_points INTEGER NOT NULL DEFAULT 0,
                preferences_json TEXT NOT NULL DEFAULT '{}',
                marketing_allowed INTEGER NOT NULL DEFAULT 0,
                data_processing_allowed INTEGER NOT NULL DEFAULT 0,
                birthday TEXT, -- YYYY-MM-DD
                gender TEXT,
                email TEXT,
                city TEXT,
                onboarding_status TEXT NOT NULL DEFAULT 'registered',
                phone_verified_at TEXT,
                phone_verification_method TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS consents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER,
                source TEXT NOT NULL,
                consent_version TEXT NOT NULL,
                consent_text TEXT NOT NULL,
                consent_type TEXT DEFAULT 'data_processing',
                accepted_at TEXT NOT NULL DEFAULT (datetime('now')),
                effective_date TEXT,
                ip_address TEXT,
                FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL
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
                pos_receipt_id TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
            CREATE INDEX IF NOT EXISTS idx_transactions_pos_receipt_id ON transactions(pos_receipt_id);

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
                description TEXT,
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

            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS seed_migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL UNIQUE,
                checksum TEXT,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- Performance indexes for QR token system
            CREATE INDEX IF NOT EXISTS idx_customers_qr_token ON customers(qr_token);
            CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
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
                content_type TEXT DEFAULT 'text',
                media_urls TEXT,
                caption TEXT,
                status TEXT DEFAULT 'draft',
                scheduled_at TEXT,
                sent_at TEXT,
                budget_limit INTEGER,
                budget_spent INTEGER NOT NULL DEFAULT 0,
                audience_count INTEGER NOT NULL DEFAULT 0,
                started_at TEXT,
                paused_at TEXT,
                completed_at TEXT,
                cancelled_at TEXT,
                stats_json TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(segment_id) REFERENCES marketing_segments(id)
            );

            CREATE TABLE IF NOT EXISTS marketing_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER,
                user_id INTEGER,
                event_type TEXT NOT NULL,
                event_data TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(campaign_id) REFERENCES marketing_campaigns(id)
            );

            CREATE TABLE IF NOT EXISTS marketing_triggers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                event_source TEXT NOT NULL,
                criteria_json TEXT NOT NULL DEFAULT '{}',
                delay_hours INTEGER NOT NULL DEFAULT 0,
                message_text TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS marketing_trigger_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trigger_id INTEGER NOT NULL,
                customer_id INTEGER NOT NULL,
                source_tx_id INTEGER,
                status TEXT NOT NULL DEFAULT 'pending',
                scheduled_for TEXT NOT NULL,
                sent_at TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(trigger_id) REFERENCES marketing_triggers(id),
                FOREIGN KEY(customer_id) REFERENCES customers(id)
            );

            CREATE TABLE IF NOT EXISTS vk_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                access_token TEXT NOT NULL,
                group_id INTEGER NOT NULL,
                api_version TEXT NOT NULL DEFAULT '5.131',
                enabled INTEGER NOT NULL DEFAULT 0,
                webhook_secret TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS short_urls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                short_code TEXT NOT NULL UNIQUE,
                original_url TEXT NOT NULL,
                campaign_id INTEGER,
                customer_id INTEGER,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(campaign_id) REFERENCES marketing_campaigns(id),
                FOREIGN KEY(customer_id) REFERENCES customers(id)
            );
            CREATE INDEX IF NOT EXISTS idx_short_urls_short_code ON short_urls(short_code);
            CREATE INDEX IF NOT EXISTS idx_short_urls_campaign_id ON short_urls(campaign_id);
            CREATE INDEX IF NOT EXISTS idx_short_urls_customer_id ON short_urls(customer_id);

            -- Location service tables
            CREATE TABLE IF NOT EXISTS countries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                name_local TEXT,
                phone_prefix TEXT,
                currency_code TEXT DEFAULT 'RUB',
                timezone_default TEXT DEFAULT 'Europe/Moscow',
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_countries_active ON countries(active);

            CREATE TABLE IF NOT EXISTS cities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                country_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                region TEXT,
                timezone TEXT DEFAULT 'Europe/Moscow',
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(country_id) REFERENCES countries(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_cities_country_id ON cities(country_id);
            CREATE INDEX IF NOT EXISTS idx_cities_active ON cities(active);

            CREATE TABLE IF NOT EXISTS locations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                city_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                address TEXT,
                phone TEXT,
                telegram_chat_id TEXT,
                timezone TEXT DEFAULT 'Europe/Moscow',
                status TEXT NOT NULL DEFAULT 'active',
                priority_score INTEGER NOT NULL DEFAULT 0,
                open_hours TEXT,
                menu_preview_url TEXT,
                description TEXT,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(city_id) REFERENCES cities(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_locations_city_id ON locations(city_id);
            CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(active);
            CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);

            CREATE TABLE IF NOT EXISTS customer_visits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                location_id INTEGER NOT NULL,
                visit_date TEXT NOT NULL,
                visit_count INTEGER NOT NULL DEFAULT 1,
                last_transaction_id INTEGER,
                total_spent REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
                FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE CASCADE,
                UNIQUE(customer_id, location_id)
            );
            CREATE INDEX IF NOT EXISTS idx_customer_visits_customer_id ON customer_visits(customer_id);
            CREATE INDEX IF NOT EXISTS idx_customer_visits_location_id ON customer_visits(location_id);
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
        if "password_salt" not in admin_cols:
            conn.execute("ALTER TABLE admin_users ADD COLUMN password_salt TEXT NOT NULL DEFAULT ''")
            conn.commit()
        if "password_iter" not in admin_cols:
            conn.execute("ALTER TABLE admin_users ADD COLUMN password_iter INTEGER NOT NULL DEFAULT 200000")
            conn.commit()
        # Migration: add preferences columns to admin_users for UI config API
        if "preferences" not in admin_cols:
            conn.execute("ALTER TABLE admin_users ADD COLUMN preferences TEXT")
            conn.commit()
        if "dashboard_prefs" not in admin_cols:
            conn.execute("ALTER TABLE admin_users ADD COLUMN dashboard_prefs TEXT")
            conn.commit()
        # Migration: add description column to products if missing
        product_cols = [r["name"] for r in conn.execute("PRAGMA table_info(products)").fetchall()]
        if "description" not in product_cols:
            conn.execute("ALTER TABLE products ADD COLUMN description TEXT")
            conn.commit()

        # Migration: create tenant_configs table for UI theming
        tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        if "tenant_configs" not in tables:
            conn.execute(
                """
                CREATE TABLE tenant_configs (
                    tenant_id TEXT PRIMARY KEY,
                    config TEXT NOT NULL DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )
            conn.execute("INSERT INTO tenant_configs (tenant_id, config) VALUES ('default', '{}')")
            conn.commit()
    finally:
        conn.close()
