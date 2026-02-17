import time
from typing import Callable, Any, Awaitable, Dict
from aiogram import BaseMiddleware
from aiogram.types import Message, CallbackQuery, TelegramObject
from .storage import get_redis


class ThrottleMiddleware(BaseMiddleware):
    def __init__(self, rate: float = 1.0) -> None:
        self.rate = rate
        self.r = get_redis()

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        uid = None
        if isinstance(event, Message):
            uid = event.from_user.id if event.from_user else None
        if isinstance(event, CallbackQuery):
            uid = event.from_user.id if event.from_user else None
        if uid:
            key = f"crm:throttle:{uid}"
            now = time.time()
            last = float(self.r.get(key) or "0")
            if now - last < self.rate:
                return
            self.r.setex(key, int(self.rate), str(now))
        return await handler(event, data)
