import os
from dataclasses import dataclass
from functools import lru_cache
from urllib.parse import urlparse

from dotenv import load_dotenv


def detect_environment() -> str:
    """
    Detect the current environment based on ENVIRONMENT variable or common dev indicators.

    Returns:
        'development', 'demo', or 'production'
    """
    env = os.getenv("ENVIRONMENT", "").lower()
    if env in ("development", "dev", "development_local"):
        return "development"
    if env in ("demo", "demonstration", "staging"):
        return "demo"
    if env in ("production", "prod", "live"):
        return "production"
    if env in ("testing", "test", "ci"):
        return "testing"

    # Auto-detect based on common development indicators
    if os.getenv("ERP_MOCK_MODE", "false").lower() in ("1", "true", "yes"):
        return "development"
    if os.getenv("DEBUG", "").lower() in ("1", "true", "yes"):
        return "development"
    if os.getenv("TEST_MODE", "").lower() in ("1", "true", "yes"):
        return "testing"
    if os.getenv("E2E_TEST_MODE", "").lower() in ("1", "true", "yes"):
        return "testing"

    # Default to production for safety
    return "production"


def _normalize_url(value: str, *, prefer_https: bool = True) -> str:
    raw = value.strip()
    if not raw:
        return ""

    parsed = urlparse(raw)
    if parsed.scheme and parsed.netloc:
        return raw.rstrip("/")

    scheme = "https"
    if not prefer_https:
        scheme = "http"
    elif raw.startswith(("localhost", "127.0.0.1")):
        scheme = "http"

    return f"{scheme}://{raw.lstrip('/').rstrip('/')}"


@dataclass
class Settings:
    environment: str
    telegram_bot_token: str
    vk_access_token: str
    vk_group_id: int
    vk_api_version: str
    erp_api_base_url: str
    erp_api_key: str
    erp_api_secret: str
    redis_url: str
    webhook_secret: str
    base_web_url: str
    erp_mock_mode: bool

    # Country and Currency configuration
    # DEFAULT_COUNTRY_CODE: ISO country code (e.g., 'RU', 'KZ', 'BY') - sets system default country
    default_country_code: str | None
    # DEFAULT_CURRENCY_CODE: ISO currency code (e.g., 'RUB', 'KZT', 'BYN') - sets system default currency
    default_currency_code: str | None

    # Compliance configuration (152-FZ)
    # Data localization settings (must be hosted within Russian Federation borders)
    # This is enforced by production infrastructure configuration
    # For more information, see docs/compliance/data_storage_compliance.md

    # Rate limiting settings for password recovery
    # RECOVERY_RATE_LIMIT_ATTEMPTS: Max attempts per window
    recovery_rate_limit_attempts: int
    # RECOVERY_RATE_LIMIT_WINDOW_SECONDS: Time window in seconds
    recovery_rate_limit_window_seconds: int

    # API Rate limiting settings (sliding window algorithm)
    # RATE_LIMIT_REQUESTS: Max requests per IP per window
    rate_limit_requests: int
    # RATE_LIMIT_WINDOW_SECONDS: Time window in seconds
    rate_limit_window_seconds: int
    rate_limited_paths: tuple[str, ...]
    rate_limited_prefixes: tuple[str, ...]

    # Messaging rate limiting settings
    # TELEGRAM_RATE_LIMIT_PER_CHAT: Messages per second per chat
    telegram_rate_limit_per_chat: float
    # TELEGRAM_RATE_LIMIT_GLOBAL: Messages per second global
    telegram_rate_limit_global: float
    # VK_RATE_LIMIT_PER_CHAT: Messages per second per chat
    vk_rate_limit_per_chat: float
    # VK_RATE_LIMIT_GLOBAL: Messages per minute global
    vk_rate_limit_global: float
    # MOBILE_RATE_LIMIT_PER_CHAT: Messages per second per chat
    mobile_rate_limit_per_chat: float
    # MOBILE_RATE_LIMIT_GLOBAL: Messages per second global
    mobile_rate_limit_global: float

    # JWT configuration
    # JWT_SECRET_KEY: Primary key for signing JWT tokens
    # Fallback chain: JWT_SECRET_KEY -> JWT_SECRET -> ADMIN_SECRET -> dev-default
    # WARNING: In production, JWT_SECRET_KEY MUST be set via environment variable!
    jwt_secret_key: str

    # JWT_ALGORITHM: Algorithm for signing tokens (HS256, HS512, etc.)
    jwt_algorithm: str

    # JWT_ACCESS_TOKEN_EXPIRE_MINUTES: How long an access token is valid
    # - Development: 30 minutes (standard security practice)
    # - Production: 30 minutes (should NOT be longer)
    jwt_access_token_expire_minutes: int

    # JWT_REFRESH_TOKEN_EXPIRE_DAYS: How long a refresh token is valid
    # - Development: 30 days (convenient for local testing)
    # - Production: 30 days (standard practice, can be extended to 90 days with rotation)
    jwt_refresh_token_expire_days: int


