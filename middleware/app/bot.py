from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from .handlers import router
from .middlewares import ThrottleMiddleware

from .config import get_settings


def create_bot() -> Bot:
    settings = get_settings()
    return Bot(
        token=settings.telegram_bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )


def create_dispatcher() -> Dispatcher:
    dp = Dispatcher()
    dp.message.middleware(ThrottleMiddleware(rate=0.7))
    dp.callback_query.middleware(ThrottleMiddleware(rate=0.7))
    dp.include_router(router)
    return dp
