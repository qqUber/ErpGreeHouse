import os
import sys

IS_TESTING = "pytest" in sys.modules or os.getenv("TESTING", "").lower() in (
    "1",
    "true",
    "yes",
)


def is_debug() -> bool:
    debug_mode = os.getenv("DEBUG_MODE")
    if debug_mode is not None:
        return debug_mode.lower() in ("1", "true", "yes")
    return os.getenv("DEBUG", "false").lower() in ("1", "true", "yes")
