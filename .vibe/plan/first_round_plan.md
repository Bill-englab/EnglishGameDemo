# Role-Play Map — First Round Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local web app that scans `roleplay-dialogues/章/关/`, renders a kid-facing "chapter → level" map with locked/unlocked/completed states, plays each level's `demo.mp4`, and shows a completed level as a clickable thumbnail of the child's own `performance.mp4`.

**Architecture:** Single-file Python/Flask backend treats the filesystem as the database (no DB, no upload endpoint). A scanner module walks the tree into a plain data structure and annotates each level's state. The browser fetches the tree as JSON and renders it with vanilla HTML/CSS/JS — no build step. Dropping a `performance.mp4` into a level folder + refreshing the page is what lights a level up.

**Tech Stack:** Python 3.10+, Flask, pytest, vanilla HTML/CSS/JS.

## Global Constraints

- Python 3.10+ (uses `list[dict]` type hints).
- One runtime dependency: `flask`. Tests use `pytest`.
- No frontend build step — vanilla JS served as static files.
- Local-only; never deployed to the public internet.
- Content root default: `../roleplay-dialogues` relative to the app dir; overridable via `LIBRARY_ROOT` env var.
- Directory names must be **zero-prefixed** (`01-`, `02-`, … `10-`) so plain string sort yields the right order.
- Each level folder is well-formed for v1: contains `meta.json` + `demo.mp4`; `performance.mp4` is optional (its presence = completed).
- `meta.json` schema: `{ "title": string, "scene": string, "dialogue": [ {"speaker": string, "line": string}, ... ] }`.
- App lives in a new sibling dir `roleplay-website/` (not inside `roleplay-dialogues/`).

---

## File Structure

```
D:/TaviusProject/roleplay-website/
  app.py                     # Flask backend: page, /api/library, /video/...
  scanner.py                 # Pure logic: scan_library() + annotate_states()
  requirements.txt           # flask
  .gitignore                 # __pycache__, .venv, *.pyc
  templates/
    map.html                 # The map page (loads #map + modal player)
  static/
    style.css                # Kid-friendly big-node styling
    app.js                   # Fetch library, render nodes, play videos
  tests/
    test_scanner.py          # Unit tests for scan + state logic
    test_app.py              # Route tests via Flask test client
```

`scanner.py` holds all pure, easily-testable logic. `app.py` is thin glue (routes that call the scanner and serve files). The frontend is split into one HTML shell, one CSS file, one JS file — each one responsibility.

---

## Task 0: Scaffold + git init

**Files:**
- Create: `roleplay-website/requirements.txt`
- Create: `roleplay-website/.gitignore`
- Create: `roleplay-website/tests/__init__.py` (empty)
- Create: `roleplay-website/scanner.py` (empty stub)
- Create: `roleplay-website/app.py` (empty stub)

**Interfaces:**
- Consumes: nothing
- Produces: the project directory + an initialized git repo so later tasks can commit.

- [ ] **Step 1: Create the directory tree**

```bash
mkdir -p roleplay-website/templates roleplay-website/static roleplay-website/tests
cd roleplay-website
```

- [ ] **Step 2: Write `requirements.txt`**

```
flask
```

- [ ] **Step 3: Write `.gitignore`**

```
__pycache__/
*.pyc
.venv/
```

- [ ] **Step 4: Create empty stubs so later tasks import cleanly**

`scanner.py`:
```python
# Pure logic for scanning the role-play library. Implemented in Task 1+.
```

`app.py`:
```python
# Flask backend. Implemented in Task 3+.
```

`tests/__init__.py`: (empty file)

- [ ] **Step 5: Initialize git at the project root and install deps**

```bash
cd D:/TaviusProject
git init
python -m venv roleplay-website/.venv
roleplay-website/.venv/Scripts/python -m pip install -r roleplay-website/requirements.txt pytest
```

> If you skip git, ignore the commit steps in later tasks. If Python venv activation differs on your machine, use `roleplay-website/.venv/Scripts/python` (Windows) explicitly as shown.

- [ ] **Step 6: Commit**

```bash
cd D:/TaviusProject
git add roleplay-website
git commit -m "chore: scaffold roleplay-website"
```

---

## Task 1: Scanner — read the library tree

