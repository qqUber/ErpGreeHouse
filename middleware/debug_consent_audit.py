#!/usr/bin/env python3
"""Debug script to test consent audit trail functionality"""

import sqlite3
import sys

from app.db import get_db
from app.handlers import _store_consent, _update_consent


def debug_consent_audit():
    print("Debugging consent audit trail...")

    # Get database connection
    db = get_db()
    conn = db.connect()

    try:
        # Create test customer
        print("\n1. Creating test customer...")
        conn.execute(
            """
            INSERT INTO customers (phone, full_name, telegram_id, qr_token,
                                marketing_allowed, data_processing_allowed)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            ("+79991234567", "Test User", 555555, "audit_qr", 1, 1),
        )
        conn.commit()

        # Get customer ID
        cur = conn.execute("SELECT id FROM customers WHERE telegram_id = 555555")
        customer_id = cur.fetchone()["id"]
        print(f"   Customer ID: {customer_id}")

        # Store initial consent
        print("\n2. Storing initial consent...")
        _store_consent(
            customer_id,
            "Consent to receive marketing messages",
            "1.0.0",
            "marketing",
            conn=conn,
        )
        conn.commit()

        # Verify initial consent stored
        cur = conn.execute(
            "SELECT * FROM consents WHERE customer_id = ?", (customer_id,)
        )
        initial_consents = cur.fetchall()
        print(f"   Initial consents count: {len(initial_consents)}")
        for i, consent in enumerate(initial_consents):
            print(f"   Consent {i+1}:")
            print(f"     Type: {consent['consent_type']}")
            print(f"     Text: '{consent['consent_text']}'")
            print(f"     Version: {consent['consent_version']}")

        # Update consent (revoke marketing)
        print("\n3. Revoking consent (marketing_allowed=0)...")
        _update_consent(555555, marketing_allowed=0, conn=conn)
        conn.commit()

        # Verify updated consent
        print("\n4. Checking consents after update...")
        cur = conn.execute(
            "SELECT * FROM consents WHERE customer_id = ? AND consent_type = 'marketing' ORDER BY accepted_at DESC",
            (customer_id,),
        )
        all_consents = cur.fetchall()

        print(f"   Total consents: {len(all_consents)}")
        for i, consent in enumerate(all_consents):
            print(f"   Consent {i+1}:")
            print(f"     Type: {consent['consent_type']}")
            print(f"     Text: '{consent['consent_text']}'")
            print(f"     Version: {consent['consent_version']}")

        # Check if we have the expected revocation text
        if len(all_consents) >= 2:
            latest = all_consents[0]
            print(
                f"\n5. Latest consent text contains 'отзыв': {'отзыв' in latest['consent_text'].lower()}"
            )
            print(f"   Latest consent text: '{latest['consent_text']}'")

    except Exception as e:
        print(f"\nERROR: {type(e).__name__}: {e}")
        import traceback

        print(traceback.format_exc())
    finally:
        # Clean up
        print("\n6. Cleaning up test data...")
        try:
            conn.execute(
                "DELETE FROM consents WHERE customer_id IN (SELECT id FROM customers WHERE telegram_id = 555555)"
            )
            conn.execute("DELETE FROM customers WHERE telegram_id = 555555")
            conn.commit()
        except Exception as e:
            print(f"Cleanup error: {e}")
        finally:
            conn.close()
    print("\nDebug completed.")


if __name__ == "__main__":
    debug_consent_audit()
