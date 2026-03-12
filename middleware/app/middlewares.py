import logging
import time
from typing import Any, Awaitable, Callable, Dict, Optional, Set

from aiogram import BaseMiddleware
from aiogram.types import CallbackQuery, Message, TelegramObject
from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from .config import get_settings
from .storage import get_redis

logger = logging.getLogger(__name__)

# Paths that should be rate limited (auth and sensitive endpoints)
RATE_LIMITED_PATHS: Set[str] = {
    "/api/v1/public/auth/login",
    "/api/v1/public/auth/recover",
    "/api/v1/public/auth/reset-password",
    "/api/v1/auth/login",
}

# Path prefixes that should be rate limited
RATE_LIMITED_PREFIXES: tuple = (
    "/api/v1/public/auth",
    "/api/v1/auth",
)


def _get_client_ip(request: Request) -> str:
    """Extract client IP from request, considering proxy headers."""
    # Check for forwarded header (when behind proxy)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Take the first IP (original client)
        return forwarded.split(",")[0].strip()
    # Check for real IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    # Fall back to direct client IP
    if request.client:
        return request.client.host
    return "unknown"


def _is_rate_limited_path(path: str) -> bool:
    """Check if the path should be rate limited."""
    if path in RATE_LIMITED_PATHS:
        return True
    for prefix in RATE_LIMITED_PREFIXES:
        if path.startswith(prefix):
            return True
    return False


def _check_sliding_window_rate_limit(
    client_ip: str,
    max_requests: int,
    window_seconds: int,
) -> tuple[bool, int, int]:
    """
    Check if the client has exceeded the rate limit using sliding window algorithm.
    Uses sorted set in Redis for accurate sliding window counting.

    Returns:
        (is_allowed, remaining_requests, current_count)
    """
    try:
        r = get_redis()
    except Exception as e:
        logger.warning(f"[RATE_LIMIT] Redis unavailable, bypassing rate limit: {e}")
        # Bypass rate limiting if Redis is unavailable - allow request through
        return True, max_requests, 0

    try:
        key = f"crm:rate_limit:sliding:{client_ip}"
        now = time.time()
        window_start = now - window_seconds

        pipe = r.pipeline()

        # Remove old entries outside the window
        pipe.zremrangebyscore(key, 0, window_start)

        # Count current requests in window
        pipe.zcard(key)

        # Add current request
        pipe.zadd(key, {str(now): now})

        # Set expiry on the key
        pipe.expire(key, window_seconds)

        results = pipe.execute()
        current_count = results[1]  # zcard result

        remaining = max(0, max_requests - current_count - 1)

        if current_count >= max_requests:
            # Remove the request we just added since it's over limit
            r.zrem(key, str(now))
            return False, 0, current_count

        return True, remaining, current_count + 1
    except Exception as e:
        logger.warning(f"[RATE_LIMIT] Redis error, bypassing rate limit: {e}")
        # Bypass rate limiting on error - allow request through
        return True, max_requests, 0


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI/Starlette middleware for rate limiting using sliding window algorithm.
    Applied to auth endpoints and other sensitive routes.
    Inherits from BaseHTTPMiddleware to work with app.add_middleware().
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Only rate limit specific paths
        if not _is_rate_limited_path(path):
            return await call_next(request)

        settings = get_settings()
        client_ip = _get_client_ip(request)

        is_allowed, remaining, current_count = _check_sliding_window_rate_limit(
            client_ip=client_ip,
            max_requests=settings.rate_limit_requests,
            window_seconds=settings.rate_limit_window_seconds,
        )

        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(settings.rate_limit_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(
            int(time.time() + settings.rate_limit_window_seconds)
        )

        if not is_allowed:
            logger.warning(
                f"[RATE_LIMIT] Rate limit exceeded for IP: {client_ip}, path: {path}"
            )
            return JSONResponse(
                status_code=429,
                content={"detail": "Слишком много попыток. Попробуйте позже."},
                headers={
                    "X-RateLimit-Limit": str(settings.rate_limit_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(
                        int(time.time() + settings.rate_limit_window_seconds)
                    ),
                },
            )

        return response


# Backwards compatible alias for the middleware
rate_limit_middleware = RateLimitMiddleware


class ThrottleMiddleware(BaseMiddleware):
    def __init__(self, rate: float = 1.0) -> None:
        self.rate = rate
        self.r = get_redis()

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
            key = f"crm:throttle:{uid}"
            now = time.time()
            last = float(await self.r.get(key) or "0")
            if now - last < self.rate:
                return
            self.r.setex(key, int(self.rate), str(now))
        return await handler(event, data)
