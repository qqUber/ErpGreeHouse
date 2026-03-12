import asyncio
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import (
    Message,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    CallbackQuery,
    WebAppInfo,
)
from .integrations.pos.erpnext_client import ERPClient
from fastapi import HTTPException
from .menu import MENU, find_item
from .db import get_db
from .identify import generate_qr_token, normalize_name, normalize_phone
from .storage import get_redis, get_json, set_json, delete
from .config import get_settings
from typing import Literal, Tuple, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Import cleanup function from shared module for backward compatibility
from .integrations.bots.shared.consent import (
    cleanup_user_data as _shared_cleanup,
    store_consent as _shared_store,
    get_customer_consents as _shared_get,
    update_consent as _shared_update,
    CURRENT_POLICY_VERSION,
)


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


def register_or_link_user(
    phone: str, social_id: str, channel: Literal["tg", "vk"]
) -> Tuple[Dict[str, Any], bool]:
    """
    Unified customer registration/linking for Telegram and VK channels.

    Args:
        phone: Raw phone number input
        social_id: The Telegram or VK user ID
        channel: Source channel - "tg" for Telegram, "vk" for VK

    Returns:
        Tuple of (customer_dict, is_new) where is_new=True if customer was created
    """
    # Normalize phone number
    normalized_phone = normalize_phone(phone)
    if not normalized_phone:
        raise ValueError("Invalid phone number format")

    db = get_db()
    conn = db.connect()
    try:
        # Check for existing customer by phone
        cur = conn.execute(
            "SELECT * FROM customers WHERE phone = ?", (normalized_phone,)
        )
        existing = cur.fetchone()

        if existing:
            # Customer exists - link the social account if not already linked
            updates = []
            params = []

            if channel == "tg":
                # Update telegram_id if currently empty
                if existing["telegram_id"] is None:
                    updates.append("telegram_id = ?")
                    params.append(int(social_id))
                # Also update tg_id if it exists as a separate column
                if "tg_id" in existing.keys() and existing["tg_id"] is None:
                    updates.append("tg_id = ?")
                    params.append(int(social_id))
            elif channel == "vk":
                # Update vk_id if currently empty
                if existing["vk_id"] is None:
                    updates.append("vk_id = ?")
                    params.append(int(social_id))

            # Set preferred_channel if not already set
            if existing["preferred_channel"] is None:
                updates.append("preferred_channel = ?")
                params.append(channel)

            if updates:
                updates.append("updated_at = datetime('now')")
                params.append(existing["id"])
                conn.execute(  # nosec
                    f"UPDATE customers SET {', '.join(updates)} WHERE id = ?",
                    tuple(params),
                )
                conn.commit()

            # Fetch updated record
            cur = conn.execute(
                "SELECT * FROM customers WHERE id = ?", (existing["id"],)
            )
            updated = cur.fetchone()
            customer_dict = dict(updated) if updated else dict(existing)
            return (customer_dict, False)

        else:
            # Create new customer
            qr_token = generate_qr_token()

            if channel == "tg":
                conn.execute(
                    """
                    INSERT INTO customers 
                    (phone, telegram_id, tg_id, qr_token, preferred_channel, balance_points, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
                    """,
                    (
                        normalized_phone,
                        int(social_id),
                        int(social_id),
                        qr_token,
                        channel,
                    ),
                )
            else:  # vk
                conn.execute(
                    """
                    INSERT INTO customers 
                    (phone, vk_id, qr_token, preferred_channel, balance_points, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 0, datetime('now'), datetime('now'))
                    """,
                    (normalized_phone, int(social_id), qr_token, channel),
                )

            conn.commit()

            # Fetch the newly created record
            cur = conn.execute(
                "SELECT * FROM customers WHERE phone = ?", (normalized_phone,)
            )
            new_customer = cur.fetchone()
            customer_dict = dict(new_customer) if new_customer else {}
            return (customer_dict, True)

    finally:
        conn.close()


def _cart_key(tg_id: int) -> str:
    return f"crm:cart:{tg_id}"


def _consent_key(tg_id: int) -> str:
    return f"crm:consent:{tg_id}"


