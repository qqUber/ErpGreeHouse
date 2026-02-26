import hmac
import hashlib
import json
from typing import Any
from urllib.parse import parse_qsl
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from .config import get_settings
from .integrations.pos.erpnext_client import ERPClient
from .db import get_db
from .loyalty import LoyaltyRules, get_tier, get_next_tier

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
        calc_hash = hmac.new(
            secret_key, data_check_string.encode(), hashlib.sha256
        ).hexdigest()

        if calc_hash != hash_val:
            raise ValueError("Invalid hash")

        return json.loads(parsed.get("user", "{}"))
    except Exception as e:
        raise ValueError(f"Failed to validate initData: {e}")


@router.post("/me")
async def get_tma_me(req: InitDataRequest) -> dict[str, Any]:
    settings = get_settings()
    bot_token = settings.telegram_bot_token

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

    # Get balance
    balance = await client.get_balance(customer["name"])

    # Get local QR token and historical spent
    db = get_db()
    conn = db.connect()
    spent_amount = 0
    try:
        cur = conn.execute(
            "SELECT id, qr_token FROM customers WHERE telegram_id=?", (telegram_id,)
        )
        row = cur.fetchone()
        qr_token = row["qr_token"] if row else ""
        cust_id = row["id"] if row else None

        if cust_id:
            spent_row = conn.execute(
                "SELECT SUM(total_amount) FROM transactions WHERE customer_id=?",
                (cust_id,),
            ).fetchone()
            spent_amount = int(spent_row[0]) if spent_row and spent_row[0] else 0

    finally:
        conn.close()

    rules = LoyaltyRules()
    tier = get_tier(spent_amount, rules)
    next_tier = get_next_tier(spent_amount, rules)

    return {
        "first_name": user_data.get("first_name", customer.get("first_name", "Гость")),
        "telegram_id": telegram_id,
        "balance": balance,
        "qr_token": qr_token,
        "tier": tier.name,
        "percent": tier.accrual_percent,
        "spent_amount": spent_amount,
        "next_tier_name": next_tier.name if next_tier else None,
        "next_tier_spent": next_tier.min_spent if next_tier else None,
    }