**Files:**
- Modify: `roleplay-website/scanner.py`
- Test: `roleplay-website/tests/test_scanner.py`

**Interfaces:**
- Consumes: nothing
- Produces: `scan_library(root: Path) -> list[dict]` — returns chapters in order, each `{ "name": str, "levels": [ { "chapter", "level", "title", "has_demo": bool, "has_performance": bool } ] }`. `root` is a `pathlib.Path`.

- [ ] **Step 1: Write the failing tests**

`roleplay-website/tests/test_scanner.py`:
```python
from pathlib import Path
import json
from scanner import scan_library


def make_level(parent: Path, name: str, *, demo=False, performance=False, title=None):
    d = parent / name
    d.mkdir(parents=True)
    if title is not None:
        (d / "meta.json").write_text(
            json.dumps({"title": title}), encoding="utf-8")
    if demo:
        (d / "demo.mp4").write_bytes(b"")
    if performance:
        (d / "performance.mp4").write_bytes(b"")
    return d


def test_scan_empty_root_returns_empty_list(tmp_path):
    assert scan_library(tmp_path / "does-not-exist") == []


def test_scan_returns_one_chapter_one_level_with_flags(tmp_path):
    root = tmp_path / "lib"
    make_level(root / "01-chapter", "01-scene", demo=True, title="Scene One")
    chapters = scan_library(root)
    assert len(chapters) == 1
    assert chapters[0]["name"] == "01-chapter"
    lv = chapters[0]["levels"][0]
    assert lv["title"] == "Scene One"
    assert lv["has_demo"] is True
    assert lv["has_performance"] is False
    assert lv["chapter"] == "01-chapter"
    assert lv["level"] == "01-scene"


def test_scan_orders_chapters_and_levels_by_name(tmp_path):
    root = tmp_path / "lib"
    make_level(root / "02-b", "02-y", demo=True)
    make_level(root / "02-b", "01-x", demo=True)
    make_level(root / "01-a", "01-w", demo=True)
    chapters = scan_library(root)
    assert [c["name"] for c in chapters] == ["01-a", "02-b"]
    assert [lv["level"] for lv in chapters[1]["levels"]] == ["01-x", "02-y"]


def test_scan_falls_back_to_dir_name_when_no_meta(tmp_path):
    root = tmp_path / "lib"
    make_level(root / "01-c", "01-s", demo=True)  # no title
    chapters = scan_library(root)
    assert chapters[0]["levels"][0]["title"] == "01-s"


def test_scan_records_performance_presence(tmp_path):
    root = tmp_path / "lib"
    make_level(root / "01-c", "01-s", demo=True, performance=True)
    chapters = scan_library(root)
    assert chapters[0]["levels"][0]["has_performance"] is True


def test_scan_ignores_stray_files_at_chapter_level(tmp_path):
    root = tmp_path / "lib"
    (root / "01-c").mkdir(parents=True)
    (root / "01-c" / "notes.txt").write_text("ignore me", encoding="utf-8")
    make_level(root / "01-c", "01-s", demo=True)
    chapters = scan_library(root)
    assert len(chapters[0]["levels"]) == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd roleplay-website
.venv/Scripts/python -m pytest tests/test_scanner.py -v
```
Expected: FAIL — `scan_library` not defined / module empty.

- [ ] **Step 3: Implement `scan_library`**

