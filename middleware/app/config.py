import os
from dataclasses import dataclass
from functools import lru_cache
from dotenv import load_dotenv


@dataclass
class Settings:
    telegram_bot_token: str
    erp_api_base_url: str
    erp_api_key: str
    erp_api_secret: str
    redis_url: str
    webhook_secret: str
    base_web_url: str
    erp_mock_mode: bool


@lru_cache
def get_settings() -> Settings:
    load_dotenv()
    return Settings(
        telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN", ""),
        erp_api_base_url=os.getenv("ERP_API_BASE_URL", ""),
        erp_api_key=os.getenv("ERP_API_KEY", ""),
        erp_api_secret=os.getenv("ERP_API_SECRET", ""),
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        webhook_secret=os.getenv("WEBHOOK_SECRET", ""),
        base_web_url=os.getenv("BASE_WEB_URL", ""),
        erp_mock_mode=os.getenv("ERP_MOCK_MODE", "true").lower() in ("1", "true", "yes"),
    )
