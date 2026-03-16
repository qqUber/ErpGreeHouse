import time
from typing import Any

from fastapi import HTTPException, Request

from .storage import get_redis


def _client_ip(request: Request) -> str:
    xfwd = request.headers.get("x-forwarded-for")
    if xfwd:
        return xfwd.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def require_rate_limit(
    request: Request, *, scope: str, limit: int, window_sec: int
) -> None:
    ip = _client_ip(request)
    key = f"rl:{scope}:ip:{ip}:{int(time.time() // window_sec)}"

    try:
        r = get_redis()
        n = r.incr(key)
        if n == 1:
            r.expire(key, window_sec)
        if int(n) > int(limit):
            raise HTTPException(status_code=429, detail="Too many requests")
    except HTTPException:
        raise
    except Exception:
        return


def require_bruteforce_guard(
    request: Request,
    *,
    username: str,
    max_attempts: int,
    window_sec: int,
    lock_sec: int,
) -> None:
    ip = _client_ip(request)
    uname = (username or "").strip().lower()[:80]
    lock_key = f"bf:lock:{uname}:{ip}"
    cnt_key = f"bf:cnt:{uname}:{ip}"

    try:
        r = get_redis()
        if r.get(lock_key):
            raise HTTPException(status_code=429, detail="Too many attempts")
    except HTTPException:
        raise
    except Exception:
        return


def register_bruteforce_failure(
    request: Request,
    *,
    username: str,
    max_attempts: int,
    window_sec: int,
    lock_sec: int,
) -> None:
    ip = _client_ip(request)
    uname = (username or "").strip().lower()[:80]
    lock_key = f"bf:lock:{uname}:{ip}"
    cnt_key = f"bf:cnt:{uname}:{ip}"

    try:
        r = get_redis()
        n = r.incr(cnt_key)
        if n == 1:
            r.expire(cnt_key, window_sec)
        if int(n) >= int(max_attempts):
            r.set(lock_key, "1", ex=lock_sec)
    except Exception:
        return
