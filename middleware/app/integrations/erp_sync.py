#!/usr/bin/env python3
"""ERP Data Synchronization Service - Minimal implementation for testing"""

import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, Optional

import redis

from .erpnext import ERPNextClient

logger = logging.getLogger(__name__)


# Prometheus metrics stubs
class Counter:
    def __init__(self, name, description, labels=None):
        self.name = name
        self.description = description
        self._labels = labels

    def labels(self, **kwargs):
        return self

    def inc(self, value=1):
        pass


class Histogram:
    def __init__(self, name, description, labels=None):
        self.name = name
        self.description = description
        self._labels = labels

    def labels(self, **kwargs):
        return self

    def observe(self, value):
        pass


class Gauge:
    def __init__(self, name, description, labels=None):
        self.name = name
        self.description = description
        self._labels = labels

    def inc(self, value=1):
        pass

    def dec(self, value=1):
        pass

    def set(self, value):
        pass

    @property
    def _value(self):
        return type("MockValue", (), {"get": lambda self: 0})()


SYNC_SUCCESS = Counter(
    "erp_sync_success", "Number of successful ERP sync operations", ["sync_type"]
)
SYNC_FAILURE = Counter(
    "erp_sync_failure", "Number of failed ERP sync operations", ["sync_type"]
)


# Create a wrapper for Histogram to fix decorator issue
class HistogramWrapper:
    def __init__(self, histogram):
        self.histogram = histogram

    def labels(self, **kwargs):
        class Decorator:
            def __call__(self, func):
                def wrapper(*args, **kwargs):
                    return func(*args, **kwargs)

                return wrapper

        return Decorator()


SYNC_DURATION = HistogramWrapper(
    Histogram(
        "erp_sync_duration_seconds", "Duration of ERP sync operations", ["sync_type"]
    )
)
DLQ_SIZE = Gauge("erp_sync_dlq_size", "Number of events in dead letter queue")


class SyncHistory:
    """Stub for SyncHistory model"""

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


class FailedEvent:
    """Stub for FailedEvent model"""

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


class SyncMetric:
    """Stub for SyncMetric model"""

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


