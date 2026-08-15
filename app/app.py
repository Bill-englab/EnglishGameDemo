import os
from pathlib import Path
from flask import Flask, jsonify, render_template, abort, send_file, request

from scanner import scan_library, annotate_states, VIDEO_EXTENSIONS

_PROJECT = Path(__file__).resolve().parent.parent
CONTENT_ROOT = Path(os.environ.get("CONTENT_ROOT", _PROJECT / "content"))
DEMO_ROOT = Path(os.environ.get("DEMO_ROOT", _PROJECT / "demo"))
RECORDINGS_ROOT = Path(os.environ.get("RECORDINGS_ROOT", _PROJECT / "recordings"))
PROMPTS_ROOT = Path(os.environ.get("PROMPTS_ROOT", _PROJECT / "prompts"))

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024  # 500 MB upload cap

# Map file extension → MIME type for serving, and the reverse for uploads.
# The in-browser recorder sends the actual MIME via a form field so the server
# stores the right extension instead of forcing everything into .mp4.
_EXT_TO_MIME = {".mp4": "video/mp4", ".webm": "video/webm"}
_MIME_TO_EXT = {v: k for k, v in _EXT_TO_MIME.items()}


@app.route("/")
def index():
    return render_template("map.html")


@app.route("/api/library")
def api_library():
    return jsonify(annotate_states(
        scan_library(CONTENT_ROOT, DEMO_ROOT, RECORDINGS_ROOT)))


@app.route("/video/<chapter>/<level>/<kind>")
def video(chapter, level, kind):
    root = {"demo": DEMO_ROOT, "performance": RECORDINGS_ROOT}.get(kind)
    if root is None:
        abort(404)
    # Resolve and guard against path traversal (e.g. ".." segments); the
    # served file must stay under the root for this kind.
    d = (root / chapter / level).resolve()
    if not d.is_relative_to(root.resolve()):
        abort(404)
    # Try each supported extension; serve the first that exists with the
    # matching MIME type so webm recordings play correctly.
    for ext, mt in _EXT_TO_MIME.items():
        f = (d / f"{kind}{ext}").resolve()
        if f.is_file() and f.is_relative_to(root.resolve()):
            return send_file(f, mimetype=mt)
    abort(404)


@app.route("/upload/<chapter>/<level>/<kind>", methods=["POST"])
def upload(chapter, level, kind):
    """Receive a video file and save it to the matching tree (demo/ or recordings/).

    Reuses the same path-traversal guard as the /video route. FileStorage.save()
    streams to disk, so large videos don't pile up in memory.

    The in-browser recorder sends the actual MIME type via a ``mimeType`` form
    field so the server picks the right extension (.webm for Chrome, .mp4 for
    Safari). Legacy file uploads without this field default to .mp4.
    """
    root = {"demo": DEMO_ROOT, "performance": RECORDINGS_ROOT}.get(kind)
    if root is None:
        abort(404)
    d = (root / chapter / level).resolve()
    if not d.is_relative_to(root.resolve()):
        abort(404)
    if "file" not in request.files:
        abort(400)
    f = request.files["file"]
    if not f.filename:
        abort(400)
    mt = request.form.get("mimeType", "").strip()
    ext = _MIME_TO_EXT.get(mt, ".mp4")
    target = (d / f"{kind}{ext}").resolve()
    if not target.is_relative_to(root.resolve()):
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
    return jsonify({"ok": True, "path": str(target.relative_to(root)), "ext": ext})


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
    app.run(debug=True, port=5000)
