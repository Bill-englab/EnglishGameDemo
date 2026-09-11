from pathlib import Path
import io
import json
import pytest
import werkzeug.exceptions
from werkzeug.security import generate_password_hash
import app as app_module
from scanner import scan_library, annotate_states

# A single test user used by the logged-in fixtures below.
TEST_USERNAME = "tester"
TEST_PASSWORD = "test-pass"


@pytest.mark.parametrize("world", [
    "morning-picnic", "color-market", "block-workshop", "finding-forest",
    "question-observatory", "feeling-garden", "reasoning-valley",
    "memory-town", "messenger-post", "planning-camp",
])
@pytest.mark.parametrize("layout", ["desktop", "mobile"])
def test_responsive_chapter_world_assets_are_served_as_webp(client, world, layout):
    response = client.get(f"/static/worlds-v2/{world}-{layout}.webp")
    assert response.status_code == 200
    assert response.mimetype == "image/webp"
    assert response.data[:4] == b"RIFF"
    assert response.data[8:12] == b"WEBP"


def _build_lib(curriculum: Path, demo: Path, recordings: Path, prompts: Path):
    lesson_dir = curriculum / "04" / "01-c" / "01-s"
    lesson_dir.mkdir(parents=True)
    (curriculum / "04" / "stage.json").write_text(
        json.dumps({"id": "04", "title": "Stage 4"}), encoding="utf-8")
    (curriculum / "04" / "01-c" / "chapter.json").write_text(
        json.dumps({"title": "Chapter One", "background_asset": "01-wants-requests"}),
        encoding="utf-8",
    )
    (lesson_dir / "lesson.json").write_text(json.dumps({
        "title": "S1",
        "title_zh": "第一课",
        "can_do": "Ask for one clear choice.",
        "trigger": "Dad offers two choices.",
        "core_response": "Can I have the apple?",
        "stretch_response": "Can I have the red apple, please?",
        "repair_response": "No, I mean the apple.",
        "conversation_move": {"id": "request-item", "label": "request an item"},
        "parent_support": ["Offer two choices."],
        "replay_cards": [{"title": "Drink", "setting": "Breakfast", "change": "Choose milk", "challenge": "Repair a mix-up"}],
        "status": "language_reviewed",
        "content_revision": 1,
        "parts": [
            {"id": "A", "beat": "goal", "turns": [{"speaker": "dad", "line": "Apple or banana?", "kind": "input"}, {"speaker": "child", "line": "The apple, please.", "kind": "core"}]},
            {"id": "B", "beat": "change", "turns": [{"speaker": "dad", "line": "The banana?", "kind": "input"}, {"speaker": "child", "line": "No, the apple.", "kind": "repair"}]},
            {"id": "C", "beat": "resolve", "turns": [{"speaker": "dad", "line": "Here it is.", "kind": "action"}, {"speaker": "child", "line": "Thank you!", "kind": "playful"}]},
        ],
    }), encoding="utf-8")
    (demo / "04" / "01-c" / "01-s").mkdir(parents=True)
    (demo / "04" / "01-c" / "01-s" / "demo.mp4").write_bytes(b"fake-demo")
    prompt_dir = prompts / "04" / "01-c" / "01-s"
    prompt_dir.mkdir(parents=True)
    (prompt_dir / "a.txt").write_text("prompt A text", encoding="utf-8")
    (prompt_dir / "b.txt").write_text("prompt B text", encoding="utf-8")
    (prompt_dir / "c.txt").write_text("prompt C text", encoding="utf-8")
    # A second stage so stage switching can be exercised end to end.
    lesson5_dir = curriculum / "05" / "01-c5" / "01-s5"
    lesson5_dir.mkdir(parents=True)
    (curriculum / "05" / "stage.json").write_text(
        json.dumps({"id": "05", "title": "Stage 5"}), encoding="utf-8")
    (curriculum / "05" / "01-c5" / "chapter.json").write_text(
        json.dumps({"title": "Chapter Five", "background_asset": "02-refusing-bargaining"}),
        encoding="utf-8",
    )
    (lesson5_dir / "lesson.json").write_text(json.dumps({
        "title": "S5",
        "title_zh": "第五课",
        "can_do": "Keep a story going with follow-up questions.",
        "trigger": "Dad starts a story.",
        "conversation_move": {"id": "ask-what-happened-next", "label": "ask what happened next"},
        "parent_support": ["Pause before the good part."],
        "replay_cards": [{"title": "Train", "setting": "Home", "change": "Tea pause", "challenge": "Ask again"}],
        "status": "draft",
        "content_revision": 1,
        "parts": [
            {"id": "A", "beat": "goal", "turns": [{"speaker": "dad", "line": "Something funny happened."}, {"speaker": "child", "line": "What happened next?"}]},
            {"id": "B", "beat": "change", "turns": [{"speaker": "dad", "line": "My sandwich was gone."}, {"speaker": "child", "line": "Where was it?"}]},
            {"id": "C", "beat": "resolve", "turns": [{"speaker": "dad", "line": "Under my hat."}, {"speaker": "child", "line": "So silly!"}]},
        ],
    }), encoding="utf-8")
    (demo / "05" / "01-c5" / "01-s5").mkdir(parents=True)
    (demo / "05" / "01-c5" / "01-s5" / "demo.mp4").write_bytes(b"fake-demo-5")


