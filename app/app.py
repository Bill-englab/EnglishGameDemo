import os
import json
import functools
import re
from pathlib import Path
from flask import (Flask, jsonify, render_template, abort, send_file, request,
                   session, redirect, url_for)
from werkzeug.security import check_password_hash, generate_password_hash

from scanner import scan_library, annotate_states, VIDEO_EXTENSIONS

_PROJECT = Path(__file__).resolve().parent.parent
CONTENT_ROOT = Path(os.environ.get("CONTENT_ROOT", _PROJECT / "content"))
DEMO_ROOT = Path(os.environ.get("DEMO_ROOT", _PROJECT / "demo"))
RECORDINGS_ROOT = Path(os.environ.get("RECORDINGS_ROOT", _PROJECT / "recordings"))
PROMPTS_ROOT = Path(os.environ.get("PROMPTS_ROOT", _PROJECT / "prompts"))
USERS_FILE = _PROJECT / "app" / "users.json"

# Sensitive config (admin password, secret key) read from config.json — NOT in the repo.
# Copy config.example.json to config.json and edit before deploying.
# config.json is gitignored and never committed.
_CONFIG_FILE = _PROJECT / "app" / "config.json"
_CONFIG_EXAMPLE = _PROJECT / "app" / "config.example.json"

def _load_config():
    """Load config.json. If missing, fall back to config.example.json with a warning."""
    f = _CONFIG_FILE if _CONFIG_FILE.exists() else _CONFIG_EXAMPLE
    try:
        return json.loads(f.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"admin_password": "admin123", "secret_key": "dev-fallback-change-me"}

_cfg = _load_config()
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = _cfg.get("admin_password", "admin123")

app = Flask(__name__)
app.secret_key = _cfg.get("secret_key", "dev-fallback-change-me")
app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024  # 500 MB upload cap
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

# Map file extension → MIME type for serving, and the reverse for uploads.
# The in-browser recorder sends the actual MIME via a form field so the server
# stores the right extension instead of forcing everything into .mp4.
_EXT_TO_MIME = {".mp4": "video/mp4", ".webm": "video/webm"}
_MIME_TO_EXT = {v: k for k, v in _EXT_TO_MIME.items()}

# A username becomes a path component under recordings_root/, so it must be
# path-safe: no separators, no "..", no slashes. Alphanumerics, dash and
# underscore only. Validated at login time and again before building any path.
_USERNAME_RE = re.compile(r"^[A-Za-z0-9_-]+$")


def _valid_username(name):
    return bool(name and _USERNAME_RE.match(name))


