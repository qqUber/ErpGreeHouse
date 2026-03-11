"""
Consent management functions for 152-ФЗ compliance.

Provides platform-agnostic functions for storing, retrieving, and managing
user consent for data processing and marketing communications.
"""

from typing import Any, Dict, Literal, Optional

from ....db import get_db
from ....storage import get_redis
from .keys import consent_key, registration_key

# Current policy version for 152-ФЗ compliance
CURRENT_POLICY_VERSION = "1.0.0"

# Valid platform sources
Source = Literal["tg", "vk"]


def get_consent_history(customer_id: int, conn=None) -> list[Dict[str, Any]]:
    """
    Get consent history for a customer for audit purposes.

    Args:
        customer_id: The customer ID in the database
        conn: Optional database connection to reuse (prevents locking)

    Returns:
        List of consent records sorted by accepted_at timestamp
    """
    if conn:
        cur = conn.execute(
            "SELECT * FROM consents WHERE customer_id = ? ORDER BY accepted_at DESC",
            (customer_id,),
        )
        rows = cur.fetchall()
    else:
        db = get_db()
        conn = db.connect()
        try:
            cur = conn.execute(
                "SELECT * FROM consents WHERE customer_id = ? ORDER BY accepted_at DESC",
                (customer_id,),
            )
            rows = cur.fetchall()
        finally:
            conn.close()

    return [dict(row) for row in rows]


def revoke_all_consents(source: Source, user_id: int, conn=None) -> None:
    """
    Revoke all consents for a user.

    Args:
        source: Platform source - "tg" for Telegram, "vk" for VK
        user_id: The platform user ID
        conn: Optional database connection to reuse (prevents locking)
    """
    # Map source to column name
    id_column_mapping = {"tg": "telegram_id", "vk": "vk_id"}
    id_column = id_column_mapping.get(source, f"{source}_id")

    # Use existing connection or create new one
    if conn is None:
        db = get_db()
        conn = db.connect()
        close_conn = True
    else:
        close_conn = False

    try:
        # Get customer ID  # noqa: B608 - id_column is hardcoded
        cur = conn.execute(
            f"SELECT id FROM customers WHERE {id_column} = ?", (user_id,)
        )
        row = cur.fetchone()
        if row:
            customer_id = row["id"]

            # Revoke all consents
            update_consent(
                source,
                user_id,
                marketing_allowed=0,
                data_processing_allowed=0,
                conn=conn,
            )

            # Store revocation record
            store_consent(
                customer_id,
                source,
                "Отзыв всех согласий на обработку данных",
                CURRENT_POLICY_VERSION,
                "both",
                conn,
            )

        if close_conn:
            conn.commit()
    finally:
        if close_conn:
            conn.close()


def store_consent(
    customer_id: int,
    source: Source,
    consent_text: str,
    consent_version: str,
    consent_type: str = "data_processing",
    conn=None,
) -> None:
    """
    Store consent record for 152-ФЗ compliance.

    Args:
        customer_id: The customer ID in the database
        source: Platform source - "tg" for Telegram, "vk" for VK
        consent_text: The text of the consent
        consent_version: Version of the privacy policy
        consent_type: Type of consent - "data_processing" or "marketing"
        conn: Optional database connection to reuse (prevents locking)
    """
    if conn:
        # Use existing connection
        conn.execute(
            "INSERT INTO consents(customer_id, source, consent_version, consent_text, consent_type) VALUES(?,?,?,?,?)",
            (customer_id, source, consent_version, consent_text, consent_type),
        )
        # Don't commit here - let caller handle commit/rollback
    else:
        # Create new connection
        db = get_db()
        conn = db.connect()
        try:
            conn.execute(
                "INSERT INTO consents(customer_id, source, consent_version, consent_text, consent_type) VALUES(?,?,?,?,?)",
                (customer_id, source, consent_version, consent_text, consent_type),
            )
            conn.commit()
        finally:
            conn.close()


def get_customer_consents(source: Source, user_id: int, conn=None) -> Dict[str, Any]:
    """
    Get customer consent status by platform user ID.

    Args:
        source: Platform source - "tg" for Telegram, "vk" for VK
        user_id: The platform user ID
        conn: Optional database connection to reuse (prevents locking)

    Returns:
        Dict with marketing_allowed and data_processing_allowed boolean values.
        Returns all False if user not found.
    """
    # Map source to column name (source "tg" maps to "telegram_id", "vk" maps to "vk_id")
    id_column_mapping = {"tg": "telegram_id", "vk": "vk_id"}
    id_column = id_column_mapping.get(source, f"{source}_id")

    if conn:
        # Use existing connection
        cur = conn.execute(
            f"SELECT marketing_allowed, data_processing_allowed FROM customers WHERE {id_column} = ?",
            (user_id,),
        )
        row = cur.fetchone()
    else:
        # Create new connection
        db = get_db()
        conn = db.connect()
        try:
            cur = conn.execute(
                f"SELECT marketing_allowed, data_processing_allowed FROM customers WHERE {id_column} = ?",
                (user_id,),
            )
            row = cur.fetchone()
        finally:
            conn.close()

    if row:
        return {
            "marketing_allowed": bool(row["marketing_allowed"]),
            "data_processing_allowed": bool(row["data_processing_allowed"]),
        }
    return {"marketing_allowed": False, "data_processing_allowed": False}