def _write_users(users_file: Path, users: dict):
    """Write {username: password_hash} to the users file."""
    users_file.write_text(
        json.dumps({u: generate_password_hash(p) for u, p in users.items()}),
        encoding="utf-8")


def _login(client, username=TEST_USERNAME, password=TEST_PASSWORD):
    return client.post("/login", data={"username": username, "password": password})


def test_missing_config_uses_local_password_and_a_fresh_strong_secret(tmp_path):
    first = app_module._load_config(tmp_path / "missing.json")
    second = app_module._load_config(tmp_path / "missing.json")

    assert first["admin_password"] == "admin123"
    assert len(first["secret_key"]) >= 64
    assert first["secret_key"] != second["secret_key"]


def test_malformed_explicit_config_fails_with_its_path(tmp_path):
    config_file = tmp_path / "config.json"
    config_file.write_text("{broken", encoding="utf-8")

    with pytest.raises(RuntimeError, match="config.json"):
        app_module._load_config(config_file)


@pytest.mark.parametrize(
    "config",
    [
        {"admin_password": "CHANGE_ME", "secret_key": "x" * 64},
        {"admin_password": "a-real-password", "secret_key": "short"},
    ],
)
def test_explicit_config_rejects_placeholder_password_or_weak_secret(tmp_path, config):
    config_file = tmp_path / "config.json"
    config_file.write_text(json.dumps(config), encoding="utf-8")

    with pytest.raises(RuntimeError, match="invalid"):
        app_module._load_config(config_file)


@pytest.fixture
def app_env(tmp_path, monkeypatch):
    """Temp roots + a test user, returns a test client that is NOT logged in.

    All routes whose auth is conditional can be tested both logged-in and
    logged-out by reusing this fixture.
    """
    curriculum = tmp_path / "curriculum"
    demo = tmp_path / "demo"
    recordings = tmp_path / "recordings"
    prompts = tmp_path / "prompts"
    users_file = tmp_path / "users.json"
    _build_lib(curriculum, demo, recordings, prompts)
    _write_users(users_file, {TEST_USERNAME: TEST_PASSWORD})
    monkeypatch.setattr(app_module, "CURRICULUM_ROOT", curriculum, raising=False)
    monkeypatch.setattr(app_module, "CURRICULUM_STAGE", "04", raising=False)
    monkeypatch.setattr(app_module, "DEMO_ROOT", demo)
    monkeypatch.setattr(app_module, "RECORDINGS_ROOT", recordings)
    monkeypatch.setattr(app_module, "PROMPTS_ROOT", prompts)
    monkeypatch.setattr(app_module, "USERS_FILE", users_file)
    app_module.app.config["TESTING"] = True
    return app_module.app.test_client()


@pytest.fixture
def client(app_env):
    """A test client logged in as the test user."""
    _login(app_env)
    return app_env


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
    assert data[0]["title"] == "Chapter One"
    lv = data[0]["levels"][0]
    assert lv["title"] == "S1"
    assert lv["can_do"] == "Ask for one clear choice."
    assert lv["state"] == "unlocked"
    assert lv["current"] is True


def test_api_stages_lists_available_stages(client):
    res = client.get("/api/stages")
    assert res.status_code == 200
    data = res.get_json()
    assert data["stages"] == ["04", "05"]
    assert data["default"] == "04"


