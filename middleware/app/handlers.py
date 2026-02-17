import asyncio
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery
from .erp_client import ERPClient
from .menu import MENU, find_item
from .storage import get_redis, get_json, set_json, delete


router = Router()


def _cart_key(tg_id: int) -> str:
    return f"crm:cart:{tg_id}"


def _consent_key(tg_id: int) -> str:
    return f"crm:consent:{tg_id}"


@router.message(Command("start"))
async def cmd_start(message: Message) -> None:
    client = ERPClient()
    data = await client.get_customer_by_telegram_id(message.from_user.id)
    if not data:
        kb = InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(text="Зарегистрироваться", callback_data="reg:start")]
            ]
        )
        await message.answer("Привет. Давай зарегистрируемся.", reply_markup=kb)
        r = get_redis()
        r.sadd("crm:known_chats", str(message.chat.id))
        return
    bal = await client.get_balance(data["name"])
    await message.answer(f"Привет, {data.get('first_name','гость')}.\nБаланс: {bal} баллов.")
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
    phone = args[2]
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
    if decision != "yes":
        await cb.message.edit_text("Регистрация отменена.")
        await cb.answer()
        delete(_consent_key(cb.from_user.id))
        return
    r = get_redis()
    data = r.hgetall(_consent_key(cb.from_user.id))
    if not data:
        await cb.answer()
        return
    client = ERPClient()
    try:
        created = await client.create_customer(
            telegram_id=cb.from_user.id,
            name=data.get("name", ""),
            phone=data.get("phone", ""),
            consent_text="Согласие принято",
        )
        delete(_consent_key(cb.from_user.id))
        await cb.message.edit_text(f"Готово. Начислено 100 приветственных баллов.")
    except Exception as e:
        await cb.message.edit_text(f"Ошибка регистрации: {e}")
        
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
        points = t['points']
        if points > 0:
            sign = "+"
        else:
            sign = "" # Points already has -
            
        lines.append(f"{sign}{points} {t.get('description','')}")
    await message.answer("\n".join(lines))


@router.message(Command("menu"))
async def cmd_menu(message: Message) -> None:
    kb_rows = []
    for it in MENU:
        kb_rows.append([InlineKeyboardButton(text=f"{it['name']} {it['price']} ₽", callback_data=f"addcb:{it['code']}")])
    kb = InlineKeyboardMarkup(inline_keyboard=kb_rows)
    await message.answer("Выбери напиток", reply_markup=kb)


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
    await message.answer(f"Добавлено. Текущая сумма: {total} ₽")


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
            f"Заказ оформлен. Номер: {resp.get('order_id','N/A')}\nСумма к оплате: {resp['total']} ₽"
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
    await client.delete_telegram_client(cb.from_user.id)
    await cb.message.edit_text("Данные удалены")
    await cb.answer()


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
            "/delete — удалить данные",
        ]
    )
    await message.answer(text)
