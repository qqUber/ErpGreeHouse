"""
Platform-agnostic keyboard definitions for bot integrations.

Provides button definitions that can be formatted by platform-specific
adapters (VK API JSON format or aiogram InlineKeyboardMarkup).
"""

from typing import Any, Dict, List

# Consent keyboard buttons (152-ФЗ)
CONSENT_BUTTONS: List[Dict[str, Any]] = [
    {
        "text": "Пользовательское соглашение ✅",
        "callback_data": "consent:agree",
    },
    {
        "text": "152-ФЗ обработка персональных данных ✅",
        "callback_data": "consent:agree",
    },
    {
        "text": "Отказ ❌",
        "callback_data": "consent:refuse",
    },
]

# Marketing consent keyboard buttons
MARKETING_BUTTONS: List[Dict[str, Any]] = [
    {
        "text": "Да, хочу ✅",
        "callback_data": "consent:marketing:yes",
    },
    {
        "text": "Нет, спасибо ❌",
        "callback_data": "consent:marketing:no",
    },
]


def get_consent_buttons() -> List[Dict[str, Any]]:
    """
    Get consent keyboard buttons.

    Returns:
        List of button definitions with 'text' and 'callback_data' keys
    """
    return CONSENT_BUTTONS.copy()


def get_marketing_buttons() -> List[Dict[str, Any]]:
    """
    Get marketing consent keyboard buttons.

    Returns:
        List of button definitions with 'text' and 'callback_data' keys
    """
    return MARKETING_BUTTONS.copy()


def format_vk_keyboard(buttons: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Format buttons for VK API keyboard format.

    Args:
        buttons: List of button definitions

    Returns:
        VK API compatible keyboard dict
    """
    vk_buttons = []
    for btn in buttons:
        vk_buttons.append(
            [
                {
                    "action": {
                        "type": "text",
                        "label": btn["text"],
                        "payload": '{"command": "' + btn["callback_data"] + '"}',
                    },
                    "color": (
                        "positive" if "agree" in btn["callback_data"] or "yes" in btn["callback_data"] else "negative"
                    ),
                }
            ]
        )

    return {"one_time": True, "buttons": vk_buttons}


def format_telegram_keyboard(
    buttons: List[Dict[str, Any]],
) -> List[List[Dict[str, str]]]:
    """
    Format buttons for Telegram InlineKeyboardMarkup.

    Args:
        buttons: List of button definitions

    Returns:
        Telegram InlineKeyboardMarkup compatible nested list
    """
    return [[{"text": btn["text"], "callback_data": btn["callback_data"]} for btn in buttons]]
