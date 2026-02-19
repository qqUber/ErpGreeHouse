import redis
import os

def flush_redis():
    host = os.getenv("REDIS_HOST", "localhost")
    port = int(os.getenv("REDIS_PORT", "6379"))
    try:
        r = redis.Redis(host=host, port=port, decode_responses=True)
        r.flushall()
        print("Redis flushed successfully.")
    except Exception as e:
        print(f"Error flushing Redis: {e}")

if __name__ == "__main__":
    flush_redis()
