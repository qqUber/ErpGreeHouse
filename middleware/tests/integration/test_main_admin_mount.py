import importlib
import sys
from pathlib import Path

from fastapi.testclient import TestClient


def test_health_not_shadowed_by_admin_ui_mount(tmp_path, monkeypatch) -> None:
    dist = Path(tmp_path) / "admin-dist"
    dist.mkdir(parents=True, exist_ok=True)
    (dist / "index.html").write_text("<html>ok</html>", encoding="utf-8")

    monkeypatch.setenv("ADMIN_UI_DIST", str(dist))

    sys.modules.pop("app.main", None)
    main = importlib.import_module("app.main")

    client = TestClient(main.app)

    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}

    r = client.get("/admin/")
    assert r.status_code == 200

    r = client.get("/", follow_redirects=False)
    assert r.status_code == 307
