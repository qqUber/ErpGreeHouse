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


def test_create_pos_integration_and_ingest_receipt(client: TestClient) -> None:
    r = client.post(
        "/api/v1/integrations",
        json={"name": "POS #1", "kind": "pos_webhook", "enabled": True, "config": {}},
        headers={"x-admin-secret": "test-admin"},
    )
    assert r.status_code == 200
    integ_id = r.json()["id"]

    g = client.get(f"/api/v1/integrations/{integ_id}", headers={"x-admin-secret": "test-admin"})
    assert g.status_code == 200
    secret = g.json()["integration"]["secret"]

    body = {
        "receipt_id": "R-100",
        "occurred_at": "2026-02-17 10:00:00",
        "customer": {"phone": "89991234567"},
        "items": [{"code": "COFFEE", "name": "Капучино", "price": 200, "qty": 2}],
    }

    w = client.post(
        f"/api/v1/public/integrations/{integ_id}/pos/receipt",
        json=body,
        headers={"x-integration-secret": secret},
    )
    assert w.status_code == 200
    assert w.json()["accepted"] is True

    w2 = client.post(
        f"/api/v1/public/integrations/{integ_id}/pos/receipt",
        json=body,
        headers={"x-integration-secret": secret},
    )
    assert w2.status_code == 200
    assert w2.json().get("duplicate") is True


def test_outbound_integration_dispatch(monkeypatch: pytest.MonkeyPatch, client: TestClient) -> None:
    calls = []

    from app import integration_events

    class DummyTask:
        def delay(self, integration_id: int, event_type: str, payload: dict):
            calls.append((integration_id, event_type, payload))

    monkeypatch.setattr(integration_events, "deliver_webhook_event", DummyTask())

    r = client.post(
        "/api/v1/integrations",
        json={
            "name": "Webhook #1",
            "kind": "outbound_webhook",
            "enabled": True,
            "config": {"url": "https://example.invalid", "events": ["transaction.created"]},
        },
        headers={"x-admin-secret": "test-admin"},
    )
    assert r.status_code == 200

    integration_events.dispatch_event("transaction.created", {"transaction_id": 1})
    assert len(calls) == 1
    assert calls[0][1] == "transaction.created"
