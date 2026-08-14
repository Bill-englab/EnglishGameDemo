# Role-Play Map

A local web app that turns offline parent-child English role-play into a
"chapter → level" star map. The filesystem is the database; dropping a
`performance.mp4` into a level folder lights that level up and unlocks the next.

## Setup (one time)

```bash
cd roleplay-website
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # Windows
# macOS/Linux:  .venv/bin/python -m pip install -r requirements.txt
```

## Run

```bash
cd roleplay-website
.venv/Scripts/python app.py      # then open http://127.0.0.1:5000
```

## Content layout

Each level lives at `roleplay-dialogues/<chapter>/<level>/`:

- `meta.json` — `{ "title": "...", "scene": "...", "dialogue": [...] }`
- `demo.mp4` — the model animation (made in the prep phase)
- `performance.mp4` — the child's recording. **Its presence lights the level
  up (shows the child's video as the node) and unlocks the next level.**

Override the content root: `LIBRARY_ROOT=/path/to/lib .venv/Scripts/python app.py`.

## Tests

```bash
cd roleplay-website
.venv/Scripts/python -m pytest
```