`roleplay-website/scanner.py`:
```python
from pathlib import Path
import json


def scan_library(root: Path) -> list[dict]:
    """Walk the library root, return chapters (each with levels) in order.

    Each level: { chapter, level, title, has_demo, has_performance }.
    Directories must be zero-prefixed so string sort matches intended order.
    """
    chapters: list[dict] = []
    if not root.exists():
        return chapters
    for chapter_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        levels = []
        for level_dir in sorted(p for p in chapter_dir.iterdir() if p.is_dir()):
            levels.append({
                "chapter": chapter_dir.name,
                "level": level_dir.name,
                "title": _read_title(level_dir),
                "has_demo": (level_dir / "demo.mp4").exists(),
                "has_performance": (level_dir / "performance.mp4").exists(),
            })
        if levels:
            chapters.append({"name": chapter_dir.name, "levels": levels})
    return chapters


def _read_title(level_dir: Path) -> str:
    meta = level_dir / "meta.json"
    if not meta.exists():
        return level_dir.name
    try:
        return json.loads(meta.read_text(encoding="utf-8")).get(
            "title", level_dir.name)
    except (json.JSONDecodeError, OSError):
        return level_dir.name
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
.venv/Scripts/python -m pytest tests/test_scanner.py -v
```
Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
cd D:/TaviusProject
git add roleplay-website/scanner.py roleplay-website/tests/test_scanner.py
git commit -m "feat: scan role-play library into ordered chapter/level tree"
```

---

## Task 2: State annotation — locked / unlocked / completed / current

**Files:**
- Modify: `roleplay-website/scanner.py` (add `annotate_states`)
- Test: `roleplay-website/tests/test_scanner.py` (add cases)

**Interfaces:**
- Consumes: `scan_library` output from Task 1.
- Produces: `annotate_states(chapters: list[dict]) -> list[dict]` — mutates each level to add `"state"` (`"locked"` | `"unlocked"` | `"completed"`) and `"current": bool`. First level is always unlocked; a level is unlocked iff the previous level (global order) is completed; a level is completed iff `has_performance`. The first unlocked-not-completed level gets `current: True`.

- [ ] **Step 1: Write the failing tests**

Append to `roleplay-website/tests/test_scanner.py`:
```python
from scanner import annotate_states


def lib_with(*specs, tmp_path):
    """specs: list of (chapter, level, has_performance). Returns scanned+annotated."""
    root = tmp_path / "lib"
    for ch, lv, perf in specs:
        make_level(root / ch, lv, demo=True, performance=perf)
    return annotate_states(scan_library(root))


def _flat(chapters):
    return [lv for ch in chapters for lv in ch["levels"]]


def test_first_level_is_unlocked_and_current(tmp_path):
    chapters = lib_with(("01-c", "01-s", False), tmp_path=tmp_path)
    lv = _flat(chapters)[0]
    assert lv["state"] == "unlocked"
    assert lv["current"] is True


def test_completed_level_marks_next_unlocked_current(tmp_path):
    chapters = lib_with(
        ("01-c", "01-s", True), ("01-c", "02-s", False), tmp_path=tmp_path)
    flat = _flat(chapters)
    assert flat[0]["state"] == "completed"
    assert flat[1]["state"] == "unlocked"
    assert flat[1]["current"] is True
    assert flat[0].get("current", False) is False


def test_locked_when_previous_not_completed(tmp_path):
    chapters = lib_with(
        ("01-c", "01-s", False), ("01-c", "02-s", False), tmp_path=tmp_path)
    flat = _flat(chapters)
    assert flat[0]["state"] == "unlocked"
    assert flat[1]["state"] == "locked"


def test_state_carries_across_chapters(tmp_path):
    chapters = lib_with(
        ("01-c", "01-s", True), ("02-c", "01-s", False), tmp_path=tmp_path)
    flat = _flat(chapters)
    assert flat[0]["state"] == "completed"
    assert flat[1]["state"] == "unlocked"
    assert flat[1]["chapter"] == "02-c"


def test_all_completed_has_no_current(tmp_path):
    chapters = lib_with(("01-c", "01-s", True), tmp_path=tmp_path)
    flat = _flat(chapters)
    assert flat[0]["state"] == "completed"
    assert flat[0].get("current", False) is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
