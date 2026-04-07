#!/usr/bin/env python3
"""ERP Integration APScheduler Setup - Mock for testing"""

import os


def start_erp_sync_scheduler():
    """Start the ERP sync scheduler with interval triggers - mock version"""
    if os.getenv("ERP_SYNC_ENABLED", "false").lower() != "true":
        print("ERP sync scheduler disabled")
        return None

    # Mock scheduler
    class MockScheduler:
        def shutdown(self, wait=True):
            pass

    print("ERP sync scheduler started (mock version)")
    return MockScheduler()