def test_api_stages_requires_login(app_env):
    assert app_env.get("/api/stages").status_code == 302


def test_api_library_stage_param_switches_curriculum(client):
    res = client.get("/api/library?stage=05")
    assert res.status_code == 200
    data = res.get_json()
    assert data[0]["name"] == "01-c5"
    assert data[0]["title"] == "Chapter Five"
    lv = data[0]["levels"][0]
    assert lv["title"] == "S5"
    assert lv["stage"] == "05"
    assert lv["state"] == "unlocked"


def test_api_library_rejects_unknown_stage(client):
    assert client.get("/api/library?stage=99").status_code == 404
    assert client.get("/api/library?stage=../04").status_code == 404
    assert client.get("/api/library?stage=").status_code == 200


def test_video_route_serves_stage_scoped_demo(client):
    res = client.get("/video/01-c5/01-s5/demo?stage=05")
    assert res.status_code == 200
    assert res.data == b"fake-demo-5"
    # Without the stage param the route stays on the default stage's tree.
    assert client.get("/video/01-c5/01-s5/demo").status_code == 404


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
    # even if a file of that name happened to exist elsewhere. The direct
    # call runs inside a request context so ?stage= resolution works.
    with app_module.app.test_request_context("/video"):
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
    assert "requestJSON(`/api/library${" in javascript
    assert 'getElementById("map-retry").addEventListener("click",' in javascript
    # Error visibility/preservation is exercised by the imported DOM helper and
    # the real browser refresh/retry regression, independent of function spelling.


def test_map_static_modules_are_served(client):
    for path in ("/static/app.js", "/static/map-model.mjs", "/static/map-path.mjs", "/static/map-interactions.mjs", "/static/adventure-shell.mjs", "/static/adventure-navigation.mjs", "/static/style.css", "/static/titlebar.js"):
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
def upload_client(app_env):
    """A logged-in client whose roots point at temp dirs; returns (client, roots)."""
    _login(app_env)
    roots = {
        "curriculum": app_module.CURRICULUM_ROOT,
        "demo": app_module.DEMO_ROOT,
        "recordings": app_module.RECORDINGS_ROOT,
    }
    return app_env, roots


def test_upload_writes_performance_to_recordings(upload_client):
    client, roots = upload_client
    res = client.post("/upload/01-c/01-s/performance", data={
        "file": (io.BytesIO(b"fake-perf"), "performance.mp4"),
    }, content_type="multipart/form-data")
    assert res.status_code == 200
    assert res.get_json()["ok"] is True
    # Performance uploads land in the logged-in user's own folder.
    written = roots["recordings"] / TEST_USERNAME / "04" / "01-c" / "01-s" / "performance.mp4"
    assert written.read_bytes() == b"fake-perf"
    # The uploaded video is now servable via the /video route.
    assert client.get("/video/01-c/01-s/performance").status_code == 200


def test_upload_stage_param_isolates_performance_trees(upload_client):
    client, roots = upload_client
    res = client.post("/upload/01-c5/01-s5/performance?stage=05", data={
        "file": (io.BytesIO(b"stage5-perf"), "performance.mp4"),
    }, content_type="multipart/form-data")
    assert res.status_code == 200
    written = roots["recordings"] / TEST_USERNAME / "05" / "01-c5" / "01-s5" / "performance.mp4"
    assert written.read_bytes() == b"stage5-perf"
    # The stage-05 recording serves with its stage param and is invisible to
    # the default stage's path (the same chapter does not exist there).
    assert client.get("/video/01-c5/01-s5/performance?stage=05").status_code == 200
    assert client.get("/video/01-c5/01-s5/performance").status_code == 404


def test_upload_writes_demo_to_demo_root(upload_client):
    client, roots = upload_client
    res = client.post("/upload/01-c/01-s/demo", data={
        "file": (io.BytesIO(b"fake-demo-2"), "demo.mp4"),
    }, content_type="multipart/form-data")
    assert res.status_code == 200
    written = roots["demo"] / "04" / "01-c" / "01-s" / "demo.mp4"
    assert written.read_bytes() == b"fake-demo-2"


