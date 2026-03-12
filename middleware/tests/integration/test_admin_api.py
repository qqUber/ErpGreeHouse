import importlib
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    db_path = tmp_path / "crm_test.db"
    monkeypatch.setenv("CRM_DB_PATH", str(db_path))
    monkeypatch.setenv("ADMIN_SECRET", "test-admin")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")
    monkeypatch.setenv("AUTO_SEED_DATA", "false")

    from app import main as main_module

    importlib.reload(main_module)
    with TestClient(main_module.app) as c:
        yield c


def test_dashboard_empty(client: TestClient) -> None:
    r = client.get("/api/v1/dashboard", headers={"x-admin-secret": "test-admin"})
    assert r.status_code == 200
    data = r.json()
    assert data["customers_total"] == 0


def test_identify_and_sale_flow(client: TestClient) -> None:
    r = client.post(
        "/api/v1/identify/phone",
        json={"phone": "89991234567"},
        headers={"x-admin-secret": "test-admin"},
    )
    assert r.status_code == 200
    customer_id = r.json()["customer_id"]

    sale = client.post(
        "/api/v1/pos/sale",
        json={
            "customer_id": customer_id,
            "requested_bonus": 999,
            "items": [{"code": "COFFEE", "name": "Капучино", "price": 200, "qty": 2}],
        },
        headers={"x-admin-secret": "test-admin"},
    )
    assert sale.status_code == 200
    payload = sale.json()
    assert payload["total"] == 400
    assert payload["bonus_used"] == 0
    assert payload["bonus_earned"] == 20

    c = client.get(
        f"/api/v1/customers/{customer_id}", headers={"x-admin-secret": "test-admin"}
    )
    assert c.status_code == 200
    data = c.json()
    assert data["customer"]["balance_points"] == 20
    assert len(data["transactions"]) == 1

    tx_id = data["transactions"][0]["id"]
    pdf = client.get(
        f"/api/v1/transactions/{tx_id}/receipt",
        headers={"x-admin-secret": "test-admin"},
    )
    assert pdf.status_code == 200
    assert pdf.headers.get("content-type", "").startswith("application/pdf")
