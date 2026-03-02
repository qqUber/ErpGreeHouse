# Phase 4: Compliance & Data Protection - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase focuses on ensuring compliance with Russian data protection law (152-FZ) for the ErpGreeHouse system. Key requirements include explicit consent collection, proper consent record-keeping, easy profile deletion, and data storage within Russian borders.

</domain>

<decisions>
## Implementation Decisions

### Consent Collection Mechanisms

- **Consent Types**: Separate consents for data processing and marketing communications (already implemented in `consent.py`)
- **Consent Versioning**: Current policy version is "1.0.0" (configurable in `CURRENT_POLICY_VERSION`)
- **Consent Storage**: Consent records are stored in the `consents` table with customer_id, source, version, text, type, and timestamp

### Consent Record Storage

- **Required Fields**: Customer ID, source (tg/vk), consent version, consent text, consent type (data_processing/marketing), accepted_at timestamp
- **Storage Location**: SQLite database (dev), PostgreSQL (prod) within consents table
- **Audit Trail**: Each consent action (grant/revoke) creates a new record for compliance purposes

### Profile Deletion Process

- **Current Implementation**: `/delete` command with confirmation button in Telegram
- **Data Removal**: Deletes customer from `customers` table and all associated consents
- **ERP Integration**: Also calls ERPNext API to delete customer data
- **Redis Cleanup**: Removes user data from Redis cache (cart, consent state, etc.)

### Data Storage Compliance

- **Production Database**: PostgreSQL 15 must be hosted within Russian Federation borders
- **Development Database**: SQLite (local file storage)
- **Cache**: Redis 7 must be hosted within Russian Federation borders

### User Interface for Compliance Features

- **Telegram Bot**:
  - `/register` command with consent checkbox
  - `/delete` command with confirmation
  - Consent buttons (Принимаю/Отказ) for registration
- **VK Integration**: Similar consent flow (needs implementation)
- **Admin UI**: Need to add consent management and profile deletion features

### KiloCode's Discretion

- **Consent Text Format**: Standardized consent text with policy version
- **Deletion Confirmation**: Two-step process (command + button)
- **Data Retention**: No explicit retention period specified - deleted data is removed immediately
- **Backup Policy**: Production backups must also be stored within Russian borders

</decisions>

<specifics>
## Specific Ideas

- The system already has a consent management module (`consent.py`) with functions for storing, retrieving, and updating consents
- Consent records include versioning to track policy changes
- Profile deletion is implemented but needs testing and verification
- VK integration for consent and deletion needs to be developed
- Admin UI needs compliance features for managing consents and handling deletion requests

</specifics>

<deferred>
## Deferred Ideas

- **Data Portability**: Ability for users to export their data (not required for 152-FZ compliance but good practice)
- **Anonymization**: Data anonymization for analytics purposes
- **Consent Reminders**: Periodic reminders to users about their consent status

</deferred>

---

_Phase: 04-Compliance-&-Data-Protection_
_Context gathered: 2026-03-02_