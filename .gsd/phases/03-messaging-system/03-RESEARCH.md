# Phase 3: Messaging System - Implementation Research

## Overview

This phase implements omnichannel messaging functionality for a coffee shop CRM, including targeted promotions, trigger-based messages, media support, rate limiting, and delivery tracking. The system will unify customer loyalty management and communications across Telegram, VK, and mobile app channels.

## Current State Analysis

Based on codebase analysis, the messaging system already has:

### Existing Features

1. **Customer Segmentation**: Basic marketing segments with criteria like min_balance and days_since_visit
2. **Campaign Management**: Create and send marketing campaigns to segments
3. **Trigger-based Messages**: 
   - Birthday triggers
   - Inactivity triggers  
   - Purchase triggers
4. **Telegram Integration**: aiogram 3.x bot with Celery workers
5. **Task Queue**: Celery with Redis backend for async message sending
6. **152-FZ Compliance**: Marketing consent management

### Missing Features

1. **Media Support**: Only text messages supported; no images, videos, documents
2. **VK Integration**: VK bot API not implemented
3. **Rate Limiting**: Basic batch processing but no comprehensive rate limiting
4. **Delivery Tracking**: No tracking of message delivery or open rates
5. **Advanced Segmentation**: Limited criteria options
6. **Message Templates**: No template variables or media templates

## Standard Stack

### Core Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| aiogram | 3.25+ | Telegram Bot API integration |
| Celery | 5.x | Async task queue |
| Redis | 7.x | Cache and Celery broker |
| SQLite | 3.x | Database (current), will transition to PostgreSQL |
| FastAPI | 0.129+ | API backend |

### Media Handling

| Feature | Library/Approach |
|---------|-----------------|
| Image/Video Upload | aiogram InputFile, MediaGroupBuilder |
| Media Storage | Local storage with CDN (future: S3) |
| Media Formats | JPEG, PNG, GIF, MP4, PDF |

### Rate Limiting

| Library | Purpose |
|---------|---------|
| limited-aiogram | aiogram extension for rate limiting |
| Redis | Token bucket algorithm implementation |

### Analytics

