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
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")

    from app import main as main_module

    importlib.reload(main_module)
    with TestClient(main_module.app) as c:
        yield c


def test_login_and_change_password(client: TestClient) -> None:
    st = client.get("/api/v1/public/auth/status")
    assert st.status_code == 200
    assert st.json()["default_admin_present"] is True

    r = client.post("/api/v1/public/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    assert r.status_code == 200
    token = r.json()["token"]

    d = client.get("/api/v1/dashboard", headers={"x-admin-secret": token})
    assert d.status_code == 200

    ch = client.post(
        "/api/v1/auth/change-password",
        json={"old_password": "ChangeMe123!", "new_password": "NewPass123!"},
        headers={"x-admin-secret": token},
    )
    assert ch.status_code == 200

    r2 = client.post("/api/v1/public/auth/login", json={"username": "admin", "password": "NewPass123!"})
    assert r2.status_code == 200


def test_recover_password(client: TestClient) -> None:
    rec = client.post(
        "/api/v1/public/auth/recover",
        json={"username": "admin", "new_password": "Recovered123!"},
        headers={"x-admin-recovery": "RecoverMe123!"},
    )
    assert rec.status_code == 200

    r = client.post("/api/v1/public/auth/login", json={"username": "admin", "password": "Recovered123!"})
    assert r.status_code == 200
