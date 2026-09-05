import os
import json
import functools
import logging
import mimetypes
import re
import secrets
import io
import hashlib
import hmac
import subprocess
from pathlib import Path
from flask import (Flask, Request, jsonify, render_template, abort, send_file, request,
                   session, redirect, url_for)
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.exceptions import RequestEntityTooLarge

from scanner import scan_curriculum_library, annotate_states, VIDEO_EXTENSIONS
from profile_store import read_profile, save_profile, read_avatar, delete_profile, profile_lock, IMAGE_LIMIT

_PROJECT = Path(__file__).resolve().parent.parent
CURRICULUM_ROOT = Path(os.environ.get("CURRICULUM_ROOT", _PROJECT / "curriculum"))
CURRICULUM_STAGE = os.environ.get("CURRICULUM_STAGE", "04")
DEMO_ROOT = Path(os.environ.get("DEMO_ROOT", _PROJECT / "demo"))
RECORDINGS_ROOT = Path(os.environ.get("RECORDINGS_ROOT", _PROJECT / "recordings"))
PROMPTS_ROOT = Path(os.environ.get("PROMPTS_ROOT", _PROJECT / "prompts"))
USERS_FILE = _PROJECT / "app" / "users.json"
PROFILES_ROOT = Path(os.environ.get("PROFILES_ROOT", _PROJECT / "profiles"))

# Sensitive config (admin password, secret key) read from config.json — NOT in the repo.
# Copy config.example.json to config.json and edit before deploying.
# config.json is gitignored and never committed.
_CONFIG_FILE = _PROJECT / "app" / "config.json"


