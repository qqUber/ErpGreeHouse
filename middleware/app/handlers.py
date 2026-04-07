# type: ignore
import json
import logging
import re
from typing import Any, Dict, Literal, Tuple

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
    WebAppInfo,
)

from .config import get_settings
from .customer_identity import (
    CustomerIdentityConflictError,
    get_customer_row,
    resolve_or_create_customer,
)
from .db import get_db
from .identify import normalize_name, normalize_phone
from .integrations.bots.shared.consent import CURRENT_POLICY_VERSION
from .integrations.bots.shared.consent import cleanup_user_data as _shared_cleanup
from .integrations.bots.shared.consent import get_customer_consents as _shared_get
from .integrations.bots.shared.consent import store_consent as _shared_store
from .integrations.bots.shared.consent import update_consent as _shared_update
from .integrations.pos.erpnext_client import ERPClient
from .loyalty_profile import build_customer_loyalty_profile
from .menu import find_item
from .services import get_location_service
from .storage import delete, get_json, get_redis, set_json
from .utils.currency import format_currency
from .utils.qr_codes import make_qr_image as _make_qr_image

logger = logging.getLogger(__name__)
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

# Move gender labels to TELEGRAM_I18N for proper internationalization
GENDER_LABELS = {
    "male": "male",
    "female": "female",
    "other": "other",
}

# Move menu labels to TELEGRAM_I18N for proper internationalization
TELEGRAM_MENU_LABELS = {
    "balance_card": "balance_card",
    "menu_addresses": "menu_addresses",
    "open_coffee_shop": "open_coffee_shop",
    "ask_question": "ask_question",
    "leave_feedback": "leave_feedback",
    "vacancies": "vacancies",
    "about_club": "about_club",
}

TELEGRAM_I18N = {
    "ru": {
        "share_contact": "Поделиться контактом",
        "virtual_card_ready": "Ваша виртуальная карта готова.\n\nПокажи QR-код бариста или назови этот код: {qr_token}",
        "card_button": "Моя карта лояльности",
        "city_info": "Информация по вашему городу.",
        "friend": "друг",
        "home_registered": "Привет 👋\nЭто клуб Green House, {full_name}.\n\nЗдесь будет проще копить бонусы, отслеживать свой прогресс и первыми узнавать про акции и новинки сети кофеен.{balance_text}",
        "balance_line": "\n💰 Ваш баланс: {balance} баллов",
        "privacy_policy": "Политика конфиденциальности",
        "decline": "Отказ",
        "consent_intro": "Привет 👋\nЭто клуб Green House. Здесь ты можешь копить бонусы, отслеживать свой прогресс и первым узнавать про акции и новинки.\n\nДля начала нужно получить твоё согласие на обработку персональных данных.",
        "restart_start": "Начните заново с меню или /start",
        "use_start_registration": "Используйте главное меню или /start для начала регистрации.",
        "session_expired": "Сессия регистрации истекла. Начните заново с меню или /start",
        "register_first": "Сначала зарегистрируйся: /start",
        "not_registered_use_start": "Вы ещё не зарегистрированы. Используйте меню или /start",
        "consent_accepted": "Согласие принято! ✅",
        "share_phone_prompt": "Чтобы подключиться к нашей программе лояльности,\nнажми кнопку «Поделиться контактом» или отправь свой номер вручную.",
        "menu_help": "Используйте кнопки меню внизу чата.",
        "accept": "Принять",
        "support_chat_not_configured": "Support chat не настроен. Обратитесь к администратору.",
        "support_message_sent": "Сообщение отправлено в поддержку. Мы скоро ответим.",
        "registration_completed": "Регистрация завершена! 🎉\n\nВам начислено 100 приветственных баллов.",
        "registration_marketing_on": "\n\nТеперь вы будете получать новости и акции.",
        "registration_marketing_off": "\n\nВы не будете получать рекламные рассылки.",
        # Add gender labels
        "gender_male": "Мужской",
        "gender_female": "Женский",
        "gender_other": "Не хочу указывать",
        # Add menu labels
        "menu_balance_card": "Баланс и карта",
        "menu_menu_addresses": "Меню и адреса",
        "menu_open_coffee_shop": "Открыть кофейню",
        "menu_ask_question": "Задать вопрос",
        "menu_leave_feedback": "Оставить отзыв",
        "menu_vacancies": "Вакансии",
        "menu_about_club": "Что такое клуб Green House?",
        # Add additional messages
        "registration_error": "Ошибка при завершении регистрации: {error}",
        "open_catalog": "Открыть каталог",
        "catalog_available_in_app": "Каталог и акции теперь доступны в приложении:",
        "menu_addresses_available": "Меню, акции и адреса доступны в приложении клуба Green House.",
        # Video messages
        "coffee_shop_video_caption": "Добро пожаловать в Green House! ☕",
        "coffee_shop_welcome": "Наша кофейня ждет вас!",
    },
    "en": {
        "share_contact": "Share contact",
        "virtual_card_ready": "Your virtual card is ready.\n\nShow this QR code to the barista or provide this code: {qr_token}",
        "card_button": "My loyalty card",
        "city_info": "Information for your city.",
        "friend": "friend",
        "home_registered": "Hi 👋\nThis is Green House Club, {full_name}.\n\nHere it will be easier to collect bonuses, track your progress, and be the first to know about promotions and new items.{balance_text}",
        "balance_line": "\n💰 Your balance: {balance} points",
        "privacy_policy": "Privacy policy",
        "decline": "Decline",
        "consent_intro": "Hi 👋\nThis is Green House Club. Here you can collect bonuses, track your progress, and be the first to hear about promotions and new items.\n\nFirst, we need your consent to process personal data.",
        "restart_start": "Start again from the menu or /start",
        "use_start_registration": "Use the main menu or /start to begin registration.",
        "session_expired": "Registration session expired. Start again from the menu or /start",
        "register_first": "Please register first: /start",
        "not_registered_use_start": "You are not registered yet. Use the menu or /start",
        "consent_accepted": "Consent accepted! ✅",
        "share_phone_prompt": "To connect to our loyalty program,\npress “Share contact” or send your phone number manually.",
        "menu_help": "Use the menu buttons at the bottom of the chat.",
        "accept": "Accept",
        "support_chat_not_configured": "Support chat is not configured. Please contact an administrator.",
        "support_message_sent": "Your message has been sent to support. We will reply soon.",
        "registration_completed": "Registration completed! 🎉\n\nYou have received 100 welcome points.",
        "registration_marketing_on": "\n\nYou will now receive news and promotions.",
        "registration_marketing_off": "\n\nYou will not receive marketing messages.",
        # Add gender labels
        "gender_male": "Male",
        "gender_female": "Female",
        "gender_other": "Prefer not to say",
        # Add menu labels
        "menu_balance_card": "Balance & Card",
        "menu_menu_addresses": "Menu & Addresses",
        "menu_open_coffee_shop": "Open Coffee Shop",
        "menu_ask_question": "Ask Question",
        "menu_leave_feedback": "Leave Feedback",
        "menu_vacancies": "Vacancies",
        "menu_about_club": "What is Green House Club?",
        # Add additional messages
        "registration_error": "Registration completion error: {error}",
        "open_catalog": "Open Catalog",
        "catalog_available_in_app": "Catalog and promotions are now available in the app:",
        "menu_addresses_available": "Menu, promotions and addresses are available in the Green House Club app.",
        # Video messages
        "coffee_shop_video_caption": "Welcome to Green House! ☕",
        "coffee_shop_welcome": "Our coffee shop awaits you!",
    },
}


