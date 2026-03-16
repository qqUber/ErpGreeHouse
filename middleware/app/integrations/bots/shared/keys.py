"""
Redis key generators for bot integrations.

Provides platform-agnostic key generation for consent, registration,
and cart data stored in Redis.
"""

from typing import Literal

# Valid platform sources
Source = Literal["tg", "vk"]


def consent_key(source: Source, user_id: int) -> str:
    """
    Generate Redis key for consent state.

    Args:
        source: Platform source - "tg" for Telegram, "vk" for VK
        user_id: The platform user ID

    Returns:
        Redis key string in format "crm:consent:{source}:{user_id}"
    """
    return f"crm:consent:{source}:{user_id}"


def registration_key(source: Source, user_id: int) -> str:
    """
    Generate Redis key for in-progress registration data.

    Args:
        source: Platform source - "tg" for Telegram, "vk" for VK
        user_id: The platform user ID

    Returns:
        Redis key string in format "crm:reg:{source}:{user_id}"
    """
    return f"crm:reg:{source}:{user_id}"


def cart_key(source: Source, user_id: int) -> str:
    """
    Generate Redis key for shopping cart data.

    Args:
        source: Platform source - "tg" for Telegram, "vk" for VK
        user_id: The platform user ID

    Returns:
        Redis key string in format "crm:cart:{source}:{user_id}"
    """
    return f"crm:cart:{source}:{user_id}"


# Legacy key functions for backward compatibility
def _vk_consent_key(vk_id: int) -> str:
    """Legacy VK consent key - use consent_key('vk', vk_id) instead."""
    return consent_key("vk", vk_id)


def _vk_registration_key(vk_id: int) -> str:
    """Legacy VK registration key - use registration_key('vk', vk_id) instead."""
    return registration_key("vk", vk_id)


def _tg_consent_key(tg_id: int) -> str:
    """Legacy Telegram consent key - use consent_key('tg', tg_id) instead."""
    return consent_key("tg", tg_id)


def _tg_registration_key(tg_id: int) -> str:
    """Legacy Telegram registration key - use registration_key('tg', tg_id) instead."""
    return registration_key("tg", tg_id)


def _tg_cart_key(tg_id: int) -> str:
    """Legacy Telegram cart key - use cart_key('tg', tg_id) instead."""
    return cart_key("tg", tg_id)
