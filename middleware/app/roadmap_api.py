import csv
import io
import json
import secrets
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

from .admin_auth_api import require_jwt_auth
from .db import get_db
from .identify import normalize_phone
from .loyalty import recalculate_customer_tier

router = APIRouter(prefix="/api/v1")


class LoyaltyTierIn(BaseModel):
    name: str
    min_spent: int = Field(ge=0)
    accrual_percent: int = Field(ge=0, le=100)
    max_redeem_percent: int = Field(ge=0, le=100)
    min_referrals: int = Field(default=0, ge=0)
    sort_order: int = Field(default=0, ge=0)
    active: int = Field(default=1, ge=0, le=1)


class ReferralCreateIn(BaseModel):
    referrer_id: int
    referred_phone: str | None = None


class CertificateIn(BaseModel):
    code: str | None = None
    type: str = Field(default="fixed_amount")
    value: int = Field(ge=0)
    currency: str = Field(default="RUB")
    sender_id: int | None = None
    recipient_id: int | None = None
    recipient_phone: str | None = None
    message: str | None = None
    expires_at: str | None = None


class RewardItemIn(BaseModel):
    product_id: int
    points_cost: int = Field(ge=1)
    stock_limit: int | None = None
    active: int = Field(default=1, ge=0, le=1)


class ReviewReplyIn(BaseModel):
    admin_reply: str = Field(min_length=1)


class NewsArticleIn(BaseModel):
    title: str = Field(min_length=1)
    body: str = Field(min_length=1)
    image_url: str | None = None
    type: str = Field(default="news")
    valid_from: str | None = None
    valid_until: str | None = None
    promo_code: str | None = None
    status: str = Field(default="draft")


class SecurityResolveIn(BaseModel):
    resolved: int = Field(default=1, ge=0, le=1)


class EmployeeMetricIn(BaseModel):
    employee_id: int
    metric_type: str = Field(min_length=1)
    value: float
    period: str = Field(min_length=1)