| Feature | Approach |
|---------|----------|
| Delivery Tracking | Message sent webhook + database logging |
| Open Rate | Read receipt simulation (Telegram doesn't support) |
| Click Tracking | Shortened URLs with tracking parameters |

## Architecture Patterns

### 1. Media Message Structure

```
marketing_campaigns table:
- content_type: TEXT (text, photo, video, document, media_group)
- media_urls: TEXT (JSON array of media URLs)
- caption: TEXT (for media messages)

marketing_triggers table:
- media_type: TEXT (text, photo, video, document)
- media_url: TEXT
- caption: TEXT
```

### 2. Rate Limiting Strategy

```
Per-channel rate limits:
- Telegram: 30 msg/sec (broadcast), 1 msg/sec per chat
- VK: 20 msg/min per group, 1 msg/sec per user
- Mobile App: 100 msg/sec (push notifications)

Implementation:
- Redis-based token bucket
- Per-chat rate limiting
- Exponential backoff for retries
```

### 3. Delivery Tracking

```
marketing_events table:
- campaign_id: INTEGER
- user_id: INTEGER
- event_type: TEXT (sent, delivered, opened, clicked)
- event_data: TEXT (JSON with metadata)
- created_at: TEXT

Trigger events extension:
- marketing_trigger_events table add: sent_at, delivered_at, opened_at
```

### 4. Message Sending Architecture

```
API → Campaign Service → Segment Evaluator → Rate Limiter → Celery Task → Channel Sender → Delivery Tracker
```

## Don't Hand-Roll

1. **Rate Limiting**: Use existing libraries (limited-aiogram) instead of custom implementation
2. **Media Handling**: Leverage aiogram's built-in InputFile and MediaGroupBuilder
3. **Task Queuing**: Use Celery + Redis, don't build custom async workers
4. **URL Shortening**: Use existing service (or integrate with Bitly/Short.io), don't build custom
5. **Analytics**: Use existing tools (Google Analytics, Yandex.Metrika) for click tracking

## Common Pitfalls

### 1. Telegram API Limits

- **Flood Errors**: 429 Too Many Requests when exceeding 30 msg/sec
- **Solution**: Implement per-chat rate limiting with 1 msg/sec cap per user

### 2. Media File Size Limits

- **Telegram**: 50 MB per file
- **VK**: 20 MB per photo, 200 MB per video
- **Solution**: Validate file sizes before sending, implement compression

### 3. Message Template Variables

- **Pitfall**: Unsanitized variables leading to injection attacks
- **Solution**: Use Jinja2 template engine with autoescaping

### 4. Delivery Tracking Inaccuracy

- **Telegram**: No read receipts for bots
- **Solution**: Use engagement metrics (reply rate, click rate) as proxy

### 5. VK API Complexity

- **Pitfall**: VK requires upload server workflow for media
- **Solution**: Implement retry logic for upload failures

## Code Examples

### Sending Photo Message with aiogram

```python
# middleware/app/worker.py
from aiogram.methods.send_photo import SendPhoto
from aiogram.types.input_file import FSInputFile

async def safe_send_photo(bot, chat_id: int, photo_path: str, caption: str = None) -> bool:
    try:
        photo = FSInputFile(photo_path)
        await bot(SendPhoto(
            chat_id=chat_id,
            photo=photo,
            caption=caption
        ))
        return True
    except Exception as e:
        logger.error(f"Failed to send photo to {chat_id}: {e}")
        return False

@celery_app.task
def send_photo_message(chat_id: int, photo_path: str, caption: str = None) -> dict:
    async def runner() -> dict:
        bot = create_bot()
        ok = await safe_send_photo(bot, int(chat_id), photo_path, caption)
        return {"sent": bool(ok), "chat_id": int(chat_id)}
    return asyncio.run(runner())
```

### Media Group (Album) Sending

```python
from aiogram.utils.media_group import MediaGroupBuilder
from aiogram.methods.send_media_group import SendMediaGroup

async def send_media_group(bot, chat_id: int, media_items: list) -> bool:
    try:
        media_group = MediaGroupBuilder()
        for item in media_items:
            if item["type"] == "photo":
                media_group.add_photo(media=FSInputFile(item["path"]), caption=item.get("caption"))
            elif item["type"] == "video":
                media_group.add_video(media=FSInputFile(item["path"]), caption=item.get("caption"))
        
        await bot(SendMediaGroup(
            chat_id=chat_id,
            media=media_group.build()
        ))
        return True
    except Exception as e:
        logger.error(f"Failed to send media group to {chat_id}: {e}")
        return False
```

### Rate Limiting with Redis Token Bucket

```python
# middleware/app/rate_limiter.py
import redis
import time
from app.config import get_settings

settings = get_settings()
r = redis.from_url(settings.redis_url)

def check_rate_limit(chat_id: int, channel: str, max_tokens: int, refill_rate: float) -> bool:
    key = f"rate_limit:{channel}:{chat_id}"
    current_time = time.time()
    
    # Get current token count and last refill time
    pipeline = r.pipeline()
    pipeline.get(key + ":tokens")
    pipeline.get(key + ":last_refill")
    tokens, last_refill = pipeline.execute()
    
    tokens = int(tokens) if tokens else max_tokens
    last_refill = float(last_refill) if last_refill else current_time
    
    # Refill tokens
    tokens_to_add = int((current_time - last_refill) * refill_rate)
    if tokens_to_add > 0:
        tokens = min(tokens + tokens_to_add, max_tokens)
        r.set(key + ":last_refill", current_time)
        r.set(key + ":tokens", tokens)
    
    if tokens > 0:
        r.decr(key + ":tokens")
        return True
    else:
        return False
```

### Delivery Tracking

```python
# middleware/app/marketing_api.py
@router.post("/campaigns/{id}/send")
def send_campaign(
    id: int, x_admin_secret: str | None = Header(default=None, alias="x-admin-secret")
):
    # ... existing logic ...
    
    # Queue messages for delivery
    customers = get_customers_in_segment(campaign["segment_id"])
    for customer in customers:
        if customer["telegram_id"]:
            # Queue message
            celery_app.send_task(
                "app.worker.send_campaign_message",
                kwargs={
                    "campaign_id": id,
                    "customer_id": customer["id"],
                    "chat_id": customer["telegram_id"],
                    "content": campaign["content"],
                    "media_urls": campaign.get("media_urls"),
                    "content_type": campaign.get("content_type", "text")
                }
            )
            # Record sent event
            conn.execute(
                """
                INSERT INTO marketing_events (campaign_id, user_id, event_type)
                VALUES (?, ?, 'sent')
                """,
                (id, customer["id"])
            )
    
    conn.commit()
    return {"status": "sending", "recipients": len(customers)}
```

## VK Integration Approach

### VK Bot Setup

```python
# middleware/app/integrations/bots/vk_handler.py
import vk_api
from vk_api.bot_longpoll import VkBotLongPoll, VkBotEventType
from app.config import get_settings

settings = get_settings()

class VKHandler:
    def __init__(self):
        self.vk_session = vk_api.VkApi(
            token=settings.vk_bot_token
        )
        self.vk = self.vk_session.get_api()
        self.longpoll = VkBotLongPoll(self.vk_session, settings.vk_group_id)
    
    async def send_message(self, peer_id: int, message: str, attachments: list = None):
        try:
            self.vk.messages.send(
                peer_id=peer_id,
                message=message,
                attachment=",".join(attachments) if attachments else None,
                random_id=0
            )
            return True
        except Exception as e:
            logger.error(f"VK send message failed: {e}")
            return False
    
    async def upload_photo(self, peer_id: int, photo_path: str):
        try:
            upload = vk_api.VkUpload(self.vk_session)
            photo = upload.photo_messages(
                photo=photo_path,
                peer_id=peer_id
            )[0]
            return f"photo{photo['owner_id']}_{photo['id']}"
        except Exception as e:
            logger.error(f"VK photo upload failed: {e}")
            return None
```

## Database Schema Extensions

```sql
-- Add media fields to marketing_campaigns
ALTER TABLE marketing_campaigns ADD COLUMN content_type TEXT DEFAULT 'text';
ALTER TABLE marketing_campaigns ADD COLUMN media_urls TEXT;  -- JSON array
ALTER TABLE marketing_campaigns ADD COLUMN caption TEXT;

-- Add media fields to marketing_triggers
ALTER TABLE marketing_triggers ADD COLUMN media_type TEXT DEFAULT 'text';
ALTER TABLE marketing_triggers ADD COLUMN media_url TEXT;
ALTER TABLE marketing_triggers ADD COLUMN caption TEXT;

-- Extend marketing_events with event data
ALTER TABLE marketing_events ADD COLUMN event_data TEXT;  -- JSON

-- Add delivery tracking to trigger events
ALTER TABLE marketing_trigger_events ADD COLUMN delivered_at TEXT;
ALTER TABLE marketing_trigger_events ADD COLUMN opened_at TEXT;
ALTER TABLE marketing_trigger_events ADD COLUMN clicked_at TEXT;
```

## Verification Steps

### Media Messages

- [ ] Send photo message via Telegram
- [ ] Send video message via Telegram
- [ ] Send document via Telegram
- [ ] Send media group (album) via Telegram
- [ ] Verify media files are properly stored
- [ ] Test with various file sizes and formats

### Rate Limiting

- [ ] Test sending 100+ messages quickly
- [ ] Verify per-chat rate limits (1 msg/sec)
- [ ] Test retry logic on 429 errors
- [ ] Monitor Redis rate limit keys

### Delivery Tracking

- [ ] Verify sent events are recorded
- [ ] Verify delivered events (when supported by channel)
- [ ] Test click tracking with shortened URLs
- [ ] View campaign analytics in Admin UI

### VK Integration

- [ ] Send text message via VK
- [ ] Send photo message via VK
- [ ] Test VK media upload
- [ ] Verify VK message delivery

## Success Criteria

1. All media types supported (text, photo, video, document, media group)
2. Rate limiting prevents API bans
3. Delivery tracking provides accurate metrics
4. VK integration works alongside Telegram
5. Admin UI supports media message creation
6. All existing functionality remains intact

## Future Enhancements

1. Push notification support for mobile app
2. SMS integration
3. Advanced analytics dashboard
4. A/B testing for campaigns
5. Dynamic content personalization
6. Multi-language support