def get_telegram_text(key: str, language: str = "en", **kwargs) -> str:
    """Get localized text for Telegram bot."""
    if language not in TELEGRAM_I18N:
        language = "en"

    text = TELEGRAM_I18N[language].get(key, TELEGRAM_I18N["en"].get(key, key))

    if kwargs:
        try:
            text = text.format(**kwargs)
        except (KeyError, ValueError):
            pass  # Fallback to original text if formatting fails

    return text


def get_gender_label(gender: str, language: str = "en") -> str:
    """Get localized gender label."""
    gender_key = f"gender_{gender}"
    return get_telegram_text(gender_key, language)


def get_menu_label(menu_key: str, language: str = "en") -> str:
    """Get localized menu label."""
    menu_key_full = f"menu_{menu_key}"
    return get_telegram_text(menu_key_full, language)


async def send_video_with_circle(message: Message, video_path: str, caption: str = "", language: str = "en") -> None:
    """Send video with circular overlay effect."""
    from aiogram.types import FSInputFile

    try:
        # Send video with caption
        video = FSInputFile(video_path)
        await message.answer_video(video=video, caption=caption, parse_mode="HTML")

        # Follow up with welcome message and catalog button
        settings = get_settings()
        tma_url = f"{settings.base_web_url}/tma"

        kb = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text=get_telegram_text("open_catalog", language),
                        web_app=WebAppInfo(url=tma_url),
                    )
                ]
            ]
        )

        await message.answer(get_telegram_text("coffee_shop_welcome", language), reply_markup=kb)

    except Exception as e:
        logger.error(f"Error sending video: {e}")
        # Fallback to regular message if video fails
        await cmd_menu(message)


# Import cleanup function from shared module for backward compatibility


def _cleanup_user_data(telegram_id: int) -> None:
    """Clean up user data for 152-ФЗ compliance. Wrapper around shared module function."""
    _shared_cleanup("tg", telegram_id)


def _store_consent(
    customer_id: int,
    consent_text: str,
    consent_version: str,
    consent_type: str = "data_processing",
    conn=None,
) -> None:
    """Store consent record for 152-ФЗ compliance. Wrapper around shared module function."""
    _shared_store(customer_id, "tg", consent_text, consent_version, consent_type, conn)


def _get_customer_consents(telegram_id: int, conn=None) -> dict:
    """Get customer consent status by Telegram ID. Wrapper around shared module function."""
    return _shared_get("tg", telegram_id, conn)


def _update_consent(
    telegram_id: int,
    marketing_allowed: int = None,
    data_processing_allowed: int = None,
    conn=None,
) -> None:
    """Update customer consent status. Wrapper around shared module function."""
    _shared_update("tg", telegram_id, marketing_allowed, data_processing_allowed, conn)


router = Router()


def register_or_link_user(phone: str, social_id: str, channel: Literal["tg", "vk"]) -> Tuple[Dict[str, Any], bool]:
    normalized_phone = normalize_phone(phone)
    if not normalized_phone:
        raise ValueError("Invalid phone number format")

    db = get_db()
    conn = db.connect()
    try:
        customer_id, is_new = resolve_or_create_customer(
            conn,
            telegram_id=int(social_id) if channel == "tg" else None,
            vk_id=int(social_id) if channel == "vk" else None,
            phone=normalized_phone,
            preferred_channel=channel,
            onboarding_status="linked",
        )
        conn.commit()
        return get_customer_row(conn, customer_id), is_new
    finally:
        conn.close()


def _cart_key(tg_id: int) -> str:
    return f"crm:cart:{tg_id}"


def _consent_key(tg_id: int) -> str:
    return f"crm:consent:{tg_id}"


def _support_request_key(tg_id: int) -> str:
    return f"crm:support_request:{tg_id}"


def _upsert_local_customer(
    telegram_id: int,
    full_name: str,
    phone: str,
    gender: str | None = None,
    birthday: str | None = None,
    email: str | None = None,
    city: str | None = None,
    country_id: int | None = None,
    city_id: int | None = None,
    username: str | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
    phone_verification_method: str | None = None,
    marketing_allowed: int = 1,
    data_processing_allowed: int = 1,
) -> int:
    db = get_db()
    conn = db.connect()
    try:
        customer_id, _ = resolve_or_create_customer(
            conn,
            telegram_id=telegram_id,
            phone=phone,
            full_name=full_name,
            gender=gender,
            birthday=birthday,
            email=email,
            city=city,
            country_id=country_id,
            city_id=city_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            marketing_allowed=marketing_allowed,
            data_processing_allowed=data_processing_allowed,
            preferred_channel="tg",
            onboarding_status="completed",
            phone_verification_method=phone_verification_method,
        )
        conn.commit()
        return customer_id
    finally:
        conn.close()


def _registration_phone_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=_telegram_text(None, "share_contact"), request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def _main_menu_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(text=_get_telegram_menu_label("balance_card")),
                KeyboardButton(text=_get_telegram_menu_label("menu_addresses")),
            ],
            [
                KeyboardButton(text=_get_telegram_menu_label("open_coffee_shop")),
                KeyboardButton(text=_get_telegram_menu_label("ask_question")),
            ],
            [
                KeyboardButton(text=_get_telegram_menu_label("leave_feedback")),
                KeyboardButton(text=_get_telegram_menu_label("vacancies")),
            ],
            [KeyboardButton(text=_get_telegram_menu_label("about_club"))],
        ],
        resize_keyboard=True,
    )


def _start_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(text=_get_telegram_menu_label("menu_addresses")),
                KeyboardButton(text=_get_telegram_menu_label("open_coffee_shop")),
            ],
            [
                KeyboardButton(text=_get_telegram_menu_label("ask_question")),
                KeyboardButton(text=_get_telegram_menu_label("about_club")),
            ],
        ],
        resize_keyboard=True,
    )


