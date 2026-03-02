"""
Shared command handlers for bot integrations.

Provides platform-agnostic command logic that can be used by both
VK and Telegram handlers. The platform-specific adapters handle
the actual message sending.
"""

from typing import Any, Callable, Dict, Literal, Optional

from ....db import get_db
from .consent import (
    CURRENT_POLICY_VERSION,
    cleanup_user_data,
    get_customer_consents,
    store_consent,
    update_consent,
)

# Valid platform sources
Source = Literal["tg", "vk"]

# Message callback type - platform-specific function to send messages
MessageCallback = Callable[[str], Any]


def cmd_start(
    source: Source,
    user_id: int,
    send_message: MessageCallback,
    get_customer_data: Optional[Callable[[], Optional[Dict[str, Any]]]] = None,
) -> None:
    """
    Handle /start command - check if user is registered and show consent if new.
    
    Args:
        source: Platform source - "tg" for Telegram, "vk" for VK
        user_id: The platform user ID
        send_message: Platform-specific function to send messages
        get_customer_data: Optional function to get customer data from external source (e.g., ERP)
    """
    db = get_db()
    conn = db.connect()
    try:
        # Check if user exists in database
        id_column = f"{source}_id"
        cur = conn.execute(
            f"SELECT id, full_name, marketing_allowed, data_processing_allowed FROM customers WHERE {id_column}=?",
            (user_id,)
        )
        row = cur.fetchone()

        if row:
            # User already registered - show balance info
            full_name = row["full_name"] or "друг"
            marketing = row["marketing_allowed"]
            data_processing = row["data_processing_allowed"]
            
            consent_status = ""
            if data_processing:
                consent_status = "\n\n✅ Обработка данных разрешена"
                if marketing:
                    consent_status += "\n✅ Рассылки включены"
                else:
                    consent_status += "\n❌ Рассылки выключены"
            
            send_message(
                f"С возвращением, {full_name}! 🏠☕\n\n"
                f"Рады видеть вас снова!{consent_status}\n\n"
                f"Управление подпиской: /subscribe /revoke_consent"
            )
        else:
            # New user - signal that consent keyboard should be shown
            # The caller should handle displaying the keyboard
            send_message("__show_consent_keyboard__")
    finally:
        conn.close()


def cmd_subscribe(
    source: Source,
    user_id: int,
    send_message: MessageCallback,
) -> None:
    """
    Handle /subscribe command - opt in to marketing.
    
    Args:
        source: Platform source - "tg" for Telegram, "vk" for VK
        user_id: The platform user ID
        send_message: Platform-specific function to send messages
    """
    db = get_db()
    conn = db.connect()
    try:
        id_column = f"{source}_id"
        cur = conn.execute(
            f"SELECT id, full_name FROM customers WHERE {id_column}=?",
            (user_id,)
        )
        row = cur.fetchone()

        if not row:
            send_message("Вы ещё не зарегистрированы. /start")
            return
        
        customer_id = row["id"]
        
        # Update marketing consent
        update_consent(source, user_id, marketing_allowed=1)
        
        # Store marketing consent
        store_consent(
            customer_id,
            source,
            "Повторное согласие на маркетинговые рассылки",
            CURRENT_POLICY_VERSION,
            "marketing"
        )
        
        send_message(
            "✅ Подписка возобновлена!\n\n"
            "Теперь вы будете получать новости и акции.\n\n"
            "Отписаться: /revoke_consent"
        )
    finally:
        conn.close()


def cmd_revoke_consent(
    source: Source,
    user_id: int,
    send_message: MessageCallback,
) -> None:
    """
    Handle /revoke_consent command - opt out of marketing.
    
    Args:
        source: Platform source - "tg" for Telegram, "vk" for VK
        user_id: The platform user ID
        send_message: Platform-specific function to send messages
    """
    db = get_db()
    conn = db.connect()
    try:
        id_column = f"{source}_id"
        cur = conn.execute(
            f"SELECT id, full_name FROM customers WHERE {id_column}=?",
            (user_id,)
        )
        row = cur.fetchone()
        
        if not row:
            send_message("Вы ещё не зарегистрированы. /start")
            return
        
        customer_id = row["id"]
        
        # Revoke marketing consent immediately
        update_consent(source, user_id, marketing_allowed=0)
        
        # Log the revocation for compliance
        store_consent(
            customer_id,
            source,
            "Отзыв согласия на маркетинговые рассылки (1-click)",
            CURRENT_POLICY_VERSION,
            "marketing"
        )
        
        send_message(
            "✅ Рассылки отключены мгновенно.\n\n"
            "Вы больше не будете получать рекламные сообщения.\n"
            "Ваш профиль и баллы сохранены.\n\n"
            "Подписаться снова: /subscribe"
        )
    finally:
        conn.close()


def cmd_profile(
    source: Source,
    user_id: int,
    send_message: MessageCallback,
) -> None:
    """
    Handle /profile command - show user profile information.
    
    Args:
        source: Platform source - "tg" for Telegram, "vk" for VK
        user_id: The platform user ID
        send_message: Platform-specific function to send messages
    """
    db = get_db()
    conn = db.connect()
    try:
        id_column = f"{source}_id"
        cur = conn.execute(
            f"""SELECT full_name, phone, balance_points, marketing_allowed, 
                     data_processing_allowed, created_at 
              FROM customers WHERE {id_column}=?""",
            (user_id,)
        )
        row = cur.fetchone()
        
        if not row:
            send_message("Вы ещё не зарегистрированы. /start")
            return
        
        full_name = row["full_name"] or "Не указано"
        phone = row["phone"] or "Не указан"
        balance = row["balance_points"]
        marketing = row["marketing_allowed"]
        data_proc = row["data_processing_allowed"]
        
        status_lines = []
        if data_proc:
            status_lines.append("✅ Обработка данных")
        else:
            status_lines.append("❌ Обработка данных")
        
        if marketing:
            status_lines.append("✅ Маркетинговые рассылки")
        else:
            status_lines.append("❌ Маркетинговые рассылки")
        
        send_message(
            f"👤 Ваш профиль\n\n"
            f"Имя: {full_name}\n"
            f"Телефон: {phone}\n"
            f"Баллы: {balance}\n\n"
            f"Статус:\n" + "\n".join(f"• {s}" for s in status_lines)
        )
    finally:
        conn.close()


def get_customer_info(source: Source, user_id: int) -> Optional[Dict[str, Any]]:
    """
    Get customer information by platform ID.
    
    Args:
        source: Platform source - "tg" for Telegram, "vk" for VK
        user_id: The platform user ID
        
    Returns:
        Customer dict if found, None otherwise
    """
    db = get_db()
    conn = db.connect()
    try:
        id_column = f"{source}_id"
        cur = conn.execute(
            f"SELECT * FROM customers WHERE {id_column}=?",
            (user_id,)
        )
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def is_registered(source: Source, user_id: int) -> bool:
    """
    Check if user is registered.
    
    Args:
        source: Platform source - "tg" for Telegram, "vk" for VK
        user_id: The platform user ID
        
    Returns:
        True if user is registered, False otherwise
    """
    return get_customer_info(source, user_id) is not None
