from pathlib import Path
import json
import pytest
import app as app_module
from scanner import scan_library, annotate_states


def _build_lib(root: Path):
    (root / "01-c" / "01-s").mkdir(parents=True)
    (root / "01-c" / "01-s" / "meta.json").write_text(
        json.dumps({"title": "S1"}), encoding="utf-8")
    (root / "01-c" / "01-s" / "demo.mp4").write_bytes(b"fake-demo")


@pytest.fixture
def client(tmp_path, monkeypatch):
    lib = tmp_path / "lib"
    _build_lib(lib)
    monkeypatch.setattr(app_module, "ROOT", lib)
    app_module.app.config["TESTING"] = True
    return app_module.app.test_client()


def test_index_returns_html(client):
    res = client.get("/")
    assert res.status_code == 200
    assert b"<html" in res.data.lower()


def test_api_library_returns_annotated_tree(client):
    res = client.get("/api/library")
    assert res.status_code == 200
    data = res.get_json()
    assert isinstance(data, list)
    assert data[0]["name"] == "01-c"
    lv = data[0]["levels"][0]
    assert lv["title"] == "S1"
    assert lv["state"] == "unlocked"
    assert lv["current"] is True


def test_video_route_serves_existing_demo(client):
    res = client.get("/video/01-c/01-s/demo")
    assert res.status_code == 200
    assert res.mimetype == "video/mp4"


def test_video_route_404_for_missing_performance(client):
    res = client.get("/video/01-c/01-s/performance")
    assert res.status_code == 404


def test_video_route_404_for_unknown_kind(client):
    res = client.get("/video/01-c/01-s/sneaky")
    assert res.status_code == 404