def _gender_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=label, callback_data=f"gender:{value}")
                for value, label in GENDER_LABELS.items()
            ]
        ]
    )


def _countries_keyboard() -> InlineKeyboardMarkup:
    """Build country selection keyboard."""
    service = get_location_service()
    countries = service.get_countries(active_only=True)

    buttons = []
    for country in countries:
        name = country.get("name_local") or country.get("name") or country["code"]
        buttons.append([InlineKeyboardButton(text=f"{name}", callback_data=f"country:{country['id']}")])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def _cities_keyboard(country_id: int) -> InlineKeyboardMarkup:
    """Build city selection keyboard for a country."""
    service = get_location_service()
    cities = service.get_cities_by_country(country_id)

    buttons = []
    for city in cities:
        name = city.get("name") or f"City {city['id']}"
        buttons.append([InlineKeyboardButton(text=name, callback_data=f"city:{city['id']}")])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def _virtual_card_message(qr_token: str) -> str:
    return _telegram_text(None, "virtual_card_ready", qr_token=qr_token)


def _get_telegram_integration_config() -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("SELECT config_json FROM integrations WHERE kind='telegram' ORDER BY id DESC LIMIT 1")
        row = cur.fetchone()
        if not row:
            return {}
        try:
            return json.loads(row["config_json"] or "{}")
        except Exception:
            return {}
    finally:
        conn.close()


def _get_telegram_menu_item_config(item_id: str) -> dict[str, Any]:
    config = _get_telegram_integration_config()
    menu_items = config.get("menu_items")
    if isinstance(menu_items, list):
        for item in menu_items:
            if isinstance(item, dict) and str(item.get("id") or "").strip() == item_id:
                return item
    commands = config.get("commands")
    if isinstance(commands, dict):
        command_config = commands.get(item_id)
        if isinstance(command_config, dict):
            return command_config
    return {}


def _get_telegram_menu_label(item_id: str) -> str:
    default_label = TELEGRAM_MENU_LABELS.get(item_id, item_id)
    config = _get_telegram_menu_item_config(item_id)
    label = str(config.get("label") or "").strip()
    return label or default_label


def _matches_telegram_menu_label(message: Message, item_id: str) -> bool:
    text = str(message.text or "").strip()
    if not text:
        return False
    return text == _get_telegram_menu_label(item_id)


def _normalize_language_code(language_code: str | None) -> str:
    code = str(language_code or "").strip().lower()
    if not code:
        return "ru"
    if code.startswith("ru"):
        return "ru"
    if code.startswith("en"):
        return "en"
    return "ru"


def _extract_language_code(language_code: str | None) -> str | None:
    code = str(language_code or "").strip().lower()
    if not code:
        return None
    if code.startswith("ru"):
        return "ru"
    if code.startswith("en"):
        return "en"
    return None


def _get_customer_preferred_language(telegram_id: int | None) -> str | None:
    if not telegram_id:
        return None
    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT preferred_language FROM customers WHERE telegram_id=? ORDER BY id DESC LIMIT 1",
            (telegram_id,),
        ).fetchone()
        if not row:
            return None
        value = str(row["preferred_language"] or "").strip()
        return _normalize_language_code(value) if value else None
    finally:
        conn.close()


def _store_customer_preferred_language(telegram_id: int | None, language_code: str | None) -> None:
    if not telegram_id:
        return
    language = _normalize_language_code(language_code)
    db = get_db()
    conn = db.connect()
    try:
        conn.execute(
            "UPDATE customers SET preferred_language=? WHERE telegram_id=?",
            (language, telegram_id),
        )
        conn.commit()
    finally:
        conn.close()


def _telegram_language(message: Message | CallbackQuery | None) -> str:
    if message is not None:
        from_user = getattr(message, "from_user", None)
        if from_user is not None:
            direct = _extract_language_code(getattr(from_user, "language_code", None))
            if direct:
                return direct
            stored = _get_customer_preferred_language(getattr(from_user, "id", None))
            if stored:
                return stored
    return "ru"


def _telegram_text(
    message: Message | CallbackQuery | None,
    key: str,
    **values: Any,
) -> str:
    language = _telegram_language(message)
    # Get custom texts from integration config
    config = _get_telegram_integration_config()
    custom_texts = config.get("custom_texts", {})
    # Check for custom text in user's language
    lang_custom = custom_texts.get(language, {})
    if key in lang_custom:
        template = str(lang_custom[key])
        return _render_command_text(template, values)
    # Fall back to default TELEGRAM_I18N
    translations = TELEGRAM_I18N.get(language) or TELEGRAM_I18N["ru"]
    template = str(translations.get(key) or TELEGRAM_I18N["ru"].get(key) or key)
    return _render_command_text(template, values)


def _remember_telegram_language(message: Message | CallbackQuery | None) -> None:
    if message is None:
        return
    from_user = getattr(message, "from_user", None)
    if from_user is None:
        return
    language = _extract_language_code(getattr(from_user, "language_code", None))
    if not language:
        return
    _store_customer_preferred_language(getattr(from_user, "id", None), language)


def _get_telegram_support_chat_id() -> str:
    config = _get_telegram_integration_config()
    return str(config.get("support_chat_id") or "").strip()


def _render_command_text(template: str, values: dict[str, Any]) -> str:
    text = template
    for key, value in values.items():
        text = text.replace(f"{{{key}}}", str(value if value is not None else ""))
    return text


def _command_items_text(items: list[Any]) -> str:
    lines: list[str] = []
    for item in items:
        if isinstance(item, str) and item.strip():
            lines.append(f"• {item.strip()}")
    return "\n".join(lines)


def _build_command_keyboard(button_text: str | None, button_url: str | None) -> InlineKeyboardMarkup | None:
    if not button_text or not button_url:
        return None
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text=button_text.strip(), url=button_url.strip())]]
    )


# Import from utils for unified QR image generation


async def _send_media_urls(message: Message, media_urls: list[str]) -> None:
    for media_url in media_urls:
        url = media_url.strip()
        if not url:
            continue
        lowered = url.lower()
        if lowered.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")):
            await message.answer_photo(url)
            continue
        if lowered.endswith((".mp4", ".mov", ".webm")):
            await message.answer_video(url)
            continue
        await message.answer_document(url)


