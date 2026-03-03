# Phase 5: ERP Integration - Research

## Standard Stack

### 1. ERPNext API Client
- **Library:** `frappe-client` (official Python library for Frappe/ERPNext API)
- **Installation:** `pip install frappe-client`
- **Purpose:** Provides Pythonic interface to ERPNext REST API
- **Features:** Token-based authentication, support for all ERPNext document operations

### 2. Circuit Breaker Pattern
- **Library:** `circuitbreaker` (mature Python implementation of circuit breaker pattern)
- **Installation:** `pip install circuitbreaker`
- **Purpose:** Prevents overwhelming ERPNext API during failures
- **Features:** Configurable failure thresholds, recovery timeouts, async support

### 3. Background Task Scheduling
- **Library:** `APScheduler` (advanced Python scheduler)
- **Installation:** `pip install apscheduler`
- **Purpose:** Handles periodic sync tasks (hourly, 15-minute, daily)
- **Features:** Multiple trigger types (interval, cron), job persistence

### 4. Dead Letter Queue
- **Implementation:** Redis Streams (using `redis-py` library)
- **Library:** `redis`
- **Installation:** `pip install redis`
- **Purpose:** Stores failed sync events for manual review and retry
- **Features:** Stream-based storage, consumer groups, retry tracking

### 5. Metrics Collection
- **Library:** `prometheus-client` (Prometheus Python client)
- **Installation:** `pip install prometheus-client`
- **Purpose:** Collects sync metrics for monitoring
- **Features:** Histograms, counters, gauges, multi-process support

### 6. Webhook Handling
- **Framework:** FastAPI (built-in HTTP server for webhook endpoints)
- **Library:** `fastapi` + `uvicorn`
- **Installation:** `pip install fastapi uvicorn`
- **Purpose:** Receives real-time webhook events from ERPNext
- **Features:** Async support, request validation, automatic OpenAPI docs

## Architecture Patterns

### 1. Event-Driven with Polling Fallback
- **Pattern:** Webhooks for real-time events + polling for missed events
- **Implementation:**
  - ERPNext webhooks trigger sync on customer/purchase/loyalty changes
  - Hourly polling ensures no events are missed
  - Daily reconciliation for data consistency

### 2. Circuit Breaker for API Resilience
- **Pattern:** Wrap all ERPNext API calls with circuit breaker
- **Implementation:**
  - Configure failure threshold (5 consecutive failures)
  - Recovery timeout (30 seconds)
  - Half-open state for test requests

### 3. Dead Letter Queue for Failed Events
- **Pattern:** Failed sync events stored in Redis Stream
- **Implementation:**
  - Each failed event includes error details and retry count
  - Admin interface for manual retry/review
  - Metrics for DLQ size and age

### 4. Batch Processing for Large Datasets
- **Pattern:** Batch operations for export/import jobs
- **Implementation:**
  - Daily batch export of loyalty data
  - 15-minute batch import of purchase data
  - Bulk API calls with rate limiting

## Don't Hand-Roll

### 1. Authentication
- **Don't:** Implement custom token or password auth
- **Do:** Use frappe-client's built-in authentication methods

### 2. Circuit Breaker
- **Don't:** Build custom circuit breaker logic
- **Do:** Use circuitbreaker library with standard settings

### 3. Scheduling
- **Don't:** Implement cron jobs from scratch
- **Do:** Use APScheduler with interval/cron triggers

### 4. Rate Limiting
- **Don't:** Implement custom rate limiting
- **Do:** Use frappe-client's built-in rate limiting or circuitbreaker's settings

### 5. Retry Logic
- **Don't:** Implement custom retry with backoff
- **Do:** Use tenacity library for exponential backoff (or circuitbreaker's built-in)

## Common Pitfalls

### 1. Overlooking Rate Limits
- **ERPNext Default:** 100 requests per minute
- **Mitigation:** Implement circuit breaker, batch operations, and rate limiting

### 2. Ignoring Idempotency
- **Problem:** Duplicate sync events causing data inconsistencies
- **Solution:** Track sync history with unique event IDs, implement idempotent operations

### 3. Poor Error Handling
- **Problem:** Silent failures in background sync tasks
- **Solution:** DLQ for failed events, alerting, detailed logging

### 4. Data Mapping Inconsistencies
- **Problem:** Mismatched field types between systems
- **Solution:** Explicit data transformation layers, validation schemas (Pydantic)

### 5. Ignoring Audit Trails
- **Problem:** No record of sync operations for debugging
- **Solution:** Store sync history in dedicated table with timestamps and event details

## Code Examples

### 1. ERPNext API Client Initialization
```python
from frappeclient import FrappeClient

# Initialize client
client = FrappeClient(
    "https://your-erpnext-instance.com",
    api_key="your-api-key",
    api_secret="your-api-secret"
)

# Example: Get customer data
customers = client.get_list("Customer", fields=["name", "email", "phone"])
```

### 2. Circuit Breaker Decorator
```python
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=30)
def erpnext_api_call():
    # ERPNext API call here
    return client.get_list("Customer")
```

### 3. APScheduler Job
```python
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

scheduler = BackgroundScheduler()

# 15-minute purchase import
scheduler.add_job(
    purchase_import_task,
    trigger=IntervalTrigger(minutes=15),
    id="purchase_import"
)

# Daily loyalty export
scheduler.add_job(
    loyalty_export_task,
    trigger=IntervalTrigger(hours=24),
    id="loyalty_export"
)

scheduler.start()
```

### 4. Redis Dead Letter Queue
```python
import redis
import json

redis_client = redis.Redis(host="localhost", port=6379, db=0)

def add_to_dlq(event: dict, error: str):
    dlq_entry = {
        "event": json.dumps(event),
        "error": error,
        "retry_count": 0,
        "timestamp": str(datetime.now())
    }
    redis_client.xadd("erp_sync_dlq", dlq_entry)
```

### 5. FastAPI Webhook Endpoint
```python
from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/webhooks/erpnext")
async def erpnext_webhook(request: Request):
    payload = await request.json()
    
    # Process webhook event
    if payload.get("doctype") == "Sales Invoice":
        process_purchase_event(payload)
    elif payload.get("doctype") == "Customer":
        process_customer_event(payload)
    
    return {"status": "ok"}
```

## Verification Steps

### 1. ERPNext Connection
- Verify API key/secret authentication
- Test basic CRUD operations on Customer and Sales Invoice doctypes
- Check rate limiting behavior

### 2. Sync Logic
- Test customer data synchronization (create/update/delete)
- Test purchase data import from Sales Invoice
- Test loyalty program data export

### 3. Error Handling
- Test DLQ behavior for failed API calls
- Verify circuit breaker tripping and recovery
- Check retry logic with exponential backoff

### 4. Monitoring
- Verify Prometheus metrics collection
- Test alerting thresholds (sync failure rate > 5%)
- Check DLQ size alert

### 5. Scheduling
- Verify 15-minute purchase import job
- Verify daily loyalty export job
- Check hourly polling job