def _load_config(config_file=_CONFIG_FILE):
    """Load explicit config, or create safe process-local development defaults."""
    config_file = Path(config_file)
    if not config_file.exists():
        logging.getLogger(__name__).warning(
            "%s is missing; using local-only admin password and an ephemeral session secret",
            config_file,
        )
        return {"admin_password": "admin123", "secret_key": secrets.token_hex(32)}
    try:
        config = json.loads(config_file.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        raise RuntimeError(f"Cannot read config file {config_file}: {exc}") from exc

    if not isinstance(config, dict):
        raise RuntimeError(f"Configuration is invalid in {config_file}: expected an object")
    password = config.get("admin_password")
    secret_key = config.get("secret_key")
    weak_passwords = {"admin123", "CHANGE_ME", "change-me-before-deploying"}
    if (
        not isinstance(password, str)
        or len(password) < 8
        or password in weak_passwords
        or not isinstance(secret_key, str)
        or len(secret_key) < 32
        or secret_key.startswith("CHANGE_ME")
    ):
        raise RuntimeError(
            f"Configuration is invalid in {config_file}: use a non-default password "
            "and a random secret_key of at least 32 characters"
        )
    return config

_cfg = _load_config()
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = _cfg["admin_password"]

class ProfileLimitedRequest(Request):
    @property
    def max_content_length(self):
        if self.path == '/api/profile':
            return 6 * 1024 * 1024
        return super().max_content_length


# Python/Windows MIME tables can omit WebP or inherit a generic registry type.
mimetypes.add_type("image/webp", ".webp")

app = Flask(__name__)
app.request_class = ProfileLimitedRequest
app.secret_key = _cfg["secret_key"]
app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024  # 500 MB upload cap
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

# Map file extension → MIME type for serving, and the reverse for uploads.
# The in-browser recorder sends the actual MIME via a form field so the server
# stores the right extension instead of forcing everything into .mp4.
_EXT_TO_MIME = {".mp4": "video/mp4", ".webm": "video/webm"}
_MIME_TO_EXT = {v: k for k, v in _EXT_TO_MIME.items()}


def _ffmpeg_path():
    """Return the ffmpeg binary path. Tries PATH first, then imageio-ffmpeg."""
    try:
        import shutil
        p = shutil.which("ffmpeg")
        if p:
            return p
    except Exception:
        pass
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"  # fallback to PATH lookup


def _generate_thumb(video_path):
    """Generate a thumbnail JPEG at 2s into the video using ffmpeg.

    Writes thumb.jpg next to the video file. Silently skips if ffmpeg
    is not installed or fails — the /thumb route will 404 and the
    frontend falls back to the accent color.
    """
    try:
        thumb = Path(video_path).parent / "thumb.jpg"
        subprocess.run(
            [_ffmpeg_path(), "-y", "-ss", "2", "-i", str(video_path),
             "-frames:v", "1", "-update", "1", "-q:v", "3",
             "-vf", "scale=480:-2", str(thumb)],
            capture_output=True, timeout=10)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass


def _needs_compress(video_path, max_size_mb=5):
    """Return True if the video file is larger than the threshold."""
    try:
        return Path(video_path).stat().st_size > max_size_mb * 1024 * 1024
    except OSError:
        return False


def _compress_video(video_path):
    """Re-encode a video to a web-friendly size using ffmpeg if it exceeds the
    size threshold.

    Targets 1.5Mbps max bitrate, 960px wide. Overwrites the original only
    if compression succeeds and the result is smaller. Skips files already
    under the threshold to avoid double-compressing.
    """
    p = Path(video_path)
    if not _needs_compress(p):
        return False
    tmp = p.parent / f"{p.stem}_tmp{p.suffix}"
    try:
        subprocess.run(
            [_ffmpeg_path(), "-y", "-i", str(p),
             "-c:v", "libx264", "-preset", "fast", "-crf", "28",
             "-maxrate", "1500k", "-bufsize", "3000k",
             "-vf", "scale=960:-2",
             "-c:a", "aac", "-b:a", "128k",
             str(tmp)],
            capture_output=True, timeout=120)
        if tmp.exists() and tmp.stat().st_size > 0 and tmp.stat().st_size < p.stat().st_size:
            p.unlink()
            tmp.rename(p)
            return True
        tmp.unlink(missing_ok=True)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        tmp.unlink(missing_ok=True)
    return False

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
        account_at_login = load_users().get(username)
        if _valid_username(username) and verify_password(username, password):
            session.pop('profile_csrf', None)
            session.pop('profile_identity', None)
            session['profile_account_stamp'] = _account_stamp(username, account_at_login)
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
    username = _profile_user()
    profile = {'displayName': username, 'avatarUrl': None}
    if _valid_username(username):
        try:
            with profile_lock(PROFILES_ROOT, username):
                username = _profile_user()
                if username:
                    profile.update(read_profile(PROFILES_ROOT, username))
                else:
                    profile = {'displayName': None, 'avatarUrl': None}
        except (OSError, ValueError):
            app.logger.warning('Profile unavailable; keeping account display defaults.')
    return jsonify({"username": username, "isAdmin": username == ADMIN_USERNAME, **profile})


@app.after_request
def private_profile_responses(response):
    if request.path.startswith('/api/profile') or request.path == '/api/me':
        response.headers['Cache-Control'] = 'private, no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.vary.add('Cookie')
    return response


def _profile_user():
    username = session.get('username')
    if not _valid_username(username):
        return None
    users = load_users()
    if username not in users:
        return None
    if session.get('profile_account_stamp') != _account_stamp(username, users[username]):
        return None
    return username


def _account_stamp(username, account):
    material = (username + '\0' + json.dumps(account, sort_keys=True)).encode('utf-8')
    key = app.secret_key.encode('utf-8') if isinstance(app.secret_key, str) else app.secret_key
    return hmac.new(key, material, hashlib.sha256).hexdigest()


def _delete_user_with_profile(username):
    with profile_lock(PROFILES_ROOT, username):
        users = load_users()
        if username not in users:
            return False
        delete_profile(PROFILES_ROOT, username)
        del users[username]
        save_users(users)
        return True


@app.route('/api/profile', methods=['GET', 'POST'])
def api_profile():
    username = _profile_user()
    if not username:
        return jsonify(error='Please sign in again.'), 401
    if request.method == 'GET':
        try:
            with profile_lock(PROFILES_ROOT, username):
                if _profile_user() != username:
                    return jsonify(error='Please sign in again.'), 401
                if not session.get('profile_csrf') or session.get('profile_identity') != username:
                    session['profile_csrf'] = secrets.token_hex(32)
                    session['profile_identity'] = username
                return jsonify(username=username, csrfToken=session['profile_csrf'],
                               **read_profile(PROFILES_ROOT, username))
        except (OSError, ValueError):
            return jsonify(error='Your profile is unavailable. Please try again.'), 503
    token = request.headers.get('X-CSRF-Token', '')
    if (session.get('profile_identity') != username or not token
            or not secrets.compare_digest(session.get('profile_csrf', '').encode('utf-8'), token.encode('utf-8'))):
        return jsonify(error='Please reopen My Profile and try again.'), 403
    try:
        if (set(request.form) - {'nickname', 'resetAvatar'} or set(request.files) - {'avatar'}
                or any(len(request.form.getlist(k)) != 1 for k in request.form)
                or len(request.files.getlist('avatar')) > 1):
            return jsonify(error='Invalid profile fields.'), 400
        reset = request.form.get('resetAvatar', 'false')
        if reset not in ('true', 'false'):
            return jsonify(error='Invalid default avatar choice.'), 400
        photo = request.files.get('avatar')
        image = photo.read(IMAGE_LIMIT + 1) if photo else None
        with profile_lock(PROFILES_ROOT, username):
            # Serialize against deletion and recheck after waiting for the lock.
            if _profile_user() != username:
                return jsonify(error='Please sign in again.'), 401
            result = save_profile(PROFILES_ROOT, username, request.form.get('nickname', ''),
                                  image, reset == 'true')
        return jsonify(username=username, **result)
    except RequestEntityTooLarge:
        return jsonify(error='This upload is too large. Choose a photo smaller than 5 MB.'), 413
    except ValueError as exc:
        return jsonify(error=str(exc)), 400
    except OSError:
        app.logger.exception('Could not save profile.')
        return jsonify(error='Could not save. Your previous profile is still available. Please retry.'), 503


@app.route('/api/profile/avatar')
def profile_avatar():
    username = _profile_user()
    if not username:
        return jsonify(error='Please sign in again.'), 401
    try:
        with profile_lock(PROFILES_ROOT, username):
            if _profile_user() != username:
                return jsonify(error='Please sign in again.'), 401
            data = read_avatar(PROFILES_ROOT, username)
    except (ValueError, OSError):
        return jsonify(error='Your photo is unavailable.'), 404
    if data is None:
        return jsonify(error='No custom photo.'), 404
    return send_file(io.BytesIO(data), mimetype='image/jpeg', download_name='avatar.jpg')


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
            if _valid_username(username) and _delete_user_with_profile(username):
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
        if _delete_user_with_profile(username):
            return jsonify({"ok": True, "users": [u for u in load_users().keys() if u != ADMIN_USERNAME]})
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
        scan_curriculum_library(
            CURRICULUM_ROOT,
            CURRICULUM_STAGE,
            DEMO_ROOT,
            RECORDINGS_ROOT,
            username=session["username"],
        )))