def load_users():
    """Read users.json → {username: password_hash}. Admin is always included.
    Missing/corrupt file → only admin is available."""
    users = {}
    if USERS_FILE.exists():
        try:
            users = json.loads(USERS_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            users = {}
    # Admin is always present, password stored in plaintext (hardcoded).
    # Regular users have hashed passwords in users.json.
    users[ADMIN_USERNAME] = {"plaintext": ADMIN_PASSWORD}
    return users


def save_users(users):
    """Write users.json (admin excluded — it's hardcoded)."""
    to_save = {k: v for k, v in users.items() if k != ADMIN_USERNAME}
    USERS_FILE.write_text(json.dumps(to_save, indent=2), encoding="utf-8")


def verify_password(username, password):
    """Check if username/password combo is valid. Handles both admin (plaintext)
    and regular users (hashed)."""
    users = load_users()
    stored = users.get(username)
    if not stored:
        return False
    if isinstance(stored, dict) and "plaintext" in stored:
        return stored["plaintext"] == password
    # Hashed password (string stored directly in users.json)
    return check_password_hash(stored, password)


def admin_required(f):
    """Require the logged-in user to be admin."""
    @functools.wraps(f)
    def wrapped(*args, **kwargs):
        if session.get("username") != ADMIN_USERNAME:
            return redirect(url_for("index"))
        return f(*args, **kwargs)
    return wrapped


def login_required(f):
    """Redirect to /login when no username is in the session."""
    @functools.wraps(f)
    def wrapped(*args, **kwargs):
        if "username" not in session:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapped


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        if _valid_username(username) and verify_password(username, password):
            session["username"] = username
            return redirect(url_for("index"))
        return render_template("login.html", error="Wrong username or password.")
    return render_template("login.html", error=None)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/api/me")
def api_me():
    username = session.get("username")
    return jsonify({"username": username, "isAdmin": username == ADMIN_USERNAME})


@app.route("/admin", methods=["GET", "POST"])
@admin_required
def admin():
    """Admin user management — add/list/delete users (HTML page, kept for backward compat)."""
    if request.method == "POST":
        action = request.form.get("action", "")
        if action == "add":
            username = request.form.get("username", "").strip()
            password = request.form.get("password", "")
            if not _valid_username(username):
                return render_template("admin.html", users=load_users(), error="Invalid username. Use letters, numbers, dash, underscore only.")
            if len(password) < 4:
                return render_template("admin.html", users=load_users(), error="Password too short (min 4 characters).")
            users = load_users()
            if username in users and username != ADMIN_USERNAME:
                return render_template("admin.html", users=load_users(), error=f"User '{username}' already exists.")
            users[username] = generate_password_hash(password)
            save_users(users)
            return render_template("admin.html", users=load_users(), success=f"User '{username}' added.")
        elif action == "delete":
            username = request.form.get("username", "").strip()
            if username == ADMIN_USERNAME:
                return render_template("admin.html", users=load_users(), error="Cannot delete admin.")
            users = load_users()
            if username in users:
                del users[username]
                save_users(users)
                return render_template("admin.html", users=load_users(), success=f"User '{username}' deleted.")
            return render_template("admin.html", users=load_users(), error=f"User '{username}' not found.")
    return render_template("admin.html", users=load_users(), error=None, success=None)


@app.route("/api/admin/users")
@admin_required
def api_admin_users():
    """Return user list as JSON for the popup menu."""
    users = load_users()
    return jsonify({"users": [u for u in users.keys() if u != ADMIN_USERNAME]})


@app.route("/api/admin/users", methods=["POST"])
@admin_required
def api_admin_users_action():
    """Add or delete a user via JSON (for the popup menu AJAX)."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request"}), 400
    action = data.get("action", "")
    username = data.get("username", "").strip()
    if action == "add":
        password = data.get("password", "")
        if not _valid_username(username):
            return jsonify({"error": "Invalid username"}), 400
        if len(password) < 4:
            return jsonify({"error": "Password too short"}), 400
        users = load_users()
        if username in users:
            return jsonify({"error": "User already exists"}), 400
        users[username] = generate_password_hash(password)
        save_users(users)
        return jsonify({"ok": True, "users": [u for u in users.keys() if u != ADMIN_USERNAME]})
    elif action == "delete":
        if username == ADMIN_USERNAME or not _valid_username(username):
            return jsonify({"error": "Cannot delete this user"}), 400
        users = load_users()
        if username in users:
            del users[username]
            save_users(users)
            return jsonify({"ok": True, "users": [u for u in users.keys() if u != ADMIN_USERNAME]})
        return jsonify({"error": "User not found"}), 404
    return jsonify({"error": "Unknown action"}), 400


@app.route("/")
@login_required
def index():
    return render_template("map.html")


@app.route("/api/library")
@login_required
def api_library():
    # Pass the logged-in username so performance videos are read from the
    # user's own folder; demo videos stay shared.
    return jsonify(annotate_states(
        scan_library(CONTENT_ROOT, DEMO_ROOT, RECORDINGS_ROOT,
                     username=session["username"])))


@app.route("/video/<chapter>/<level>/<kind>")
def video(chapter, level, kind):
    """Serve a demo (shared) or performance (per-user) video file.

    demo videos are shared across users and need no login. performance videos
    are isolated per user under recordings_root/<username>/<chapter>/<level>/
    and require a logged-in user. Path-traversal guard: the resolved file must
    stay under the effective base directory for this kind.
    """
    if kind == "performance":
        if "username" not in session:
            return redirect(url_for("login"))
        username = session["username"]
        if not _valid_username(username):
            abort(404)
        base = RECORDINGS_ROOT / username
        name = "performance"
    elif kind == "demo":
        base = DEMO_ROOT
        name = "demo"
    else:
        abort(404)
    base_resolved = base.resolve()
    # Resolve and guard against path traversal (e.g. ".." segments); the
    # served file must stay under the base directory for this kind/user.
    d = (base / chapter / level).resolve()
    if not d.is_relative_to(base_resolved):
        abort(404)
    # Try each supported extension; serve the first that exists with the
    # matching MIME type so webm recordings play correctly.
    for ext, mt in _EXT_TO_MIME.items():
        f = (d / f"{name}{ext}").resolve()
        if f.is_file() and f.is_relative_to(base_resolved):
            return send_file(f, mimetype=mt)
    abort(404)


@app.route("/upload/<chapter>/<level>/<kind>", methods=["POST"])
@login_required
def upload(chapter, level, kind):
    """Receive a video file and save it to the matching tree (demo/ or recordings/).

    Reuses the same path-traversal guard as the /video route. FileStorage.save()
    streams to disk, so large videos don't pile up in memory.

    demo uploads go to the shared demo_root/<chapter>/<level>/ but still require
    login. performance uploads go to the user's own folder
    recordings_root/<username>/<chapter>/<level>/ so each child's recordings
    stay isolated from other users.

    The in-browser recorder sends the actual MIME type via a ``mimeType`` form
    field so the server picks the right extension (.webm for Chrome, .mp4 for
    Safari). Legacy file uploads without this field default to .mp4.
    """
    username = session["username"]
    if kind == "performance":
        if not _valid_username(username):
            abort(404)
        base = RECORDINGS_ROOT / username
    elif kind == "demo":
        base = DEMO_ROOT
    else:
        abort(404)
    base_resolved = base.resolve()
    d = (base / chapter / level).resolve()
    if not d.is_relative_to(base_resolved):
        abort(404)
    if "file" not in request.files:
        abort(400)
    f = request.files["file"]
    if not f.filename:
        abort(400)
    mt = request.form.get("mimeType", "").strip()
    ext = _MIME_TO_EXT.get(mt, ".mp4")
    target = (d / f"{kind}{ext}").resolve()
    if not target.is_relative_to(base_resolved):
        abort(404)
    d.mkdir(parents=True, exist_ok=True)
    # Remove any existing video of this kind so only one file remains —
    # a re-record in a different format shouldn't leave a stale .mp4 next
    # to a new .webm (or vice versa).
    for other_ext in _EXT_TO_MIME:
        if other_ext != ext:
            other = d / f"{kind}{other_ext}"
            if other.exists():
                other.unlink()
    f.save(target)
    return jsonify({"ok": True, "path": str(target.relative_to(base_resolved)), "ext": ext})


@app.route("/api/prompts/<chapter>/<level>")
def api_prompts(chapter, level):
    """Return the Sora prompt text (a + b) for a given level.

    Derives the dialogue number (D1/D2/D3) from the level's sorted position
    within its chapter in the content tree.
    """
    chapter_dir = (CONTENT_ROOT / chapter).resolve()
    if not chapter_dir.is_relative_to(CONTENT_ROOT.resolve()):
        abort(404)
    if not chapter_dir.is_dir():
        abort(404)
    level_dirs = sorted(p for p in chapter_dir.iterdir() if p.is_dir())
    try:
        n = level_dirs.index((chapter_dir / level).resolve()) + 1
    except (ValueError, FileNotFoundError):
        abort(404)

    prompts_dir = (PROMPTS_ROOT / chapter).resolve()
    if not prompts_dir.is_relative_to(PROMPTS_ROOT.resolve()):
        abort(404)

    def _read(suffix):
        f = prompts_dir / f"D{n}{suffix}"
        if not f.is_file():
            return ""
        return f.read_text(encoding="utf-8")

    return jsonify({"a": _read("a.txt"), "b": _read("b.txt")})


if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG", "").lower() in ("1", "true", "yes")
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", debug=debug, port=port)
