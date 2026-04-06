# type: ignore
from typing import Any

from fastapi import APIRouter, Depends

from .admin_api import check_permission
from .admin_auth_api import require_jwt_auth
from .db import get_db

router = APIRouter(prefix="/api/v1/debug", tags=["debug"])


def _count(conn: Any, table: str) -> int:
    allowed_tables = {
        "customers",
        "products",
        "transactions",
        "marketing_campaigns",
        "marketing_triggers",
        "marketing_trigger_events",
        "integrations",
        "integration_deliveries",
    }
    if table not in allowed_tables:
        raise ValueError("Invalid table name")

    # Use parameterized query to prevent SQL injection
    # For SQLite, we need to construct the query differently
    query = f"SELECT COUNT(*) AS cnt FROM {table}"  # nosec B608 - table name is validated against allowlist
    row = conn.execute(query).fetchone()
    return int(row["cnt"] if row else 0)


@router.get("/seed-status")
def get_seed_status(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    check_permission(auth_result, "dashboard.read")

    db = get_db()
    conn = db.connect()
    try:
        counts = {
            "customers": _count(conn, "customers"),
            "products": _count(conn, "products"),
            "transactions": _count(conn, "transactions"),
            "marketing_campaigns": _count(conn, "marketing_campaigns"),
            "marketing_triggers": _count(conn, "marketing_triggers"),
            "marketing_trigger_events": _count(conn, "marketing_trigger_events"),
            "integrations": _count(conn, "integrations"),
            "integration_deliveries": _count(conn, "integration_deliveries"),
        }
        empty_tables = [name for name, value in counts.items() if value == 0]
        return {
            "counts": counts,
            "empty_tables": empty_tables,
            "ready_for_dashboard": len(empty_tables) == 0,
        }
    finally:
        conn.close()
