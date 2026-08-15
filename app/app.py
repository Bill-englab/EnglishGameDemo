import os
from pathlib import Path
from flask import Flask, jsonify, render_template, abort, send_file, request

from scanner import scan_library, annotate_states

_PROJECT = Path(__file__).resolve().parent.parent
CONTENT_ROOT = Path(os.environ.get("CONTENT_ROOT", _PROJECT / "content"))
DEMO_ROOT = Path(os.environ.get("DEMO_ROOT", _PROJECT / "demo"))
RECORDINGS_ROOT = Path(os.environ.get("RECORDINGS_ROOT", _PROJECT / "recordings"))
PROMPTS_ROOT = Path(os.environ.get("PROMPTS_ROOT", _PROJECT / "prompts"))

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024  # 500 MB upload cap


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
    file = (root / chapter / level / f"{kind}.mp4").resolve()
    if not file.is_relative_to(root.resolve()):
        abort(404)
    if not file.is_file():
        abort(404)
    return send_file(file, mimetype="video/mp4")


@app.route("/upload/<chapter>/<level>/<kind>", methods=["POST"])
def upload(chapter, level, kind):
    """Receive a video file and save it to the matching tree (demo/ or recordings/).

    Reuses the same path-traversal guard as the /video route. FileStorage.save()
    streams to disk, so large videos don't pile up in memory.
    """
    root = {"demo": DEMO_ROOT, "performance": RECORDINGS_ROOT}.get(kind)
    if root is None:
        abort(404)
    target = (root / chapter / level / f"{kind}.mp4").resolve()
    if not target.is_relative_to(root.resolve()):
        abort(404)
    if "file" not in request.files:
        abort(400)
    f = request.files["file"]
    if not f.filename:
        abort(400)
    target.parent.mkdir(parents=True, exist_ok=True)
    f.save(target)
    return jsonify({"ok": True, "path": str(target.relative_to(root))})


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
