import json
from typing import Any, Optional
import redis
from .config import get_settings


def get_redis() -> redis.Redis:
    settings = get_settings()
    return redis.from_url(settings.redis_url, decode_responses=True)


def hgetall(key: str) -> dict:
    r = get_redis()
    return r.hgetall(key)  # type: ignore[return-value]


def hset(key: str, mapping: dict) -> None:
    r = get_redis()
    r.hset(key, mapping=mapping)


def get_json(key: str) -> Optional[Any]:
    r = get_redis()
    val = r.get(key)
    return json.loads(val) if val else None  # type: ignore[arg-type]


def set_json(key: str, value: Any, ex: Optional[int] = None) -> None:
    r = get_redis()
    r.set(key, json.dumps(value, ensure_ascii=False), ex=ex)


def delete(key: str) -> None:
    r = get_redis()
    r.delete(key)