def test_upload_creates_missing_parent_dirs(upload_client):
    client, roots = upload_client
    res = client.post("/upload/02-new/01-s/performance", data={
        "file": (io.BytesIO(b"x"), "performance.mp4"),
    }, content_type="multipart/form-data")
    assert res.status_code == 200
    assert (roots["recordings"] / TEST_USERNAME / "04" / "02-new" / "01-s" / "performance.mp4").exists()


def test_upload_webm_stores_correct_extension(upload_client):
    """The recorder sends mimeType=video/webm; server must save as .webm."""
    client, roots = upload_client
    res = client.post("/upload/01-c/01-s/performance", data={
        "file": (io.BytesIO(b"fake-webm"), "performance.webm"),
        "mimeType": "video/webm",
    }, content_type="multipart/form-data")
    assert res.status_code == 200
    assert res.get_json()["ext"] == ".webm"
    written = roots["recordings"] / TEST_USERNAME / "04" / "01-c" / "01-s" / "performance.webm"
    assert written.read_bytes() == b"fake-webm"
    # No .mp4 should be created.
    assert not (roots["recordings"] / TEST_USERNAME / "04" / "01-c" / "01-s" / "performance.mp4").exists()


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
    assert (roots["recordings"] / TEST_USERNAME / "04" / "01-c" / "01-s" / "performance.mp4").exists()
    # Re-record as webm.
    client.post("/upload/01-c/01-s/performance", data={
        "file": (io.BytesIO(b"new-webm"), "performance.webm"),
        "mimeType": "video/webm",
    }, content_type="multipart/form-data")
    assert (roots["recordings"] / TEST_USERNAME / "04" / "01-c" / "01-s" / "performance.webm").exists()
    assert not (roots["recordings"] / TEST_USERNAME / "04" / "01-c" / "01-s" / "performance.mp4").exists()


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
    # upload is @login_required, so call it inside a request context that
    # carries a logged-in session; a ".." chapter must still be refused and
    # must not escape the user's recordings folder.
    with app_module.app.test_request_context(method="POST"):
        from flask import session
        session["username"] = TEST_USERNAME
        with pytest.raises(werkzeug.exceptions.NotFound):
            app_module.upload("..", "01-s", "performance")


# ===== prompts API tests =====

def test_prompts_returns_a_b_and_c_text(client):
    res = client.get("/api/prompts/01-c/01-s")
    assert res.status_code == 200
    data = res.get_json()
    assert data["a"] == "prompt A text"
    assert data["b"] == "prompt B text"
    assert data["c"] == "prompt C text"


def test_prompts_hide_internal_header_but_preserve_generation_content(client):
    path = app_module.PROMPTS_ROOT / "04/01-c/01-s/a.txt"
    body = 'VIDEO AND SOUND\nPixar-style 3D animated cartoon.\n\nSPOKEN DIALOGUE\nChild: "Source SHA256: is printed on the box."\n'
    path.write_text(
        'Example — Clip 1\n'
        'Production prompt draft | Source: curriculum/04/01-c/01-s/lesson.json | Content revision: 3\n'
        'Source SHA256: ' + 'a' * 64 + '\n'
        'The source/revision above are production metadata, not spoken words or on-screen text.\n\n' + body,
        encoding="utf-8",
    )
    assert client.get("/api/prompts/01-c/01-s").get_json()["a"] == 'Example — Clip 1\n\n' + body
    assert 'Production prompt draft' in path.read_text(encoding="utf-8")


def test_prompts_404_for_missing_chapter(client):
    res = client.get("/api/prompts/99-nope/01-s")
    assert res.status_code == 404


def test_prompts_404_for_missing_level(client):
    res = client.get("/api/prompts/01-c/99-nope")
    assert res.status_code == 404


def test_prompts_rejects_path_traversal(client):
    # Direct route call inside a request context so ?stage= resolution works.
    with app_module.app.test_request_context("/api/prompts"):
        with pytest.raises(werkzeug.exceptions.NotFound):
            app_module.api_prompts("..", "01-s")


def test_map_shell_has_detail_prompts_element(client):
    html = client.get("/").get_data(as_text=True)
    assert 'id="detail-prompts"' in html


def test_map_shell_has_stage_4_teaching_and_replay_regions(client):
    html = client.get("/").get_data(as_text=True)

    for element_id in (
        "detail-can-do",
        "detail-trigger",
        "detail-replay-cards",
        "detail-parent-support",
    ):
        assert f'id="{element_id}"' in html


