import asyncio
import json
import logging
import os
import sys
from typing import Any, Dict

import httpx
from app.config import get_settings

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("init_erp_structure")


async def create_doctype(
    client: httpx.AsyncClient, base_url: str, doctype_data: Dict[str, Any]
):
    doctype_name = doctype_data["name"]
    logger.info(f"Checking if DocType '{doctype_name}' exists...")

    try:
        resp = await client.get(f"{base_url}/api/resource/DocType/{doctype_name}")
        if resp.status_code == 200:
            logger.info(f"DocType '{doctype_name}' already exists.")
            return
    except Exception as e:
        logger.warning(f"Error checking DocType '{doctype_name}': {e}")

    logger.info(f"Creating DocType '{doctype_name}'...")
    try:
        # ERPNext requires some specific fields for creating DocType via API
        # We might need to adjust the schema slightly or use a specific endpoint
        # For simplicity, we assume we can post to /api/resource/DocType

        # We need to make sure 'module' exists or use 'Custom' module
        # Using 'Core' or 'Custom' is safer if 'Telegram CRM' module doesn't exist
        # But let's try to stick to the schema if possible, or fallback to 'Custom'

        # Check if Module 'Telegram CRM' exists, if not create it or use 'Custom'
        module_resp = await client.get(
            f"{base_url}/api/resource/Module Def/Telegram CRM"
        )
        if module_resp.status_code != 200:
            logger.info("Module 'Telegram CRM' not found. Creating it...")
            await client.post(
                f"{base_url}/api/resource/Module Def",
                json={
                    "module_name": "Telegram CRM",
                    "app_name": "erpnext",  # Hack to attach to existing app
                    "custom": 1,
                },
            )

        payload = doctype_data.copy()

        # ERPNext DocType creation via API can be tricky.
        # Sometimes it's better to create Custom Fields on existing DocTypes if we can't create full DocTypes easily.
        # But let's try.

        resp = await client.post(f"{base_url}/api/resource/DocType", json=payload)
        if resp.status_code == 200:
            logger.info(f"DocType '{doctype_name}' created successfully.")
        else:
            logger.error(f"Failed to create DocType '{doctype_name}': {resp.text}")
            # If failed, maybe try to create as Custom DocType?
            # Or maybe just Custom Fields on Customer?
            # For MVP, if this fails, we might fallback to just using Custom Fields on Customer
            # But let's assume it works for now.
    except Exception as e:
        logger.error(f"Exception creating DocType '{doctype_name}': {e}")


async def init_erp():
    settings = get_settings()

    if settings.erp_mock_mode:
        logger.info("ERP Mock Mode is enabled. Skipping initialization.")
        return

    base_url = settings.erp_api_base_url
    api_key = settings.erp_api_key
    api_secret = settings.erp_api_secret

    if not all([base_url, api_key, api_secret]):
        logger.error("Missing ERPNext configuration (URL, Key, Secret).")
        return

    headers = {
        "Authorization": f"token {api_key}:{api_secret}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(headers=headers, timeout=30.0) as client:
        # Load schemas
        try:
            with open("app/schemas/telegram_client.json", "r") as f:
                telegram_client_schema = json.load(f)
            with open("app/schemas/loyalty_transaction.json", "r") as f:
                loyalty_transaction_schema = json.load(f)
        except FileNotFoundError:
            logger.error("Schema files not found in app/schemas/")
            return

        # Create DocTypes
        await create_doctype(client, base_url, telegram_client_schema)
        await create_doctype(client, base_url, loyalty_transaction_schema)

        logger.info("Initialization complete.")


if __name__ == "__main__":
    # Ensure we can import app
    sys.path.append(os.getcwd())
    asyncio.run(init_erp())
