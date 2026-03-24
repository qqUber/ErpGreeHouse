"""Redis cache utilities - re-exported from storage for backward compatibility."""

from app.storage import get_redis, hgetall, hset, get_json, set_json, delete

__all__ = ["get_redis", "hgetall", "hset", "get_json", "set_json", "delete"]
