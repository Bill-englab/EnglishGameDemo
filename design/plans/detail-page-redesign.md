# Detail Page Redesign — Implementation Plan

## Overview
Redesign the level detail view with design/reference/reference.html's visual style (clean card layout, rounded corners, soft shadows, ink/surface/line color tokens). Add Sora prompt display. Fix the demo video spinner bug.

## Tasks

### Task 1: Fix demo video spinner bug
**File**: `app/static/app.js`
- Change demo video `preload="metadata"` → `preload="auto"`
- Move `playbackRate = 0.75` into a `loadedmetadata` event listener (setting it before metadata loads causes some browsers to show a perpetual spinner)
- Same fix for performance video (preventive, even though no current symptom)

### Task 2: Add prompts API route
**File**: `app/app.py`
New route: `GET /api/prompts/<chapter>/<level>`
- Derive dialogue number N from the level's position in its chapter (scan content_root, sort levels, find index → N=1,2,3)
- Read `prompts/<chapter>/D{N}a.txt` and `D{N}b.txt`
- Return `{ "a": "...", "b": "..." }` as JSON
- Path traversal guard (resolve + is_relative_to)
- 404 if files missing
- Add `PROMPTS_ROOT` env var (default `<project>/prompts`)

**File**: `app/tests/test_app.py`
- Test: returns a/b prompt text for a known level
- Test: 404 for missing prompts
- Test: path traversal rejected

### Task 3: Fetch and display prompts in detail view
**File**: `app/static/app.js` — `openDetail()`
- After rendering dialogue, `fetch("/api/prompts/<chapter>/<level>")` 
- Render two collapsible `<pre>` blocks (Prompt A / Prompt B) with monospace font
- Graceful: if fetch fails or 404, show nothing (not an error)

**File**: `app/templates/map.html`
- Add `<div id="detail-prompts" class="prompt-section"></div>` after variations, before nav

### Task 4: Redesign detail view CSS (design/reference/reference.html visual style)
**File**: `app/static/style.css`

Adopt design/reference/reference.html's design tokens (adapted to our warm palette):
```css
:root {
  /* From design/reference/reference.html, adapted */
  --card-bg: rgba(255,255,255,.92);
  --card-border: 2px solid rgba(205,211,222,.5);
  --card-radius: 16px;
  --card-shadow: 0 8px 24px rgba(20,22,26,.08);
  --ink: #14161a;
  --ink-2: #5a6070;
  --ink-3: #8a92a0;
  --surface: #fff;
  --surface-2: #f7f8fa;
  --line: #e4e7ee;
  --line-strong: #cdd3de;
  --accent-blue: #2d5bff;
  --accent-blue-tint: rgba(45,91,255,.08);
}
```

Layout changes:
- `.detail-card`: cleaner card with stronger border, more padding, bigger radius
- Video blocks: full-width, rounded, with a label chip above each (like reference's task cards)
- Dialogue: chat-bubble style retained but with cleaner spacing
- Prompt section: monospace `<pre>` in a tinted background card, collapsible
- Upload buttons: integrated as subtle action chips below each video
- Section labels: uppercase mono small caps (like reference's "Getting Started" tag)
- Prev/Next nav: pill buttons (reference style)

### Task 5: Update tests
**File**: `app/tests/test_app.py`
- Add prompts route tests (Task 2)
- Verify `map.html` has `detail-prompts` element id

### Task 6: Manual verification
- Start server, open detail for 01-wants-requests/01-can-i-have
- Verify: demo video loads without spinner, plays at 0.75x
- Verify: performance video plays
- Verify: prompts a/b text displayed
- Verify: dialogue readable
- Verify: upload buttons work
- Verify: prev/next nav works
- Run both test suites

## Execution order
1. Task 1 (spinner fix) — independent, quick win
2. Task 2 (prompts API) — backend, testable
3. Task 3 + 4 (frontend display + CSS redesign) — together, biggest chunk
4. Task 5 (tests) — after all code changes
5. Task 6 (manual verify) — last
