#!/usr/bin/env python3
"""ERP Sync Database Models - Minimal implementation for testing without SQLAlchemy"""

from datetime import datetime


class SyncHistory:
    """Model for tracking sync operations history"""

    def __init__(self, **kwargs):
        self.id = kwargs.get("id")
        self.sync_type = kwargs.get("sync_type")
        self.total_records = kwargs.get("total_records", 0)
        self.successful_records = kwargs.get("successful_records", 0)
        self.failed_records = kwargs.get("failed_records", 0)
        self.sync_start = kwargs.get("sync_start", datetime.utcnow())
        self.sync_end = kwargs.get("sync_end")
        self.duration = kwargs.get("duration")

    def __repr__(self):
        return f"<SyncHistory(id={self.id}, type={self.sync_type}, total={self.total_records}, success={self.successful_records}, failed={self.failed_records})>"


class FailedEvent:
    """Model for storing failed sync events for manual review"""

    def __init__(self, **kwargs):
        self.id = kwargs.get("id")
        self.event_type = kwargs.get("event_type")
        self.event_data = kwargs.get("event_data")
        self.error_message = kwargs.get("error_message")
        self.retry_count = kwargs.get("retry_count", 0)
        self.max_retries = kwargs.get("max_retries", 3)
        self.last_attempt = kwargs.get("last_attempt", datetime.utcnow())
        self.next_retry_at = kwargs.get("next_retry_at")
        self.created_at = kwargs.get("created_at", datetime.utcnow())
        self.updated_at = kwargs.get("updated_at", datetime.utcnow())

    def __repr__(self):
        return f"<FailedEvent(id={self.id}, type={self.event_type}, retries={self.retry_count}/{self.max_retries})>"


class SyncMetric:
    """Model for storing sync metrics (for Prometheus-like aggregation)"""

    def __init__(self, **kwargs):
        self.id = kwargs.get("id")
        self.metric_name = kwargs.get("metric_name")
        self.metric_value = kwargs.get("metric_value", 0.0)
        self.metric_labels = kwargs.get("metric_labels")
        self.recorded_at = kwargs.get("recorded_at", datetime.utcnow())

    def __repr__(self):
        return f"<SyncMetric(id={self.id}, name={self.metric_name}, value={self.metric_value}, recorded_at={self.recorded_at})>"