async def _send_virtual_card(message: Message, customer: dict[str, Any]) -> None:
    qr_token = str(customer.get("qr_token") or "").strip()
    customer_id = int(customer.get("id") or 0)
    full_name = customer.get("full_name") or ""
    logger.debug(
        f"[DEBUG] _send_virtual_card: customer_id={customer_id}, full_name='{full_name}', qr_token='{qr_token}'"
    )
    if not qr_token or not customer_id:
        await message.answer(_telegram_text(message, "virtual_card_ready", qr_token=qr_token or "—"))
        return

    profile = customer.get("_loyalty_profile")
    if not isinstance(profile, dict):
        db = get_db()
        conn = db.connect()
        try:
            profile = build_customer_loyalty_profile(conn, customer_id)
        finally:
            conn.close()
    if not isinstance(profile, dict):
        profile = {}

    config = _get_telegram_menu_item_config("balance_card")
    caption_template = str(config.get("text") or _telegram_text(message, "virtual_card_ready", qr_token=qr_token))
    caption = _render_command_text(
        caption_template,
        {
            **profile,
            "customer_id": customer_id,
            "qr_token": qr_token,
            "full_name": customer.get("full_name") or "",
        },
    )
    items_text = _command_items_text(config.get("items", []))
    if items_text:
        caption = f"{caption}\n\n{items_text}"

    settings = get_settings()
    use_button = bool(config.get("use_button"))
    button_text = str(config.get("button_text") or "").strip() or "Моя карта лояльности" if use_button else None
    if use_button and not button_text:
        button_text = _telegram_text(message, "card_button")
    button_url = str(config.get("button_url") or "").strip() or f"{settings.base_web_url}/tma" if use_button else None
    reply_markup = _build_command_keyboard(button_text, button_url)

    await message.answer_photo(
        _make_qr_image(customer_id, qr_token),
        caption=caption,
        reply_markup=reply_markup,
    )

    media_urls = [str(url).strip() for url in (config.get("media_urls") or []) if str(url).strip()]
    legacy_media_url = str(config.get("media_url") or "").strip()
    if legacy_media_url:
        media_urls.append(legacy_media_url)
    await _send_media_urls(message, media_urls)


def _get_telegram_customer_card_data(telegram_id: int) -> dict[str, Any] | None:
    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT id, full_name, qr_token FROM customers WHERE telegram_id=? ORDER BY id DESC LIMIT 1",
            (telegram_id,),
        ).fetchone()
        if not row or not row["qr_token"]:
            return None
        profile = build_customer_loyalty_profile(conn, int(row["id"]))
        return {
            "id": row["id"],
            "full_name": row["full_name"] or "",
            "qr_token": row["qr_token"],
            "_loyalty_profile": profile if isinstance(profile, dict) else {},
        }
    finally:
        conn.close()


async def _send_configured_command_message(
    message: Message,
    item_id: str,
    default_text: str,
    values: dict[str, Any] | None = None,
    default_button_text: str | None = None,
    default_button_url: str | None = None,
) -> bool:
    config = _get_telegram_menu_item_config(item_id)
    if not config:
        return False

    merged_values = values or {}
    use_text = bool(config.get("use_text", True))
    use_button = bool(config.get("use_button"))
    use_media = bool(config.get("use_media"))
    text_template = str(config.get("text") or default_text)
    text = _render_command_text(text_template, merged_values) if use_text else ""
    items_text = _command_items_text(config.get("items", []))
    if items_text:
        text = f"{text}\n\n{items_text}" if text else items_text

    button_text = str(config.get("button_text") or "").strip() or default_button_text if use_button else None
    button_url = str(config.get("button_url") or "").strip() or default_button_url if use_button else None
    reply_markup = _build_command_keyboard(button_text, button_url)

    media_urls = [str(url).strip() for url in (config.get("media_urls") or []) if str(url).strip()]
    legacy_media_url = str(config.get("media_url") or "").strip()
    if legacy_media_url:
        media_urls.append(legacy_media_url)
    if use_media and media_urls:
        first_media = media_urls[0]
        lowered = first_media.lower()
        if lowered.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")):
            await message.answer_photo(first_media, caption=text or None, reply_markup=reply_markup)
        elif lowered.endswith((".mp4", ".mov", ".webm")):
            await message.answer_video(first_media, caption=text or None, reply_markup=reply_markup)
        else:
            await message.answer_document(first_media, caption=text or None, reply_markup=reply_markup)
        if len(media_urls) > 1:
            await _send_media_urls(message, media_urls[1:])
        return True

    if text or reply_markup:
        await message.answer(text or default_text, reply_markup=reply_markup)
        return True

    return False


def _get_customer_city_by_telegram_id(telegram_id: int) -> str:
    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT city FROM customers WHERE telegram_id=? ORDER BY id DESC LIMIT 1",
            (telegram_id,),
        ).fetchone()
        return str(row["city"] or "").strip() if row else ""
    finally:
        conn.close()


def _find_city_entry(config: dict[str, Any], city: str) -> dict[str, Any] | None:
    city_entries = config.get("city_entries")
    if not isinstance(city_entries, list):
        return None
    normalized_city = city.strip().lower()
    if not normalized_city:
        return None
    for entry in city_entries:
        if not isinstance(entry, dict):
            continue
        entry_city = str(entry.get("city") or "").strip().lower()
        if entry_city == normalized_city:
            return entry
    return None


async def _send_city_menu_content(message: Message, config: dict[str, Any], city: str) -> bool:
    entry = _find_city_entry(config, city)
    if not entry:
        return False

    text = str(entry.get("text") or "").strip()
    button_text = str(entry.get("button_text") or "").strip() or None
    button_url = str(entry.get("button_url") or "").strip() or None
    reply_markup = _build_command_keyboard(button_text, button_url)
    media_urls = [str(url).strip() for url in (entry.get("media_urls") or []) if str(url).strip()]

    if media_urls:
        first_media = media_urls[0]
        lowered = first_media.lower()
        if lowered.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")):
            await message.answer_photo(first_media, caption=text or None, reply_markup=reply_markup)
        elif lowered.endswith((".mp4", ".mov", ".webm")):
            await message.answer_video(first_media, caption=text or None, reply_markup=reply_markup)
        else:
            await message.answer_document(first_media, caption=text or None, reply_markup=reply_markup)
        if len(media_urls) > 1:
            await _send_media_urls(message, media_urls[1:])
        return True

    if text or reply_markup:
        await message.answer(text or _telegram_text(message, "city_info"), reply_markup=reply_markup)
        return True

    return False


def _registered_home_text(message: Message | CallbackQuery | None, full_name: str, balance_text: str = "") -> str:
    safe_name = full_name or _telegram_text(message, "friend")
    return _telegram_text(
        message,
        "home_registered",
        full_name=safe_name,
        balance_text=balance_text,
    )