.venv/Scripts/python -m pytest tests/test_scanner.py -v
```
Expected: the 5 new tests FAIL (`annotate_states` not defined).

- [ ] **Step 3: Implement `annotate_states`**

Append to `roleplay-website/scanner.py`:
```python
def annotate_states(chapters: list[dict]) -> list[dict]:
    """Set each level's state (locked/unlocked/completed) and mark current.

    Walks levels in global order. First level is unlocked. Each later level is
    unlocked iff the previous level has a performance video. Completed iff
    has_performance. The first unlocked-but-not-completed level is 'current'.
    Mutates and returns the input.
    """
    flat = [lv for ch in chapters for lv in ch["levels"]]
    prev_completed = True  # the first level has nothing required before it
    current_set = False
    for lv in flat:
        if lv["has_performance"]:
            lv["state"] = "completed"
            lv["current"] = False
        elif prev_completed:
            lv["state"] = "unlocked"
            lv["current"] = not current_set
            current_set = True
        else:
            lv["state"] = "locked"
            lv["current"] = False
        prev_completed = lv["has_performance"]
    return chapters
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
.venv/Scripts/python -m pytest tests/test_scanner.py -v
```
Expected: all 11 PASS.

- [ ] **Step 5: Commit**

```bash
cd D:/TaviusProject
git add roleplay-website/scanner.py roleplay-website/tests/test_scanner.py
git commit -m "feat: annotate levels with locked/unlocked/completed state"
```

---

## Task 3: Flask backend — page, library API, video route

**Files:**
- Modify: `roleplay-website/app.py`
- Create: `roleplay-website/templates/map.html` (minimal shell for now)
- Test: `roleplay-website/tests/test_app.py`

**Interfaces:**
- Consumes: `scan_library`, `annotate_states` from `scanner.py`.
- Produces three routes:
  - `GET /` → renders `templates/map.html`
  - `GET /api/library` → JSON of `annotate_states(scan_library(ROOT))`
  - `GET /video/<chapter>/<level>/<kind>` → serves `<ROOT>/<chapter>/<level>/<kind>.mp4` (kind ∈ `demo`, `performance`), 404 otherwise.
- Reads module global `ROOT` (a `Path`) at request time, so tests can patch `app.ROOT`.

- [ ] **Step 1: Write the failing tests**

`roleplay-website/tests/test_app.py`:
```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd roleplay-website
.venv/Scripts/python -m pytest tests/test_app.py -v
```
Expected: FAIL — routes not defined.

- [ ] **Step 3: Write the minimal HTML shell**

`roleplay-website/templates/map.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Role-Play Map</title>
  <link rel="stylesheet" href="/static/style.css">
</head>
<body>
  <main id="map"></main>
  <div id="player" class="modal">
    <video id="player-video" controls></video>
    <button id="player-close" type="button">✕</button>
  </div>
  <script src="/static/app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Implement the Flask app**

`roleplay-website/app.py`:
```python
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
.venv/Scripts/python -m pytest tests/test_app.py -v
```
Expected: 5 PASS.

- [ ] **Step 6: Commit**

```bash
cd D:/TaviusProject
git add roleplay-website/app.py roleplay-website/templates/map.html roleplay-website/tests/test_app.py
git commit -m "feat: flask backend serves library API, videos, and map page"
```

---

## Task 4: Frontend — render the map with states + play videos

**Files:**
- Create: `roleplay-website/static/app.js`
- Create: `roleplay-website/static/style.css`
- Verify: by running the app against the test fixture (manual browser check)

**Interfaces:**
- Consumes: `GET /api/library` JSON (chapter `{name, levels[]}`, level `{chapter, level, title, state, current, has_demo, has_performance}`) and `GET /video/<chapter>/<level>/<kind>`.
- Produces: a rendered map. Completed nodes show the performance video's first frame as a clickable thumbnail (click → plays performance). Unlocked nodes show the title (click → plays demo). Locked nodes show 🔒 and are inert.

> v1 "face-thumbnail": a completed node uses a `<video preload="metadata">` element as its visual, so the browser shows the video's first frame. The first frame may not literally be the child's face — refining the seek point is a later-round enhancement.

- [ ] **Step 1: Write `app.js`**

