from typing import Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from .auth import require_roles
from .db import get_db


router = APIRouter(prefix="/api/v1/products")


class ProductIn(BaseModel):
    code: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=200)
    kind: str = Field(min_length=1, max_length=40)
    price: int = Field(default=0, ge=0)
    active: bool = True


@router.get("")
def list_products(
    q: str | None = None,
    active: bool | None = True,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_roles(x_admin_secret, roles=("owner", "operator", "marketer"))
    qv = (q or "").strip()
    db = get_db()
    conn = db.connect()
    try:
        where = []
        args: list[Any] = []
        if active is not None:
            where.append("active=?")
            args.append(1 if active else 0)
        if qv:
            where.append("(code LIKE ? OR name LIKE ?)")
            like = f"%{qv}%"
            args.extend([like, like])
        sql = "SELECT id, code, name, kind, price, active, created_at, updated_at FROM products"
        if where:
            sql += " WHERE " + " AND ".join(where)
        sql += " ORDER BY id DESC LIMIT 200"
        cur = conn.execute(sql, tuple(args))
        items = []
        for r in cur.fetchall():
            items.append(
                {
                    "id": int(r["id"]),
                    "code": str(r["code"]),
                    "name": str(r["name"]),
                    "kind": str(r["kind"]),
                    "price": int(r["price"]),
                    "active": bool(int(r["active"])),
                    "created_at": str(r["created_at"]),
                    "updated_at": str(r["updated_at"]),
                }
            )
        return {"items": items}
    finally:
        conn.close()


@router.post("")
def create_product(
    payload: ProductIn,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_roles(x_admin_secret, roles=("owner", "marketer"))
    db = get_db()
    conn = db.connect()
    try:
        try:
            cur = conn.execute(
                "INSERT INTO products(code, name, kind, price, active) VALUES(?,?,?,?,?)",
                (payload.code.strip(), payload.name.strip(), payload.kind.strip(), int(payload.price), 1 if payload.active else 0),
            )
            conn.commit()
        except Exception:
            raise HTTPException(status_code=400, detail="Product code already exists")
        return {"id": int(cur.lastrowid)}
    finally:
        conn.close()


@router.put("/{product_id}")
def update_product(
    product_id: int,
    payload: ProductIn,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_roles(x_admin_secret, roles=("owner", "marketer"))
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute(
            "UPDATE products SET code=?, name=?, kind=?, price=?, active=?, updated_at=datetime('now') WHERE id=?",
            (payload.code.strip(), payload.name.strip(), payload.kind.strip(), int(payload.price), 1 if payload.active else 0, int(product_id)),
        )
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"updated": True}
    finally:
        conn.close()


@router.post("/{product_id}/archive")
def archive_product(
    product_id: int,
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_roles(x_admin_secret, roles=("owner", "marketer"))
    db = get_db()
    conn = db.connect()
    try:
        cur = conn.execute("UPDATE products SET active=0, updated_at=datetime('now') WHERE id=?", (int(product_id),))
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"archived": True}
    finally:
        conn.close()
