## Skill: Dual-Channel Identity Specialist (TG & VK Only)
   Since our scope is locked to Telegram and VK, KiloCode must treat the phone number as the absolute bridge between them.
   Logic: Always prioritize normalize_phone to link a tg_id and a vk_id to a single customer_id.
   Action: If a user registers in VK with a phone that already has a TG profile, KiloCode must merge them silently and update the preferred_channel without asking for permission.

## Skill: 152-FZ "Clean Slate" Compliance
   KiloCode must act as a legal guardian for Russian data laws.
   Logic: Any "Refuse" or "Delete" callback from a bot must trigger a total purge (PostgreSQL + Redis + Logs).
   Action: Automatically implement the _cleanup_user_data call whenever a user revokes consent. No ghost records allowed.
   
## Skill: Green House Logic Auditor
   KiloCode must internalize the "Coffee Shop" business rules we reversed.
   The Math: 100 bonus points on registration, 7-day expiration (TTL), 3% starting tier, and a 6-digit numeric QR code (e.g., 517105).
   Action: Apply these constants to the app/loyalty.py and app/handlers.py logic automatically.

## Skill: Redis 8 & Python 3.14 Efficiency
   KiloCode must stop using legacy patterns and use the bleeding-edge stack we've established.
   Python 3.14: Use TaskGroups for handling bot webhooks concurrently.
   Redis 8: Use RESP3 for lower latency and Sorted Sets for real-time loyalty leaderboards and sliding-window rate limiting.

## Skill: Dashboard Visual Integrity
   To fix the "squeezed window" and overflowing text issues.
   Logic: Every UI change must be verified for responsiveness.
   Action: Apply flex-wrap, min-width, and overflow: hidden to all analytics cards in the admin-ui.