def _parse_birthday(raw: str) -> str | None:
    parts = raw.strip().split(".")
    if len(parts) != 3:
        return None
    day, month, year = parts
    if not (day.isdigit() and month.isdigit() and year.isdigit() and len(year) == 4):
        return None
    day_int = int(day)
    month_int = int(month)
    year_int = int(year)
    if not (1 <= day_int <= 31 and 1 <= month_int <= 12 and 1900 <= year_int <= 2100):
        return None
    return f"{year_int:04d}-{month_int:02d}-{day_int:02d}"


@router.message(Command("start"))
async def cmd_start(message: Message) -> None:
    _remember_telegram_language(message)
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT id, full_name, marketing_allowed, data_processing_allowed, qr_token FROM customers WHERE telegram_id=?",
            (message.from_user.id,),
        )
        row = cur.fetchone()

        if row:
            full_name = row["full_name"] or _telegram_text(message, "friend")
            balance_text = ""
            try:
                client = ERPClient()
                erp_cust = await client.get_customer_by_telegram_id(message.from_user.id)
                if erp_cust:
                    bal = await client.get_balance(erp_cust["name"])
                    balance_text = _telegram_text(message, "balance_line", balance=bal)
            except Exception as e:
                logger.warning(f"Could not get balance for /start: {e}")

            await message.answer(
                _registered_home_text(message, full_name, balance_text),
                reply_markup=_main_menu_keyboard(),
            )
        else:
            kb = InlineKeyboardMarkup(
                inline_keyboard=[
                    [
                        InlineKeyboardButton(
                            text=_telegram_text(message, "privacy_policy"),
                            url=f"{get_settings().base_web_url}/privacy",
                        )
                    ],
                    [
                        InlineKeyboardButton(
                            text=_telegram_text(message, "accept"),
                            callback_data="consent:yes",
                        ),
                        InlineKeyboardButton(
                            text=_telegram_text(message, "decline"),
                            callback_data="consent:no",
                        ),
                    ],
                ]
            )
            await message.answer(
                _telegram_text(message, "consent_intro"),
                reply_markup=kb,
            )
            await message.answer(
                _telegram_text(message, "menu_help"),
                reply_markup=_start_keyboard(),
            )
    finally:
        conn.close()

    r = get_redis()
    r.sadd("crm:known_chats", str(message.chat.id))


@router.callback_query(F.data == "reg:start")
async def reg_start(cb: CallbackQuery) -> None:
    await cb.message.answer(_telegram_text(cb, "restart_start"))
    await cb.answer()


@router.message(Command("register"))
async def cmd_register(message: Message) -> None:
    await message.answer(_telegram_text(message, "use_start_registration"))


@router.callback_query(F.data.startswith("consent:"))
async def cb_consent(cb: CallbackQuery) -> None:
    decision = cb.data.split(":", 1)[1]

    if decision in ("no", "refuse"):
        await cb.message.edit_text("Регистрация отменена.")
        await cb.answer()
        delete(_consent_key(cb.from_user.id))
        _cleanup_user_data(cb.from_user.id)
        return

    if decision in ("yes", "agree"):
        r = get_redis()
        db = get_db()
        conn = db.connect()
        try:
            try:
                customer_id, _ = resolve_or_create_customer(
                    conn,
                    telegram_id=cb.from_user.id,
                    username=cb.from_user.username,
                    first_name=cb.from_user.first_name,
                    last_name=cb.from_user.last_name,
                    preferred_channel="tg",
                    onboarding_status="consent_accepted",
                    data_processing_allowed=1,
                )
            except CustomerIdentityConflictError:
                await cb.message.edit_text(
                    "Найден конфликт профиля. Обратитесь к оператору для подтверждения телефона."
                )
                await cb.answer()
                return
            _store_consent(
                customer_id,
                "Я соглашаюсь на обработку персональных данных в соответствии с 152-ФЗ.",
                CURRENT_POLICY_VERSION,
                "data_processing",
                conn=conn,
            )
            conn.commit()
        finally:
            conn.close()

        # Check if force_single_country mode is enabled
        service = get_location_service()
        force_single = service.get_force_single_country()
        system_country = service.get_system_country()

        if force_single and system_country:
            # Skip country selection, go directly to city selection
            country_id = system_country["id"]
            r.hset(
                _consent_key(cb.from_user.id),
                mapping={
                    "consent_given": "1",
                    "country_id": str(country_id),
                    "step": "city_select",
                    "username": cb.from_user.username or "",
                    "first_name": cb.from_user.first_name or "",
                    "last_name": cb.from_user.last_name or "",
                },
            )
            await cb.message.edit_text("Согласие принято! ✅")
            await cb.message.answer("Выберите ваш город:", reply_markup=_cities_keyboard(country_id))
        else:
            # Show country selection
            r.hset(
                _consent_key(cb.from_user.id),
                mapping={
                    "consent_given": "1",
                    "step": "country_select",
                    "username": cb.from_user.username or "",
                    "first_name": cb.from_user.first_name or "",
                    "last_name": cb.from_user.last_name or "",
                },
            )
            await cb.message.edit_text("Согласие принято! ✅")
            await cb.message.answer("Выберите вашу страну:", reply_markup=_countries_keyboard())
        await cb.answer()
        return


@router.callback_query(F.data.startswith("country:"))
async def cb_country(cb: CallbackQuery) -> None:
    """Handle country selection during registration."""
    _remember_telegram_language(cb)
    country_id = cb.data.split(":", 1)[1]
    r = get_redis()
    key = _consent_key(cb.from_user.id)
    data = r.hgetall(key)

    if not data or data.get("consent_given") != "1":
        await cb.message.edit_text("Сессия регистрации истекла. Начните заново с /start")
        await cb.answer()
        return

    # Store country_id and move to city selection
    r.hset(key, mapping={"country_id": country_id, "step": "city_select"})
    await cb.message.edit_text("🌍 Страна выбрана")
    await cb.message.answer("Выберите ваш город:", reply_markup=_cities_keyboard(int(country_id)))
    await cb.answer()


@router.callback_query(F.data.startswith("city:"))
async def cb_city(cb: CallbackQuery) -> None:
    """Handle city selection during registration."""
    _remember_telegram_language(cb)
    city_id = cb.data.split(":", 1)[1]
    r = get_redis()
    key = _consent_key(cb.from_user.id)
    data = r.hgetall(key)

    if not data or data.get("consent_given") != "1":
        await cb.message.edit_text("Сессия регистрации истекла. Начните заново с /start")
        await cb.answer()
        return

    # Store city_id and move to phone step
    r.hset(key, mapping={"city_id": city_id, "step": "phone"})
    await cb.message.edit_text("🏙️ Город выбран")
    await cb.message.answer(
        "Чтобы подключиться к нашей программе лояльности,\n"
        "нажми кнопку «Поделиться контактом» или отправь свой номер вручную.",
        reply_markup=_registration_phone_keyboard(),
    )
    await cb.answer()