def _upsert_local_customer(
    telegram_id: int,
    full_name: str,
    phone: str,
    marketing_allowed: int = 1,
    data_processing_allowed: int = 1,
) -> int:
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT id, qr_token FROM customers WHERE telegram_id=? OR phone=?",
            (telegram_id, phone),
        )
        row = cur.fetchone()
        name_norm = normalize_name(full_name)
        qr_token = generate_qr_token()
        if row:
            existing_qr = row["qr_token"] or qr_token
            logger.info(f"Updating customer {row['id']} with marketing_allowed={marketing_allowed}")
            conn.execute(
                """
                UPDATE customers SET 
                    phone=?, full_name=?, telegram_id=?, qr_token=?, 
                    marketing_allowed=?, data_processing_allowed=?, 
                    updated_at=datetime('now') 
                WHERE id=?
                """,
                (
                    phone,
                    name_norm,
                    telegram_id,
                    existing_qr,
                    marketing_allowed,
                    data_processing_allowed,
                    int(row["id"]),
                ),
            )
            conn.commit()
            return int(row["id"])
        
        logger.info(f"Inserting new customer with marketing_allowed={marketing_allowed}")
        cur2 = conn.execute(
            """
            INSERT INTO customers(phone, full_name, telegram_id, qr_token, marketing_allowed, data_processing_allowed) 
            VALUES(?,?,?,?,?,?)
            """,
            (
                phone,
                name_norm,
                telegram_id,
                qr_token,
                marketing_allowed,
                data_processing_allowed,
            ),
        )
        conn.commit()
        return int(cur2.lastrowid)
    finally:
        conn.close()

        conn.close()


@router.message(Command("start"))
async def cmd_start(message: Message) -> None:
    """Handle /start command - check if user is registered and show consent if new."""
    # Check if user is registered
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT id, full_name, marketing_allowed, data_processing_allowed FROM customers WHERE telegram_id=?",
            (message.from_user.id,),
        )
        row = cur.fetchone()

        if row:
            # User is already registered
            full_name = row["full_name"] or "друг"
            marketing = row["marketing_allowed"]
            data_processing = row["data_processing_allowed"]

            # Try to get balance from ERP
            balance_text = ""
            try:
                client = ERPClient()
                # Use ERPClient mock mode or real logic
                # For MVP, we use the customer name from ERP if we had it, 
                # but here we only have telegram_id. 
                # We'll need to find the customer in ERP first.
                erp_cust = await client.get_customer_by_telegram_id(message.from_user.id)
                if erp_cust:
                    bal = await client.get_balance(erp_cust["name"])
                    balance_text = f"\n💰 Ваш баланс: {bal} баллов"
            except Exception as e:
                logger.warning(f"Could not get balance for /start: {e}")

            consent_status = ""
            if data_processing:
                consent_status = "\n\n✅ Обработка данных разрешена"
                if marketing:
                    consent_status += "\n✅ Рассылки включены"
                else:
                    consent_status += "\n❌ Рассылки выключены"

            await message.answer(
                f"С возвращением, {full_name}! 🏠☕\n\n"
                f"Рады видеть вас снова!{balance_text}{consent_status}\n\n"
                f"Управление подпиской: /subscribe /revoke_consent"
            )
        else:
            # New user - show consent buttons
            consent_text = "Я соглашаюсь с Пользовательским соглашением и даю согласие на обработку персональных данных в соответствии с 152-ФЗ."
            kb = InlineKeyboardMarkup(
                inline_keyboard=[
                    [
                        InlineKeyboardButton(
                            text="Принимаю Пользовательское соглашение и 152-ФЗ",
                            callback_data="consent:yes",
                        ),
                        InlineKeyboardButton(text="Отказ", callback_data="consent:no"),
                    ]
                ]
            )
            await message.answer(
                "Добро пожаловать! Для продолжения необходимо принять условия.",
                reply_markup=kb,
            )
    finally:
        conn.close()

    r = get_redis()
    r.sadd("crm:known_chats", str(message.chat.id))


@router.callback_query(F.data == "reg:start")
async def reg_start(cb: CallbackQuery) -> None:
    await cb.message.answer("Отправь команду в виде:\n/register Имя +79991234567")
    await cb.answer()


@router.message(Command("register"))
async def cmd_register(message: Message) -> None:
    args = message.text.split(maxsplit=2)
    if len(args) < 3:
        await message.answer("Формат: /register Имя Телефон")
        return
    name = args[1]
    phone = normalize_phone(args[2])
    if not phone:
        await message.answer("Телефон должен быть в формате +79991234567")
        return
    consent_text = "Я соглашаюсь на обработку персональных данных."
    r = get_redis()
    r.hset(_consent_key(message.from_user.id), mapping={"name": name, "phone": phone})
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="Принимаю", callback_data="consent:yes"),
                InlineKeyboardButton(text="Отказ", callback_data="consent:no"),
            ]
        ]
    )
    await message.answer(consent_text, reply_markup=kb)


@router.callback_query(F.data.startswith("consent:"))
async def cb_consent(cb: CallbackQuery) -> None:
    decision = cb.data.split(":", 1)[1]
    
    # Handle refusal
    if decision in ("no", "refuse"):
        await cb.message.edit_text("Регистрация отменена.")
        await cb.answer()
        delete(_consent_key(cb.from_user.id))
        # Also clean up any partial registration data
        _cleanup_user_data(cb.from_user.id)
        return
        
    # Handle agreement
    if decision in ("yes", "agree"):
        r = get_redis()
        # Mark that consent was given and we're starting the flow
        r.hset(_consent_key(cb.from_user.id), mapping={"consent_given": "1", "step": "name"})
        await cb.message.edit_text("Согласие принято! ✅\n\nКак тебя зовут? (Имя)")
        await cb.answer()
        return

    # Legacy support for direct /register flow
    r = get_redis()
    data = r.hgetall(_consent_key(cb.from_user.id))
    # ... rest of legacy logic if needed, but better to unify