`roleplay-website/static/app.js`:
```javascript
async function loadLibrary() {
  const res = await fetch("/api/library");
  return res.json();
}

function nodeFor(level) {
  const div = document.createElement("div");
  div.className = "node node-" + level.state;
  if (level.current) div.classList.add("current");

  if (level.state === "completed" && level.has_performance) {
    const thumb = document.createElement("video");
    thumb.src = `/video/${level.chapter}/${level.level}/performance`;
    thumb.muted = true;
    thumb.preload = "metadata";
    thumb.setAttribute("playsinline", "");
    thumb.setAttribute("aria-label", `Re-play ${level.title}`);
    div.appendChild(thumb);
    div.addEventListener("click", () => openPlayer(level, "performance"));
  } else if (level.state === "unlocked") {
    const label = document.createElement("span");
    label.className = "title";
    label.textContent = level.title;
    div.appendChild(label);
    div.addEventListener("click", () => openPlayer(level, "demo"));
  } else {
    const lock = document.createElement("span");
    lock.className = "lock";
    lock.textContent = "🔒";
    div.appendChild(lock);
  }
  return div;
}

function render(library) {
  const map = document.getElementById("map");
  map.innerHTML = "";
  for (const chapter of library) {
    const section = document.createElement("section");
    section.className = "chapter";
    const heading = document.createElement("h2");
    heading.textContent = chapter.name;
    section.appendChild(heading);
    const row = document.createElement("div");
    row.className = "levels";
    for (const level of chapter.levels) {
      row.appendChild(nodeFor(level));
    }
    section.appendChild(row);
    map.appendChild(section);
  }
}

function openPlayer(level, kind) {
  const modal = document.getElementById("player");
  const v = document.getElementById("player-video");
  v.src = `/video/${level.chapter}/${level.level}/${kind}`;
  modal.classList.add("open");
  v.play();
}

function closePlayer() {
  const modal = document.getElementById("player");
  const v = document.getElementById("player-video");
  v.pause();
  v.removeAttribute("src");
  v.load();
  modal.classList.remove("open");
}

async function init() {
  render(await loadLibrary());
  document.getElementById("player-close")
    .addEventListener("click", closePlayer);
}
init();
```

- [ ] **Step 2: Write `style.css`**

`roleplay-website/static/style.css`:
```css
:root {
  --bg: #fdf6ec;
  --node: #ffd66b;
  --done: #8bd450;
  --locked: #cfcfcf;
  --ink: #333;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: "Comic Sans MS", "Segoe UI", system-ui, sans-serif;
}

#map { padding: 24px; }

.chapter { margin-bottom: 32px; }
.chapter h2 {
  font-size: 22px;
  margin: 0 0 12px;
  text-transform: capitalize;
}

.levels { display: flex; flex-wrap: wrap; gap: 18px; }

.node {
  width: 120px;
  height: 120px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  border: 4px solid transparent;
  background: var(--node);
  transition: transform 0.1s;
}
.node:hover { transform: scale(1.05); }
.node.current { border-color: #ff7043; }

.node-completed { background: var(--done); }
.node-completed video { width: 100%; height: 100%; object-fit: cover; }

.node-locked {
  background: var(--locked);
  cursor: not-allowed;
}
.node-locked:hover { transform: none; }
.node .lock { font-size: 40px; }

.node .title {
  padding: 8px;
  text-align: center;
  font-size: 16px;
  font-weight: bold;
}

.modal {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.modal.open { display: flex; }
.modal video { max-width: 90vw; max-height: 85vh; background: #000; border-radius: 12px; }
#player-close {
  position: absolute;
  top: 24px;
  right: 24px;
  font-size: 28px;
  background: #fff;
  border: none;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  cursor: pointer;
}
```

- [ ] **Step 3: Manual verification against a fake library**

Create a throwaway library with a real short `.mp4` (any small video file works; the browser only needs to play it):
```bash
mkdir -p /tmp/fakelib/01-fun/01-hi /tmp/fakelib/01-fun/02-bye
echo '{"title":"Say hi"}' > /tmp/fakelib/01-fun/01-hi/meta.json
echo '{"title":"Say bye"}' > /tmp/fakelib/01-fun/02-bye/meta.json
# put any small mp4 as demo.mp4 in each, e.g. copy a sample:
# cp ~/Downloads/sample.mp4 /tmp/fakelib/01-fun/01-hi/demo.mp4
# cp ~/Downloads/sample.mp4 /tmp/fakelib/01-fun/02-bye/demo.mp4
```
Run the app pointed at it:
```bash
cd roleplay-website
LIBRARY_ROOT=/tmp/fakelib .venv/Scripts/python app.py
```
Open `http://127.0.0.1:5000` in a browser and confirm:
- Two nodes render under `01-fun`; the first is unlocked+highlighted (current), the second is 🔒 locked.
- Clicking the unlocked node opens the modal and plays the demo.
- Drop a `performance.mp4` into `01-hi` (copy the sample), refresh the page: `01-hi` now shows a green node with the video's first frame; `02-bye` is now unlocked. Clicking `01-hi` plays the performance.
- Stop the server (`Ctrl+C`).

- [ ] **Step 4: Commit**

```bash
cd D:/TaviusProject
git add roleplay-website/static/app.js roleplay-website/static/style.css
git commit -m "feat: render map with state nodes and modal video player"
```

