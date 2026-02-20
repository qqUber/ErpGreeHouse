from typing import Any
import csv
import io
import openpyxl

from fastapi import APIRouter, Header, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

from .auth import require_permission
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
    require_permission(x_admin_secret, "product.read")
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
    require_permission(x_admin_secret, "product.create")
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
    require_permission(x_admin_secret, "product.update")
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
    require_permission(x_admin_secret, "product.update")
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


@router.post("/import")
def import_products(
    file: UploadFile = File(...),
    x_admin_secret: str | None = Header(default=None, alias="x-admin-secret"),
) -> dict[str, Any]:
    require_permission(x_admin_secret, "product.import")
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename")
    
    ext = file.filename.lower().split(".")[-1]
    if ext not in ("csv", "xlsx"):
        raise HTTPException(status_code=400, detail="Only .csv and .xlsx files are supported")

    content = file.file.read()
    rows = []

    try:
        if ext == "csv":
            # Detect encoding? Assume utf-8 for now
            text = content.decode("utf-8")
            reader = csv.DictReader(io.StringIO(text), delimiter=";")
            # If delimiter is wrong, try comma
            if not reader.fieldnames or "code" not in reader.fieldnames:
                reader = csv.DictReader(io.StringIO(text), delimiter=",")
            
            for row in reader:
                rows.append(row)
        else:
            # Excel
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
            ws = wb.active
            if not ws:
                raise HTTPException(status_code=400, detail="Empty excel file")
            
            headers = []
            for i, row in enumerate(ws.iter_rows(values_only=True)):
                if i == 0:
                    headers = [str(h).lower() for h in row if h]
                    continue
                
                # Map headers to values
                item = {}
                for h, v in zip(headers, row):
                    item[h] = v
                if item:
                    rows.append(item)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    # Process rows
    processed = 0
    updated = 0
    inserted = 0
    errors = []

    db = get_db()
    conn = db.connect()
    try:
        for idx, r in enumerate(rows):
            try:
                # Normalize keys
                code = str(r.get("code") or r.get("articul") or "").strip()
                name = str(r.get("name") or r.get("title") or "").strip()
                kind = str(r.get("kind") or r.get("type") or "Import").strip()
                price_raw = r.get("price") or 0
                
                if not code or not name:
                    continue

                try:
                    price = int(float(str(price_raw).replace(",", ".").replace(" ", "")))
                except ValueError:
                    price = 0

                # Check if exists
                cur = conn.execute("SELECT id FROM products WHERE code=?", (code,))
                row = cur.fetchone()
                
                if row:
                    conn.execute(
                        "UPDATE products SET name=?, kind=?, price=?, active=1, updated_at=datetime('now') WHERE id=?",
                        (name, kind, price, row[0]),
                    )
                    updated += 1
                else:
                    conn.execute(
                        "INSERT INTO products(code, name, kind, price, active) VALUES(?,?,?,?,1)",
                        (code, name, kind, price),
                    )
                    inserted += 1
                processed += 1
            except Exception as e:
                errors.append(f"Row {idx+1}: {str(e)}")
        
        conn.commit()
        return {
            "processed": processed,
            "inserted": inserted,
            "updated": updated,
            "errors": errors[:10]  # Limit errors
        }
    finally:
        conn.close()
