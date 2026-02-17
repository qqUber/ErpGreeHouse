import asyncio
import json
from celery import Celery
from aiogram.types import Update
import httpx
from .config import get_settings
from .bot import create_bot, create_dispatcher
from .storage import get_redis
from .db import get_db


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

@celery_app.task
def send_customer_message(chat_id: int, text: str) -> dict:
    async def runner() -> dict:
        bot = create_bot()
        ok = await safe_send(bot, int(chat_id), text)
        return {"sent": bool(ok), "chat_id": int(chat_id)}

    return asyncio.run(runner())

@celery_app.task
def deliver_webhook_event(integration_id: int, event_type: str, payload: dict) -> dict:
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("SELECT id, enabled, config_json FROM integrations WHERE id=?", (integration_id,))
        row = cur.fetchone()
        if not row or int(row["enabled"]) != 1:
            return {"delivered": False, "reason": "integration disabled or missing"}
        try:
            cfg = json.loads(row["config_json"] or "{}")
        except Exception:
            cfg = {}
        url = str(cfg.get("url") or "").strip()
        if not url:
            return {"delivered": False, "reason": "missing url"}
        headers = cfg.get("headers") if isinstance(cfg.get("headers"), dict) else {}

        body = {"event_type": event_type, "data": payload}
        status = "error"
        http_status = None
        response_body = None
        try:
            with httpx.Client(timeout=httpx.Timeout(5.0)) as client:
                resp = client.post(url, json=body, headers=headers)
                http_status = int(resp.status_code)
                response_body = resp.text[:2000] if resp.text else ""
                status = "ok" if 200 <= resp.status_code < 300 else "error"
        except Exception as e:
            response_body = str(e)[:2000]
            status = "error"

        conn.execute(
            "INSERT INTO integration_deliveries(integration_id, event_type, status, http_status, response_body) VALUES(?,?,?,?,?)",
            (int(integration_id), str(event_type), str(status), http_status, response_body),
        )
        conn.commit()
        return {"delivered": status == "ok", "http_status": http_status}
    finally:
        conn.close()

async def safe_send(bot, chat_id: int, text: str) -> bool:
    try:
        await bot.send_message(chat_id=chat_id, text=text)
        return True
    except Exception as e:
        # In production: log error, handle blocking/deactivation
        return False

if __name__ == "__main__":
    celery_app.start()
