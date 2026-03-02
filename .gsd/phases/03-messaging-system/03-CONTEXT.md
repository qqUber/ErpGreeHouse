# Phase 3: Messaging System - Gray Areas Analysis

## Domain Boundary
This phase implements omnichannel messaging functionality for coffee shop CRM, including targeted promotions, trigger-based messages, media support, rate limiting, and delivery tracking.

---

## Gray Areas & Clarifying Questions

### 1. Customer Segmentation for Targeted Messages

**Goal:** Define how customers are segmented for targeted messaging campaigns

**Questions:**

- What primary segmentation criteria should be available?
  - Visit frequency (regular/occasional/new customer)
  - Purchase history (total spent, last purchase date, favorite products)
  - Loyalty points (balance, tier level, points redemption history)
  - Birthday month/day
  - Channel preference (Telegram/VK/mobile app)
  - Consent status for messaging
  - Demographics (age, gender, location)

- Should segments be:
  - Predefined templates (e.g., "New Customers", "Inactive Users")
  - Customizable with multiple criteria (e.g., "Customers who spent > $50 in last 30 days AND have > 100 points")
  - Both (predefined + custom)

- How should segment definitions be stored and updated?
- Should segments be dynamic (auto-update as customer data changes) or static (fixed at campaign creation)?

---

### 2. Trigger-Based Message Configuration

**Goal:** Define how automated messages are triggered by user behavior/events

**Questions:**

- What predefined trigger types should be available?
  - Welcome message (first visit/registration)
  - Birthday message (on or before birthday)
  - Inactivity reminder (X days since last visit/purchase)
  - Purchase follow-up (after specific purchase)
  - Points expiration reminder (before loyalty points expire)

- Should users be able to create custom triggers?
- What configuration parameters should be available per trigger:
  - Timing (delay after trigger event, specific time of day)
  - Frequency (how often message can be sent)
  - Channel selection (which channels to send via)
  - Content variation (A/B testing options)

- How to handle time zones for trigger timing?
- What if a customer opts out of specific trigger types?

---

### 3. Message Content Management

**Goal:** Define supported message formats and content management approach

**Questions:**

- What text formats should be supported?
  - Plain text
  - Rich text (bold, italic, links)
  - Markdown
  - HTML (limited subset)

- What media types should be supported?
  - Images (JPEG, PNG, GIF)
  - Videos (MP4)
  - Documents (PDF, Word)
  - Audio clips (MP3)

- Should there be message templates?
  - Pre-built templates for common scenarios
  - Custom template creation
  - Template variables (e.g., {{first_name}}, {{points_balance}})

- How should media content be stored?
  - Local storage with CDN
  - Cloud storage (AWS S3, Yandex Disk)
  - Direct links to external sources

- Should there be localization support for multi-language messages?

---

### 4. Rate Limiting Implementation

**Goal:** Prevent channel bans by limiting message send rates

**Questions:**

- What rate limits should be configured per channel?
  - Telegram (messages per second/minute/hour)
  - VK (messages per second/minute/hour)
  - Mobile app (push notifications per day)

- Should limits be:
  - Global per channel
  - Per customer per channel
  - Both (global + per customer)

- What time windows should be supported?
  - Per second
  - Per minute
  - Per hour
  - Per day

- What happens when rate limits are hit?
  - Queue messages for later delivery
  - Discard messages with error
  - Notify admin

- How to handle retries for failed delivery attempts?

---

### 5. Delivery and Open Rate Tracking

**Goal:** Track message performance metrics

**Questions:**

- What metrics should be tracked?
  - Delivery rate (sent vs delivered)
  - Open rate (delivered vs opened)
  - Click-through rate (opened vs clicked links)
  - Bounce rate (failed delivery)
  - Unsubscribe rate

- How to track opens?
  - Pixel tracking (invisible image)
  - Read receipts from channels
  - Both (fallback mechanism)

- How to track click-through rates?
  - Shortened URLs with tracking parameters
  - Direct link tracking via channel APIs

- What about data privacy regulations (152-FZ/GDPR) for tracking?
  - Should tracking be optional?
  - How to store tracking data
  - Data retention period

- Should there be real-time tracking or batch processing of metrics?

---

## Key Decisions Needed

These questions will help clarify:
- How segments are defined and managed
- How triggers are configured and executed
- What message formats and media types are supported
- How rate limiting is implemented across channels
- How message performance metrics are tracked and reported

All decisions will be captured in CONTEXT.md and guide phase planning.