@lru_cache
def get_settings() -> Settings:
    load_dotenv()

    # Detect environment
    environment = detect_environment()

    # Configure JWT secret based on environment
    # PRODUCTION: JWT_SECRET_KEY MUST be set - no fallbacks allowed!
    # DEMO/DEVELOPMENT: Allow fallback to ADMIN_SECRET for demo/simple auth
    jwt_secret_key = os.getenv("JWT_SECRET_KEY")

    if environment == "production":
        # Production: strict mode - require JWT_SECRET_KEY
        if not jwt_secret_key:
            raise ValueError(
                "FATAL: JWT_SECRET_KEY environment variable is required in production! "
                "Set a secure random value (e.g., JWT_SECRET_KEY=$(openssl rand -hex 32))"
            )
    else:
        # Development/Demo: allow fallback for simpler testing
        # Use JWT_SECRET_KEY if set, otherwise fall back to ADMIN_SECRET
        if not jwt_secret_key:
            jwt_secret_key = os.getenv("JWT_SECRET") or os.getenv("ADMIN_SECRET")
        if not jwt_secret_key:
            import secrets

            jwt_secret_key = secrets.token_hex(32)

    # Configure defaults based on environment
    default_access_expire = 30
    default_refresh_expire = 30

    if environment == "development":
        # Development defaults - stable and deterministic for local testing
        # These values won't change between restarts, making debugging easier
        default_access_expire = 30  # 30 minutes - standard for access tokens
        default_refresh_expire = 30  # 30 days - convenient for dev testing

    default_rate_limited_paths = (
        "/api/v1/public/auth/login",
        "/api/v1/public/auth/recover",
        "/api/v1/public/auth/reset-password",
        "/api/v1/auth/login",
    )
    default_rate_limited_prefixes = (
        "/api/v1/public/auth",
        "/api/v1/auth",
    )
    configured_rate_limited_paths = tuple(
        path.strip()
        for path in os.getenv(
            "RATE_LIMITED_PATHS",
            ",".join(default_rate_limited_paths),
        ).split(",")
        if path.strip()
    )
    configured_rate_limited_prefixes = tuple(
        path.strip()
        for path in os.getenv(
            "RATE_LIMITED_PREFIXES",
            ",".join(default_rate_limited_prefixes),
        ).split(",")
        if path.strip()
    )
    erp_api_base_url = _normalize_url(os.getenv("ERP_API_BASE_URL", ""))
    base_web_url = _normalize_url(os.getenv("BASE_WEB_URL", ""))

    return Settings(
        environment=environment,
        telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN", ""),
        vk_access_token=os.getenv("VK_ACCESS_TOKEN", ""),
        vk_group_id=int(os.getenv("VK_GROUP_ID", "0") or "0"),
        vk_api_version=os.getenv("VK_API_VERSION", "5.131"),
        erp_api_base_url=erp_api_base_url,
        erp_api_key=os.getenv("ERP_API_KEY", ""),
        erp_api_secret=os.getenv("ERP_API_SECRET", ""),
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        webhook_secret=os.getenv("WEBHOOK_SECRET", ""),
        base_web_url=base_web_url,
        erp_mock_mode=os.getenv("ERP_MOCK_MODE", "false").lower()
        in ("1", "true", "yes"),
        # Country and Currency settings from ENV
        default_country_code=os.getenv("DEFAULT_COUNTRY_CODE", "").strip() or None,
        default_currency_code=os.getenv("DEFAULT_CURRENCY_CODE", "").strip() or None,
        # Rate limiting settings for password recovery
        recovery_rate_limit_attempts=int(
            os.getenv("RECOVERY_RATE_LIMIT_ATTEMPTS", "5")
        ),
        recovery_rate_limit_window_seconds=int(
            os.getenv("RECOVERY_RATE_LIMIT_WINDOW_SECONDS", "60")
        ),
        # API Rate limiting settings
        rate_limit_requests=int(os.getenv("RATE_LIMIT_REQUESTS", "100")),
        rate_limit_window_seconds=int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60")),
        rate_limited_paths=configured_rate_limited_paths,
        rate_limited_prefixes=configured_rate_limited_prefixes,
        # Messaging rate limiting settings
        telegram_rate_limit_per_chat=float(
            os.getenv("TELEGRAM_RATE_LIMIT_PER_CHAT", "1.0")
        ),
        telegram_rate_limit_global=float(
            os.getenv("TELEGRAM_RATE_LIMIT_GLOBAL", "30.0")
        ),
        vk_rate_limit_per_chat=float(os.getenv("VK_RATE_LIMIT_PER_CHAT", "1.0")),
        vk_rate_limit_global=float(os.getenv("VK_RATE_LIMIT_GLOBAL", "0.333")),
        mobile_rate_limit_per_chat=float(
            os.getenv("MOBILE_RATE_LIMIT_PER_CHAT", "5.0")
        ),
        mobile_rate_limit_global=float(os.getenv("MOBILE_RATE_LIMIT_GLOBAL", "100.0")),
        # JWT configuration
        # PRODUCTION: JWT_SECRET_KEY MUST be set (enforced above)
        # DEVELOPMENT: Allow fallback to ADMIN_SECRET for demo purposes
        jwt_secret_key=jwt_secret_key,
        # Algorithm for JWT signing (HS256 is recommended for most cases)
        jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        # Access token expiration (in minutes)
        # CRITICAL: Access tokens should be short-lived (15-30 minutes) for security
        # The old value of 43200 (30 days) was a security risk!
        jwt_access_token_expire_minutes=int(
            os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", str(default_access_expire))
        ),
        # Refresh token expiration (in days)
        # Refresh tokens can be longer-lived since they can be revoked
        jwt_refresh_token_expire_days=int(
            os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", str(default_refresh_expire))
        ),
    )
