import asyncio
from celery import Celery
from aiogram.types import Update
from .config import get_settings
from .bot import create_bot, create_dispatcher
from .storage import get_redis


settings = get_settings()

celery_app = Celery(
    "telegram_crm",
    broker=settings.redis_url,
    backend=settings.redis_url,
)


@celery_app.task
def process_telegram_update(update: dict) -> dict:
    async def runner() -> dict:
        bot = create_bot()
        dp = create_dispatcher()
        aioupdate = Update.model_validate(update)
        await dp.feed_update(bot, aioupdate)
        return {"processed": True, "update_id": update.get("update_id")}
    return asyncio.run(runner())

@celery_app.task
def send_broadcast(text: str) -> dict:
    async def runner() -> dict:
        r = get_redis()
        chats = r.smembers("crm:known_chats") or set()
        bot = create_bot()
        ok = 0
        failed = 0
        total = len(chats)
        
        # Batch processing to respect Telegram limits (30 msgs/sec roughly)
        # We will be conservative: 20 msgs per batch, sleep 1 sec
        batch_size = 20
        chat_list = list(chats)
        
        for i in range(0, total, batch_size):
            batch = chat_list[i:i + batch_size]
            tasks = []
            for cid in batch:
                tasks.append(safe_send(bot, int(cid), text))
            
            results = await asyncio.gather(*tasks)
            ok += sum(1 for r in results if r)
            failed += sum(1 for r in results if not r)
            
            if i + batch_size < total:
                await asyncio.sleep(1.0)
                
        return {"sent": ok, "failed": failed, "total": total}
        
    return asyncio.run(runner())

async def safe_send(bot, chat_id: int, text: str) -> bool:
    try:
        await bot.send_message(chat_id=chat_id, text=text)
        return True
    except Exception as e:
        # In production: log error, handle blocking/deactivation
        return False

if __name__ == "__main__":
    celery_app.start()
