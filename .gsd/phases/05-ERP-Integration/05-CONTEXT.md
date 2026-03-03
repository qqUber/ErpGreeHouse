# Phase 5: ERP Integration - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase focuses on integrating the ErpGreeHouse CRM with ERPNext for data synchronization. The scope includes:
- Customer data synchronization
- Purchase data import for loyalty point calculation
- Loyalty program data export for reporting
- Integration architecture and error handling

This phase does NOT include:
- Full ERPNext customization
- Advanced analytics or reporting beyond basic data synchronization
- Integration with other ERP systems

</domain>

<decisions>
## Implementation Decisions

### 1. Customer Data Synchronization

**Direction:** Bidirectional synchronization between ErpGreeHouse and ERPNext

**Fields to Sync:**
- Customer name (required)
- Email (required for communication)
- Phone number (required for loyalty program)
- Loyalty points balance (calculated by ErpGreeHouse)
- Loyalty tier (calculated by ErpGreeHouse)
- Consent status (required for compliance)
- Date of birth (for birthday promotions)
- Last visit date (for inactivity triggers)

**Sync Frequency:** Real-time for critical updates (loyalty points, consent), hourly for non-critical updates

**Conflict Resolution:** ErpGreeHouse takes precedence for loyalty-related fields; ERPNext takes precedence for core customer data (name, contact info)

### 2. Purchase Data Import

**Data Mapping:**
- ERPNext `Sales Invoice` → ErpGreeHouse `Purchase`
- `Customer` field → ErpGreeHouse `user_id`
- `Grand Total` → ErpGreeHouse `amount` (used for point calculation)
- `Posting Date` → ErpGreeHouse `timestamp`
- `Invoice Number` → ErpGreeHouse `external_id`

**Import Frequency:** Every 15 minutes (near real-time to ensure timely point accrual)

**Error Handling:**
- Skip invalid invoices (missing customer or amount)
- Retry failed imports up to 3 times with exponential backoff
- Alert admin via system notification for persistent failures
- Log all errors with detailed information for debugging

### 3. Loyalty Program Data Export

**Data to Export:**
- Loyalty points earned per purchase
- Loyalty points redeemed per purchase
- Loyalty tier changes
- Redemption history (points used, purchase amount)
- Point expiration dates

**Export Frequency:** Daily batch export (at midnight) for reporting purposes

**Format:** JSON or CSV, delivered via ERPNext API or file storage

### 4. Integration Architecture

**Pattern:** Event-driven architecture with polling fallback

**Event Types:**
- Customer created/updated/deleted
- Purchase created
- Loyalty points earned/redeemed
- Loyalty tier changed

**Polling Fallback:**
- Hourly polling for missed events
- Daily reconciliation to ensure data consistency

**Retry Logic:**
- 3 retries with exponential backoff (1min, 5min, 15min)
- Failed events stored in dead-letter queue for manual review

**Rate Limits:**
- Respect ERPNext API rate limits (default: 100 requests/minute)
- Implement circuit breaker pattern to prevent overwhelming the API

### 5. Error Handling and Monitoring

**Health Monitoring:**
- Sync success/failure rates per data type
- Response times for ERPNext API calls
- Dead-letter queue size

**Metrics Collection:**
- Prometheus metrics for system monitoring
- Grafana dashboards for visualization

**Alerts:**
- Slack/email alerts for:
  - Sync failure rate > 5%
  - Dead-letter queue size > 100
  - ERPNext API unresponsive for > 5 minutes
- Severity levels: WARNING (5-10% failures), ERROR (10-20% failures), CRITICAL (>20% failures)

**Failure Handling:**
- Automatic retry for transient errors
- Manual retry from admin dashboard for persistent errors
- Data reconciliation tool to fix inconsistencies
- Detailed error logging with stack traces and context

### KiloCode's Discretion

- Specific API endpoint design for ERP integration
- Database transaction management for sync operations
- Implementation details of the circuit breaker pattern
- Exact format of error logs and metrics

</decisions>

<specifics>
## Specific Ideas

- Use ERPNext's REST API for all data synchronization
- Implement webhooks from ERPNext for real-time event notification
- Store sync history in a dedicated table for auditing
- Provide admin interface to manually trigger sync operations

</specifics>

<deferred>
## Deferred Ideas

- Advanced ERPNext customization (would require ERPNext development skills)
- Integration with other ERP systems (future phase possibility)
- Real-time analytics dashboard for sync performance (Phase 6: Admin Dashboard)

</deferred>

---

_Phase: 05-ERP Integration_
_Context gathered: 2026-03-03_