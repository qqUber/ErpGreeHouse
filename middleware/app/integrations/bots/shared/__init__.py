"""
Shared bot framework for VK and Telegram handlers.

This module contains common business logic extracted from both platforms
to eliminate code duplication while keeping platform-specific code separate.

Modules:
- keys: Redis key generators
- consent: Consent management functions
- registration: Registration flow state machine
- commands: Shared command handlers
- keyboards: Platform-agnostic keyboard definitions
- base: Abstract base class for bot adapters
"""

from .keys import consent_key, registration_key, cart_key
from .consent import (
    store_consent,
    get_customer_consents,
    cleanup_user_data,
    update_consent,
    find_customer_by_platform,
    get_customer_id,
    CURRENT_POLICY_VERSION,
)
from .registration import RegistrationFlow, get_consent_text, get_marketing_consent_text
from .commands import (
    cmd_start,
    cmd_subscribe,
    cmd_revoke_consent,
)
from .keyboards import (
    CONSENT_BUTTONS,
    MARKETING_BUTTONS,
    get_consent_buttons,
    get_marketing_buttons,
    format_vk_keyboard,
    format_telegram_keyboard,
)
from .base import BaseBotAdapter

__all__ = [
    # Keys
    "consent_key",
    "registration_key",
    "cart_key",
    # Consent
    "store_consent",
    "get_customer_consents",
    "cleanup_user_data",
    "update_consent",
    "find_customer_by_platform",
    "get_customer_id",
    "CURRENT_POLICY_VERSION",
    # Registration
    "RegistrationFlow",
    "get_consent_text",
    "get_marketing_consent_text",
    # Commands
    "cmd_start",
    "cmd_subscribe",
    "cmd_revoke_consent",
    # Keyboards
    "CONSENT_BUTTONS",
    "MARKETING_BUTTONS",
    "get_consent_buttons",
    "get_marketing_buttons",
    "format_vk_keyboard",
    "format_telegram_keyboard",
    # Base
    "BaseBotAdapter",
]
