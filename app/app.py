import os
from pathlib import Path
from flask import Flask, jsonify, render_template, abort, send_file, request

from scanner import scan_library, annotate_states

_PROJECT = Path(__file__).resolve().parent.parent
CONTENT_ROOT = Path(os.environ.get("CONTENT_ROOT", _PROJECT / "content"))
DEMO_ROOT = Path(os.environ.get("DEMO_ROOT", _PROJECT / "demo"))
RECORDINGS_ROOT = Path(os.environ.get("RECORDINGS_ROOT", _PROJECT / "recordings"))

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


if __name__ == "__main__":
    app.run(debug=True, port=5000)