# ===== auth + multi-user isolation tests =====

def test_index_requires_login(app_env):
    """Without a session, the map redirects to /login."""
    res = app_env.get("/")
    assert res.status_code == 302
    assert res.headers["Location"].endswith("/login")


def test_api_library_requires_login(app_env):
    """Without a session, /api/library redirects to /login."""
    res = app_env.get("/api/library")
    assert res.status_code == 302
    assert res.headers["Location"].endswith("/login")


def test_login_with_valid_credentials(app_env):
    res = app_env.post("/login", data={
        "username": TEST_USERNAME, "password": TEST_PASSWORD})
    assert res.status_code == 302
    assert res.headers["Location"].endswith("/")
    # The session now carries the username.
    assert app_env.get("/api/me").get_json()["username"] == TEST_USERNAME


def test_login_rejects_wrong_password(app_env):
    res = app_env.post("/login", data={
        "username": TEST_USERNAME, "password": "nope"})
    # Re-renders the form (200) with an error; no session is set.
    assert res.status_code == 200
    assert app_env.get("/api/me").get_json()["username"] is None


def test_api_me_reports_null_when_logged_out(app_env):
    me = app_env.get("/api/me").get_json()
    assert me["username"] is None
    assert me["isAdmin"] is False


def test_logout_clears_session(client):
    # client is logged in by the fixture.
    assert client.get("/api/me").get_json()["username"] == TEST_USERNAME
    res = client.get("/logout")
    assert res.status_code == 302
    assert res.headers["Location"].endswith("/login")
    assert client.get("/api/me").get_json()["username"] is None


def test_performance_video_requires_login(app_env):
    """A performance video request without a session redirects to /login
    (demo videos stay public and shared)."""
    res = app_env.get("/video/01-c/01-s/performance")
    assert res.status_code == 302
    assert res.headers["Location"].endswith("/login")


def test_demo_video_served_without_login(app_env):
    """demo videos are shared content and need no authentication."""
    res = app_env.get("/video/01-c/01-s/demo")
    assert res.status_code == 200
    assert res.mimetype == "video/mp4"


def test_performance_isolated_between_users(tmp_path, monkeypatch):
    """User A's performance upload must be invisible to user B."""
    curriculum = tmp_path / "curriculum"
    demo = tmp_path / "demo"
    recordings = tmp_path / "recordings"
    prompts = tmp_path / "prompts"
    users_file = tmp_path / "users.json"
    _build_lib(curriculum, demo, recordings, prompts)
    _write_users(users_file, {"userA": "pass-a", "userB": "pass-b"})
    monkeypatch.setattr(app_module, "CURRICULUM_ROOT", curriculum, raising=False)
    monkeypatch.setattr(app_module, "CURRICULUM_STAGE", "04", raising=False)
    monkeypatch.setattr(app_module, "DEMO_ROOT", demo)
    monkeypatch.setattr(app_module, "RECORDINGS_ROOT", recordings)
    monkeypatch.setattr(app_module, "PROMPTS_ROOT", prompts)
    monkeypatch.setattr(app_module, "USERS_FILE", users_file)
    app_module.app.config["TESTING"] = True

    client_a = app_module.app.test_client()
    client_a.post("/login", data={"username": "userA", "password": "pass-a"})
    # User A records a performance.
    res = client_a.post("/upload/01-c/01-s/performance", data={
        "file": (io.BytesIO(b"A-perf"), "performance.mp4"),
    }, content_type="multipart/form-data")
    assert res.status_code == 200

    # User A sees their recording (the level becomes completed).
    lib_a = client_a.get("/api/library").get_json()
    assert lib_a[0]["levels"][0]["has_performance"] is True
    assert lib_a[0]["levels"][0]["state"] == "completed"
    assert client_a.get("/video/01-c/01-s/performance").status_code == 200

    # User B logs in and must NOT see user A's recording.
    client_b = app_module.app.test_client()
    client_b.post("/login", data={"username": "userB", "password": "pass-b"})
    lib_b = client_b.get("/api/library").get_json()
    assert lib_b[0]["levels"][0]["has_performance"] is False
    assert client_b.get("/video/01-c/01-s/performance").status_code == 404

    # The file is physically under userA's folder only — not shared, not in B's.
    assert (recordings / "userA" / "04" / "01-c" / "01-s" / "performance.mp4").exists()
    assert not (recordings / "userB" / "04" / "01-c" / "01-s").exists()
    assert not (recordings / "04" / "01-c" / "01-s" / "performance.mp4").exists()


