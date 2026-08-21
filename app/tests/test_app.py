from pathlib import Path
import io
import json
import pytest
import werkzeug.exceptions
import app as app_module
from scanner import scan_library, annotate_states


def _build_lib(content: Path, demo: Path, recordings: Path, prompts: Path):
    (content / "01-c" / "01-s").mkdir(parents=True)
    (content / "01-c" / "01-s" / "meta.json").write_text(
        json.dumps({"title": "S1"}), encoding="utf-8")
    (demo / "01-c" / "01-s").mkdir(parents=True)
    (demo / "01-c" / "01-s" / "demo.mp4").write_bytes(b"fake-demo")
    (prompts / "01-c").mkdir(parents=True)
    (prompts / "01-c" / "D1a.txt").write_text("prompt A text", encoding="utf-8")
    (prompts / "01-c" / "D1b.txt").write_text("prompt B text", encoding="utf-8")


@pytest.fixture
def client(tmp_path, monkeypatch):
    content = tmp_path / "content"
    demo = tmp_path / "demo"
    recordings = tmp_path / "recordings"
    prompts = tmp_path / "prompts"
    _build_lib(content, demo, recordings, prompts)
    monkeypatch.setattr(app_module, "CONTENT_ROOT", content)
    monkeypatch.setattr(app_module, "DEMO_ROOT", demo)
    monkeypatch.setattr(app_module, "RECORDINGS_ROOT", recordings)
    monkeypatch.setattr(app_module, "PROMPTS_ROOT", prompts)
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
    for path in ("/static/app.js", "/static/map-model.mjs", "/static/map-path.mjs", "/static/style.css", "/static/titlebar.js"):
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


# ===== upload route tests =====

@pytest.fixture
def upload_client(tmp_path, monkeypatch):
    """A client whose three roots point at temp dirs; returns (client, roots)."""
    content = tmp_path / "content"
    demo = tmp_path / "demo"
    recordings = tmp_path / "recordings"
    prompts = tmp_path / "prompts"
    _build_lib(content, demo, recordings, prompts)
    monkeypatch.setattr(app_module, "CONTENT_ROOT", content)
    monkeypatch.setattr(app_module, "DEMO_ROOT", demo)
    monkeypatch.setattr(app_module, "RECORDINGS_ROOT", recordings)
    monkeypatch.setattr(app_module, "PROMPTS_ROOT", prompts)
    app_module.app.config["TESTING"] = True
    return app_module.app.test_client(), {"content": content, "demo": demo, "recordings": recordings}


def test_upload_writes_performance_to_recordings(upload_client):
    client, roots = upload_client
    res = client.post("/upload/01-c/01-s/performance", data={
        "file": (io.BytesIO(b"fake-perf"), "performance.mp4"),
    }, content_type="multipart/form-data")
    assert res.status_code == 200
    assert res.get_json()["ok"] is True
    written = roots["recordings"] / "01-c" / "01-s" / "performance.mp4"
    assert written.read_bytes() == b"fake-perf"
    # The uploaded video is now servable via the /video route.
    assert client.get("/video/01-c/01-s/performance").status_code == 200


def test_upload_writes_demo_to_demo_root(upload_client):
    client, roots = upload_client
    res = client.post("/upload/01-c/01-s/demo", data={
        "file": (io.BytesIO(b"fake-demo-2"), "demo.mp4"),
    }, content_type="multipart/form-data")
    assert res.status_code == 200
    written = roots["demo"] / "01-c" / "01-s" / "demo.mp4"
    assert written.read_bytes() == b"fake-demo-2"


def test_upload_creates_missing_parent_dirs(upload_client):
    client, roots = upload_client
    res = client.post("/upload/02-new/01-s/performance", data={
        "file": (io.BytesIO(b"x"), "performance.mp4"),
    }, content_type="multipart/form-data")
    assert res.status_code == 200
    assert (roots["recordings"] / "02-new" / "01-s" / "performance.mp4").exists()


def test_upload_webm_stores_correct_extension(upload_client):
    """The recorder sends mimeType=video/webm; server must save as .webm."""
    client, roots = upload_client
    res = client.post("/upload/01-c/01-s/performance", data={
        "file": (io.BytesIO(b"fake-webm"), "performance.webm"),
        "mimeType": "video/webm",
    }, content_type="multipart/form-data")
    assert res.status_code == 200
    assert res.get_json()["ext"] == ".webm"
    written = roots["recordings"] / "01-c" / "01-s" / "performance.webm"
    assert written.read_bytes() == b"fake-webm"
    # No .mp4 should be created.
    assert not (roots["recordings"] / "01-c" / "01-s" / "performance.mp4").exists()


def test_upload_webm_served_with_correct_mimetype(upload_client):
    client, roots = upload_client
    client.post("/upload/01-c/01-s/performance", data={
        "file": (io.BytesIO(b"fake-webm"), "performance.webm"),
        "mimeType": "video/webm",
    }, content_type="multipart/form-data")
    res = client.get("/video/01-c/01-s/performance")
    assert res.status_code == 200
    assert res.mimetype == "video/webm"


def test_upload_webm_replaces_existing_mp4(upload_client):
    """Re-recording in webm should delete the old .mp4 so only one file remains."""
    client, roots = upload_client
    # First upload as mp4.
    client.post("/upload/01-c/01-s/performance", data={
        "file": (io.BytesIO(b"old-mp4"), "performance.mp4"),
    }, content_type="multipart/form-data")
    assert (roots["recordings"] / "01-c" / "01-s" / "performance.mp4").exists()
    # Re-record as webm.
    client.post("/upload/01-c/01-s/performance", data={
        "file": (io.BytesIO(b"new-webm"), "performance.webm"),
        "mimeType": "video/webm",
    }, content_type="multipart/form-data")
    assert (roots["recordings"] / "01-c" / "01-s" / "performance.webm").exists()
    assert not (roots["recordings"] / "01-c" / "01-s" / "performance.mp4").exists()


def test_upload_404_for_unknown_kind(upload_client):
    client, _ = upload_client
    res = client.post("/upload/01-c/01-s/sneaky", data={
        "file": (io.BytesIO(b"x"), "x.mp4"),
    }, content_type="multipart/form-data")
    assert res.status_code == 404


def test_upload_400_without_file(upload_client):
    client, _ = upload_client
    res = client.post("/upload/01-c/01-s/performance", data={},
                      content_type="multipart/form-data")
    assert res.status_code == 400


def test_upload_rejects_path_traversal(upload_client):
    with pytest.raises(werkzeug.exceptions.NotFound):
        app_module.upload("..", "01-s", "performance")


# ===== prompts API tests =====

def test_prompts_returns_a_and_b_text(client):
    res = client.get("/api/prompts/01-c/01-s")
    assert res.status_code == 200
    data = res.get_json()
    assert data["a"] == "prompt A text"
    assert data["b"] == "prompt B text"


def test_prompts_404_for_missing_chapter(client):
    res = client.get("/api/prompts/99-nope/01-s")
    assert res.status_code == 404


def test_prompts_404_for_missing_level(client):
    res = client.get("/api/prompts/01-c/99-nope")
    assert res.status_code == 404


def test_prompts_rejects_path_traversal(client):
    with pytest.raises(werkzeug.exceptions.NotFound):
        app_module.api_prompts("..", "01-s")


def test_map_shell_has_detail_prompts_element(client):
    html = client.get("/").get_data(as_text=True)
    assert 'id="detail-prompts"' in html
