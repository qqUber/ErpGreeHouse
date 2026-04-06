import importlib
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


def _build_client(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    *,
    bootstrap_default: bool = False,
    bootstrap_demo_users: bool = False,
    environment: str = "development",
) -> TestClient:
    db_path = tmp_path / "crm_test.db"
    monkeypatch.setenv("CRM_DB_PATH", str(db_path))
    monkeypatch.setenv("ENVIRONMENT", environment)
    monkeypatch.setenv("ADMIN_SECRET", "")
    monkeypatch.setenv("ADMIN_BOOTSTRAP_DEFAULT", "true" if bootstrap_default else "false")
    monkeypatch.setenv("ADMIN_DEFAULT_USERNAME", "admin")
    monkeypatch.setenv("ADMIN_DEFAULT_PASSWORD", "ChangeMe123!")
    monkeypatch.setenv("ADMIN_BOOTSTRAP_DEMO_USERS", "true" if bootstrap_demo_users else "false")
    monkeypatch.setenv("ADMIN_RECOVERY_SECRET", "RecoverMe123!")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")

    # CRITICAL: Initialize database schema and load seed data before app loads
    from app.db import init_db

    init_db()

    # Load seed files for test data (direct call to avoid argument parsing)
    from app.db_init import (
        run_migrations,
        discover_seed_files,
        bootstrap_demo_data_from_seed,
        bootstrap_admins_from_seed,
        bootstrap_reference_data_from_seed,
        bootstrap_products_from_seed,
    )

    # Run migrations first
    run_migrations()

    # Load and apply seed files
    seed_files = discover_seed_files()
    for seed_file in seed_files:
        from app.db_init import load_seed_file

        seed_data = load_seed_file(seed_file)

        # Apply seed data based on file content
        reference_data = []
        if "countries" in seed_data:
            reference_data.extend(seed_data["countries"])
        if "cities" in seed_data:
            reference_data.extend(seed_data["cities"])
        if "locations" in seed_data:
            reference_data.extend(seed_data["locations"])
        if "system_settings" in seed_data:
            reference_data.extend(seed_data["system_settings"])

        if reference_data:
            bootstrap_reference_data_from_seed(reference_data)

        if "products" in seed_data:
            bootstrap_products_from_seed({"products": seed_data["products"]})

        if "admins" in seed_data and bootstrap_default and environment != "production":
            bootstrap_admins_from_seed({"admins": seed_data["admins"]})

        if bootstrap_default and environment != "production":
            if "demo_customers" in seed_data or "demo_transactions" in seed_data:
                bootstrap_demo_data_from_seed(seed_data)

    from app.config import get_settings
    from app import main as main_module

    get_settings.cache_clear()
    importlib.reload(main_module)
    return TestClient(main_module.app)


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    with _build_client(
        tmp_path,
        monkeypatch,
        bootstrap_default=True,
        bootstrap_demo_users=False,
    ) as c:
        yield c


def test_login_and_change_password(client: TestClient) -> None:
    st = client.get("/api/v1/public/auth/status")
    assert st.status_code == 200
    assert st.json()["default_admin_present"] is True

    r = client.post(
        "/api/v1/public/auth/login",
        json={"username": "admin", "password": "admin"},
    )
    assert r.status_code == 200
    token = r.json()["access_token"]

    me = client.get("/api/v1/auth/me", headers={"x-admin-secret": token})
    assert me.status_code == 200
    assert me.json()["username"] == "admin"
    assert me.json()["role"] == "owner"

    d = client.get("/api/v1/dashboard", headers={"x-admin-secret": token})
    assert d.status_code == 200

    ch = client.post(
        "/api/v1/auth/change-password",
        json={"old_password": "admin", "new_password": "NewPass123!"},
        headers={"x-admin-secret": token},
    )
    assert ch.status_code == 200

    r2 = client.post(
        "/api/v1/public/auth/login",
        json={"username": "admin", "password": "NewPass123!"},
    )
    assert r2.status_code == 200


def test_recover_password(client: TestClient) -> None:
    rec = client.post(
        "/api/v1/public/auth/recover",
        json={"username": "admin", "new_password": "Recovered123!"},
        headers={"x-admin-recovery": "RecoverMe123!"},
    )
    assert rec.status_code == 200

    r = client.post(
        "/api/v1/public/auth/login",
        json={"username": "admin", "password": "Recovered123!"},
    )
    assert r.status_code == 200


def test_disabled_user_cannot_login(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    db_path = tmp_path / "crm_test.db"

    with _build_client(
        tmp_path,
        monkeypatch,
        bootstrap_default=True,
        bootstrap_demo_users=False,
    ) as c:
        conn = sqlite3.connect(str(db_path))
        try:
            conn.execute("UPDATE admin_users SET disabled=1 WHERE username='admin'")
            conn.commit()
        finally:
            conn.close()

        r = c.post(
            "/api/v1/public/auth/login",
            json={"username": "admin", "password": "admin"},
        )
        assert r.status_code == 403


def test_auth_status_does_not_create_default_admin_by_default(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    with _build_client(
        tmp_path,
        monkeypatch,
        bootstrap_default=False,
        bootstrap_demo_users=False,
    ) as client:
        status_response = client.get("/api/v1/public/auth/status")

    assert status_response.status_code == 200
    assert status_response.json()["bootstrap_enabled"] is False
    assert status_response.json()["default_admin_present"] is False


def test_login_does_not_bootstrap_accounts_on_request(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    with _build_client(
        tmp_path,
        monkeypatch,
        bootstrap_default=False,
        bootstrap_demo_users=False,
    ) as client:
        login_response = client.post(
            "/api/v1/public/auth/login",
            json={"username": "admin", "password": "ChangeMe123!"},
        )
        status_response = client.get("/api/v1/public/auth/status")

    assert login_response.status_code == 401
    assert status_response.status_code == 200
    assert status_response.json()["default_admin_present"] is False


def test_production_ignores_bootstrap_flags(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    with _build_client(
        tmp_path,
        monkeypatch,
        bootstrap_default=True,
        bootstrap_demo_users=True,
        environment="production",
    ) as client:
        status_response = client.get("/api/v1/public/auth/status")

    assert status_response.status_code == 200
    assert status_response.json()["bootstrap_enabled"] is False
    assert status_response.json()["default_admin_present"] is False
