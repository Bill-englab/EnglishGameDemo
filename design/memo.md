# Detail Page Redesign — Requirement Memo

## Confirmed Requirements

### 1. Detail page content (4 blocks)
- **Demo video** (original AI animation) — large, primary
- **Performance video** (child's recording) — large, primary
- **Original dialogue** (from meta.json, already shown but needs visual upgrade)
- **Video generation prompts** (from `prompts/<chapter>/D{N}a.txt` + `D{N}b.txt`) — new content, needs backend API to serve

### 2. Visual style reference
- Reference: `design/reference/reference.html` — a tutorial page with card-based layout, rounded corners, soft shadows, clean color system (CSS custom properties like `--x-ink`, `--x-surface`, `--x-blue-tint`).
- We borrow the **visual style** (card layout, spacing, typography, color tokens), NOT the three-column structure. Our detail page stays single-column.
- Videos are the "big head" — they dominate the layout above the fold.

### 3. Upload functionality
- Already implemented (demo + performance upload buttons). Keep and integrate into new layout.

### 4. Spinner bug fix
- **Symptom**: Demo video shows a loading spinner in the center even though it's playable.
- **Root cause**: `preload="metadata"` + large MP4 with moov atom at file end → browser issues multiple range requests → spinner persists. Also `playbackRate` set before metadata loads.
- **Performance video**: no spinner (smaller files, moov at front).
- **Fix**: Change demo `preload` to `"auto"`, set `playbackRate` on `loadedmetadata` event, optionally add a poster image to mask loading state.

### 5. Prompts API (new backend route)
- Need `GET /api/prompts/<chapter>/<level>` returning the Sora prompt text for that level.
- File mapping: level `NN-slug` in chapter → dialogue number D{N}. Need to derive N from the level's position in the chapter (1st level = D1, 2nd = D2, 3rd = D3).
- Returns: `{ "a": "<D{N}a.txt content>", "b": "<D{N}b.txt content>" }`
- Path traversal guard (same as video route).

## Out of scope
- No change to map view, background layer, or navigation logic.
- No change to scanner or state machine.
- No new npm/pip dependencies.
