#!/usr/bin/env python3
"""
Test script to simulate Telegram bot consent flow
"""

import sys
sys.path.append('middleware')

import asyncio
from unittest.mock import AsyncMock, MagicMock
from app.handlers import cmd_start, cb_consent
from app.db import get_db
from app.storage import get_redis

async def test_consent_flow():
    """Test the complete consent flow"""
    print("🧪 Testing Coffee Shop CRM Consent Flow")
    
    # Mock Telegram objects
    message = MagicMock()
    message.from_user.id = 123456
    message.answer = AsyncMock()
    
    callback = MagicMock()
    callback.from_user.id = 123456
    callback.message = MagicMock()
    callback.message.answer = AsyncMock()
    callback.message.edit_text = AsyncMock()
    callback.answer = AsyncMock()
    callback.data = "consent:yes"
    
    # Mock Redis
    redis_mock = AsyncMock()
    
    try:
        # Step 1: Test /start command
        print("\n1. Testing /start command...")
        await cmd_start(message, redis_client=redis_mock)
        print("✅ /start command executed")
        
        # Step 2: Test consent acceptance
        print("\n2. Testing consent acceptance...")
        await cb_consent(callback, redis_client=redis_mock)
        print("✅ Consent acceptance executed")
        
        # Step 3: Verify database state
        print("\n3. Verifying database state...")
        db = get_db()
        conn = db.connect()
        
        # Check if customer was created
        cursor = conn.execute("SELECT full_name, qr_token FROM customers WHERE telegram_id = ?", (123456,))
        customer = cursor.fetchone()
        
        if customer:
            print(f"✅ Customer created: {customer[0]} with QR: {customer[1]}")
        else:
            print("❌ Customer not found")
        
        # Check consents
        cursor = conn.execute("SELECT COUNT(*) FROM consents WHERE customer_id = (SELECT id FROM customers WHERE telegram_id = ?)", (123456,))
        consent_count = cursor.fetchone()[0]
        
        if consent_count > 0:
            print(f"✅ Consents recorded: {consent_count}")
        else:
            print("❌ No consents found")
        
        conn.close()
        
        print("\n🎉 Consent flow test completed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_consent_flow())
