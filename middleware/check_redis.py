import os
import sys

try:
    import redis
except ImportError:
    print("Redis module not found")
    sys.exit(1)

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
print(f"Checking Redis at {redis_url}")

try:
    r = redis.from_url(redis_url)
    if r.ping():
        print("Redis PING OK")
    else:
        print("Redis PING Failed")
except Exception as e:
    print(f"Redis Connection Error: {e}")