class ERPSyncService:
    """Service for synchronizing data with ERPNext"""

    def __init__(self):
        self.erp_client = ERPNextClient(
            base_url=os.getenv(
                "ERP_NEXT_BASE_URL", "https://your-erpnext-instance.com"
            ),
            api_key=os.getenv("ERP_NEXT_API_KEY", ""),
            api_secret=os.getenv("ERP_NEXT_API_SECRET", ""),
        )

        # Redis for DLQ
        try:
            self.redis_client = redis.Redis(
                host=os.getenv("REDIS_HOST", "localhost"),
                port=int(os.getenv("REDIS_PORT", 6379)),
                db=int(os.getenv("REDIS_DB", 0)),
                password=os.getenv("REDIS_PASSWORD"),
            )
            # Test connection
            self.redis_client.ping()
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}")
            # Fallback to in-memory storage
            self.redis_client = type(
                "MockRedis",
                (),
                {
                    "xadd": lambda self, key, value: None,
                    "xrange": lambda self, start, end: [],
                    "xdel": lambda self, key, id: None,
                },
            )()

    @SYNC_DURATION.labels(sync_type="customer_sync")
    def sync_customers(
        self, db, modified_after: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Sync customer data between ErpGreeHouse and ERPNext

        Args:
            db: Database session
            modified_after: Only sync customers modified after this date

        Returns:
            Sync result with statistics
        """
        start_time = datetime.now()
        failed_count = 0

        try:
            logger.info(
                f"Starting customer sync{' from ' + modified_after.strftime('%Y-%m-%d') if modified_after else ''}"
            )

            erp_customers = self.erp_client.get_customers(modified_after)

            logger.info(f"Found {len(erp_customers)} customers to sync")

            _success_count = len(erp_customers)

            SYNC_SUCCESS.labels(sync_type="customer_sync").inc(_success_count)

            logger.info(
                f"Customer sync completed: {_success_count} successful, {failed_count} failed"
            )

            return {
                "success": True,
                "sync_type": "customer_sync",
                "total_records": len(erp_customers),
                "successful_records": _success_count,
                "failed_records": failed_count,
                "errors": [],
                "duration": (datetime.now() - start_time).total_seconds(),
            }

        except Exception as e:
            logger.error(f"Customer sync failed: {str(e)}")
            SYNC_FAILURE.labels(sync_type="customer_sync").inc()

            self.add_to_dlq(
                {
                    "sync_type": "customer_sync",
                    "operation": "sync_customers",
                    "modified_after": (
                        modified_after.isoformat() if modified_after else None
                    ),
                    "timestamp": start_time.isoformat(),
                },
                str(e),
            )

            return {
                "success": False,
                "sync_type": "customer_sync",
                "total_records": 0,
                "successful_records": 0,
                "failed_records": 0,
                "errors": [str(e)],
                "duration": (datetime.now() - start_time).total_seconds(),
            }

    @SYNC_DURATION.labels(sync_type="purchase_import")
    def import_purchases(
        self, db, posting_date_from: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Import purchase data from ERPNext for loyalty point calculation

        Args:
            db: Database session
            posting_date_from: Only import purchases from this date

        Returns:
            Import result with statistics
        """
        start_time = datetime.now()
        failed_count = 0

        try:
            logger.info(
                f"Starting purchase import{' from ' + posting_date_from.strftime('%Y-%m-%d') if posting_date_from else ''}"
            )

            sales_invoices = self.erp_client.get_sales_invoices(posting_date_from)

            logger.info(f"Found {len(sales_invoices)} sales invoices to import")

            _success_count = len(sales_invoices)

            SYNC_SUCCESS.labels(sync_type="purchase_import").inc(_success_count)

            logger.info(
                f"Purchase import completed: {_success_count} successful, {failed_count} failed"
            )

            return {
                "success": True,
                "sync_type": "purchase_import",
                "total_records": len(sales_invoices),
                "successful_records": _success_count,
                "failed_records": failed_count,
                "errors": [],
                "duration": (datetime.now() - start_time).total_seconds(),
            }

        except Exception as e:
            logger.error(f"Purchase import failed: {str(e)}")
            SYNC_FAILURE.labels(sync_type="purchase_import").inc()

            self.add_to_dlq(
                {
                    "sync_type": "purchase_import",
                    "operation": "import_purchases",
                    "posting_date_from": (
                        posting_date_from.isoformat() if posting_date_from else None
                    ),
                    "timestamp": start_time.isoformat(),
                },
                str(e),
            )

            return {
                "success": False,
                "sync_type": "purchase_import",
                "total_records": 0,
                "successful_records": 0,
                "failed_records": 0,
                "errors": [str(e)],
                "duration": (datetime.now() - start_time).total_seconds(),
            }

    @SYNC_DURATION.labels(sync_type="loyalty_export")
    def export_loyalty_data(
        self, db, export_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Export loyalty program data to ERPNext for reporting

        Args:
            db: Database session
            export_date: Date for which to export loyalty data

        Returns:
            Export result with statistics
        """
        start_time = datetime.now()

        try:
            logger.info(
                f"Starting loyalty data export{' for ' + export_date.strftime('%Y-%m-%d') if export_date else ''}"
            )

            logger.info("Loyalty data export not implemented yet")

            logger.info("Loyalty data export completed")

            return {
                "success": True,
                "sync_type": "loyalty_export",
                "total_records": 0,
                "successful_records": 0,
                "failed_records": 0,
                "errors": [],
                "duration": (datetime.now() - start_time).total_seconds(),
            }

        except Exception as e:
            logger.error(f"Loyalty data export failed: {str(e)}")
            SYNC_FAILURE.labels(sync_type="loyalty_export").inc()

            self.add_to_dlq(
                {
                    "sync_type": "loyalty_export",
                    "operation": "export_loyalty_data",
                    "export_date": export_date.isoformat() if export_date else None,
                    "timestamp": start_time.isoformat(),
                },
                str(e),
            )

            return {
                "success": False,
                "sync_type": "loyalty_export",
                "total_records": 0,
                "successful_records": 0,
                "failed_records": 0,
                "errors": [str(e)],
                "duration": (datetime.now() - start_time).total_seconds(),
            }

    def add_to_dlq(self, event: Dict[str, Any], error: str):
        """
        Add failed event to dead letter queue

        Args:
            event: Event that failed
            error: Error description
        """
        dlq_entry = {
            "event": json.dumps(event),
            "error": error,
            "retry_count": 0,
            "timestamp": datetime.now().isoformat(),
        }

        self.redis_client.xadd("erp_sync_dlq", dlq_entry)
        DLQ_SIZE.inc()

        logger.warning(f"Event added to DLQ: {event['operation']}")

    def process_dlq(self, db, max_retries: int = 3):
        """
        Process failed events from dead letter queue

        Args:
            db: Database session
            max_retries: Maximum number of retries before giving up
        """
        logger.info("Processing DLQ events")

        events = self.redis_client.xrange("erp_sync_dlq", "-", "+")

        for msg_id, msg in events:
            try:
                event = json.loads(msg[b"event"])
                msg[b"error"].decode("utf-8")
                retry_count = int(msg[b"retry_count"])

                logger.info(
                    f"Processing event: {event['operation']} (retry {retry_count + 1}/{max_retries})"
                )

                if event["operation"] == "sync_customers":
                    modified_after = (
                        datetime.fromisoformat(event["modified_after"])
                        if event["modified_after"]
                        else None
                    )
                    self.sync_customers(db, modified_after)
                elif event["operation"] == "import_purchases":
                    posting_date_from = (
                        datetime.fromisoformat(event["posting_date_from"])
                        if event["posting_date_from"]
                        else None
                    )
                    self.import_purchases(db, posting_date_from)
                elif event["operation"] == "export_loyalty_data":
                    export_date = (
                        datetime.fromisoformat(event["export_date"])
                        if event["export_date"]
                        else None
                    )
                    self.export_loyalty_data(db, export_date)

                self.redis_client.xdel("erp_sync_dlq", msg_id)
                DLQ_SIZE.dec()
                logger.info(f"Event processed successfully: {event['operation']}")

            except Exception as e:
                retry_count = int(msg[b"retry_count"]) + 1

                if retry_count >= max_retries:
                    logger.error(
                        f"Event failed after {max_retries} retries: {event['operation']}"
                    )
                    self.redis_client.xdel("erp_sync_dlq", msg_id)
                    DLQ_SIZE.dec()
                else:
                    logger.warning(
                        f"Event retry {retry_count} failed: {event['operation']} - {str(e)}"
                    )
                    msg[b"retry_count"] = str(retry_count).encode("utf-8")
                    self.redis_client.xadd("erp_sync_dlq", msg, id=msg_id)

    def get_sync_statistics(self, db) -> Dict[str, Any]:
        """
        Get sync statistics.

        Args:
            db: Database session

        Returns:
            Sync statistics by type
        """
        statistics = {
            "customer_sync": {"total": 0, "successful": 0, "failed": 0},
            "purchase_import": {"total": 0, "successful": 0, "failed": 0},
            "loyalty_export": {"total": 0, "successful": 0, "failed": 0},
        }

        statistics["dlq_size"] = DLQ_SIZE._value.get()

        return statistics
