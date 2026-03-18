import logging
import math
import time
from typing import Optional

import redis

from app.config import get_settings

settings = get_settings()

logger = logging.getLogger(__name__)

# Module-level Redis connection for connection pooling
_redis_client: Optional[redis.Redis] = None
_rate_limit_script: Optional[redis.client.Script] = None

_RATE_LIMIT_LUA = """
local tokens_key = KEYS[1]
local refill_key = KEYS[2]
local max_tokens = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local ttl_seconds = tonumber(ARGV[4])

local tokens = tonumber(redis.call("GET", tokens_key))
if not tokens then
    tokens = max_tokens
end

local last_refill = tonumber(redis.call("GET", refill_key))
if not last_refill then
    last_refill = now
end

local elapsed = now - last_refill
if elapsed < 0 then
    elapsed = 0
end

tokens = math.min(max_tokens, tokens + (elapsed * refill_rate))

local allowed = 0
if tokens >= 1 then
    allowed = 1
    tokens = tokens - 1
end

redis.call("SET", tokens_key, tokens, "EX", ttl_seconds)
redis.call("SET", refill_key, now, "EX", ttl_seconds)

return allowed
"""


def _get_redis() -> Optional[redis.Redis]:
    """Get Redis connection with lazy initialization and error handling.

    Returns None if Redis is unavailable, allowing callers to handle gracefully.
    """
    global _redis_client
    if _redis_client is None:
        try:
            settings = get_settings()
            _redis_client = redis.from_url(settings.redis_url, decode_responses=True)
            # Test connection
            _redis_client.ping()
        except Exception as e:
            logger.warning(
                f"[RateLimiter] Redis unavailable, rate limiting disabled: {e}"
            )
            _redis_client = None
    return _redis_client


def check_rate_limit(
    chat_id: int | str, channel: str, max_tokens: int, refill_rate: float
) -> bool:
    r = _get_redis()
    if r is None:
        return True  # Allow sending if Redis is unavailable

    if max_tokens <= 0 or refill_rate <= 0:
        return False

    key = f"rate_limit:{channel}:{chat_id}"
    current_time = time.time()
    ttl_seconds = max(60, int(math.ceil((max_tokens / refill_rate) * 4)))
    tokens_key = key + ":tokens"
    last_refill_key = key + ":last_refill"

    global _rate_limit_script
    if _rate_limit_script is None:
        _rate_limit_script = r.register_script(_RATE_LIMIT_LUA)

    try:
        allowed = _rate_limit_script(
            keys=[tokens_key, last_refill_key],
            args=[max_tokens, refill_rate, current_time, ttl_seconds],
        )
        return bool(int(allowed))
    except Exception as e:
        logger.warning(
            f"[RateLimiter] Lua script failed, allowing message as fallback: {e}"
        )
        return True


def get_rate_limit_config(channel: str):
    """Get rate limit configuration per channel type"""
    # Telegram: 30 msg/sec broadcast, 1 msg/sec per chat
    if channel == "telegram":
        return {
            "global": {
                "max_tokens": int(settings.telegram_rate_limit_global),
                "refill_rate": settings.telegram_rate_limit_global,
            },
            "per_chat": {
                "max_tokens": int(settings.telegram_rate_limit_per_chat),
                "refill_rate": settings.telegram_rate_limit_per_chat,
            },
        }
    # VK: 20 msg/min per group, 1 msg/sec per user
    elif channel == "vk":
        return {
            "global": {
                "max_tokens": int(settings.vk_rate_limit_global * 60),
                "refill_rate": settings.vk_rate_limit_global,
            },
            "per_chat": {
                "max_tokens": int(settings.vk_rate_limit_per_chat),
                "refill_rate": settings.vk_rate_limit_per_chat,
            },
        }
    # Mobile app: 100 msg/sec
    elif channel == "mobile":
        return {
            "global": {
                "max_tokens": int(settings.mobile_rate_limit_global),
                "refill_rate": settings.mobile_rate_limit_global,
            },
            "per_chat": {
                "max_tokens": int(settings.mobile_rate_limit_per_chat),
                "refill_rate": settings.mobile_rate_limit_per_chat,
            },
        }
    # Default: conservative limits
    return {
        "global": {"max_tokens": 10, "refill_rate": 10.0},
        "per_chat": {"max_tokens": 1, "refill_rate": 1.0},
    }


def is_rate_limited(chat_id: int | str, channel: str) -> bool:
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
