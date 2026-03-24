from .storage import get_redis
from .integrations.bots.telegram_handler import create_bot
from .db import get_db
from .constants import (
    EXPIRE_INACTIVE_POINTS_INTERVAL,
    INACTIVE_POINTS_EXPIRY_DAYS,
    PROCESS_MARKETING_INTERVAL,
)
from .config import get_settings
from celery import Celery
import httpx
from typing import Any
import json
import asyncio
import logging

logger = logging.getLogger(__name__)


settings = get_settings()

celery_app = Celery(
    "telegram_crm",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.beat_schedule = {
    "expire-inactive-points-daily": {
        "task": "app.worker.expire_inactive_points",
        "schedule": float(EXPIRE_INACTIVE_POINTS_INTERVAL),  # Run every day
    },
    "process-periodic-marketing-daily": {
        "task": "app.worker.process_periodic_marketing",
        "schedule": float(PROCESS_MARKETING_INTERVAL),  # Run every hour
    },
}
celery_app.conf.timezone = "UTC"


@celery_app.task
def send_media_group_message(
    chat_id: int, media_items: list, campaign_id: int = None, customer_id: int = None
) -> dict:
    async def runner() -> dict:
        bot = create_bot()
        ok = await send_media_group(bot, int(chat_id), media_items)

        # Track delivery event
        if campaign_id and customer_id:
            db = get_db()
            conn = db.connect()
            try:
                conn.execute(
                    "INSERT INTO marketing_events (campaign_id, user_id, event_type, event_data) VALUES (?, ?, ?, ?)",
                    (
                        campaign_id,
                        customer_id,
                        "delivered",
                        json.dumps({"channel": "telegram"}),
                    ),
                )
                conn.commit()
            finally:
                conn.close()

        return {"sent": bool(ok), "chat_id": int(chat_id)}

    return asyncio.run(runner())


@celery_app.task
def send_vk_message(
    user_id: int, text: str, campaign_id: int = None, customer_id: int = None
) -> dict:
    async def runner() -> dict:
        from app.config import get_settings
        from app.integrations.bots.vk_handler import create_vk_bot, get_vk_bot

        settings = get_settings()
        bot = await get_vk_bot()
        if not bot:
            if settings.vk_access_token and settings.vk_group_id:
                bot = create_vk_bot(settings.vk_access_token, settings.vk_group_id)
            else:
                return {"sent": False, "reason": "VK bot not configured"}

        try:
            await bot._send_message(user_id, text)
            ok = True

            # Track delivery event
            if campaign_id and customer_id:
                db = get_db()
                conn = db.connect()
                try:
                    conn.execute(
                        "INSERT INTO marketing_events (campaign_id, user_id, event_type, event_data) VALUES (?, ?, ?, ?)",
                        (
                            campaign_id,
                            customer_id,
                            "delivered",
                            json.dumps({"channel": "vk"}),
                        ),
                    )
                    conn.commit()
                finally:
                    conn.close()

            return {"sent": ok, "user_id": user_id}
        except Exception as e:
            return {"sent": False, "error": str(e)}

    return asyncio.run(runner())


@celery_app.task
def send_vk_photo_message(
    user_id: int,
    photo_path: str,
    caption: str = None,
    campaign_id: int = None,
    customer_id: int = None,
) -> dict:
    async def runner() -> dict:
        from app.config import get_settings
        from app.integrations.bots.vk_handler import create_vk_bot, get_vk_bot

        settings = get_settings()
        bot = await get_vk_bot()
        if not bot:
            if settings.vk_access_token and settings.vk_group_id:
                bot = create_vk_bot(settings.vk_access_token, settings.vk_group_id)
            else:
                return {"sent": False, "reason": "VK bot not configured"}

        try:
            # TODO: Implement photo sending for VK
            await bot._send_message(user_id, f"Фото: {caption or ''}")
            ok = True

            # Track delivery event
            if campaign_id and customer_id:
                db = get_db()
                conn = db.connect()
                try:
                    conn.execute(
                        "INSERT INTO marketing_events (campaign_id, user_id, event_type, event_data) VALUES (?, ?, ?, ?)",
                        (
                            campaign_id,
                            customer_id,
                            "delivered",
                            json.dumps({"channel": "vk"}),
                        ),
                    )
                    conn.commit()
                finally:
                    conn.close()

            return {"sent": ok, "user_id": user_id}
        except Exception as e:
            return {"sent": False, "error": str(e)}

    return asyncio.run(runner())


@celery_app.task
def send_broadcast(text: str) -> dict:
    async def runner() -> dict:
        r = get_redis()
        chats = r.smembers("crm:known_chats") or set()  # type: ignore[union-attr]
        bot = create_bot()
        ok = 0
        failed = 0
        total = len(chats)  # type: ignore[arg-type]

        chat_list: list[Any] = list(chats)  # type: ignore[arg-type]

        # Import rate limiter
        from app.rate_limiter import is_rate_limited

        for cid in chat_list:
            chat_id = int(cid)

            # Check rate limit before sending
            if is_rate_limited(chat_id, "telegram"):
                failed += 1
                continue

            try:
                # Send message
                ok_flag = await safe_send(bot, chat_id, text)
                if ok_flag:
                    ok += 1
                else:
                    failed += 1

                # Sleep to respect rate limits
                await asyncio.sleep(0.1)
            except Exception as e:
                failed += 1

        return {"sent": ok, "failed": failed, "total": total}

    return asyncio.run(runner())


@celery_app.task
def send_customer_message(
    chat_id: int, text: str, campaign_id: int = None, customer_id: int = None
) -> dict:
    async def runner() -> dict:
        bot = create_bot()
        ok = await safe_send(bot, int(chat_id), text)

        # Track delivery event
        if campaign_id and customer_id:
            db = get_db()
            conn = db.connect()
            try:
                conn.execute(
                    "INSERT INTO marketing_events (campaign_id, user_id, event_type, event_data) VALUES (?, ?, ?, ?)",
                    (
                        campaign_id,
                        customer_id,
                        "delivered",
                        json.dumps({"channel": "telegram"}),
                    ),
                )
                conn.commit()
            finally:
                conn.close()

        return {"sent": bool(ok), "chat_id": int(chat_id)}

    return asyncio.run(runner())


@celery_app.task
def send_photo_message(
    chat_id: int,
    photo_path: str,
    caption: str = None,
    campaign_id: int = None,
    customer_id: int = None,
) -> dict:
    async def runner() -> dict:
        bot = create_bot()
        ok = await safe_send_photo(bot, int(chat_id), photo_path, caption)

        # Track delivery event
        if campaign_id and customer_id:
            db = get_db()
            conn = db.connect()
            try:
                conn.execute(
                    "INSERT INTO marketing_events (campaign_id, user_id, event_type, event_data) VALUES (?, ?, ?, ?)",
                    (
                        campaign_id,
                        customer_id,
                        "delivered",
                        json.dumps({"channel": "telegram"}),
                    ),
                )
                conn.commit()
            finally:
                conn.close()

        return {"sent": bool(ok), "chat_id": int(chat_id)}

    return asyncio.run(runner())


@celery_app.task
def send_video_message(
    chat_id: int,
    video_path: str,
    caption: str = None,
    campaign_id: int = None,
    customer_id: int = None,
) -> dict:
    async def runner() -> dict:
        bot = create_bot()
        ok = await safe_send_video(bot, int(chat_id), video_path, caption)

        # Track delivery event
        if campaign_id and customer_id:
            db = get_db()
            conn = db.connect()
            try:
                conn.execute(
                    "INSERT INTO marketing_events (campaign_id, user_id, event_type, event_data) VALUES (?, ?, ?, ?)",
                    (
                        campaign_id,
                        customer_id,
                        "delivered",
                        json.dumps({"channel": "telegram"}),
                    ),
                )
                conn.commit()
            finally:
                conn.close()

        return {"sent": bool(ok), "chat_id": int(chat_id)}

    return asyncio.run(runner())


@celery_app.task
def send_document_message(
    chat_id: int,
    document_path: str,
    caption: str = None,
    campaign_id: int = None,
    customer_id: int = None,
) -> dict:
    async def runner() -> dict:
        bot = create_bot()
        ok = await safe_send_document(bot, int(chat_id), document_path, caption)

        # Track delivery event
        if campaign_id and customer_id:
            db = get_db()
            conn = db.connect()
            try:
                conn.execute(
                    "INSERT INTO marketing_events (campaign_id, user_id, event_type, event_data) VALUES (?, ?, ?, ?)",
                    (
                        campaign_id,
                        customer_id,
                        "delivered",
                        json.dumps({"channel": "telegram"}),
                    ),
                )
                conn.commit()
            finally:
                conn.close()

        return {"sent": bool(ok), "chat_id": int(chat_id)}

    return asyncio.run(runner())


@celery_app.task
def send_media_group_message(
    chat_id: int, media_items: list, campaign_id: int = None, customer_id: int = None
) -> dict:
    async def runner() -> dict:
        bot = create_bot()
        ok = await send_media_group(bot, int(chat_id), media_items)

        # Track delivery event
        if campaign_id and customer_id:
            db = get_db()
            conn = db.connect()
            try:
                conn.execute(
                    "INSERT INTO marketing_events (campaign_id, user_id, event_type, event_data) VALUES (?, ?, ?, ?)",
                    (
                        campaign_id,
                        customer_id,
                        "delivered",
                        json.dumps({"channel": "telegram"}),
                    ),
                )
                conn.commit()
            finally:
                conn.close()

        return {"sent": bool(ok), "chat_id": int(chat_id)}

    return asyncio.run(runner())


@celery_app.task
def deliver_webhook_event(integration_id: int, event_type: str, payload: dict) -> dict:
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "SELECT id, enabled, config_json FROM integrations WHERE id=?",
            (integration_id,),
        )
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
            (
                int(integration_id),
                str(event_type),
                str(status),
                http_status,
                response_body,
            ),
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