@router.message()
async def handle_registration_message(message: Message) -> None:
    """Handle text messages during registration flow."""
    r = get_redis()
    key = _consent_key(message.from_user.id)
    data = r.hgetall(key)
    
    if not data or data.get("consent_given") != "1":
        # Not in registration flow, ignore or handle other messages
        return
        
    step = data.get("step")
    
    if step == "name":
        # Store name and ask for phone
        name = normalize_name(message.text.strip())
        r.hset(key, mapping={"name": name, "step": "phone"})
        await message.answer("Отлично! Теперь введите ваш номер телефона в формате +79991234567")
        
    elif step == "phone":
        # Store phone and ask for marketing consent
        phone = normalize_phone(message.text.strip())
        if not phone:
            await message.answer("Неверный формат телефона. Попробуйте ещё раз: +79991234567")
            return
            
        r.hset(key, mapping={"phone": phone, "step": "marketing"})
        
        kb = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(text="Да, хочу", callback_data="marketing:yes"),
                    InlineKeyboardButton(text="Нет, спасибо", callback_data="marketing:no"),
                ]
            ]
        )
        await message.answer("Хотите получать информацию об акциях и бонусах?", reply_markup=kb)


@router.callback_query(F.data.startswith("marketing:"))
async def cb_marketing_consent(cb: CallbackQuery) -> None:
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
        await client.create_customer(
            telegram_id=cb.from_user.id,
            name=data.get("name", ""),
            phone=data.get("phone", ""),
            consent_text=consent_text,
        )
        
        # 2. Upsert locally
        customer_id = _upsert_local_customer(
            cb.from_user.id,
            data.get("name", ""),
            data.get("phone", ""),
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
        msg = "Регистрация завершена! 🎉\n\nВам начислено 100 приветственных баллов."
        if marketing_allowed:
            msg += "\n\nТеперь вы будете получать новости и акции."
        else:
            msg += "\n\nВы не будете получать рекламные рассылки."
            
        await cb.message.edit_text(msg)
        
    except Exception as e:
        logger.error(f"Registration error: {e}")
        await cb.message.edit_text(f"Ошибка при завершении регистрации: {e}")
        
    await cb.answer()


@router.message(Command("balance"))
async def cmd_balance(message: Message) -> None:
    client = ERPClient()
    data = await client.get_customer_by_telegram_id(message.from_user.id)
    if not data:
        await message.answer("Ты ещё не зарегистрирован. /start")
        return
    bal = await client.get_balance(data["name"])
    tx = await client.get_transactions(data["name"], limit=5)
    lines = [f"Баланс: {bal}"]
    for t in tx:
        # Check transaction type logic
        sign = "+" if t["transaction_type"] in ("Accrual", "начисление") else "-"
        # Also points can be negative for Redemption in ERP, so abs() might be needed or just show as is
        # My implementation of get_transactions returns raw points.
        # If redemption points are negative, sign should probably be just empty if points already has sign
        # But for UI consistency let's format it.
        points = t["points"]
        if points > 0:
            sign = "+"
        else:
            sign = ""  # Points already has -

        lines.append(f"{sign}{points} {t.get('description', '')}")
    await message.answer("\n".join(lines))


@router.message(Command("menu"))
async def cmd_menu(message: Message) -> None:
    settings = get_settings()
    tma_url = f"{settings.base_web_url}/tma"
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Открыть каталог", web_app=WebAppInfo(url=tma_url)
                )
            ]
        ]
    )
    await message.answer(
        "Каталог и акции теперь доступны в приложении:", reply_markup=kb
    )


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
    cart["items"].append(
        {"code": code, "name": item["name"], "price": item["price"], "qty": qty}
    )
    set_json(_cart_key(message.from_user.id), cart, ex=3600)
    total = sum(x["price"] * x["qty"] for x in cart["items"])
    await message.answer(f"Добавлено. Текущая сумма: {total} ₽")