@router.get("/loyalty/tiers")
def get_loyalty_tiers(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        rows = conn.execute(
            "SELECT id, name, min_spent, accrual_percent, max_redeem_percent, min_referrals, sort_order, active, created_at, updated_at FROM loyalty_tiers ORDER BY sort_order ASC, min_spent ASC"
        ).fetchall()
        return {"items": [dict(r) for r in rows], "pagination": {"total": len(rows)}}
    finally:
        conn.close()


@router.post("/loyalty/tiers")
def create_loyalty_tier(
    payload: LoyaltyTierIn,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "INSERT INTO loyalty_tiers (name, min_spent, accrual_percent, max_redeem_percent, min_referrals, sort_order, active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))",
            (
                payload.name,
                payload.min_spent,
                payload.accrual_percent,
                payload.max_redeem_percent,
                payload.min_referrals,
                payload.sort_order,
                payload.active,
            ),
        )
        conn.commit()
        return {"id": int(cur.lastrowid)}
    finally:
        conn.close()


@router.post("/referrals")
def create_referral(
    payload: ReferralCreateIn, auth_result: dict[str, Any] = Depends(require_jwt_auth)
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        referrer = conn.execute(
            "SELECT id FROM customers WHERE id=?", (payload.referrer_id,)
        ).fetchone()
        if not referrer:
            raise HTTPException(status_code=404, detail="Referrer not found")

        code = secrets.token_hex(4)
        referred_id = None
        if payload.referred_phone:
            phone = normalize_phone(payload.referred_phone)
            if phone:
                row = conn.execute(
                    "SELECT id FROM customers WHERE phone=?", (phone,)
                ).fetchone()
                if row:
                    referred_id = int(row["id"])
                    conn.execute(
                        "UPDATE customers SET referred_by=?, updated_at=datetime('now') WHERE id=?",
                        (payload.referrer_id, referred_id),
                    )

        conn.execute(
            "INSERT INTO referrals (referrer_id, referred_id, referral_code, status, bonus_awarded) VALUES (?, ?, ?, ?, 0)",
            (payload.referrer_id, referred_id, code, "invited"),
        )
        conn.commit()
        return {"referral_code": code}
    finally:
        conn.close()


@router.get("/analytics/referrals")
def analytics_referrals(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        rows = conn.execute(
            """
            SELECT r.referrer_id, c.full_name, COUNT(*) as total_invites,
                   SUM(CASE WHEN r.status='converted' THEN 1 ELSE 0 END) as converted
            FROM referrals r
            LEFT JOIN customers c ON c.id = r.referrer_id
            GROUP BY r.referrer_id, c.full_name
            ORDER BY converted DESC, total_invites DESC
            LIMIT 100
            """
        ).fetchall()
        items = []
        for r in rows:
            total = int(r["total_invites"] or 0)
            converted = int(r["converted"] or 0)
            items.append(
                {
                    "referrer_id": int(r["referrer_id"]),
                    "full_name": r["full_name"] or "",
                    "total_invites": total,
                    "converted": converted,
                    "conversion_rate": (
                        round((converted / total) * 100, 2) if total else 0
                    ),
                }
            )
        return {"items": items, "pagination": {"total": len(items)}}
    finally:
        conn.close()


@router.post("/certificates")
def create_certificate(
    payload: CertificateIn, auth_result: dict[str, Any] = Depends(require_jwt_auth)
) -> dict[str, Any]:
    code = (payload.code or f"CERT-{secrets.token_hex(4)}").upper()
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            'INSERT INTO certificates (code, type, value, currency, status, sender_id, recipient_id, recipient_phone, message, expires_at) VALUES (?, ?, ?, ?, "active", ?, ?, ?, ?, ?)',
            (
                code,
                payload.type,
                payload.value,
                payload.currency,
                payload.sender_id,
                payload.recipient_id,
                payload.recipient_phone,
                payload.message,
                payload.expires_at,
            ),
        )
        conn.commit()
        return {"id": int(cur.lastrowid), "code": code}
    finally:
        conn.close()


@router.get("/certificates")
def list_certificates(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        rows = conn.execute(
            "SELECT * FROM certificates ORDER BY id DESC LIMIT 200"
        ).fetchall()
        return {"items": [dict(r) for r in rows], "pagination": {"total": len(rows)}}
    finally:
        conn.close()


@router.post("/rewards")
def create_reward_item(
    payload: RewardItemIn, auth_result: dict[str, Any] = Depends(require_jwt_auth)
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "INSERT INTO reward_items (product_id, points_cost, stock_limit, active) VALUES (?, ?, ?, ?)",
            (
                payload.product_id,
                payload.points_cost,
                payload.stock_limit,
                payload.active,
            ),
        )
        conn.commit()
        return {"id": int(cur.lastrowid)}
    finally:
        conn.close()


@router.get("/rewards")
def list_reward_items(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        rows = conn.execute(
            "SELECT r.id, r.product_id, p.name as product_name, r.points_cost, r.stock_limit, r.active, r.created_at FROM reward_items r LEFT JOIN products p ON p.id=r.product_id ORDER BY r.id DESC"
        ).fetchall()
        return {"items": [dict(r) for r in rows], "pagination": {"total": len(rows)}}
    finally:
        conn.close()


@router.get("/reviews")
def list_reviews(
    rating: int | None = Query(default=None, ge=1, le=5),
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        args: list[Any] = []
        where = ""
        if rating is not None:
            where = "WHERE r.rating=?"
            args.append(rating)
        rows = conn.execute(
            f"SELECT r.*, c.full_name FROM reviews r LEFT JOIN customers c ON c.id=r.customer_id {where} ORDER BY r.id DESC LIMIT 500",
            tuple(args),
        ).fetchall()
        return {"items": [dict(r) for r in rows], "pagination": {"total": len(rows)}}
    finally:
        conn.close()


@router.post("/reviews/{review_id}/reply")
def reply_review(
    review_id: int,
    payload: ReviewReplyIn,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        conn.execute(
            "UPDATE reviews SET admin_reply=?, status=\"replied\", replied_at=datetime('now') WHERE id=?",
            (payload.admin_reply, review_id),
        )
        conn.commit()
        return {"status": "ok"}
    finally:
        conn.close()


@router.post("/news")
def create_news(
    payload: NewsArticleIn, auth_result: dict[str, Any] = Depends(require_jwt_auth)
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "INSERT INTO news_articles (title, body, image_url, type, valid_from, valid_until, promo_code, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))",
            (
                payload.title,
                payload.body,
                payload.image_url,
                payload.type,
                payload.valid_from,
                payload.valid_until,
                payload.promo_code,
                payload.status,
            ),
        )
        conn.commit()
        return {"id": int(cur.lastrowid)}
    finally:
        conn.close()


@router.post("/news/{article_id}/publish")
def publish_news(
    article_id: int, auth_result: dict[str, Any] = Depends(require_jwt_auth)
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        conn.execute(
            "UPDATE news_articles SET status=\"published\", published_at=datetime('now'), updated_at=datetime('now') WHERE id=?",
            (article_id,),
        )
        conn.commit()
        return {"status": "ok"}
    finally:
        conn.close()


@router.get("/news")
def list_news(
    status: str | None = None,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        if status:
            rows = conn.execute(
                "SELECT * FROM news_articles WHERE status=? ORDER BY id DESC LIMIT 200",
                (status,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM news_articles ORDER BY id DESC LIMIT 200"
            ).fetchall()
        return {"items": [dict(r) for r in rows], "pagination": {"total": len(rows)}}
    finally:
        conn.close()


@router.get("/security/alerts")
def list_security_alerts(
    resolved: int | None = Query(default=None, ge=0, le=1),
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        if resolved is None:
            rows = conn.execute(
                "SELECT * FROM security_alerts ORDER BY id DESC LIMIT 500"
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM security_alerts WHERE resolved=? ORDER BY id DESC LIMIT 500",
                (resolved,),
            ).fetchall()
        return {"items": [dict(r) for r in rows], "pagination": {"total": len(rows)}}
    finally:
        conn.close()


@router.post("/security/alerts/{alert_id}/resolve")
def resolve_security_alert(
    alert_id: int,
    payload: SecurityResolveIn,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        conn.execute(
            "UPDATE security_alerts SET resolved=?, resolved_at=CASE WHEN ?=1 THEN datetime('now') ELSE NULL END WHERE id=?",
            (payload.resolved, payload.resolved, alert_id),
        )
        conn.commit()
        return {"status": "ok"}
    finally:
        conn.close()


@router.post("/employees/metrics")
def upsert_employee_metric(
    payload: EmployeeMetricIn,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        conn.execute(
            "INSERT INTO employee_metrics (employee_id, metric_type, value, period, created_at) VALUES (?, ?, ?, ?, datetime('now')) ON CONFLICT(employee_id, metric_type, period) DO UPDATE SET value=excluded.value, created_at=datetime('now')",
            (payload.employee_id, payload.metric_type, payload.value, payload.period),
        )
        conn.commit()
        return {"status": "ok"}
    finally:
        conn.close()


@router.get("/employees/metrics")
def list_employee_metrics(
    period: str | None = None,
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        if period:
            rows = conn.execute(
                "SELECT * FROM employee_metrics WHERE period=? ORDER BY value DESC LIMIT 500",
                (period,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM employee_metrics ORDER BY created_at DESC LIMIT 500"
            ).fetchall()
        return {"items": [dict(r) for r in rows], "pagination": {"total": len(rows)}}
    finally:
        conn.close()


@router.post("/customers/import")
def import_customers(
    file: UploadFile = File(...),
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    raw = file.file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("cp1251", errors="ignore")

    reader = csv.DictReader(io.StringIO(text))
    inserted = 0
    updated = 0
    skipped = 0

    db = get_db()
    conn = db.connect()
    try:
        for row in reader:
            phone = normalize_phone((row.get("phone") or "").strip())
            full_name = (row.get("full_name") or "").strip() or (
                row.get("name") or ""
            ).strip()
            if not phone and not full_name:
                skipped += 1
                continue

            existing = None
            if phone:
                existing = conn.execute(
                    "SELECT id FROM customers WHERE phone=?", (phone,)
                ).fetchone()

            if existing:
                conn.execute(
                    "UPDATE customers SET full_name=COALESCE(NULLIF(?, \"\"), full_name), updated_at=datetime('now') WHERE id=?",
                    (full_name, int(existing["id"])),
                )
                updated += 1
                continue

            conn.execute(
                'INSERT INTO customers (phone, full_name, qr_token, marketing_allowed, data_processing_allowed, preferred_channel) VALUES (?, ?, lower(hex(randomblob(4))), 1, 1, "tg")',
                (phone, full_name),
            )
            inserted += 1

        conn.commit()
        return {
            "inserted": inserted,
            "updated": updated,
            "skipped": skipped,
            "total": inserted + updated + skipped,
        }
    finally:
        conn.close()


@router.post("/phase6/fraud-scan")
def run_fraud_scan(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        rows = conn.execute(
            """
            SELECT customer_id, COUNT(*) AS tx_count, SUM(bonus_used) AS used_points
            FROM transactions
            WHERE created_at >= datetime('now', '-1 day')
            GROUP BY customer_id
            HAVING tx_count >= 5 OR used_points >= 1000
            """
        ).fetchall()

        created = 0
        for row in rows:
            details = {
                "customer_id": int(row["customer_id"]),
                "tx_count_24h": int(row["tx_count"] or 0),
                "used_points_24h": int(row["used_points"] or 0),
                "detected_at": datetime.utcnow().isoformat(),
            }
            conn.execute(
                'INSERT INTO security_alerts (alert_type, severity, details_json, resolved, created_at) VALUES ("suspicious_redemption", "medium", ?, 0, datetime(\'now\'))',
                (json.dumps(details, ensure_ascii=False),),
            )
            created += 1

        conn.commit()
        return {"created_alerts": created}
    finally:
        conn.close()


@router.post("/phase2/recalculate-tiers")
def recalculate_tiers(
    auth_result: dict[str, Any] = Depends(require_jwt_auth),
) -> dict[str, Any]:
    db = get_db()
    conn = db.connect()
    try:
        rows = conn.execute("SELECT id FROM customers").fetchall()
        updated = 0
        for row in rows:
            recalculate_customer_tier(conn, int(row["id"]))
            updated += 1
        conn.commit()
        return {"updated": updated}
    finally:
        conn.close()