async def safe_send_photo(
    bot, chat_id: int, photo_path: str, caption: str = None
) -> bool:
    try:
        from aiogram.methods.send_photo import SendPhoto
        from aiogram.types.input_file import FSInputFile

        photo = FSInputFile(photo_path)
        await bot(SendPhoto(chat_id=chat_id, photo=photo, caption=caption))
        return True
    except Exception as e:
        # In production: log error, handle blocking/deactivation
        return False


async def safe_send_video(
    bot, chat_id: int, video_path: str, caption: str = None
) -> bool:
    try:
        from aiogram.methods.send_video import SendVideo
        from aiogram.types.input_file import FSInputFile

        video = FSInputFile(video_path)
        await bot(SendVideo(chat_id=chat_id, video=video, caption=caption))
        return True
    except Exception as e:
        # In production: log error, handle blocking/deactivation
        return False


async def safe_send_document(
    bot, chat_id: int, document_path: str, caption: str = None
) -> bool:
    try:
        from aiogram.methods.send_document import SendDocument
        from aiogram.types.input_file import FSInputFile

        document = FSInputFile(document_path)
        await bot(SendDocument(chat_id=chat_id, document=document, caption=caption))
        return True
    except Exception as e:
        # In production: log error, handle blocking/deactivation
        return False


