"""
Registration flow state machine for bot integrations.

Provides platform-agnostic registration flow that handles:
- Name capture
- Phone number capture with normalization
- Marketing consent

The platform-specific adapters (VK, Telegram) handle the actual message sending
while this module handles the state management and business logic.
"""

from typing import Any, Dict, Literal, Optional, Tuple

from ....db import get_db
from ....identify import generate_qr_token, normalize_name, normalize_phone
from ....storage import get_redis
from .consent import CURRENT_POLICY_VERSION, store_consent
from .keys import consent_key

# Valid platform sources
Source = Literal["tg", "vk"]

# Registration TTL in seconds (1 hour)
REGISTRATION_TTL = 3600


class RegistrationFlow:
    """
    Manages the registration flow state machine for bot integrations.

    The flow is:
    1. consent_given -> user has agreed to data processing
    2. name -> user provides their name
    3. phone -> user provides their phone number
    4. marketing -> user decides on marketing consent
    """

    # Step names
    STEP_CONSENT = "consent"
    STEP_NAME = "name"
    STEP_PHONE = "phone"
    STEP_MARKETING = "marketing"

    def __init__(self, source: Source):
        """
        Initialize the registration flow.

        Args:
            source: Platform source - "tg" for Telegram, "vk" for VK
        """
        self.source = source

    def is_in_registration_flow(self, user_id: int) -> bool:
        """
        Check if user is in an active registration flow.

        Args:
            user_id: The platform user ID

        Returns:
            True if user has consent_given=1 in Redis
        """
        r = get_redis()
        data = r.hgetall(consent_key(self.source, user_id))  # type: ignore[union-attr]
        return data.get("consent_given") == "1"

    def get_registration_data(self, user_id: int) -> Dict[str, str]:
        """
        Get current registration data from Redis.

        Args:
            user_id: The platform user ID

        Returns:
            Dict with registration data (name, phone, step, consent_given)
        """
        r = get_redis()
        return r.hgetall(consent_key(self.source, user_id))  # type: ignore[return-value]

    def set_step(self, user_id: int, step: str) -> None:
        """
        Set the current registration step.

        Args:
            user_id: The platform user ID
            step: The step name (name, phone, marketing)
        """
        r = get_redis()
        r.hset(consent_key(self.source, user_id), mapping={"step": step})
        r.expire(consent_key(self.source, user_id), REGISTRATION_TTL)

    def start_registration(self, user_id: int) -> None:
        """
        Start the registration flow after consent is given.

        Args:
            user_id: The platform user ID
        """
        r = get_redis()
        r.hset(
            consent_key(self.source, user_id),
            mapping={"consent_given": "1", "step": self.STEP_NAME},
        )
        r.expire(consent_key(self.source, user_id), REGISTRATION_TTL)

    def store_name(self, user_id: int, name: str) -> None:
        """
        Store user's name and advance to phone step.

        Args:
            user_id: The platform user ID
            name: User's name
        """
        r = get_redis()
        r.hset(
            consent_key(self.source, user_id),
            mapping={"name": name, "step": self.STEP_PHONE},
        )
        r.expire(consent_key(self.source, user_id), REGISTRATION_TTL)

    def store_phone(self, user_id: int, phone: str) -> Optional[str]:
        """
        Store user's phone and advance to marketing step.

        Args:
            user_id: The platform user ID
            phone: User's phone number (will be normalized)

        Returns:
            Normalized phone string, or None if invalid
        """
        normalized = normalize_phone(phone)
        if not normalized:
            return None

        r = get_redis()
        r.hset(
            consent_key(self.source, user_id),
            mapping={"phone": normalized, "step": self.STEP_MARKETING},
        )
        r.expire(consent_key(self.source, user_id), REGISTRATION_TTL)
        return normalized

    def clear_registration(self, user_id: int) -> None:
        """
        Clear registration data from Redis.

        Args:
            user_id: The platform user ID
        """
        r = get_redis()
        r.delete(consent_key(self.source, user_id))

    def complete_registration(
        self,
        user_id: int,
        name: str,
        phone: str,
        marketing_allowed: int,
    ) -> Tuple[Dict[str, Any], bool]:
        """
        Complete the registration by creating/updating customer record.

        This function:
        1. Checks if phone exists in customers table
        2. If exists: UPDATE with platform ID, full_name, marketing_allowed
        3. If not exists: INSERT new customer with phone, platform ID, qr_token, marketing_allowed
        4. Stores consent records (data_processing + marketing if allowed)
        5. Cleans up Redis registration data

        Args:
            user_id: The platform user ID
            name: User's name (will be normalized)
            phone: User's phone number
            marketing_allowed: 1 for marketing allowed, 0 for not

        Returns:
            Tuple of (customer_dict, is_new) where is_new=True if customer was created
        """
        normalized_phone = normalize_phone(phone)
        normalized_name = normalize_name(name)

        db = get_db()
        conn = db.connect()
        try:
            # Check for existing customer by phone
            cur = conn.execute(
                "SELECT * FROM customers WHERE phone = ?", (normalized_phone,)
            )
            existing = cur.fetchone()

            is_new = False

            if existing:
                # Customer exists - link the social account if not already linked
                updates: list[str] = []
                params: list[Any] = []

                # Update platform ID if currently empty
                id_column = f"{self.source}_id"
                if existing[id_column] is None:
                    updates.append(f"{id_column} = ?")
                    params.append(int(user_id))

                # Update full_name
                updates.append("full_name = ?")
                params.append(normalized_name)

                # Update marketing_allowed
                updates.append("marketing_allowed = ?")
                params.append(marketing_allowed)

                # Update data_processing_allowed
                updates.append("data_processing_allowed = ?")
                params.append(1)

                # Update preferred_channel if not set
                if existing["preferred_channel"] is None:
                    updates.append("preferred_channel = ?")
                    params.append(self.source)

                updates.append("updated_at = datetime('now')")
                params.append(existing["id"])

                # noqa: B608 - updates built from hardcoded column names
                conn.execute(
                    f"UPDATE customers SET {', '.join(updates)} WHERE id = ?",
                    tuple(params),
                )
                conn.commit()

                # Fetch updated record
                cur = conn.execute(
                    "SELECT * FROM customers WHERE id = ?", (existing["id"],)
                )
                customer = cur.fetchone()
                customer_dict = dict(customer) if customer else dict(existing)
            else:
                # Create new customer
                qr_token = generate_qr_token()

                conn.execute(
                    """
                    INSERT INTO customers
                    (phone, full_name, {0}_id, qr_token, preferred_channel,
                     marketing_allowed, data_processing_allowed, balance_points,
                     created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
                    """.format(self.source),
                    (
                        normalized_phone,
                        normalized_name,
                        int(user_id),
                        qr_token,
                        self.source,
                        marketing_allowed,
                        1,
                    ),
                )
                conn.commit()

                # Fetch the newly created record
                cur = conn.execute(
                    "SELECT * FROM customers WHERE phone = ?", (normalized_phone,)
                )
                customer = cur.fetchone()
                customer_dict = dict(customer) if customer else {}
                is_new = True

            customer_id = customer_dict.get("id")

            # Store consent records for 152-ФЗ compliance
            if customer_id is not None:
                store_consent(
                    int(customer_id),
                    self.source,
                    "Я ознакомлен с Политикой конфиденциальности и даю согласие "
                    "на обработку персональных данных в соответствии с 152-ФЗ.",
                    CURRENT_POLICY_VERSION,
                    "data_processing",
                )

            if marketing_allowed and customer_id is not None:
                store_consent(
                    int(customer_id),
                    self.source,
                    "Я даю согласие на получение рекламных рассылок и акций",
                    CURRENT_POLICY_VERSION,
                    "marketing",
                )

            return customer_dict, is_new

        finally:
            conn.close()


def get_consent_text() -> str:
    """
    Get the standard consent text for data processing.

    Returns:
        Consent text in Russian
    """
    return (
        "Я ознакомлен с Политикой конфиденциальности и даю согласие "
        "на обработку персональных данных в соответствии с 152-ФЗ."
    )


def get_marketing_consent_text() -> str:
    """
    Get the standard marketing consent text.

    Returns:
        Marketing consent text in Russian
    """
    return "Я даю согласие на получение рекламных рассылок и акций"
