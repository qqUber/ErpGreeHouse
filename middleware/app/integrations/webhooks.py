#!/usr/bin/env python3
"""ERPNext Webhook Handler"""

import logging
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Request, HTTPException
from ..integrations.erp_sync import ERPSyncService
from ..db import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/erpnext")
async def erpnext_webhook(request: Request):
    """
    Handle ERPNext webhook events

    ERPNext webhook format:
    {
        "doctype": "Customer" | "Sales Invoice" | "..."
        "event": "create" | "update" | "delete"
        "data": { ... }
    }
    """
    try:
        # Verify webhook signature
        # TODO: Implement signature verification using ERPNext's webhook secret

        # Parse request body
        payload = await request.json()

        logger.info(
            f"Received ERPNext webhook: {payload.get('doctype')} - {payload.get('event')}"
        )

        # Get database session
        db: Session = next(get_db())

        # Initialize sync service
        sync_service = ERPSyncService()

        # Handle different event types
        doctype = payload.get("doctype")
        event = payload.get("event")
        data = payload.get("data")

        if doctype == "Customer":
            if event in ["create", "update"]:
                logger.info(f"Customer {event} event: {data.get('name')}")
                # Trigger customer sync
                result = sync_service.sync_customers(
                    db, modified_after=datetime.now() - datetime.timedelta(minutes=15)
                )
                logger.info(f"Customer sync result: {result}")
            elif event == "delete":
                logger.info(f"Customer delete event: {data.get('name')}")
                # TODO: Handle customer deletion
        elif doctype == "Sales Invoice":
            if event in ["create", "update"]:
                logger.info(f"Sales Invoice {event} event: {data.get('name')}")
                # Trigger purchase import
                result = sync_service.import_purchases(
                    db,
                    posting_date_from=datetime.now() - datetime.timedelta(minutes=15),
                )
                logger.info(f"Purchase import result: {result}")
        else:
            logger.warning(f"Unhandled doctype: {doctype}")

        return {"status": "ok"}

    except Exception as e:
        logger.error(f"Error handling ERPNext webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