async def send_media_group(bot, chat_id: int, media_items: list) -> bool:
    try:
        from aiogram.methods.send_media_group import SendMediaGroup
        from aiogram.types.input_file import FSInputFile
        from aiogram.utils.media_group import MediaGroupBuilder

        media_group = MediaGroupBuilder()
        for item in media_items:
            if item["type"] == "photo":
                media_group.add_photo(
                    media=FSInputFile(item["path"]), caption=item.get("caption")
                )
            elif item["type"] == "video":
                media_group.add_video(
                    media=FSInputFile(item["path"]), caption=item.get("caption")
                )

        await bot(SendMediaGroup(chat_id=chat_id, media=media_group.build()))
        return True
    except Exception as e:
        # In production: log error, handle blocking/deactivation
        return False


@celery_app.task
def expire_inactive_points() -> dict:
    """Zeroes out balance for customers inactive for > INACTIVE_POINTS_EXPIRY_DAYS days."""
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            f"""
            UPDATE customers
            SET balance_points = 0, updated_at = datetime('now')
            WHERE balance_points > 0
            AND id NOT IN (
                SELECT customer_id FROM transactions
                WHERE created_at >= datetime('now', '-{INACTIVE_POINTS_EXPIRY_DAYS} days')
            )
        """
        )
        conn.commit()
        return {"expired_accounts": cur.rowcount}
    finally:
        conn.close()


