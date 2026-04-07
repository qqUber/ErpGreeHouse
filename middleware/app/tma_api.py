import hashlib
import hmac
import json
from typing import Any, cast
from urllib.parse import parse_qsl

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .db import get_db
from .integrations.bots.telegram_handler import get_configured_telegram_token
from .integrations.pos.erpnext_client import ERPClient
from .loyalty_profile import build_customer_loyalty_profile

router = APIRouter(prefix="/api/v1/tma")


class InitDataRequest(BaseModel):
    initData: str


def validate_init_data(init_data: str, bot_token: str) -> dict:
    try:
        parsed = dict(parse_qsl(init_data))
        if "hash" not in parsed:
            raise ValueError("No hash in initData")

        hash_val = parsed.pop("hash")

        # Sort and join
        sorted_keys = sorted(parsed.keys())
        data_check_string = "\n".join(f"{k}={parsed[k]}" for k in sorted_keys)

        # Compute HMAC
        bot_token_bytes = bot_token.encode()
        secret_key = hmac.new(b"WebAppData", bot_token_bytes, hashlib.sha256).digest()
        calc_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        if calc_hash != hash_val:
            raise ValueError("Invalid hash")

        return cast(dict[str, Any], json.loads(parsed.get("user", "{}")))
    except Exception as e:
        raise ValueError(f"Failed to validate initData: {e}")


@router.post("/me")
async def get_tma_me(req: InitDataRequest) -> dict[str, Any]:
    bot_token = get_configured_telegram_token()

    if not bot_token:
        # Development fallback if token is unset
        return {"error": "Server missing bot token"}

    try:
        # Validate initData from Telegram
        user_data = validate_init_data(req.initData, bot_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    telegram_id = user_data.get("id")
    if not telegram_id:
        raise HTTPException(status_code=400, detail="No user id in initData")

    client = ERPClient()
    customer = await client.get_customer_by_telegram_id(telegram_id)
    if not customer:
        return {"error": "Вы не зарегистрированы. Напишите боту /start."}

    balance = await client.get_balance(customer["name"])
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("SELECT id, qr_token FROM customers WHERE telegram_id=?", (telegram_id,))
        row = cur.fetchone()
        cust_id = row["id"] if row else None
        if not cust_id:
            return {"error": "Локальный профиль клиента не найден."}
        profile = build_customer_loyalty_profile(
            conn,
            int(cust_id),
            balance_override=int(balance),
        )
    finally:
        conn.close()

    if not profile:
        return {"error": "Лояльность клиента недоступна."}

    return {
        "first_name": user_data.get("first_name", customer.get("first_name", "Гость")),
        "telegram_id": telegram_id,
        "balance": profile["balance"],
        "qr_token": profile["qr_token"],
        "tier": profile["tier"],
        "percent": profile["percent"],
        "spent_amount": profile["spent_amount"],
        "next_tier_name": profile["next_tier_name"],
        "next_tier_spent": profile["next_tier_spent"],
        "loyalty_percent": profile["loyalty_percent"],
        "date_to": profile["date_to"],
        "balance_minus": profile["balance_minus"],
        "payUp": profile["payUp"],
        "orders_to_next_tier": profile["orders_to_next_tier"],
    }