---

## Task 5: Wire to real content + end-to-end verification

**Files:**
- Create (real content, by the father): `roleplay-dialogues/01-wants-requests/01-i-want-water/meta.json`
- Add (real content): a `demo.mp4` into that same folder (AI-generated later is fine; any short mp4 for now).

**Interfaces:**
- Consumes: the full app from Tasks 1–4.
- Produces: one fully working real level end-to-end — the "贯通第一关" milestone from `design-proposal.md` §8.

- [ ] **Step 1: Create the first real level**

```bash
mkdir -p roleplay-dialogues/01-wants-requests/01-i-want-water
```

Write `roleplay-dialogues/01-wants-requests/01-i-want-water/meta.json`:
```json
{
  "title": "I want water",
  "scene": "At the dinner table. The child is thirsty.",
  "dialogue": [
    {"speaker": "Child", "line": "I want water, please."},
    {"speaker": "Dad",   "line": "Here you go. Say thank you."},
    {"speaker": "Child", "line": "Thank you, Dad!"}
  ]
}
```

- [ ] **Step 2: Drop in a `demo.mp4`**

Place any short `.mp4` at `roleplay-dialogues/01-wants-requests/01-i-want-water/demo.mp4`. (An AI-generated animation is the eventual goal per the design proposal; for first-round verification any playable mp4 is enough.)

- [ ] **Step 3: Run against the real library**

```bash
cd roleplay-website
.venv/Scripts/python app.py
```
Open `http://127.0.0.1:5000`. Confirm:
- Chapter `01-wants-requests` shows with one unlocked, current node titled "I want water".
- Clicking it plays `demo.mp4`.
- No `performance.mp4` yet → node stays yellow, not green.

- [ ] **Step 4: Do the real role-play + record + drop the file (the actual milestone)**

This step is done with the child, not at the keyboard:
1. Watch the demo together.
2. Role-play the "I want water" exchange until the child can do it.
3. Record the child's performance to a file named `performance.mp4`.
4. Copy that file into `roleplay-dialogues/01-wants-requests/01-i-want-water/`.
5. Refresh the browser.

Confirm the milestone: the "I want water" node turns green and shows the child's video frame; clicking it plays the child's performance.

- [ ] **Step 5: Commit the content + close the round**

```bash
cd D:/TaviusProject
git add roleplay-dialogues/01-wants-requests/01-i-want-water
git commit -m "content: first real level (01-wants-requests/01-i-want-water)"
```

---

## Self-Review

**Spec coverage** (against `.vibe/design-proposal.md`):
- §2 trophy-layer positioning → reflected in architecture (no teaching logic). ✓
- §3 chapter→level map, dense star rhythm → Tasks 1–2 model chapters/levels; Task 4 renders them. ✓
- §3 state table (locked/unlocked/completed) → Task 2 `annotate_states` + tests. ✓
- §4 face-thumbnail node → Task 4 completed-node `<video>` thumbnail. ✓ (first-frame limitation noted inline)
- §5 per-level `{meta.json, demo.mp4, performance.mp4}` → Task 1 reads these; Task 3 serves them. ✓
- §6 two-level folder + 3 state rules → Task 1 (order by name), Task 2 (unlock/lit rules). ✓
- §7 local + filesystem-as-DB + manual drop → Tasks 3, 5. ✓
- §8 two phases + "贯通第一关" → Task 5 is exactly that milestone. ✓
- Parked decisions (§10 who-taps, lighting ceremony) and exclusions (§11 no upload UI, no star tiers, no public deploy) are intentionally out of scope. ✓

**Placeholder scan:** no TBD/TODO/“add error handling”/“similar to Task N”. Every code step contains runnable code. ✓

**Type consistency:** `scan_library` returns `list[dict]` with keys `name`/`levels`; each level carries `chapter`/`level`/`title`/`has_demo`/`has_performance`, and `annotate_states` adds `state`/`current`. `app.py` and `app.js` both consume exactly these keys (e.g. `level.chapter`, `level.level`, `level.state`, `level.current`, `level.has_performance`, `level.title`). Route path `/video/<chapter>/<level>/<kind>` matches the JS-built URL `/video/${level.chapter}/${level.level}/${kind}`. ✓