# ===== admin tests =====

@pytest.fixture
def admin_client(app_env):
    """A test client logged in as admin."""
    _login(app_env, username="admin", password=app_module.ADMIN_PASSWORD)
    return app_env


def test_admin_login_works(app_env):
    res = _login(app_env, username="admin", password=app_module.ADMIN_PASSWORD)
    assert res.status_code == 302
    me = app_env.get("/api/me").get_json()
    assert me["username"] == "admin"
    assert me["isAdmin"] is True


def test_admin_page_requires_admin(client):
    """Non-admin user redirected away from /admin."""
    res = client.get("/admin")
    assert res.status_code == 302
    assert res.headers["Location"].endswith("/")


def test_admin_page_accessible_by_admin(admin_client):
    res = admin_client.get("/admin")
    assert res.status_code == 200
    assert b"User Management" in res.data


def test_admin_can_add_user(admin_client):
    res = admin_client.post("/admin", data={
        "action": "add", "username": "newuser", "password": "newpass123"})
    assert res.status_code == 200
    assert b"newuser" in res.data
    # New user can log in
    assert _login(admin_client, username="newuser", password="newpass123").status_code == 302


def test_admin_can_delete_user(admin_client):
    # Add then delete
    admin_client.post("/admin", data={
        "action": "add", "username": "tempuser", "password": "temppass"})
    res = admin_client.post("/admin", data={
        "action": "delete", "username": "tempuser"})
    assert res.status_code == 200
    assert b"deleted" in res.data
    # Verify the user is gone from users.json
    import json
    users = json.loads(app_module.USERS_FILE.read_text(encoding="utf-8"))
    assert "tempuser" not in users


def test_admin_cannot_be_deleted(admin_client):
    res = admin_client.post("/admin", data={
        "action": "delete", "username": "admin"})
    assert b"Cannot delete admin" in res.data


def test_admin_me_reports_isAdmin(app_env):
    _login(app_env, username="admin", password=app_module.ADMIN_PASSWORD)
    me = app_env.get("/api/me").get_json()
    assert me["isAdmin"] is True


def test_hashed_map_art_can_be_cached_but_scripts_are_revalidated(client):
    asset = next((Path(app_module.app.static_folder) / 'map-assets').glob('*.webp'))
    response = client.get('/static/map-assets/' + asset.name)
    assert response.status_code == 200
    assert response.mimetype == 'image/webp'
    assert 'public' in response.headers['Cache-Control']
    assert 'max-age=31536000' in response.headers['Cache-Control']
    assert 'immutable' in response.headers['Cache-Control']
    for name in ('app.js', 'map-assets.mjs', 'map-assets.css'):
        script = client.get('/static/' + name)
        assert 'no-cache' in script.headers['Cache-Control']
        if name.endswith(('.js', '.mjs')):
            assert script.mimetype == 'text/javascript'


def test_performance_cache_revalidates_and_varies_by_account(client):
    root = app_module.RECORDINGS_ROOT / TEST_USERNAME / '04' / '01-c' / '01-s'
    root.mkdir(parents=True, exist_ok=True)
    video = root / 'performance.mp4'
    video.write_bytes(b'first-performance')
    url = '/video/01-c/01-s/performance'
    first = client.get(url)
    assert 'private' in first.headers['Cache-Control']
    assert 'no-cache' in first.headers['Cache-Control']
    assert 'Cookie' in first.headers['Vary']
    headers = {'If-None-Match': first.headers['ETag']}
    assert client.get(url, headers=headers).status_code == 304
    video.write_bytes(b'a-new-recording-with-a-different-length')
    changed = client.get(url, headers=headers)
    assert changed.status_code == 200
    assert changed.data == video.read_bytes()
    client.get('/logout')
    assert client.get(url, headers=headers).status_code == 302


def test_module_mime_is_correct_even_with_generic_host_mime_table(client, monkeypatch):
    monkeypatch.setitem(app_module.mimetypes.types_map, '.mjs', 'application/octet-stream')
    response = client.get('/static/request-json.mjs')
    assert response.mimetype == 'text/javascript'