@celery_app.task
def execute_marketing_trigger(
    customer_id: int,
    trigger_id: int,
    message_text: str,
    media_type: str = None,
    media_url: str = None,
    caption: str = None,
    event_id: int | None = None,
) -> dict:
    async def runner() -> dict:
        db = get_db()
        conn = db.connect()
        try:
            # Check if event is still pending
            if event_id:
                row = conn.execute(
                    "SELECT status FROM marketing_trigger_events WHERE id=?",
                    (event_id,),
                ).fetchone()
                if not row or row["status"] != "pending":
                    return {"sent": False, "reason": "event cancelled or already sent"}

            # Get user TG ID
            row = conn.execute(
                "SELECT telegram_id FROM customers WHERE id=?", (customer_id,)
            ).fetchone()
            if not row or not row["telegram_id"]:
                if event_id:
                    conn.execute(
                        "UPDATE marketing_trigger_events SET status='failed' WHERE id=?",
                        (event_id,),
                    )
                    conn.commit()
                return {"sent": False, "reason": "no telegram id"}

            bot = create_bot()
            ok = False

            if media_type:
                if media_type == "photo" and media_url:
                    ok = await safe_send_photo(
                        bot, int(row["telegram_id"]), media_url, caption or message_text
                    )
                elif media_type == "video" and media_url:
                    ok = await safe_send_video(
                        bot, int(row["telegram_id"]), media_url, caption or message_text
                    )
                elif media_type == "document" and media_url:
                    ok = await safe_send_document(
                        bot, int(row["telegram_id"]), media_url, caption or message_text
                    )
                else:
                    ok = await safe_send(bot, int(row["telegram_id"]), message_text)
            else:
                ok = await safe_send(bot, int(row["telegram_id"]), message_text)

            if event_id:
                conn.execute(
                    "UPDATE marketing_trigger_events SET status=?, sent_at=datetime('now') WHERE id=?",
                    ("sent" if ok else "failed", event_id),
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
    from app import trigger_engine

    db = get_db()
    conn = db.connect()
    try:
        # Birthday triggers
        # SQLite: strftime('%m-%d', 'now')
        rows = conn.execute(
            """
            SELECT id FROM customers
            WHERE birthday IS NOT NULL
            AND strftime('%m-%d', birthday) = strftime('%m-%d', 'now')
        """
        ).fetchall()
        for r in rows:
            trigger_engine.evaluate_and_queue_triggers(
                int(r["id"]), "customer.birthday", {}
            )

        # Inactive customer triggers
        rows = conn.execute(
            """
            SELECT c.id,
                   CAST((julianday('now') - julianday(MAX(t.created_at))) AS INTEGER) as days_inactive
            FROM customers c
            LEFT JOIN transactions t ON c.id = t.customer_id
            GROUP BY c.id
            HAVING days_inactive IS NOT NULL
        """
        ).fetchall()
        for r in rows:
            trigger_engine.evaluate_and_queue_triggers(
                int(r["id"]),
                "customer.inactive",
                {"days_inactive": int(r["days_inactive"])},
            )

        # Welcome message triggers for new customers
        rows = conn.execute(
            """
            SELECT id FROM customers
            WHERE created_at >= datetime('now', '-24 hours')
        """
        ).fetchall()
        for r in rows:
            trigger_engine.evaluate_and_queue_triggers(
                int(r["id"]), "customer.welcome", {}
            )

        # Points expiration triggers
        # Check for points that will expire in next 7 days
        rows = conn.execute(
            """
            SELECT c.id, SUM(t.bonus_earned - t.bonus_used) as points_to_expire
            FROM customers c
            LEFT JOIN transactions t ON c.id = t.customer_id
            WHERE t.created_at <= datetime('now', '-365 days')
            GROUP BY c.id
            HAVING points_to_expire > 0
        """
        ).fetchall()
        for r in rows:
            trigger_engine.evaluate_and_queue_triggers(
                int(r["id"]),
                "points.expiration",
                {"points_to_expire": int(r["points_to_expire"])},
            )

        return {"processed": True}
    except Exception as e:
        return {"processed": False, "error": str(e)}
    finally:
        conn.close()


@celery_app.task
def process_telegram_update(payload: dict) -> dict:
    """Process Telegram webhook updates."""

    async def runner() -> dict:
        from aiogram.types import Update

        from app.integrations.bots.telegram_handler import create_bot, create_dispatcher

        bot = create_bot()
        dp = create_dispatcher()

        try:
            update = Update(**payload)
            await dp.feed_update(bot, update)
            return {"processed": True}
        except Exception as e:
            logger.error(f"Error processing Telegram update: {e}")
            return {"processed": False, "error": str(e)}

    return asyncio.run(runner())


if __name__ == "__main__":
    celery_app.start()
