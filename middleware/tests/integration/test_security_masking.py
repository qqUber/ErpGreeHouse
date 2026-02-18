import importlib
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    db_path = tmp_path / "crm_test.db"
    monkeypatch.setenv("CRM_DB_PATH", str(db_path))
    monkeypatch.setenv("ADMIN_SECRET", "")
    monkeypatch.setenv("ADMIN_BOOTSTRAP_DEFAULT", "true")
    monkeypatch.setenv("ADMIN_DEFAULT_USERNAME", "admin")
    monkeypatch.setenv("ADMIN_DEFAULT_PASSWORD", "ChangeMe123!")
    monkeypatch.setenv("ADMIN_RECOVERY_SECRET", "RecoverMe123!")
    monkeypatch.setenv("DEBUG_MODE", "false")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")

    from app import main as main_module

    importlib.reload(main_module)
    with TestClient(main_module.app) as c:
        yield c


def test_masked_unauthorized_message(client: TestClient) -> None:
    r = client.get("/api/v1/dashboard")
    assert r.status_code == 401
    assert r.json().get("detail") == "Доступ запрещён."


def test_masked_recover_secret_message(client: TestClient) -> None:
    r = client.post("/api/v1/public/auth/recover", json={"username": "admin", "new_password": "NewPass123!"})
    assert r.status_code in (401, 400)
    assert "secret" not in str(r.json()).lower()