@router.message(
    lambda message: bool(get_redis().hgetall(_consent_key(message.from_user.id)).get("consent_given") == "1")
)
async def handle_registration_message(message: Message) -> None:
    _remember_telegram_language(message)
    r = get_redis()
    key = _consent_key(message.from_user.id)
    data = r.hgetall(key)

    if not data or data.get("consent_given") != "1":
        return

    step = data.get("step")

    if step == "phone":
        contact = message.contact
        phone_raw = (message.text or "").strip()
        verification_method = "manual"
        if contact:
            if contact.user_id and contact.user_id != message.from_user.id:
                await message.answer(
                    "Пожалуйста, используйте кнопку, чтобы отправить свой собственный контакт.",
                    reply_markup=_registration_phone_keyboard(),
                )
                return
            phone_raw = contact.phone_number or ""
            verification_method = "telegram_contact"
        phone = normalize_phone(phone_raw)
        if not phone:
            await message.answer(
                "Неверный формат телефона. Попробуйте ещё раз или используйте кнопку «Поделиться контактом».",
                reply_markup=_registration_phone_keyboard(),
            )
            return
        r.hset(
            key,
            mapping={
                "phone": phone,
                "phone_verification_method": verification_method,
                "step": "full_name",
            },
        )
        await message.answer(
            "Заполните анкету ✍️\n\nУкажи своё имя и фамилию.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    if step == "full_name":
        name_result = normalize_name((message.text or "").strip())
        full_name = name_result.get("normalized", "") if isinstance(name_result, dict) else str(name_result)
        logger.debug(f"[DEBUG] Received full_name input: raw='{message.text}' -> normalized='{full_name}'")
        if not full_name:
            await message.answer("Имя не распознано. Введите полное имя и фамилию.")
            return
        r.hset(key, mapping={"full_name": full_name, "step": "gender"})
        logger.debug(f"[DEBUG] Saved full_name to Redis: {full_name}")
        await message.answer("Укажи свой пол.", reply_markup=_gender_keyboard())
        return

    if step == "birthday":
        birthday = _parse_birthday((message.text or "").strip())
        if not birthday:
            await message.answer("Введите дату рождения в формате dd.mm.yyyy")
            return
        r.hset(key, mapping={"birthday": birthday, "step": "email"})
        await message.answer("Введите email.")
        return

    if step == "email":
        email = (message.text or "").strip()
        if email and not EMAIL_RE.fullmatch(email):
            await message.answer("Введите корректный email.")
            return
        r.hset(key, mapping={"email": email, "step": "city"})
        await message.answer("Введите ваш город.")
        return

    if step == "city":
        city_result = normalize_name((message.text or "").strip())
        city = city_result.get("normalized", "") if isinstance(city_result, dict) else str(city_result)
        if not city:
            await message.answer("Введите город.")
            return
        r.hset(key, mapping={"city": city, "step": "marketing"})
        kb = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(text="Да, хочу", callback_data="marketing:yes"),
                    InlineKeyboardButton(text="Нет, спасибо", callback_data="marketing:no"),
                ]
            ]
        )
        await message.answer("Хотите получать информацию об акциях и бонусах?", reply_markup=kb)


@router.callback_query(F.data.startswith("gender:"))
async def cb_gender(cb: CallbackQuery) -> None:
    _remember_telegram_language(cb)
    gender = cb.data.split(":", 1)[1]
    if gender not in GENDER_LABELS:
        await cb.answer()
        return
    r = get_redis()
    key = _consent_key(cb.from_user.id)
    data = r.hgetall(key)
    if not data or data.get("consent_given") != "1":
        await cb.message.edit_text("Сессия регистрации истекла. Начните заново с /start")
        await cb.answer()
        return
    r.hset(key, mapping={"gender": gender, "step": "birthday"})
    await cb.message.edit_text(f"Пол: {GENDER_LABELS[gender]}")
    await cb.message.answer("Введите дату рождения в формате dd.mm.yyyy")
    await cb.answer()


@router.callback_query(F.data.startswith("marketing:"))
async def cb_marketing_consent(cb: CallbackQuery) -> None:
    _remember_telegram_language(cb)
    """Handle marketing consent selection and complete registration."""
    decision = cb.data.split(":", 1)[1]
    marketing_allowed = 1 if decision == "yes" else 0

    r = get_redis()
    key = _consent_key(cb.from_user.id)
    data = r.hgetall(key)

    if not data or data.get("consent_given") != "1":
        await cb.message.edit_text("Сессия регистрации истекла. Начните заново с /start")
        await cb.answer()
        return

    try:
        client = ERPClient()
        consent_version = "1.1 (MVP)"
        consent_text = "Я ознакомлен с Политикой конфиденциальности и даю согласие на обработку персональных данных и получение рекламных рассылок в соответствии с 152-ФЗ."

        # 1. Create in ERP
        erp_name = data.get("full_name", "")
        logger.debug(f"[DEBUG] Creating ERP customer with name: '{erp_name}'")
        await client.create_customer(
            telegram_id=cb.from_user.id,
            name=erp_name,
            phone=data.get("phone", ""),
            consent_text=consent_text,
        )

        # 2. Upsert locally
        local_full_name = data.get("full_name", "")
        logger.debug(f"[DEBUG] Upserting local customer with name: '{local_full_name}'")
        customer_id = _upsert_local_customer(
            cb.from_user.id,
            local_full_name,
            data.get("phone", ""),
            gender=data.get("gender"),
            birthday=data.get("birthday"),
            email=data.get("email"),
            city=data.get("city"),
            country_id=int(data.get("country_id")) if data.get("country_id") else None,
            city_id=int(data.get("city_id")) if data.get("city_id") else None,
            username=data.get("username"),
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            phone_verification_method=data.get("phone_verification_method"),
            marketing_allowed=marketing_allowed,
            data_processing_allowed=1,
        )

        # 3. Store consent records
        _store_consent(customer_id, consent_text, consent_version, "data_processing")
        if marketing_allowed:
            _store_consent(customer_id, consent_text, consent_version, "marketing")

        # 4. Cleanup Redis
        delete(key)

        # 5. Success message
        conn_local = get_db().connect()
        try:
            customer = get_customer_row(conn_local, customer_id)
            logger.debug(
                f"[DEBUG] Customer from DB: id={customer.get('id')}, full_name='{customer.get('full_name')}', qr_token='{customer.get('qr_token')}'"
            )
        finally:
            conn_local.close()
        msg = _telegram_text(cb, "registration_completed")
        if marketing_allowed:
            msg += _telegram_text(cb, "registration_marketing_on")
        else:
            msg += _telegram_text(cb, "registration_marketing_off")

        await cb.message.edit_text(msg)
        await _send_virtual_card(cb.message, customer)
        await cb.message.answer(
            _registered_home_text(
                cb.message,
                customer.get("full_name") or _telegram_text(cb, "friend"),
            ),
            reply_markup=_main_menu_keyboard(),
        )

    except Exception as e:
        logger.error(f"Registration error: {e}")
        await cb.message.edit_text(_telegram_text(cb, "registration_error", error=str(e)))

    await cb.answer()


