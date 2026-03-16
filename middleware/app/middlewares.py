import logging
import math
import time
from typing import Any, Awaitable, Callable, Dict

from aiogram import BaseMiddleware
from aiogram.types import CallbackQuery, Message, TelegramObject
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from .config import get_settings
from .storage import get_redis

logger = logging.getLogger(__name__)

def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip
    if request.client:
        return request.client.host
    return "unknown"


def _is_rate_limited_path(path: str, settings) -> bool:
    if path in settings.rate_limited_paths:
        return True
    for prefix in settings.rate_limited_prefixes:
        if path.startswith(prefix):
            return True
    return False


def _check_sliding_window_rate_limit(
    client_ip: str,
    max_requests: int,
    window_seconds: int,
) -> tuple[bool, int, int, bool]:
    try:
        r = get_redis()
    except Exception:
        logger.exception("[RATE_LIMIT] Redis unavailable")
        return False, 0, 0, True

    try:
        key = f"crm:rate_limit:sliding:{client_ip}"
        now = time.time()
        window_start = now - window_seconds

        pipe = r.pipeline()

        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, window_seconds)

        results = pipe.execute()
        current_count = results[1]

        remaining = max(0, max_requests - current_count - 1)

        if current_count >= max_requests:
            r.zrem(key, str(now))
            return False, 0, current_count, False

        return True, remaining, current_count + 1, False
    except Exception:
        logger.exception("[RATE_LIMIT] Redis error")
        return False, 0, 0, True


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        settings = get_settings()

        if not _is_rate_limited_path(path, settings):
            return await call_next(request)

        client_ip = _get_client_ip(request)

        is_allowed, remaining, current_count, rate_limit_unavailable = (
            _check_sliding_window_rate_limit(
            client_ip=client_ip,
            max_requests=settings.rate_limit_requests,
            window_seconds=settings.rate_limit_window_seconds,
        )
        )

        reset_at = int(time.time() + settings.rate_limit_window_seconds)

        if rate_limit_unavailable:
            return JSONResponse(
                status_code=503,
                content={"detail": "Сервис защиты временно недоступен."},
            )

        if not is_allowed:
            logger.warning(
                "[RATE_LIMIT] Rate limit exceeded for IP=%s path=%s count=%s",
                client_ip,
                path,
                current_count,
            )
            return JSONResponse(
                status_code=429,
                content={"detail": "Слишком много попыток. Попробуйте позже."},
                headers={
                    "X-RateLimit-Limit": str(settings.rate_limit_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_at),
                },
            )

        response = await call_next(request)

        response.headers["X-RateLimit-Limit"] = str(settings.rate_limit_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_at)

        return response


# Backwards compatible alias for the middleware
rate_limit_middleware = RateLimitMiddleware


class ThrottleMiddleware(BaseMiddleware):
    def __init__(self, rate: float = 1.0) -> None:
        self.rate = rate
        self.r = None

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        uid = None
        if isinstance(event, Message):
            uid = event.from_user.id if event.from_user else None
        if isinstance(event, CallbackQuery):
            uid = event.from_user.id if event.from_user else None
        if uid:
            try:
                if self.r is None:
                    self.r = get_redis()
                key = f"crm:throttle:{uid}"
                now = time.time()
                last_raw = self.r.get(key)
                last = float(last_raw or "0")
                if now - last < self.rate:
                    return
                ttl_seconds = max(1, math.ceil(self.rate))
                self.r.setex(key, ttl_seconds, str(now))
            except Exception:
                logger.exception("[THROTTLE] Redis unavailable for uid=%s", uid)
        return await handler(event, data)
