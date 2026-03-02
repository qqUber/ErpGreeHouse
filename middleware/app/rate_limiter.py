import redis
import time
from app.config import get_settings

settings = get_settings()
r = redis.from_url(settings.redis_url)


def check_rate_limit(
    chat_id: int, channel: str, max_tokens: int, refill_rate: float
) -> bool:
    key = f"rate_limit:{channel}:{chat_id}"
    current_time = time.time()

    # Get current token count and last refill time
    pipeline = r.pipeline()
    pipeline.get(key + ":tokens")
    pipeline.get(key + ":last_refill")
    tokens, last_refill = pipeline.execute()

    tokens = int(tokens) if tokens else max_tokens
    last_refill = float(last_refill) if last_refill else current_time

    # Refill tokens
    tokens_to_add = int((current_time - last_refill) * refill_rate)
    if tokens_to_add > 0:
        tokens = min(tokens + tokens_to_add, max_tokens)
        r.set(key + ":last_refill", current_time)
        r.set(key + ":tokens", tokens)

    if tokens > 0:
        r.decr(key + ":tokens")
        return True
    else:
        return False


def get_rate_limit_config(channel: str):
    """Get rate limit configuration per channel type"""
    # Telegram: 30 msg/sec broadcast, 1 msg/sec per chat
    if channel == "telegram":
        return {
            "global": {"max_tokens": int(settings.telegram_rate_limit_global), "refill_rate": settings.telegram_rate_limit_global},
            "per_chat": {"max_tokens": int(settings.telegram_rate_limit_per_chat), "refill_rate": settings.telegram_rate_limit_per_chat}
        }
    # VK: 20 msg/min per group, 1 msg/sec per user
    elif channel == "vk":
        return {
            "global": {"max_tokens": int(settings.vk_rate_limit_global * 60), "refill_rate": settings.vk_rate_limit_global},
            "per_chat": {"max_tokens": int(settings.vk_rate_limit_per_chat), "refill_rate": settings.vk_rate_limit_per_chat}
        }
    # Mobile app: 100 msg/sec
    elif channel == "mobile":
        return {
            "global": {"max_tokens": int(settings.mobile_rate_limit_global), "refill_rate": settings.mobile_rate_limit_global},
            "per_chat": {"max_tokens": int(settings.mobile_rate_limit_per_chat), "refill_rate": settings.mobile_rate_limit_per_chat}
        }
    # Default: conservative limits
    return {
        "global": {"max_tokens": 10, "refill_rate": 10.0},
        "per_chat": {"max_tokens": 1, "refill_rate": 1.0}
    }
    # VK: 20 msg/min per group, 1 msg/sec per user
    elif channel == "vk":
        return {
            "global": {"max_tokens": 20, "refill_rate": 0.333},
            "per_chat": {"max_tokens": 1, "refill_rate": 1.0},
        }
    # Mobile app: 100 msg/sec
    elif channel == "mobile":
        return {
            "global": {"max_tokens": 100, "refill_rate": 100.0},
            "per_chat": {"max_tokens": 5, "refill_rate": 1.0},
        }
    # Default: conservative limits
    return {
        "global": {"max_tokens": 10, "refill_rate": 10.0},
        "per_chat": {"max_tokens": 1, "refill_rate": 1.0},
    }


def is_rate_limited(chat_id: int, channel: str) -> bool:
    """Check if sending a message to this chat on this channel would exceed rate limits"""
    config = get_rate_limit_config(channel)

    # Check per-chat rate limit
    if not check_rate_limit(
        chat_id,
        channel,
        config["per_chat"]["max_tokens"],
        config["per_chat"]["refill_rate"],
    ):
        return True

    # Check global rate limit
    if not check_rate_limit(
        "global",
        channel,
        config["global"]["max_tokens"],
        config["global"]["refill_rate"],
    ):
        return True

    return False