@router.message(Command("balance"))
async def cmd_balance(message: Message) -> None:
    _remember_telegram_language(message)
    customer = _get_telegram_customer_card_data(message.from_user.id)
    if not customer:
        await message.answer(_telegram_text(message, "register_first"))
        return
    await _send_virtual_card(message, customer)


@router.message(Command("menu"))
async def cmd_menu(message: Message) -> None:
    _remember_telegram_language(message)
    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT 1 FROM customers WHERE telegram_id=? LIMIT 1",
            (message.from_user.id,),
        ).fetchone()
    finally:
        conn.close()

    reply_markup = _main_menu_keyboard() if row else _start_keyboard()
    settings = get_settings()
    tma_url = f"{settings.base_web_url}/tma"
    sent = await _send_configured_command_message(
        message,
        "open_coffee_shop",
        _telegram_text(message, "catalog_available_in_app"),
        default_button_text=_telegram_text(message, "open_catalog"),
        default_button_url=tma_url,
    )
    if sent:
        return
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=_telegram_text(message, "open_catalog"),
                    web_app=WebAppInfo(url=tma_url),
                )
            ]
        ]
    )
    await message.answer(
        _telegram_text(message, "catalog_available_in_app"),
        reply_markup=kb,
    )
    await message.answer(_telegram_text(message, "menu_help"), reply_markup=reply_markup)


@router.message(lambda message: _matches_telegram_menu_label(message, "balance_card"))
async def menu_balance_and_card(message: Message) -> None:
    await cmd_balance(message)


@router.message(lambda message: _matches_telegram_menu_label(message, "menu_addresses"))
async def menu_menu_and_addresses(message: Message) -> None:
    _remember_telegram_language(message)
    settings = get_settings()
    config = _get_telegram_menu_item_config("menu_addresses")
    if bool(config.get("use_city_list")):
        customer_city = _get_customer_city_by_telegram_id(message.from_user.id)
        if await _send_city_menu_content(message, config, customer_city):
            return
    sent = await _send_configured_command_message(
        message,
        "menu_addresses",
        _telegram_text(message, "menu_addresses_available"),
        default_button_text=_telegram_text(message, "open_coffee_shop"),
        default_button_url=f"{settings.base_web_url}/tma",
    )
    if sent:
        return
    await message.answer(
        _telegram_text(message, "menu_addresses_available"),
        reply_markup=InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text=_telegram_text(message, "open_coffee_shop"),
                        web_app=WebAppInfo(url=f"{settings.base_web_url}/tma"),
                    )
                ]
            ]
        ),
    )


@router.message(lambda message: _matches_telegram_menu_label(message, "open_coffee_shop"))
async def menu_open_coffee_shop(message: Message) -> None:
    _remember_telegram_language(message)

    # Path to your video file (should be stored in middleware/assets/videos/)
    video_path = "assets/videos/coffee_shop_intro.mp4"

    # Send video with circular overlay effect
    caption = _telegram_text(message, "coffee_shop_video_caption")
    await send_video_with_circle(message, video_path, caption, _telegram_language(message))


@router.message(lambda message: _matches_telegram_menu_label(message, "ask_question"))
async def menu_ask_question(message: Message) -> None:
    _remember_telegram_language(message)
    config = _get_telegram_menu_item_config("ask_question")
    if bool(config.get("use_support_forward")) and _get_telegram_support_chat_id():
        set_json(
            _support_request_key(message.from_user.id),
            {"active": True},
            ex=3600,
        )
    sent = await _send_configured_command_message(
        message,
        "ask_question",
        "Напиши свой вопрос следующим сообщением, и мы передадим его в поддержку.",
    )
    if sent:
        return
    await message.answer("Напиши свой вопрос следующим сообщением, и мы передадим его в поддержку.")


@router.message(lambda message: _matches_telegram_menu_label(message, "leave_feedback"))
async def menu_leave_feedback(message: Message) -> None:
    _remember_telegram_language(message)
    sent = await _send_configured_command_message(
        message,
        "leave_feedback",
        "Спасибо! Отправь отзыв следующим сообщением — мы обязательно его прочитаем и передадим команде.",
    )
    if sent:
        return
    await message.answer(
        "Спасибо! Отправь отзыв следующим сообщением — мы обязательно его прочитаем и передадим команде."
    )


@router.message(lambda message: _matches_telegram_menu_label(message, "vacancies"))
async def menu_vacancies(message: Message) -> None:
    _remember_telegram_language(message)
    sent = await _send_configured_command_message(
        message,
        "vacancies",
        "Актуальные вакансии можно уточнить у менеджера или в наших соцсетях.",
    )
    if sent:
        return
    await message.answer("Актуальные вакансии можно уточнить у менеджера или в наших соцсетях.")


@router.message(lambda message: _matches_telegram_menu_label(message, "about_club"))
async def menu_about_club(message: Message) -> None:
    _remember_telegram_language(message)
    sent = await _send_configured_command_message(
        message,
        "about_club",
        "Клуб Green House — это программа лояльности с бонусами, персональными предложениями и виртуальной картой.",
    )
    if sent:
        return
    await message.answer(
        "Клуб Green House — это программа лояльности с бонусами, персональными предложениями и виртуальной картой."
    )


@router.message(
    lambda message: (
        isinstance(get_json(_support_request_key(message.from_user.id)), dict)
        and bool(get_json(_support_request_key(message.from_user.id)).get("active"))
    )
)
async def handle_support_request_message(message: Message) -> None:
    _remember_telegram_language(message)
    support_chat_id = _get_telegram_support_chat_id()
    if not support_chat_id:
        delete(_support_request_key(message.from_user.id))
        await message.answer(_telegram_text(message, "support_chat_not_configured"))
        return

    from .integrations.bots.telegram_handler import create_bot

    bot = create_bot()
    customer_name = " ".join(
        [part for part in [message.from_user.first_name, message.from_user.last_name] if part]
    ).strip() or (message.from_user.username or str(message.from_user.id))
    support_text = (
        f"Новое сообщение в поддержку\n\n"
        f"Клиент: {customer_name}\n"
        f"Telegram ID: {message.from_user.id}\n"
        f"Username: @{message.from_user.username}\n\n"
        f"{message.text or ''}"
    )
    try:
        await bot.send_message(chat_id=int(support_chat_id), text=support_text)
    finally:
        await bot.session.close()
    delete(_support_request_key(message.from_user.id))
    await message.answer(_telegram_text(message, "support_message_sent"))


