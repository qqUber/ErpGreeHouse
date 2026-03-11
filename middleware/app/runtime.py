import os


def is_debug() -> bool:
    return os.getenv("DEBUG_MODE", "false").lower() in ("1", "true", "yes")
