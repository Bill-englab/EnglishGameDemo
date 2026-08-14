from pathlib import Path
import json
import pytest
import werkzeug.exceptions
import app as app_module
from scanner import scan_library, annotate_states


def _build_lib(content: Path, demo: Path, recordings: Path):
    (content / "01-c" / "01-s").mkdir(parents=True)
    (content / "01-c" / "01-s" / "meta.json").write_text(
        json.dumps({"title": "S1"}), encoding="utf-8")
    (demo / "01-c" / "01-s").mkdir(parents=True)
    (demo / "01-c" / "01-s" / "demo.mp4").write_bytes(b"fake-demo")


@pytest.fixture
def client(tmp_path, monkeypatch):
    content = tmp_path / "content"
    demo = tmp_path / "demo"
    recordings = tmp_path / "recordings"
    _build_lib(content, demo, recordings)
    monkeypatch.setattr(app_module, "CONTENT_ROOT", content)
    monkeypatch.setattr(app_module, "DEMO_ROOT", demo)
    monkeypatch.setattr(app_module, "RECORDINGS_ROOT", recordings)
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


def test_video_route_rejects_path_traversal(client):
    # A ".." chapter segment must resolve outside its root and be refused,
    # even if a file of that name happened to exist elsewhere.
    with pytest.raises(werkzeug.exceptions.NotFound):
        app_module.video("..", "01-s", "demo")


def test_map_shell_has_module_entry_and_resilient_states(client):
    response = client.get("/")
    html = response.get_data(as_text=True)
    assert response.status_code == 200
    assert '<script type="module" src="/static/app.js"></script>' in html
    for element_id in ("map-view", "map-scroll", "path-svg", "map", "map-loading", "map-error", "map-retry", "detail-view"):
        assert f'id="{element_id}"' in html


def test_app_registers_retryable_library_loading(client):
    javascript = client.get("/static/app.js").get_data(as_text=True)
    assert 'fetch("/api/library", { cache: "no-store" })' in javascript
    assert 'getElementById("map-retry").addEventListener("click", loadLibrary)' in javascript
    assert 'showOnly("map-error")' in javascript


def test_map_static_modules_are_served(client):
    for path in ("/static/app.js", "/static/map-model.mjs", "/static/map-scenes.mjs", "/static/map-path.mjs", "/static/style.css"):
        response = client.get(path)
        assert response.status_code == 200


def test_fonts_are_self_hosted_not_cdn(client):
    # The map shell must not depend on Google Fonts CDN ...
    html = client.get("/").get_data(as_text=True)
    assert "fonts.googleapis.com" not in html
    assert "fonts.gstatic.com" not in html
    # ... and the self-hosted woff2 must be served locally.
    res = client.get("/static/fonts/nunito-latin-700-normal.woff2")
    assert res.status_code == 200
