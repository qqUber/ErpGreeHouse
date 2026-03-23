import asyncio
import hashlib
import logging
import time
from typing import Any, Dict, List, Optional

import httpx

from ...config import get_settings
from ...storage import get_redis

logger = logging.getLogger(__name__)


class ERPClientError(Exception):
    """Custom exception for ERPClient errors that can be used in both HTTP and non-HTTP contexts."""


class ERPClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.mock = self.settings.erp_mock_mode
        self.r = get_redis()

        if not self.mock:
            self.headers = {
                "Authorization": f"token {self.settings.erp_api_key}:{self.settings.erp_api_secret}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
            self.base_url = self.settings.erp_api_base_url

    def _cid(self, telegram_id: int) -> str:
        return str(telegram_id)

    async def _request(
        self, method: str, endpoint: str, **kwargs
    ) -> Optional[Dict[str, Any]]:
        if self.mock:
            return None

        url = f"{self.base_url}{endpoint}"
        max_retries = 3
        retry_delay = 1.0

        for attempt in range(max_retries):
            async with httpx.AsyncClient(timeout=20.0) as client:
                try:
                    response = await client.request(
                        method, url, headers=self.headers, **kwargs
                    )
                    response.raise_for_status()
                    return response.json()  # type: ignore[no-any-return]
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 404:
                        return None
                    # Retry on 5xx errors or 429 (Too Many Requests)
                    if (
                        e.response.status_code >= 500 or e.response.status_code == 429
                    ) and attempt < max_retries - 1:
                        logger.warning(
                            f"ERPNext API Error {e.response.status_code}, retrying (attempt {attempt + 1})..."
                        )
                        await asyncio.sleep(retry_delay * (attempt + 1))
                        continue
                    logger.error(f"ERPNext API Error: {e.response.text}")
                    raise
                except (httpx.RequestError, asyncio.TimeoutError) as e:
                    if attempt < max_retries - 1:
                        logger.warning(
                            f"Request failed: {e}, retrying (attempt {attempt + 1})..."
                        )
                        await asyncio.sleep(retry_delay * (attempt + 1))
                        continue
                    logger.error(f"Request failed: {e}")
                    raise
                except Exception as e:
                    logger.error(f"Unexpected error: {e}")
                    raise
        return None

    async def get_customer_by_telegram_id(
        self, telegram_id: int
    ) -> Optional[dict[str, Any]]:
        if self.mock:
            key = f"crm:tg:{telegram_id}"
            cid = self.r.get(key)
            if not cid:
                return None
            customer_data = self.r.hgetall(f"crm:c:{cid}")
            return customer_data or None  # type: ignore[return-value]

        # Query Telegram Client DocType
        filters = f'[["telegram_id","=","{telegram_id}"]]'
        fields = '["name", "telegram_id", "first_name", "balance", "customer_link"]'
        endpoint = f"/api/resource/Telegram Client?filters={filters}&fields={fields}"

        data: Optional[Dict[str, Any]] = await self._request("GET", endpoint)
        if data and data.get("data"):
            return data["data"][0]  # type: ignore[no-any-return]
        return None

    async def create_customer(
        self, telegram_id: int, name: str, phone: str, consent_text: str
    ) -> dict[str, Any]:
        ts = int(time.time())
        consent_hash = hashlib.sha256(consent_text.encode()).hexdigest()[:8]

        # 152-FZ Logging
        self.r.lpush(
            f"crm:audit:consent:{telegram_id}",
            f"{ts}|{consent_hash}|{consent_text[:50]}...",
        )

        if self.mock:
            cid = self._cid(telegram_id)
            self.r.set(f"crm:tg:{telegram_id}", cid)
            self.r.hset(
                f"crm:c:{cid}",
                mapping={
                    "id": cid,
                    "telegram_id": str(telegram_id),
                    "name": name,
                    "phone": phone,
                    "consent_version": consent_hash,
                    "consent_date": str(ts),
                    "balance": "100",
                },
            )
            self.r.lpush(
                f"crm:tx:{cid}",
                f"{ts}|accrual|100|Приветственные бонусы",
            )
            return {"name": cid, "balance": 100}

        # 1. Create Standard Customer
        customer_payload = {
            "customer_name": f"{name} (TG:{telegram_id})",
            "customer_type": "Individual",
            "customer_group": "All Customer Groups",
            "territory": "All Territories",
            "mobile_no": phone,
        }

        # Check if customer with phone exists? Maybe later. For now create new or catch error.
        # Actually ERPNext might prevent duplicate names.

        erp_customer_name = ""
        try:
            # Try to find existing customer by phone to avoid duplicates
            filters = f'[["mobile_no","=","{phone}"]]'
            existing = await self._request(
                "GET", f"/api/resource/Customer?filters={filters}"
            )
            if existing and existing.get("data"):
                erp_customer_name = existing["data"][0]["name"]
            else:
                res = await self._request(
                    "POST", "/api/resource/Customer", json=customer_payload
                )
                if res and res.get("data"):
                    erp_customer_name = res["data"]["name"]
        except Exception as e:
            logger.error(f"Failed to create/find Customer: {e}")
            raise

        # 2. Create Telegram Client linked to Customer
        payload = {
            "telegram_id": telegram_id,
            "first_name": name,
            "phone": phone,
            "consent_given": 1,
            "consent_text_version": consent_hash,
            "consent_date": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(ts)),
            "balance": 100,  # Initial balance
            "customer_link": erp_customer_name,
        }

        res = await self._request("POST", "/api/resource/Telegram Client", json=payload)
        if res is None:
            raise ERPClientError("Failed to create customer in ERP")
        new_client = res["data"]

        # 3. Create initial transaction
        await self.create_loyalty_transaction(
            new_client["name"], "Accrual", 100, "Welcome Bonus"
        )

        return new_client  # type: ignore[no-any-return]

    async def create_loyalty_transaction(
        self, client_name: str, ttype: str, points: int, desc: str
    ):
        if self.mock:
            return

        payload = {
            "telegram_client": client_name,
            "transaction_type": ttype,
            "points": points,
            "description": desc,
            "transaction_date": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        try:
            await self._request(
                "POST", "/api/resource/Loyalty Transaction", json=payload
            )
        except Exception as e:
            logger.error(f"Failed to create loyalty transaction: {e}")

    async def get_balance(self, client_name: str) -> int:
        if self.mock:
            bal_value = self.r.hget(f"crm:c:{client_name}", "balance")
            bal = int(bal_value) if bal_value is not None else 0  # type: ignore[arg-type]
            return bal

        # In real mode, we should query Telegram Client's balance field if it's updated via hooks,
        # OR sum up transactions. For MVP, let's assume we update 'balance' field in Telegram Client manually or via script.
        # Or simpler: Just GET the Telegram Client again, as we might have updated it.
        # Wait, the schema has 'balance' field (read_only). It should be updated by ERPNext server script on transaction save.
        # If we don't have server script, we must sum transactions.

        # Let's try to sum transactions for MVP robustness
        filters = f'[["telegram_client","=","{client_name}"]]'
        fields = '["points", "transaction_type"]'
        endpoint = f"/api/resource/Loyalty Transaction?filters={filters}&fields={fields}&limit_page_length=1000"

        data = await self._request("GET", endpoint)
        if not data or not data.get("data"):
            return 0

        total = 0
        for tx in data["data"]:
            total += tx["points"]  # Points can be negative for Redemption

        return total

    async def get_transactions(
        self, client_name: str, limit: int = 5
    ) -> List[Dict[str, Any]]:
        if self.mock:
            items = self.r.lrange(f"crm:tx:{client_name}", 0, limit - 1) or []
            result = []
            for item in items:  # type: ignore[union-attr]
                ts, ttype, points, desc = item.split("|", 3)
                result.append(
                    {
                        "date": int(ts),
                        "type": ttype,
                        "points": int(points),
                        "description": desc,
                    }
                )
            return result

        filters = f'[["telegram_client","=","{client_name}"]]'
        fields = '["transaction_date", "transaction_type", "points", "description"]'
        endpoint = f"/api/resource/Loyalty Transaction?filters={filters}&fields={fields}&order_by=transaction_date desc&limit_page_length={limit}"

        data = await self._request("GET", endpoint)
        if not data or not data.get("data"):
            return []

        return data["data"]  # type: ignore[no-any-return]

    async def create_order(
        self, client_name: str, items: List[Dict[str, Any]], bonus_points: int
    ) -> Dict[str, Any]:
        if self.mock:
            bal = await self.get_balance(client_name)
            bonus_apply = min(bonus_points, bal)
            amount = sum(x["price"] * x["qty"] for x in items)
            total = max(0, amount - bonus_apply)
            new_bal = bal - bonus_apply
            self.r.hset(f"crm:c:{client_name}", mapping={"balance": str(new_bal)})
            ts = int(time.time())
            if bonus_apply > 0:
                self.r.lpush(
                    f"crm:tx:{client_name}",
                    f"{ts}|Redemption|{-bonus_apply}|Оплата бонусами",
                )
            order_id = hashlib.sha256(f"{client_name}{ts}".encode()).hexdigest()[:10]
            return {"order_id": order_id, "total": total, "bonus_used": bonus_apply}

        # 1. Get Customer Link
        client_data: Optional[Dict[str, Any]] = await self._request(
            "GET", f"/api/resource/Telegram Client/{client_name}"
        )
        if client_data is None or client_data.get("data") is None:
            raise ValueError("Customer not found in ERP")
        customer_link = client_data["data"]["customer_link"]

        # 2. Calculate totals
        amount = sum(x["price"] * x["qty"] for x in items)

        # 3. Create Sales Order
        # Note: We need actual Item Codes from ERPNext.
        # For MVP, assuming items in 'menu.py' have codes that exist in ERPNext or we use a dummy item.

        sales_order_items = []
        for item in items:
            sales_order_items.append(
                {"item_code": item["code"], "qty": item["qty"], "rate": item["price"]}
            )

        payload = {
            "customer": customer_link,
            "items": sales_order_items,
            "docstatus": 1,  # Submit directly? Or 0 (Draft)
            "delivery_date": time.strftime("%Y-%m-%d"),
            # Custom fields if added
            # "telegram_order": 1,
            # "bonus_points_used": bonus_points
        }

        res: Optional[Dict[str, Any]] = await self._request(
            "POST", "/api/resource/Sales Order", json=payload
        )
        if res is None or res.get("data") is None:
            raise ValueError("Failed to create sales order in ERP")
        order_id = res["data"]["name"]

        # 4. Handle Loyalty Points (Redemption)
        if bonus_points > 0:
            await self.create_loyalty_transaction(
                client_name,
                "Redemption",
                -bonus_points,
                f"Redemption for Order {order_id}",
            )

        # 5. Handle Loyalty Points (Accrual) - 10%
        # Calculate accrual amount (excluding bonus part? or total?)
        # Let's say 10% of amount paid
        paid_amount = max(0, amount - bonus_points)
        if paid_amount >= 100:  # Minimum 100
            accrual = int(paid_amount * 0.1)
            if accrual > 0:
                await self.create_loyalty_transaction(
                    client_name, "Accrual", accrual, f"Accrual for Order {order_id}"
                )

        return {"order_id": order_id, "total": paid_amount, "bonus_used": bonus_points}

    async def delete_telegram_client(self, telegram_id: int) -> Dict:
        if self.mock:
            cid = self.r.get(f"crm:tg:{telegram_id}")
            if cid:
                self.r.delete(f"crm:tg:{telegram_id}")
                self.r.delete(f"crm:c:{cid}")
                self.r.delete(f"crm:tx:{cid}")
            return {"deleted": True}

        # Not implemented for real ERP yet (safety)
        return {"deleted": False, "message": "Not implemented"}
