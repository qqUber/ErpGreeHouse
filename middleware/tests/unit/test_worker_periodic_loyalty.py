from datetime import datetime
from unittest.mock import patch

from app.db import get_db
from app.worker import _process_periodic_marketing_impl


def test_periodic_marketing_awards_welcome_and_birthday_and_expires_points() -> None:
    db = get_db()
    conn = db.connect()
    try:
        today = datetime.utcnow().strftime("%Y-%m-%d")

        # Customer eligible for welcome and birthday bonus
        cur = conn.execute(
            """
            INSERT INTO customers (
                phone, full_name, telegram_id, qr_token, balance_points,
                marketing_allowed, data_processing_allowed,
                birthday, welcome_bonus_awarded, birthday_bonus_last_year, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                "+79991112233",
                "Bonus User",
                12345,
                "qr_bonus_user",
                0,
                1,
                1,
                today,
                0,
                None,
            ),
        )
        customer_id = int(cur.lastrowid)

        # Add expiring points in ledger (already expired)
        conn.execute(
            """
            INSERT INTO points_ledger(customer_id, amount, source, source_ref_id, expires_at, expired)
            VALUES (?, ?, 'purchase_earned', NULL, datetime('now', '-1 day'), 0)
            """,
            (customer_id, 50),
        )

        # Ensure customer has points to be deducted by expiration
        conn.execute(
            "UPDATE customers SET balance_points = 100, welcome_bonus_awarded = 0 WHERE id=?",
            (customer_id,),
        )
        conn.commit()
    finally:
        conn.close()

    with patch("app.trigger_engine.evaluate_and_queue_triggers", return_value=None):
        result = _process_periodic_marketing_impl()
    assert result.get("processed") is True

    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT balance_points, welcome_bonus_awarded, birthday_bonus_last_year FROM customers WHERE id=?",
            (customer_id,),
        ).fetchone()
        assert row is not None

        # Welcome + birthday points are awarded, expired ledger points deducted
        # Defaults from db migration: welcome=100, birthday=200
        # Starting 100 + 100 + 200 - 50 expired = 350
        assert int(row["balance_points"]) == 350
        assert int(row["welcome_bonus_awarded"]) == 1
        assert int(row["birthday_bonus_last_year"]) == int(datetime.utcnow().year)

        expired_rows = conn.execute(
            "SELECT COUNT(*) AS cnt FROM points_ledger WHERE customer_id=? AND expired=1",
            (customer_id,),
        ).fetchone()
        assert int(expired_rows["cnt"]) >= 1
    finally:
        conn.close()
