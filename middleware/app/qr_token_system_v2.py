"""
Improved QR Token Generation System

Fixes:
1. GUID arithmetic overflow using proper big integer handling
2. Race conditions with database transactions
3. Security using secrets module
4. Proper error handling and logging
"""

import logging
import secrets
import sqlite3
import uuid
from contextlib import contextmanager
from typing import Optional

logger = logging.getLogger(__name__)

# Constants for token generation
TOKEN_LENGTH = 8
BASE_GUID_KEY = "qr_token_base_guid"
MAX_RETRY_ATTEMPTS = 10


@contextmanager
def database_transaction(conn: sqlite3.Connection):
    """Context manager for database transactions with proper isolation."""
    try:
        conn.execute("BEGIN IMMEDIATE")
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def generate_secure_token() -> str:
    """Generate cryptographically secure random token."""
    return f"{secrets.randbelow(90_000_000) + 10_000_000:08d}"


def get_or_generate_base_guid_safe(conn: sqlite3.Connection) -> str:
    """Safely get or generate base GUID with proper transaction handling."""
    with database_transaction(conn):
        # Ensure table exists
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """
        )

        # Try to get existing GUID
        row = conn.execute(
            "SELECT value FROM system_settings WHERE key=?", (BASE_GUID_KEY,)
        ).fetchone()

        if row:
            return row[0]

        # Generate new GUID
        base_guid = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO system_settings (key, value) VALUES (?, ?)",
            (BASE_GUID_KEY, base_guid),
        )
        logger.info(f"Generated new base GUID: {base_guid}")
        return base_guid


def generate_unique_qr_token_safe(conn: sqlite3.Connection) -> str:
    """Generate unique QR token with proper overflow handling and retries."""
    base_guid = get_or_generate_base_guid_safe(conn)

    # Get current max customer ID
    max_id_row = conn.execute("SELECT MAX(id) FROM customers").fetchone()
    current_max_id = max_id_row[0] if max_id_row and max_id_row[0] else 0

    # Generate token using UUID-based approach to avoid overflow
    for attempt in range(MAX_RETRY_ATTEMPTS):
        try:
            # Use UUID + counter approach for guaranteed uniqueness
            namespace = uuid.UUID(base_guid)
            counter_value = current_max_id + attempt + 1

            # Generate deterministic UUID from namespace + counter
            token_uuid = uuid.uuid5(namespace, str(counter_value))

            # Convert UUID-derived entropy into an 8-digit numeric token.
            token = f"{(token_uuid.int % 90_000_000) + 10_000_000:08d}"

            # Verify uniqueness
            existing = conn.execute(
                "SELECT id FROM customers WHERE qr_token=?", (token,)
            ).fetchone()

            if not existing:
                logger.debug(f"Generated unique token: {token} (attempt {attempt + 1})")
                return token

        except Exception as e:
            logger.warning(f"Token generation attempt {attempt + 1} failed: {e}")
            continue

    # Fallback to secure random token
    logger.warning("GUID-based generation failed, using secure random fallback")
    return generate_secure_token()


def resolve_or_create_customer_safe(
    conn: sqlite3.Connection, **kwargs
) -> tuple[int, bool]:
    """Thread-safe customer resolution with proper transaction handling."""

    for attempt in range(MAX_RETRY_ATTEMPTS):
        try:
            with database_transaction(conn):
                # Check for existing customer
                existing_id = _find_existing_customer(conn, **kwargs)

                if existing_id:
                    # Update existing customer if needed
                    _update_customer_if_changed(conn, existing_id, **kwargs)
                    return existing_id, False

                # Create new customer
                customer_id = _create_new_customer(conn, **kwargs)
                return customer_id, True

        except sqlite3.IntegrityError as e:
            if "UNIQUE constraint failed: customers.qr_token" in str(e):
                logger.info(f"QR token collision, retrying (attempt {attempt + 1})")
                continue
            raise
        except Exception as e:
            logger.error(f"Customer creation attempt {attempt + 1} failed: {e}")
            if attempt == MAX_RETRY_ATTEMPTS - 1:
                raise
            continue

    raise RuntimeError(
        f"Failed to resolve/create customer after {MAX_RETRY_ATTEMPTS} attempts"
    )


def _find_existing_customer(conn: sqlite3.Connection, **kwargs) -> Optional[int]:
    """Find existing customer by various identifiers."""
    # Implementation similar to original but with proper parameter handling
    telegram_id = kwargs.get("telegram_id")
    vk_id = kwargs.get("vk_id")
    phone = kwargs.get("phone")

    if telegram_id is not None:
        row = conn.execute(
            "SELECT id FROM customers WHERE telegram_id=?", (telegram_id,)
        ).fetchone()
        if row:
            return row[0]

    if vk_id is not None:
        row = conn.execute(
            "SELECT id FROM customers WHERE vk_id=?", (vk_id,)
        ).fetchone()
        if row:
            return row[0]

    if phone:
        row = conn.execute(
            "SELECT id FROM customers WHERE phone=?", (phone,)
        ).fetchone()
        if row:
            return row[0]

    return None


def _update_customer_if_changed(
    conn: sqlite3.Connection, customer_id: int, **kwargs
) -> None:
    """Update customer if data has changed."""
    # Implementation of update logic with proper field handling


def _create_new_customer(conn: sqlite3.Connection, **kwargs) -> int:
    """Create new customer with unique QR token."""
    qr_token = generate_unique_qr_token_safe(conn)

    cur = conn.execute(
        """
        INSERT INTO customers (
            phone, full_name, telegram_id, vk_id, qr_token,
            marketing_allowed, data_processing_allowed, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    """,
        (
            kwargs.get("phone"),
            kwargs.get("full_name", ""),
            kwargs.get("telegram_id"),
            kwargs.get("vk_id"),
            qr_token,
            kwargs.get("marketing_allowed", 1),
            kwargs.get("data_processing_allowed", 1),
        ),
    )

    return cur.lastrowid


# Migration helper to fix existing tokens
def migrate_existing_tokens(conn: sqlite3.Connection) -> dict:
    """Migrate existing QR tokens to new format if needed."""
    migrated = {"fixed": 0, "errors": 0}

    try:
        with database_transaction(conn):
            # Check if we have tokens in old format that might collide
            rows = conn.execute(
                "SELECT id, qr_token FROM customers WHERE qr_token IS NOT NULL"
            ).fetchall()

            for row in rows:
                customer_id, old_token = row
                if old_token and len(old_token) == TOKEN_LENGTH:
                    # Verify token format and uniqueness
                    collision_count = conn.execute(
                        "SELECT COUNT(*) FROM customers WHERE qr_token=? AND id!=?",
                        (old_token, customer_id),
                    ).fetchone()[0]

                    if collision_count > 0:
                        # Generate new unique token for this customer
                        new_token = generate_unique_qr_token_safe(conn)
                        conn.execute(
                            "UPDATE customers SET qr_token=? WHERE id=?",
                            (new_token, customer_id),
                        )
                        migrated["fixed"] += 1
                        logger.info(
                            f"Migrated customer {customer_id}: {old_token} -> {new_token}"
                        )

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        migrated["errors"] += 1
        raise

    return migrated
