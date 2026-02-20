import importlib
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    db_path = tmp_path / "crm_test.db"
    monkeypatch.setenv("CRM_DB_PATH", str(db_path))
    monkeypatch.setenv("ADMIN_SECRET", "test-admin")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")

    from app import main as main_module
    importlib.reload(main_module)
    with TestClient(main_module.app) as c:
        yield c

def test_import_products_csv(client: TestClient):
    csv_content = """code;name;price;kind
PROD1;Test Product 1;100;goods
PROD2;Test Product 2;200;service
"""
    files = {"file": ("test.csv", csv_content, "text/csv")}
    r = client.post(
        "/api/v1/products/import",
        files=files,
        headers={"x-admin-secret": "test-admin"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["processed"] == 2
    assert data["inserted"] == 2
    assert data["updated"] == 0
    assert not data["errors"]

    # Verify in DB via list API
    r = client.get("/api/v1/products", headers={"x-admin-secret": "test-admin"})
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 2
    p1 = next(p for p in items if p["code"] == "PROD1")
    assert p1["name"] == "Test Product 1"
    assert p1["price"] == 100

def test_import_products_update(client: TestClient):
    # Initial import
    csv1 = "code;name;price\nP1;Name1;100"
    client.post("/api/v1/products/import", files={"file": ("1.csv", csv1, "text/csv")}, headers={"x-admin-secret": "test-admin"})

    # Update import
    csv2 = "code;name;price\nP1;Name1 Updated;150"
    r = client.post(
        "/api/v1/products/import",
        files={"file": ("2.csv", csv2, "text/csv")},
        headers={"x-admin-secret": "test-admin"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["updated"] == 1
    assert data["inserted"] == 0

    r = client.get("/api/v1/products", headers={"x-admin-secret": "test-admin"})
    items = r.json()["items"]
    p1 = items[0]
    assert p1["name"] == "Name1 Updated"
    assert p1["price"] == 150