def cleanup_user_data(
    source: Source, user_id: int, conn=None, log_refusal: bool = True
) -> None:
    """
    Clean all client data when user refuses registration or deletes profile (152-ФЗ compliance).
    Deletes user from customers table and cleans all client history.

    Args:
        source: Platform source - "tg" for Telegram, "vk" for VK
        user_id: The platform user ID
        conn: Optional database connection to reuse (prevents locking)
        log_refusal: Whether to log a refusal consent record (default: True)
    """
    # Map source to column name
    id_column_mapping = {"tg": "telegram_id", "vk": "vk_id"}
    id_column = id_column_mapping.get(source, f"{source}_id")

    # Use existing connection or create new one
    if conn is None:
        db = get_db()
        conn = db.connect()
        close_conn = True
    else:
        close_conn = False

    try:
        # Get customer ID before deleting
        cur = conn.execute(
            f"SELECT id FROM customers WHERE {id_column} = ?", (user_id,)
        )
        row = cur.fetchone()
        customer_id = row["id"] if row else None

        if customer_id:
            # Log the refusal for compliance (only if log_refusal is True)
            if log_refusal:
                store_consent(
                    customer_id,
                    source,
                    "Отказ от регистрации пользователем",
                    CURRENT_POLICY_VERSION,
                    "data_processing",
                    conn,
                )

            # Delete all consents EXCEPT the refusal record we just created
            # This provides proof of deletion for 152-ФЗ compliance
            conn.execute(
                "DELETE FROM consents WHERE customer_id = ? AND consent_text != ?",
                (customer_id, "Отказ от регистрации пользователем"),
            )

        # Delete customer from customers table
        conn.execute(f"DELETE FROM customers WHERE {id_column} = ?", (user_id,))
        conn.commit()
    finally:
        if close_conn:
            conn.close()

    # Clean Redis data (cart, consent state, etc.)
    r = get_redis()
    r.delete(consent_key(source, user_id))
    r.delete(registration_key(source, user_id))


def update_consent(
    source: Source,
    user_id: int,
    marketing_allowed: Optional[int] = None,
    data_processing_allowed: Optional[int] = None,
    conn=None,
) -> None:
    """
    Update customer consent status.

    Args:
        source: Platform source - "tg" for Telegram, "vk" for VK
        user_id: The platform user ID
        marketing_allowed: 1 to allow marketing, 0 to deny
        data_processing_allowed: 1 to allow data processing, 0 to deny
        conn: Optional database connection to reuse (prevents locking)
    """
    # Map source to column name (source "tg" maps to "telegram_id", "vk" maps to "vk_id")
    id_column_mapping = {"tg": "telegram_id", "vk": "vk_id"}
    id_column = id_column_mapping.get(source, f"{source}_id")

    # Use existing connection or create new one
    if conn is None:
        db = get_db()
        conn = db.connect()
        close_conn = True
    else:
        close_conn = False

    try:
        updates = ["updated_at = datetime('now')"]
        params = []

        if marketing_allowed is not None:
            updates.append("marketing_allowed = ?")
            params.append(marketing_allowed)
        if data_processing_allowed is not None:
            updates.append("data_processing_allowed = ?")
            params.append(data_processing_allowed)

        params.append(user_id)

        conn.execute(
            f"UPDATE customers SET {', '.join(updates)} WHERE {id_column} = ?",
            tuple(params),
        )

        # Get customer ID to store consent record
        cur = conn.execute(
            f"SELECT id FROM customers WHERE {id_column} = ?", (user_id,)
        )
        row = cur.fetchone()
        if row:
            customer_id = row["id"]
            # Determine consent type based on which field was updated
            if marketing_allowed is not None and data_processing_allowed is not None:
                consent_type = "both"
            elif marketing_allowed is not None:
                consent_type = "marketing"
            else:
                consent_type = "data_processing"

            # Determine consent text based on whether we're granting or revoking
            is_revoking = False
            if marketing_allowed == 0 or data_processing_allowed == 0:
                is_revoking = True

            if is_revoking:
                consent_text = "Отзыв согласия на обработку данных"
            else:
                # Only include values that were actually updated
                parts = []
                if marketing_allowed is not None:
                    parts.append(f"marketing={marketing_allowed}")
                if data_processing_allowed is not None:
                    parts.append(f"data_processing={data_processing_allowed}")
                consent_text = f"Updated consent: {', '.join(parts)}"

            # Store consent record for audit trail (reuse existing connection)
            store_consent(
                customer_id,
                source,
                consent_text,
                CURRENT_POLICY_VERSION,
                consent_type,
                conn,  # Pass existing connection to prevent locking
            )

        if close_conn:
            conn.commit()
    finally:
        if close_conn:
            conn.close()


def find_customer_by_platform(source: Source, user_id: int) -> Optional[Dict[str, Any]]:
    """
    Find a customer by their platform ID.

    Args:
        source: Platform source - "tg" for Telegram, "vk" for VK
        user_id: The platform user ID

    Returns:
        Customer dict if found, None otherwise.
    """
    # Map source to column name (source "tg" maps to "telegram_id", "vk" maps to "vk_id")
    id_column_mapping = {"tg": "telegram_id", "vk": "vk_id"}
    id_column = id_column_mapping.get(source, f"{source}_id")

    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(f"SELECT * FROM customers WHERE {id_column} = ?", (user_id,))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_customer_id(source: Source, user_id: int) -> Optional[int]:
    """
    Get customer ID by platform user ID.

    Args:
        source: Platform source - "tg" for Telegram, "vk" for VK
        user_id: The platform user ID

    Returns:
        Customer ID if found, None otherwise.
    """
    customer = find_customer_by_platform(source, user_id)
    return customer["id"] if customer else None