@router.callback_query(F.data.startswith("addcb:"))
async def cb_add(cb: CallbackQuery) -> None:
    code = cb.data.split(":", 1)[1]
    item = find_item(code)
    if not item:
        await cb.answer()
        return
    cart = get_json(_cart_key(cb.from_user.id)) or {"items": [], "bonus": 0}
    cart["items"].append(
        {"code": code, "name": item["name"], "price": item["price"], "qty": 1}
    )
    set_json(_cart_key(cb.from_user.id), cart, ex=3600)
    total = sum(x["price"] * x["qty"] for x in cart["items"])
    await cb.message.edit_text(f"Добавлено {item['name']}. Сумма: {total} ₽")
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
            f"Заказ оформлен. Номер: {resp.get('order_id', 'N/A')}\nСумма к оплате: {resp['total']} ₽"
        )
    except Exception as e:
        await message.answer(f"Ошибка оформления заказа: {e}")


@router.message(Command("delete"))
async def cmd_delete(message: Message) -> None:
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="Удалить", callback_data="delete:yes"),
                InlineKeyboardButton(text="Отмена", callback_data="delete:no"),
            ]
        ]
    )
    await message.answer("Подтверди удаление данных", reply_markup=kb)


@router.callback_query(F.data.startswith("delete:"))
async def cb_delete(cb: CallbackQuery) -> None:
    if cb.data.endswith("no"):
        await cb.message.edit_text("Отменено")
        await cb.answer()
        return
    client = ERPClient()
    try:
        await client.delete_telegram_client(cb.from_user.id)
        db = get_db()
        conn = db.connect()
        conn.execute("DELETE FROM customers WHERE telegram_id=?", (cb.from_user.id,))
        conn.commit()
        conn.close()
        await cb.message.edit_text(
            "Ваш профиль и все данные удалены в соответствии с 152-ФЗ."
        )
    except Exception as e:
        await cb.message.edit_text(f"Ошибка при удалении: {e}")
    await cb.answer()


@router.message(Command("revoke_consent"))
async def cmd_revoke_consent(message: Message) -> None:
    """Revoke consent to marketing communications."""
    consents = _get_customer_consents(message.from_user.id)

    if not consents.get("data_processing_allowed"):
        await message.answer("Вы ещё не зарегистрированы. Используйте /start")
        return

    # Revoke marketing consent
    _update_consent(message.from_user.id, marketing_allowed=0)

    await message.answer(
        "Вы отписаны от рассылки.\nДля повторной подписки используйте /subscribe"
    )


@router.message(Command("subscribe"))
async def cmd_subscribe(message: Message) -> None:
    """Subscribe to marketing communications."""
    consents = _get_customer_consents(message.from_user.id)

    if not consents.get("data_processing_allowed"):
        await message.answer("Вы ещё не зарегистрированы. Используйте /start")
        return

    # Get customer_id
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT id FROM customers WHERE telegram_id=?", (message.from_user.id,)
        )
        row = cur.fetchone()
        if not row:
            await message.answer("Вы ещё не зарегистрированы. Используйте /start")
            return
        customer_id = row["id"]

        # Update consent
        _update_consent(message.from_user.id, marketing_allowed=1, conn=conn)

        # Store consent record
        consent_text = "Согласие на получение рекламных рассылок"
        _store_consent(
            customer_id, consent_text, CURRENT_POLICY_VERSION, "marketing", conn
        )

        await message.answer("Вы подписаны на рассылку!\nОтписаться: /revoke_consent")
    finally:
        conn.close()


@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    text = "\n".join(
        [
            "/start — начать",
            "/register Имя Телефон — регистрация",
            "/balance — баланс и последние операции",
            "/menu — меню с кнопками",
            "/add код количество — добавить в корзину",
            "/pay N — применить N баллов",
            "/order — оформить заказ",
            "/qr — показать QR токен",
            "/delete — удалить данные",
            "/revoke_consent — отписаться от рассылок",
            "/subscribe — подписаться на рассылки",
        ]
    )
    await message.answer(text)


@router.message(Command("delete"))
async def cmd_delete(message: Message) -> None:
    """Handle /delete command - delete user profile."""
    # Check if user is registered
    consents = _get_customer_consents("tg", message.from_user.id)

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

            # Cleanup user data - don't log refusal since it's a deliberate deletion
            _cleanup_user_data("tg", callback.from_user.id, log_refusal=False)

            await callback.message.edit_text(
                "Ваш профиль и все данные удалены в соответствии с 152-ФЗ."
            )
        except Exception as e:
            await callback.message.edit_text(f"Ошибка при удалении: {e}")


@router.message(Command("qr"))
async def cmd_qr(message: Message) -> None:
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT qr_token FROM customers WHERE telegram_id=?",
            (message.from_user.id,),
        )
        row = cur.fetchone()
        if not row or not row["qr_token"]:
            await message.answer("Сначала зарегистрируйся: /start")
            return

        settings = get_settings()
        tma_url = f"{settings.base_web_url}/tma"
        kb = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="Моя карта лояльности", web_app=WebAppInfo(url=tma_url)
                    )
                ]
            ]
        )
        await message.answer(
            "Ваша карта лояльности и QR-код доступны в приложении:", reply_markup=kb
        )
    finally:
        conn.close()
