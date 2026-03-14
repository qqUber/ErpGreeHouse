import json
import random
import sqlite3
from datetime import datetime
from typing import Any

from .identify import normalize_name, normalize_phone


class CustomerIdentityConflictError(ValueError):
    pass


def generate_unique_qr_token(conn: sqlite3.Connection, max_attempts: int = 50) -> str:
    for _ in range(max_attempts):
        token = f"{random.randint(0, 999999):06d}"
        # Check if token already exists
        row = conn.execute(
            "SELECT id FROM customers WHERE qr_token=?",
            (token,),
        ).fetchone()
        if not row:
            return token
    raise RuntimeError("Failed to generate unique loyalty code")


def _merge_preferences(existing_json: str | None, updates: dict[str, Any]) -> str:
    try:
        current = json.loads(existing_json or "{}")
    except Exception:
        current = {}
    current.update({key: value for key, value in updates.items() if value not in (None, "")})
    return json.dumps(current, ensure_ascii=False)


_ONBOARDING_STATUS_RANK = {
    "identified": 1,
    "consent_accepted": 2,
    "linked": 3,
    "registered": 4,
    "completed": 5,
}


def _should_update_onboarding_status(
    current_status: str | None, next_status: str | None
) -> bool:
    candidate = str(next_status or "").strip()
    if not candidate:
        return False
    current = str(current_status or "").strip()
    current_rank = _ONBOARDING_STATUS_RANK.get(current, 0)
    candidate_rank = _ONBOARDING_STATUS_RANK.get(candidate, current_rank)
    return candidate_rank > current_rank


def resolve_customer_id(
    conn: sqlite3.Connection,
    *,
    telegram_id: int | None = None,
    vk_id: int | None = None,
    phone: str | None = None,
) -> int | None:
    normalized_phone = normalize_phone(phone or "") if phone else None

    if telegram_id is not None:
        row = conn.execute(
            "SELECT id FROM customers WHERE telegram_id=?",
            (telegram_id,),
        ).fetchone()
        if row:
            return int(row["id"])

    if vk_id is not None:
        row = conn.execute(
            "SELECT id FROM customers WHERE vk_id=?",
            (vk_id,),
        ).fetchone()
        if row:
            return int(row["id"])

    if normalized_phone:
        row = conn.execute(
            "SELECT id FROM customers WHERE phone=?",
            (normalized_phone,),
        ).fetchone()
        if row:
            return int(row["id"])

    return None


