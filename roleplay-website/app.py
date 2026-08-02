import os
from pathlib import Path
from flask import Flask, jsonify, render_template, abort, send_file

from scanner import scan_library, annotate_states

ROOT = Path(os.environ.get(
    "LIBRARY_ROOT",
    Path(__file__).resolve().parent.parent / "roleplay-dialogues",
))

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("map.html")


@app.route("/api/library")
def api_library():
    return jsonify(annotate_states(scan_library(ROOT)))


@app.route("/video/<chapter>/<level>/<kind>")
def video(chapter, level, kind):
    if kind not in ("demo", "performance"):
        abort(404)
    file = ROOT / chapter / level / f"{kind}.mp4"
    if not file.is_file():
        abort(404)
    return send_file(file, mimetype="video/mp4")


if __name__ == "__main__":
    app.run(debug=True, port=5000)