@app.route("/thumb/<chapter>/<level>")
def thumb(chapter, level):
    """Serve a pre-generated thumbnail JPEG for a level's demo video.

    Thumbnails live at demo_root/<stage>/<chapter>/<level>/thumb.jpg and are
    generated server-side via ffmpeg. Falls back to 404 if missing.
    """
    base = DEMO_ROOT / CURRICULUM_STAGE
    base_resolved = base.resolve()
    d = (base / chapter / level).resolve()
    if not d.is_relative_to(base_resolved):
        abort(404)
    f = (d / "thumb.jpg").resolve()
    if f.is_file() and f.is_relative_to(base_resolved):
        return send_file(f, mimetype="image/jpeg")
    abort(404)


@app.route("/video/<chapter>/<level>/<kind>")
def video(chapter, level, kind):
    """Serve a demo (shared) or performance (per-user) video file.

    demo videos are shared across users and need no login. performance videos
    are isolated per user under recordings_root/<username>/<stage>/<chapter>/<level>/
    and require a logged-in user. Path-traversal guard: the resolved file must
    stay under the effective base directory for this kind.
    """
    if kind == "performance":
        if "username" not in session:
            return redirect(url_for("login"))
        username = session["username"]
        if not _valid_username(username):
            abort(404)
        base = RECORDINGS_ROOT / username / CURRICULUM_STAGE
        name = "performance"
    elif kind == "demo":
        base = DEMO_ROOT / CURRICULUM_STAGE
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

    demo uploads go to the shared demo_root/<stage>/<chapter>/<level>/ but still require
    login. performance uploads go to the user's own folder
    recordings_root/<username>/<stage>/<chapter>/<level>/ so each child's recordings
    stay isolated from other users.

    The in-browser recorder sends the actual MIME type via a ``mimeType`` form
    field so the server picks the right extension (.webm for Chrome, .mp4 for
    Safari). Legacy file uploads without this field default to .mp4.
    """
    username = session["username"]
    if kind == "performance":
        if not _valid_username(username):
            abort(404)
        base = RECORDINGS_ROOT / username / CURRICULUM_STAGE
    elif kind == "demo":
        base = DEMO_ROOT / CURRICULUM_STAGE
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
    _compress_video(target)
    if kind == "demo":
        _generate_thumb(target)
    return jsonify({"ok": True, "path": str(target.relative_to(base_resolved)), "ext": ext})


@app.route("/api/prompts/<chapter>/<level>")
def api_prompts(chapter, level):
    """Return optional A/B/C video prompts for a canonical Lesson."""
    stage_dir = (CURRICULUM_ROOT / CURRICULUM_STAGE).resolve()
    lesson_dir = (stage_dir / chapter / level).resolve()
    if not lesson_dir.is_relative_to(stage_dir):
        abort(404)
    if not (lesson_dir / "lesson.json").is_file():
        abort(404)
    prompts_base = (PROMPTS_ROOT / CURRICULUM_STAGE).resolve()
    prompts_dir = (prompts_base / chapter / level).resolve()
    if not prompts_dir.is_relative_to(prompts_base):
        abort(404)

    def _read(part):
        f = prompts_dir / f"{part}.txt"
        if not f.is_file():
            return ""
        return f.read_text(encoding="utf-8")

    return jsonify({part: _read(part) for part in ("a", "b", "c")})


def _scan_and_optimize():
    """Scan demo and recordings trees on startup.

    For every video found:
    - Compress if larger than the threshold (skip already-small files).
    - For demo videos: generate a thumbnail if one is missing.
    """
    import sys
    roots_to_scan = []
    if DEMO_ROOT.is_dir():
        roots_to_scan.append(DEMO_ROOT)
    if RECORDINGS_ROOT.is_dir():
        roots_to_scan.append(RECORDINGS_ROOT)

    total = 0
    for root in roots_to_scan:
        for ext in VIDEO_EXTENSIONS:
            for video in root.rglob(f"*{ext}"):
                if video.stem.endswith("_tmp"):
                    continue
                total += 1
                _compress_video(video)
                if root == DEMO_ROOT:
                    thumb = video.parent / "thumb.jpg"
                    if not thumb.exists():
                        _generate_thumb(video)
    if total:
        print(f"[scan] Processed {total} video file(s) in demo/ and recordings/", file=sys.stderr)


if __name__ == "__main__":
    _scan_and_optimize()
    debug = os.environ.get("FLASK_DEBUG", "").lower() in ("1", "true", "yes")
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", debug=debug, port=port)