@router.message(Command("add"))
async def cmd_add(message: Message) -> None:
    args = message.text.split()
    if len(args) < 3:
        await message.answer("Формат: /add код количество")
        return
    code = args[1]
    try:
        qty = int(args[2])
    except Exception:
        await message.answer("Количество должно быть числом")
        return
    item = find_item(code)
    if not item:
        await message.answer("Товар не найден")
        return
    cart = get_json(_cart_key(message.from_user.id)) or {"items": [], "bonus": 0}
    cart["items"].append({"code": code, "name": item["name"], "price": item["price"], "qty": qty})
    set_json(_cart_key(message.from_user.id), cart, ex=3600)
    total = sum(x["price"] * x["qty"] for x in cart["items"])
    await message.answer(f"Добавлено. Текущая сумма: {format_currency(total)}")


@router.callback_query(F.data.startswith("addcb:"))
async def cb_add(cb: CallbackQuery) -> None:
    code = cb.data.split(":", 1)[1]
    item = find_item(code)
    if not item:
        await cb.answer()
        return
    cart = get_json(_cart_key(cb.from_user.id)) or {"items": [], "bonus": 0}
    cart["items"].append({"code": code, "name": item["name"], "price": item["price"], "qty": 1})
    set_json(_cart_key(cb.from_user.id), cart, ex=3600)
    total = sum(x["price"] * x["qty"] for x in cart["items"])
    await cb.message.edit_text(f"Добавлено {item['name']}. Сумма: {format_currency(total)}")
    await cb.answer()


@router.message(Command("pay"))
async def cmd_pay(message: Message) -> None:
    args = message.text.split()
    if len(args) < 2:
        await message.answer("Формат: /pay баллы")
        return
    try:
        points = int(args[1])
    except Exception:
        await message.answer("Баллы должны быть числом")
        return
    cart = get_json(_cart_key(message.from_user.id))
    if not cart or not cart.get("items"):
        await message.answer("Корзина пуста")
        return
    cart["bonus"] = max(0, points)
    set_json(_cart_key(message.from_user.id), cart, ex=3600)
    await message.answer(f"Будут применены {cart['bonus']} баллов при оформлении")


@router.message(Command("order"))
async def cmd_order(message: Message) -> None:
    cart = get_json(_cart_key(message.from_user.id))
    if not cart or not cart.get("items"):
        await message.answer("Корзина пуста")
        return
    client = ERPClient()
    data = await client.get_customer_by_telegram_id(message.from_user.id)
    if not data:
        await message.answer("Нужна регистрация")
        return
    items = cart["items"]
    try:
        resp = await client.create_order(data["name"], items, cart.get("bonus", 0))
        delete(_cart_key(message.from_user.id))
        await message.answer(
            f"Заказ оформлен. Номер: {resp.get('order_id', 'N/A')}\nСумма к оплате: {format_currency(resp['total'])}"
        )
    except Exception as e:
        await message.answer(f"Ошибка оформления заказа: {e}")


@router.message(Command("revoke_consent"))
async def cmd_revoke_consent(message: Message) -> None:
    _remember_telegram_language(message)
    """Revoke consent to marketing communications."""
    consents = _get_customer_consents(message.from_user.id)

    if not consents.get("data_processing_allowed"):
        await message.answer("Вы ещё не зарегистрированы. Используйте /start")
        return

    # Revoke marketing consent
    _update_consent(message.from_user.id, marketing_allowed=0)

    await message.answer("Вы отписаны от рассылки.\nДля повторной подписки используйте /subscribe")


@router.message(Command("subscribe"))
async def cmd_subscribe(message: Message) -> None:
    _remember_telegram_language(message)
    """Subscribe to marketing communications."""
    consents = _get_customer_consents(message.from_user.id)

    if not consents.get("data_processing_allowed"):
        await message.answer("Вы ещё не зарегистрированы. Используйте /start")
        return

    # Get customer_id
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("SELECT id FROM customers WHERE telegram_id=?", (message.from_user.id,))
        row = cur.fetchone()
        if not row:
            await message.answer("Вы ещё не зарегистрированы. Используйте /start")
            return
        customer_id = row["id"]

        # Update consent
        _update_consent(message.from_user.id, marketing_allowed=1, conn=conn)

        # Store consent record
        consent_text = "Согласие на получение рекламных рассылок"
        _store_consent(customer_id, consent_text, CURRENT_POLICY_VERSION, "marketing", conn)

        await message.answer("Вы подписаны на рассылку!\nОтписаться: /revoke_consent")
    finally:
        conn.close()


@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    _remember_telegram_language(message)
    text = _telegram_text(message, "menu_help")
    sent = await _send_configured_command_message(message, "help", text)
    if not sent:
        await message.answer(text)


@router.message(Command("delete"))
async def cmd_delete(message: Message) -> None:
    _remember_telegram_language(message)
    """Handle /delete command - delete user profile."""
    # Check if user is registered
    consents = _get_customer_consents(message.from_user.id)

    if not consents.get("data_processing_allowed"):
        await message.answer("Вы ещё не зарегистрированы. Используйте /start")
        return

    # Show confirmation
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="Удалить", callback_data="delete:yes"),
                InlineKeyboardButton(text="Отмена", callback_data="delete:no"),
            ]
        ]
    )
    await message.answer("Подтверди удаление данных", reply_markup=kb)


@router.callback_query(lambda c: c.data and c.data.startswith("delete:"))
async def handle_delete_confirmation(callback: CallbackQuery) -> None:
    """Handle delete confirmation button response."""
    command = callback.data.split(":")[1]

    if command == "no":
        await callback.message.edit_text("Отменено")
        return

    if command == "yes":
        try:
            from app.integrations.pos.erpnext_client import ERPClient

            client = ERPClient()
            await client.delete_telegram_client(callback.from_user.id)

            _cleanup_user_data(callback.from_user.id)

            await callback.message.edit_text("Ваш профиль и все данные удалены в соответствии с 152-ФЗ.")
        except Exception as e:
            await callback.message.edit_text(f"Ошибка при удалении: {e}")


@router.message(Command("qr"))
async def cmd_qr(message: Message) -> None:
    _remember_telegram_language(message)
    customer = _get_telegram_customer_card_data(message.from_user.id)
    if not customer:
        await message.answer(_telegram_text(message, "register_first"))
        return
    await _send_virtual_card(message, customer)