def resolve_or_create_customer(
    conn: sqlite3.Connection,
    *,
    telegram_id: int | None = None,
    vk_id: int | None = None,
    phone: str | None = None,
    full_name: str | None = None,
    gender: str | None = None,
    birthday: str | None = None,
    email: str | None = None,
    city: str | None = None,
    username: str | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
    marketing_allowed: int | None = None,
    data_processing_allowed: int | None = None,
    preferred_channel: str | None = None,
    onboarding_status: str | None = None,
    phone_verification_method: str | None = None,
) -> tuple[int, bool]:
    normalized_phone = normalize_phone(phone or "") if phone else None
    normalized_name = normalize_name(full_name or "") if full_name else None
    resolved_onboarding_status = onboarding_status or "registered"

    for _ in range(5):
        by_telegram = None
        if telegram_id is not None:
            by_telegram = conn.execute(
                "SELECT * FROM customers WHERE telegram_id=?",
                (telegram_id,),
            ).fetchone()

        by_vk = None
        if vk_id is not None:
            by_vk = conn.execute(
                "SELECT * FROM customers WHERE vk_id=?",
                (vk_id,),
            ).fetchone()

        by_phone = None
        if normalized_phone:
            by_phone = conn.execute(
                "SELECT * FROM customers WHERE phone=?",
                (normalized_phone,),
            ).fetchone()

        matches = [row for row in (by_telegram, by_vk, by_phone) if row]
        if matches:
            customer_ids = {int(row["id"]) for row in matches}
            if len(customer_ids) > 1:
                raise CustomerIdentityConflictError(
                    "Provided identifiers are linked to different customers"
                )

        target = by_telegram or by_vk or by_phone
        if target:
            customer_id = int(target["id"])
            updates: list[str] = []
            params: list[Any] = []

            if normalized_phone and target["phone"] != normalized_phone:
                updates.append("phone = ?")
                params.append(normalized_phone)
            if telegram_id is not None and target["telegram_id"] != telegram_id:
                updates.append("telegram_id = ?")
                params.append(telegram_id)
            if telegram_id is not None and "tg_id" in target.keys() and target["tg_id"] != telegram_id:
                updates.append("tg_id = ?")
                params.append(telegram_id)
            if vk_id is not None and target["vk_id"] != vk_id:
                updates.append("vk_id = ?")
                params.append(vk_id)
            if normalized_name and target["full_name"] != normalized_name:
                updates.append("full_name = ?")
                params.append(normalized_name)
            if gender and target["gender"] != gender:
                updates.append("gender = ?")
                params.append(gender)
            if birthday and target["birthday"] != birthday:
                updates.append("birthday = ?")
                params.append(birthday)
            if email and target["email"] != email:
                updates.append("email = ?")
                params.append(email)
            if city and target["city"] != city:
                updates.append("city = ?")
                params.append(city)
            if preferred_channel and target["preferred_channel"] != preferred_channel:
                updates.append("preferred_channel = ?")
                params.append(preferred_channel)
            if marketing_allowed is not None and int(target["marketing_allowed"] or 0) != int(marketing_allowed):
                updates.append("marketing_allowed = ?")
                params.append(marketing_allowed)
            if data_processing_allowed is not None and int(target["data_processing_allowed"] or 0) != int(data_processing_allowed):
                updates.append("data_processing_allowed = ?")
                params.append(data_processing_allowed)
            if _should_update_onboarding_status(
                target["onboarding_status"], resolved_onboarding_status
            ):
                updates.append("onboarding_status = ?")
                params.append(resolved_onboarding_status)
            if normalized_phone and phone_verification_method:
                updates.append("phone_verified_at = datetime('now')")
                updates.append("phone_verification_method = ?")
                params.append(phone_verification_method)

            preferences_json = _merge_preferences(
                target["preferences_json"] if "preferences_json" in target.keys() else None,
                {
                    "telegram_username": username,
                    "telegram_first_name": first_name,
                    "telegram_last_name": last_name,
                    "telegram_contact_user_id": telegram_id,
                },
            )
            if "preferences_json" in target.keys() and preferences_json != (target["preferences_json"] or "{}"):
                updates.append("preferences_json = ?")
                params.append(preferences_json)

            if not target["qr_token"]:
                updates.append("qr_token = ?")
                params.append(generate_unique_qr_token(conn))

            if updates:
                updates.append("updated_at = datetime('now')")
                params.append(customer_id)
                try:
                    conn.execute(
                        f"UPDATE customers SET {', '.join(updates)} WHERE id = ?",
                        tuple(params),
                    )
                except sqlite3.IntegrityError as exc:
                    if "qr_token" in str(exc).lower():
                        continue
                    raise
            return customer_id, False

        qr_token = generate_unique_qr_token(conn)
        preferences_json = _merge_preferences(
            None,
            {
                "telegram_username": username,
                "telegram_first_name": first_name,
                "telegram_last_name": last_name,
                "telegram_contact_user_id": telegram_id,
            },
        )
        try:
            cur = conn.execute(
                """
                INSERT INTO customers(
                    phone, full_name, telegram_id, tg_id, vk_id, qr_token, preferred_channel,
                    preferences_json, marketing_allowed, data_processing_allowed,
                    birthday, gender, email, city, onboarding_status,
                    phone_verified_at, phone_verification_method
                )
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    normalized_phone,
                    normalized_name or "",
                    telegram_id,
                    telegram_id,
                    vk_id,
                    qr_token,
                    preferred_channel,
                    preferences_json,
                    int(marketing_allowed or 0),
                    int(data_processing_allowed or 0),
                    birthday,
                    gender,
                    email,
                    city,
                    resolved_onboarding_status,
                    datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S") if normalized_phone else None,
                    phone_verification_method or ("telegram_contact" if normalized_phone else None),
                ),
            )
            return int(cur.lastrowid), True
        except sqlite3.IntegrityError as exc:
            if "qr_token" in str(exc).lower():
                continue
            raise

    raise RuntimeError("Failed to assign a unique loyalty code after multiple attempts")


def get_customer_row(conn: sqlite3.Connection, customer_id: int) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM customers WHERE id=?", (customer_id,)).fetchone()
    return dict(row) if row else {}
