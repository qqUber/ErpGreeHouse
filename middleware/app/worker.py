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

celery_app.conf.beat_schedule = {
    "expire-inactive-points-daily": {
        "task": "app.worker.expire_inactive_points",
        "schedule": 86400.0, # Run every day
    },
    "process-periodic-marketing-daily": {
        "task": "app.worker.process_periodic_marketing",
        "schedule": 3600.0, # Run every hour to be safe, but logic normally skips once done
    },
}
celery_app.conf.timezone = "UTC"


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
            ok += sum(1 for res in results if res)
            failed += sum(1 for res in results if not res)
            
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

@celery_app.task
def expire_inactive_points() -> dict:
    """Zeroes out balance for customers inactive for > 180 days."""
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute('''
            UPDATE customers
            SET balance_points = 0, updated_at = datetime('now')
            WHERE balance_points > 0
            AND id NOT IN (
                SELECT customer_id FROM transactions
                WHERE created_at >= datetime('now', '-180 days')
            )
        ''')
        conn.commit()
        return {"expired_accounts": cur.rowcount}
    finally:
        conn.close()

@celery_app.task
def execute_marketing_trigger(customer_id: int, trigger_id: int, message_text: str, event_id: int | None = None) -> dict:
    async def runner() -> dict:
        db = get_db()
        conn = db.connect()
        try:
            # Check if event is still pending
            if event_id:
                row = conn.execute("SELECT status FROM marketing_trigger_events WHERE id=?", (event_id,)).fetchone()
                if not row or row["status"] != "pending":
                    return {"sent": False, "reason": "event cancelled or already sent"}
            
            # Get user TG ID
            row = conn.execute("SELECT telegram_id FROM customers WHERE id=?", (customer_id,)).fetchone()
            if not row or not row["telegram_id"]:
                if event_id:
                    conn.execute("UPDATE marketing_trigger_events SET status='failed' WHERE id=?", (event_id,))
                    conn.commit()
                return {"sent": False, "reason": "no telegram id"}

            bot = create_bot()
            ok = await safe_send(bot, int(row["telegram_id"]), message_text)
            
            if event_id:
                conn.execute(
                    "UPDATE marketing_trigger_events SET status=?, sent_at=datetime('now') WHERE id=?",
                    ('sent' if ok else 'failed', event_id)
                )
                conn.commit()
                
                
            return {"sent": bool(ok), "chat_id": int(row["telegram_id"])}
        except Exception as e:
            return {"sent": False, "error": str(e)}
        finally:
            conn.close()
            
    return asyncio.run(runner())

@celery_app.task
def process_periodic_marketing() -> dict:
    """Scans for birthdays and inactive customers to fire triggers."""
    from . import trigger_engine
    db = get_db()
    conn = db.connect()
    try:
        # Birthday triggers
        # SQLite: strftime('%m-%d', 'now') 
        rows = conn.execute("""
            SELECT id FROM customers 
            WHERE birthday IS NOT NULL 
            AND strftime('%m-%d', birthday) = strftime('%m-%d', 'now')
        """).fetchall()
        for r in rows:
            trigger_engine.evaluate_and_queue_triggers(int(r["id"]), "customer.birthday", {})

        # Inactive customer triggers
        rows = conn.execute("""
            SELECT c.id, 
                   CAST((julianday('now') - julianday(MAX(t.created_at))) AS INTEGER) as days_inactive
            FROM customers c
            LEFT JOIN transactions t ON c.id = t.customer_id
            GROUP BY c.id
            HAVING days_inactive IS NOT NULL
        """).fetchall()
        for r in rows:
            trigger_engine.evaluate_and_queue_triggers(int(r["id"]), "customer.inactive", {"days_inactive": int(r["days_inactive"])})

        return {"processed": True}
    except Exception as e:
        return {"processed": False, "error": str(e)}
    finally:
        conn.close()

if __name__ == "__main__":
    celery_app.start()
