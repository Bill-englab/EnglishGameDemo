# Chapter World Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current sparse hybrid map with a polished top-to-bottom chapter-world game map whose large level nodes occupy the visual center and whose side scenery creates ten distinct animated worlds.

**Architecture:** Keep Flask and the existing `/api/library` contract unchanged. Move testable visual decisions into native ES modules, keep DOM orchestration in `app.js`, generate all scenery from CSS and inline SVG, and render each chapter as a responsive 23/54/23 desktop grid or 14/72/14 mobile grid.

**Tech Stack:** Python 3.11, Flask 3, native HTML/CSS, native JavaScript ES modules, Node.js built-in test runner, pytest, local browser verification.

## Global Constraints

- Progress flows from top to bottom.
- All Completed, Current, and Locked nodes remain clickable.
- Desktop layout uses 23% left scenery, 54% main route, and 23% right scenery.
- Mobile layout uses 14% left scenery, 72% main route, and 14% right scenery.
- Desktop nodes are approximately 168×168px; Current is approximately 184×184px.
- Mobile nodes are approximately 128×128px; Current is approximately 140×140px.
- Use CSS and inline SVG only; do not add background images or a frontend build tool.
- Preserve the existing Flask API, filesystem content model, video routes, and detail-view content.
- Scenery must use `pointer-events: none`; route and node positions must not participate in looping movement animations.
- Missing or dark performance frames must render a chapter-colored achievement fallback instead of a black cover.
- Do not stage unrelated working-tree files such as `README.md`, `demo.html`, `TwoDots参考.jpeg`, or files outside the task's explicit file list.

---

## File Structure

- `roleplay-website/static/map-model.mjs`: chapter theme data and pure visual-state/layout/frame-analysis functions.
- `roleplay-website/static/map-scenes.mjs`: deterministic scene specifications and DOM/SVG scenery rendering.
- `roleplay-website/static/map-path.mjs`: pure smooth-path generation from node-center points.
- `roleplay-website/static/app.js`: API loading, map orchestration, node creation, cover extraction, detail navigation, and retry handling.
- `roleplay-website/static/style.css`: chapter-world layout, responsive sizes, node states, ambient animation, and detail styling.
- `roleplay-website/templates/map.html`: semantic map/detail shell, loading and error states, and ES-module entrypoint.
- `roleplay-website/tests-js/map-model.test.mjs`: unit tests for themes, state, proportions, rotation, and dark-frame detection.
- `roleplay-website/tests-js/map-scenes.test.mjs`: deterministic scene-spec tests for all ten chapter worlds.
- `roleplay-website/tests-js/map-path.test.mjs`: smooth-path generation tests.
- `roleplay-website/tests/test_app.py`: Flask/template/static-route contract tests.

---

### Task 0: Checkpoint the Current Frontend Safely

**Files:**
- Existing modified files only: `roleplay-website/templates/map.html`, `roleplay-website/static/style.css`, `roleplay-website/static/app.js`

**Interfaces:**
- Produces: a recoverable baseline commit before the approved redesign replaces the current frontend.
- Does not stage: `README.md`, `demo.html`, `TwoDots参考.jpeg`, dialogue videos, or any other untracked file.

- [ ] **Step 1: Inspect the exact current frontend diff**

Run:

```powershell
cd D:\TaviusProject
git diff -- roleplay-website/templates/map.html roleplay-website/static/style.css roleplay-website/static/app.js
git status --short
```

Expected: only the three named frontend files are selected for this checkpoint; unrelated files remain unstaged.

- [ ] **Step 2: Verify the current checkpoint is runnable**

Run:

```powershell
cd D:\TaviusProject\roleplay-website
.venv\Scripts\python -m pytest -q
node --check static/app.js
```

Expected: all existing pytest tests pass and JavaScript syntax check exits 0.

- [ ] **Step 3: Commit only the current frontend checkpoint**

```powershell
cd D:\TaviusProject
git add roleplay-website/templates/map.html roleplay-website/static/style.css roleplay-website/static/app.js
git diff --cached --name-only
git commit -m "chore: checkpoint current glass map"
```

Expected staged names: exactly the three frontend files listed above.

---

### Task 1: Define the Testable Map Model

**Files:**
- Create: `roleplay-website/static/map-model.mjs`
- Create: `roleplay-website/tests-js/map-model.test.mjs`

**Interfaces:**
- Produces: `CHAPTER_THEMES: Readonly<Record<number, ChapterTheme>>`
- Produces: `getChapterTheme(chapterName: string): ChapterTheme`
- Produces: `getLevelVisualState(level: object): "completed" | "current" | "locked"`
- Produces: `getLayoutForWidth(width: number): { left: number, main: number, right: number, node: number, currentNode: number }`
- Produces: `getStableRotation(index: number): number`
- Produces: `isFrameDark(data: Uint8ClampedArray, threshold?: number, ratio?: number): boolean`
- Consumed by: Tasks 3–5.

- [ ] **Step 1: Write failing model tests**

```js
// roleplay-website/tests-js/map-model.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  CHAPTER_THEMES,
  getChapterTheme,
  getLevelVisualState,
  getLayoutForWidth,
  getStableRotation,
  isFrameDark,
} from "../static/map-model.mjs";

test("defines ten distinct chapter worlds", () => {
  assert.equal(Object.keys(CHAPTER_THEMES).length, 10);
  assert.equal(new Set(Object.values(CHAPTER_THEMES).map(theme => theme.world)).size, 10);
  for (const theme of Object.values(CHAPTER_THEMES)) {
    assert.match(theme.gradient, /^linear-gradient\(/);
    assert.ok(theme.accent.startsWith("#"));
    assert.ok(theme.props.length >= 3 && theme.props.length <= 5);
  }
});

test("selects visual state without disabling locked levels", () => {
  assert.equal(getLevelVisualState({ has_performance: true, current: false }), "completed");
  assert.equal(getLevelVisualState({ has_performance: false, current: true }), "current");
  assert.equal(getLevelVisualState({ has_performance: false, current: false }), "locked");
});

test("uses approved desktop and mobile proportions", () => {
  assert.deepEqual(getLayoutForWidth(1440), { left: 23, main: 54, right: 23, node: 168, currentNode: 184 });
  assert.deepEqual(getLayoutForWidth(390), { left: 14, main: 72, right: 14, node: 128, currentNode: 140 });
});

test("completed-card rotation is stable and bounded", () => {
  const values = Array.from({ length: 30 }, (_, index) => getStableRotation(index));
  assert.deepEqual(values, Array.from({ length: 30 }, (_, index) => getStableRotation(index)));
  assert.ok(values.every(value => value >= -3 && value <= 3));
});

test("detects nearly black video frames", () => {
  assert.equal(isFrameDark(new Uint8ClampedArray([0, 0, 0, 255, 8, 8, 8, 255])), true);
  assert.equal(isFrameDark(new Uint8ClampedArray([230, 120, 60, 255, 250, 220, 180, 255])), false);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```powershell
cd D:\TaviusProject\roleplay-website
node --test tests-js/map-model.test.mjs
```

Expected: FAIL because `static/map-model.mjs` does not exist.

- [ ] **Step 3: Implement the model**

Create `map-model.mjs` with these exact behaviors:

```js
export const CHAPTER_THEMES = Object.freeze({
  1: { world: "morning-picnic", gradient: "linear-gradient(180deg,#bfe8ff 0%,#fff0b8 52%,#ffd18a 100%)", accent: "#f47b35", props: ["cloud", "fruit-tree", "picnic", "basket"] },
  2: { world: "color-market", gradient: "linear-gradient(180deg,#ffd8df 0%,#ffc69b 100%)", accent: "#e75f79", props: ["awning", "flags", "stall", "tag"] },
  3: { world: "block-workshop", gradient: "linear-gradient(180deg,#cfeeff 0%,#ffe0a3 100%)", accent: "#4b9fd8", props: ["tool-rack", "blocks", "gear", "workbench"] },
  4: { world: "finding-forest", gradient: "linear-gradient(180deg,#ccebd2 0%,#a8d79d 100%)", accent: "#4f9f64", props: ["signpost", "bush", "path-stone", "light-dot"] },
  5: { world: "question-observatory", gradient: "linear-gradient(180deg,#c9ddff 0%,#d6c3ff 100%)", accent: "#6c72d9", props: ["question-cloud", "telescope", "planet", "small-cloud"] },
  6: { world: "feeling-garden", gradient: "linear-gradient(180deg,#ffd9e8 0%,#ffc9a4 100%)", accent: "#df6997", props: ["flower", "fruit-tree", "mood-orb", "leaf"] },
  7: { world: "reasoning-valley", gradient: "linear-gradient(180deg,#cce8f6 0%,#bcd9a4 100%)", accent: "#438f77", props: ["bridge", "hill", "signpost", "light-band"] },
  8: { world: "memory-town", gradient: "linear-gradient(180deg,#ffd6a0 0%,#dc8d7e 100%)", accent: "#cc684f", props: ["house", "sunset", "window-light", "chimney-smoke"] },
  9: { world: "messenger-post", gradient: "linear-gradient(180deg,#d7edff 0%,#f1cf9e 100%)", accent: "#498bb5", props: ["mailbox", "envelope", "paper-plane", "flight-line"] },
  10: { world: "planning-camp", gradient: "linear-gradient(180deg,#8ca5df 0%,#6b579e 100%)", accent: "#f1b84b", props: ["tent", "moon", "star-map", "star"] },
});

const chapterNumber = chapterName => Number.parseInt(chapterName.match(/^\d+/)?.[0] || "1", 10);
export const getChapterTheme = chapterName => CHAPTER_THEMES[chapterNumber(chapterName)] || CHAPTER_THEMES[1];
export const getLevelVisualState = level => level.has_performance ? "completed" : level.current ? "current" : "locked";
export const getLayoutForWidth = width => width <= 600
  ? { left: 14, main: 72, right: 14, node: 128, currentNode: 140 }
  : { left: 23, main: 54, right: 23, node: 168, currentNode: 184 };
export const getStableRotation = index => ((index * 53) % 7) - 3;
export function isFrameDark(data, threshold = 28, ratio = 0.92) {
  let darkPixels = 0;
  const pixels = data.length / 4;
  for (let offset = 0; offset < data.length; offset += 4) {
    const luminance = 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
    if (luminance < threshold) darkPixels += 1;
  }
  return pixels > 0 && darkPixels / pixels >= ratio;
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test tests-js/map-model.test.mjs`

Expected: 5 tests pass.

- [ ] **Step 5: Commit Task 1**

```powershell
git add roleplay-website/static/map-model.mjs roleplay-website/tests-js/map-model.test.mjs
git commit -m "test: define chapter map visual model"
```

---

### Task 2: Build the Semantic Page Shell and Loading Contract

**Files:**
- Modify: `roleplay-website/templates/map.html`
- Modify: `roleplay-website/tests/test_app.py`

**Interfaces:**
- Produces DOM IDs: `map-view`, `map-scroll`, `path-svg`, `map`, `map-loading`, `map-error`, `map-retry`, `detail-view`.
- Loads: `/static/app.js` with `type="module"`.
- Consumed by: Tasks 3–6.

- [ ] **Step 1: Add failing template contract test**

```python
def test_map_shell_has_module_entry_and_resilient_states(client):
    response = client.get("/")
    html = response.get_data(as_text=True)
    assert response.status_code == 200
    assert '<script type="module" src="/static/app.js"></script>' in html
    for element_id in ("map-view", "map-scroll", "path-svg", "map", "map-loading", "map-error", "map-retry", "detail-view"):
        assert f'id="{element_id}"' in html
```

- [ ] **Step 2: Run test and verify RED**

Run:

```powershell
cd D:\TaviusProject\roleplay-website
.venv\Scripts\python -m pytest tests/test_app.py::test_map_shell_has_module_entry_and_resilient_states -v
```

Expected: FAIL because loading/error/retry elements and module script are missing.

- [ ] **Step 3: Update `map.html`**

The map shell must use this structure:

```html
<main id="map-view" class="view">
  <header class="topbar">
    <h1>My English Adventure</h1>
    <div class="progress" aria-label="Completed levels"><span id="star-count">0</span>/<span id="star-total">30</span></div>
  </header>
  <div id="map-loading" class="status-card" role="status">Loading your adventure…</div>
  <div id="map-error" class="status-card hidden" role="alert">
    <strong>The map is taking a nap.</strong>
    <button id="map-retry" type="button">Try again</button>
  </div>
  <div id="map-scroll" class="hidden">
    <svg id="path-svg" class="path-layer" aria-hidden="true"></svg>
    <div id="map"></div>
  </div>
</main>
```

Keep the existing detail-view IDs and replace the script tag with:

```html
<script type="module" src="/static/app.js"></script>
```

- [ ] **Step 4: Run the focused and full Flask tests**

Run:

```powershell
.venv\Scripts\python -m pytest tests/test_app.py::test_map_shell_has_module_entry_and_resilient_states -v
.venv\Scripts\python -m pytest -q
```

Expected: focused test passes; all existing pytest tests pass.

- [ ] **Step 5: Commit Task 2**

```powershell
git add roleplay-website/templates/map.html roleplay-website/tests/test_app.py
git commit -m "feat: add resilient map page shell"
```

---

### Task 3: Generate Ten Deterministic Chapter Worlds

**Files:**
- Create: `roleplay-website/static/map-scenes.mjs`
- Create: `roleplay-website/tests-js/map-scenes.test.mjs`
- Modify: `roleplay-website/static/app.js`
- Modify: `roleplay-website/static/style.css`

**Interfaces:**
- Consumes: `getChapterTheme(chapterName)` from `map-model.mjs`.
- Produces: `buildSceneSpec(chapterName: string, seed: number): SceneSpec`.
- Produces: `renderChapterScenery(leftElement: HTMLElement, rightElement: HTMLElement, spec: SceneSpec): void`.
- `SceneSpec` shape: `{ world: string, gradient: string, accent: string, left: SceneProp[], right: SceneProp[] }`.
- `SceneProp` shape: `{ kind: string, x: number, y: number, scale: number, delay: number }`.

- [ ] **Step 1: Write failing deterministic scene tests**

```js
// roleplay-website/tests-js/map-scenes.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { buildSceneSpec } from "../static/map-scenes.mjs";

test("builds stable, balanced scenery for all ten chapters", () => {
  for (let chapter = 1; chapter <= 10; chapter += 1) {
    const name = `${String(chapter).padStart(2, "0")}-chapter`;
    const first = buildSceneSpec(name, 20260809);
    const second = buildSceneSpec(name, 20260809);
    assert.deepEqual(first, second);
    assert.ok(first.left.length >= 2 && first.left.length <= 3);
    assert.ok(first.right.length >= 2 && first.right.length <= 3);
    assert.ok([...first.left, ...first.right].every(prop => prop.x >= 4 && prop.x <= 88));
  }
});

test("chapter worlds have distinct identities", () => {
  const worlds = Array.from({ length: 10 }, (_, index) => buildSceneSpec(`${index + 1}-chapter`, 1).world);
  assert.equal(new Set(worlds).size, 10);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests-js/map-scenes.test.mjs`

Expected: FAIL because `map-scenes.mjs` does not exist.

- [ ] **Step 3: Implement deterministic scene specifications**

Implement `buildSceneSpec` with a small seeded PRNG. Alternate the configured theme props between left and right, cap each side at three props, and generate bounded positions. Implement `renderChapterScenery` by mapping each `kind` to an inline SVG factory and appending elements with classes `scene-prop`, `scene-prop--<kind>`, and CSS custom properties `--x`, `--y`, `--scale`, `--delay`.

Use this exact rendering contract:

```js
export function renderChapterScenery(leftElement, rightElement, spec) {
  leftElement.replaceChildren(...spec.left.map(createSceneProp));
  rightElement.replaceChildren(...spec.right.map(createSceneProp));
}
```

Unknown prop kinds must render a neutral rounded color orb instead of throwing.

- [ ] **Step 4: Refactor `app.js` to create chapter-world grids**

Import the scene functions and build each chapter with:

```html
<section class="chapter-world" style="--chapter-gradient: …; --chapter-accent: …">
  <div class="chapter-side chapter-side--left" aria-hidden="true"></div>
  <div class="chapter-main">
    <header class="chapter-heading">…</header>
    <div class="chapter-levels">…</div>
  </div>
  <div class="chapter-side chapter-side--right" aria-hidden="true"></div>
</section>
```

Remove the old `start-hero`, tiger mascot, random global scenery, and per-chapter decoration code from `app.js`.

- [ ] **Step 5: Add chapter-world layout CSS**

Add these core rules, then implement the theme-specific shapes and ambient animations:

```css
.chapter-world {
  display: grid;
  grid-template-columns: 23% 54% 23%;
  position: relative;
  min-height: 780px;
  background: var(--chapter-gradient);
  overflow: hidden;
  isolation: isolate;
}
.chapter-main { position: relative; z-index: 3; }
.chapter-side { position: relative; z-index: 1; pointer-events: none; }
.scene-prop { position: absolute; left: calc(var(--x) * 1%); top: calc(var(--y) * 1%); transform: scale(var(--scale)); }
@media (max-width: 600px) {
  .chapter-world { grid-template-columns: 14% 72% 14%; min-height: 660px; }
  .scene-prop:nth-child(n+3) { display: none; }
}
```

Use large rounded pseudo-elements on alternating chapter edges to create soft transitions. Do not use raster backgrounds.

- [ ] **Step 6: Run tests and verify GREEN**

Run:

```powershell
node --test tests-js/map-model.test.mjs tests-js/map-scenes.test.mjs
node --check static/app.js
```

Expected: all Node tests pass and syntax check exits 0.

- [ ] **Step 7: Commit Task 3**

```powershell
git add roleplay-website/static/map-scenes.mjs roleplay-website/tests-js/map-scenes.test.mjs roleplay-website/static/app.js roleplay-website/static/style.css
git commit -m "feat: render ten animated chapter worlds"
```

---

### Task 4: Build Large Clickable Node States and Safe Covers

**Files:**
- Modify: `roleplay-website/static/app.js`
- Modify: `roleplay-website/static/style.css`
- Modify: `roleplay-website/static/map-model.mjs`
- Modify: `roleplay-website/tests-js/map-model.test.mjs`

**Interfaces:**
- Consumes: `getLevelVisualState`, `getLayoutForWidth`, `getStableRotation`, `isFrameDark`.
- Produces internal DOM helper: `createLevelNode(level: object, index: number, theme: ChapterTheme): HTMLButtonElement`.
- Produces internal async helper: `extractSafeCover(level: object, theme: ChapterTheme): Promise<string | null>`.

- [ ] **Step 1: Extend failing frame-analysis tests**

Add tests proving transparent pixels are ignored and a mixed bright frame is not rejected:

```js
test("ignores transparent pixels while evaluating frame darkness", () => {
  const transparentBlackAndBright = new Uint8ClampedArray([0, 0, 0, 0, 240, 180, 80, 255]);
  assert.equal(isFrameDark(transparentBlackAndBright), false);
});
```

- [ ] **Step 2: Run focused test and verify RED**

Run: `node --test tests-js/map-model.test.mjs`

Expected: FAIL because the initial implementation counts transparent black pixels.

- [ ] **Step 3: Update `isFrameDark` and cover extraction**

Skip pixels whose alpha is below 16. In `extractSafeCover`, seek to 20% of the performance video, draw to canvas, inspect `getImageData`, and only return `canvas.toDataURL("image/jpeg", 0.82)` when `isFrameDark` is false. Resolve `null` on timeout, media error, zero dimensions, canvas error, or dark frame.

- [ ] **Step 4: Implement the exact node contract**

`createLevelNode` must:

- Create a `<button type="button" class="level-node-wrap level-node-wrap--STATE">` for every level.
- Attach the detail click handler for every state.
- Create a `.level-node` sized via CSS variables.
- Add `.level-title` after the node, clamp it to two lines, and keep it readable over every chapter world.
- Set `--polaroid-rotation` from `getStableRotation(index)` for Completed.
- Render Completed with cover or `.level-node--fallback` plus chapter accent.
- Render Current with a white card, orange glow, and 72px play button.
- Render Locked with glass, a minimal gray lock SVG, and no disabled attribute.

- [ ] **Step 5: Add node-state CSS**

Use these dimensions and interactions:

```css
.level-node { width: 168px; height: 168px; border-radius: 28px; transition: transform 160ms ease, box-shadow 240ms ease; }
.level-node-wrap--current .level-node { width: 184px; height: 184px; }
.level-node-wrap:hover .level-node { transform: scale(1.05); }
.level-node-wrap:active .level-node { transform: scale(.96); }
.level-node-wrap--completed .level-node { border: 8px solid #fff; transform: rotate(var(--polaroid-rotation)); overflow: visible; }
.level-node__cover { border-radius: 20px; overflow: hidden; }
@media (max-width: 600px) {
  .level-node { width: 128px; height: 128px; }
  .level-node-wrap--current .level-node { width: 140px; height: 140px; }
}
```

Preserve the Completed rotation when applying hover/active scale. The gold star must be positioned outside the cover-clipping layer.

- [ ] **Step 6: Run unit and syntax tests**

Run:

```powershell
node --test tests-js/map-model.test.mjs
node --check static/app.js
```

Expected: all tests pass and syntax check exits 0.

- [ ] **Step 7: Commit Task 4**

```powershell
git add roleplay-website/static/app.js roleplay-website/static/style.css roleplay-website/static/map-model.mjs roleplay-website/tests-js/map-model.test.mjs
git commit -m "feat: enlarge level states and harden video covers"
```

---

### Task 5: Draw the Continuous Route and Orchestrate Motion

**Files:**
- Create: `roleplay-website/static/map-path.mjs`
- Create: `roleplay-website/tests-js/map-path.test.mjs`
- Modify: `roleplay-website/static/app.js`
- Modify: `roleplay-website/static/style.css`

**Interfaces:**
- Produces: `buildSmoothPath(points: Array<{x:number,y:number}>): string`.
- Consumed by: `drawMapPath()` inside `app.js`.

- [ ] **Step 1: Write failing path tests**

```js
// roleplay-website/tests-js/map-path.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { buildSmoothPath } from "../static/map-path.mjs";

test("returns empty path for fewer than two points", () => {
  assert.equal(buildSmoothPath([]), "");
  assert.equal(buildSmoothPath([{ x: 10, y: 20 }]), "");
});

test("creates one continuous cubic path through top-to-bottom points", () => {
  const path = buildSmoothPath([{ x: 100, y: 20 }, { x: 40, y: 180 }, { x: 160, y: 340 }]);
  assert.match(path, /^M 100 20 C /);
  assert.equal((path.match(/ C /g) || []).length, 2);
  assert.ok(path.endsWith("160 340"));
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests-js/map-path.test.mjs`

Expected: FAIL because `map-path.mjs` does not exist.

- [ ] **Step 3: Implement Catmull–Rom-to-Bézier path generation**

`buildSmoothPath` must use neighboring points to derive cubic control points, preserve point order, and return a path beginning with `M`. It must not mutate the input array.

- [ ] **Step 4: Integrate route drawing**

`drawMapPath()` must:

- Read centers from `.level-node` elements in DOM order.
- Convert viewport coordinates into `#map-scroll` coordinates.
- Set SVG width, height, and viewBox from the rendered scroll container.
- Draw one path across chapter boundaries.
- Run after initial render, `document.fonts.ready`, cover resolution, and debounced resize.
- Never include scenery or animated transforms when measuring centers.

- [ ] **Step 5: Implement restrained motion**

Add:

- 800ms chapter background/heading reveal.
- 8–14s ambient scene loops using `--delay` and per-prop duration variables.
- 2s Current glow breathing animation.
- 120–180ms click feedback.
- Completed star entrance animation.
- A `prefers-reduced-motion: reduce` block that disables ambient loops and translated reveals while preserving state visibility.

- [ ] **Step 6: Run path, model, scene, and syntax tests**

Run:

```powershell
node --test tests-js/*.test.mjs
node --check static/app.js
```

Expected: all Node tests pass and syntax check exits 0.

- [ ] **Step 7: Commit Task 5**

```powershell
git add roleplay-website/static/map-path.mjs roleplay-website/tests-js/map-path.test.mjs roleplay-website/static/app.js roleplay-website/static/style.css
git commit -m "feat: connect chapter worlds with a smooth route"
```

---

### Task 6: Add Retry Handling and Preserve Detail Navigation

**Files:**
- Modify: `roleplay-website/static/app.js`
- Modify: `roleplay-website/static/style.css`
- Modify: `roleplay-website/tests/test_app.py`

**Interfaces:**
- Produces internal async function: `loadLibrary(): Promise<void>`.
- Uses DOM IDs from Task 2.
- Preserves existing `openDetail(level)` and `closeDetail()` behavior and detail-view element IDs.

- [ ] **Step 1: Add a failing retry-handler contract test**

```python
def test_app_registers_retryable_library_loading(client):
    javascript = client.get("/static/app.js").get_data(as_text=True)
    assert 'fetch("/api/library", { cache: "no-store" })' in javascript
    assert 'getElementById("map-retry").addEventListener("click", loadLibrary)' in javascript
    assert 'showOnly("map-error")' in javascript
```

- [ ] **Step 2: Run focused tests**

Run:

```powershell
.venv\Scripts\python -m pytest tests/test_app.py::test_app_registers_retryable_library_loading -v
```

Expected: FAIL because the current `app.js` does not register the approved retry state transitions.

- [ ] **Step 3: Implement retryable library loading**

Use this state transition:

```js
async function loadLibrary() {
  showOnly("map-loading");
  try {
    const response = await fetch("/api/library", { cache: "no-store" });
    if (!response.ok) throw new Error(`library ${response.status}`);
    const library = await response.json();
    renderMap(library);
    showOnly("map-scroll");
  } catch (error) {
    console.error("Unable to load library", error);
    showOnly("map-error");
  }
}
document.getElementById("map-retry").addEventListener("click", loadLibrary);
```

`showOnly` must only toggle `map-loading`, `map-error`, and `map-scroll`; it must not hide the detail view.

- [ ] **Step 4: Preserve detail behavior**

Verify and retain:

- Every node opens details, including Locked.
- Missing demo renders the existing text placeholder and full dialogue.
- Completed detail includes the performance player.
- `mapScrollY` is captured before entry and restored after return.
- All detail videos pause and clear their `src` on return.

Add a static-module serving test after the modules exist:

```python
def test_map_static_modules_are_served(client):
    for path in ("/static/app.js", "/static/map-model.mjs", "/static/map-scenes.mjs", "/static/map-path.mjs", "/static/style.css"):
        response = client.get(path)
        assert response.status_code == 200
```

- [ ] **Step 5: Run all automated tests**

Run:

```powershell
.venv\Scripts\python -m pytest -q
node --test tests-js/*.test.mjs
node --check static/app.js
```

Expected: all pytest and Node tests pass; syntax check exits 0.

- [ ] **Step 6: Commit Task 6**

```powershell
git add roleplay-website/static/app.js roleplay-website/static/style.css roleplay-website/tests/test_app.py
git commit -m "feat: add resilient map loading and detail navigation"
```

---

### Task 7: Browser QA at Desktop and Mobile Sizes

**Files:**
- Modify only if QA finds a verified issue: `roleplay-website/static/app.js`, `roleplay-website/static/style.css`, or `roleplay-website/templates/map.html`
- Test: browser interaction against `http://127.0.0.1:5000`

**Interfaces:**
- Consumes the complete implementation from Tasks 1–6.
- Produces a verified release candidate; no new public interfaces.

- [ ] **Step 1: Start the local server**

Run:

```powershell
cd D:\TaviusProject\roleplay-website
.venv\Scripts\python app.py
```

Expected: server listens on `http://127.0.0.1:5000`.

- [ ] **Step 2: Verify desktop layout at 1440×1000**

Using the browser, verify:

- Approximate 23/54/23 composition.
- Main route is visually dominant and side scenes are visibly populated.
- Completed, Current, and Locked nodes are at least 168px/184px as specified.
- The first three levels follow top-to-bottom DOM and visual order.
- Chapter 1 and Chapter 2 have distinct worlds with rounded visual transition.
- No scenery overlaps node click targets or two-line labels.

- [ ] **Step 3: Verify mobile layout at 390×844**

Verify:

- Approximate 14/72/14 composition.
- Nodes are at least 128px/140px.
- Side scenery is reduced but still visible.
- There is no horizontal scrolling.
- Titles remain readable and do not exceed two lines.

- [ ] **Step 4: Exercise all interaction states**

Click one Completed, one Current, and one Locked node. For each:

- Detail view opens.
- Back returns to the previous map scroll position.
- Current and Locked show demo or dialogue placeholder as appropriate.
- Completed shows performance video.
- Browser console has no uncaught errors.

- [ ] **Step 5: Verify cover fallback**

Temporarily use browser evaluation to force `extractSafeCover` to resolve `null`, then confirm the Completed node renders the chapter-colored fallback instead of black. Do not edit or replace the user's performance video.

- [ ] **Step 6: Run final automated verification**

Run:

```powershell
cd D:\TaviusProject\roleplay-website
.venv\Scripts\python -m pytest -q
node --test tests-js/*.test.mjs
node --check static/app.js
git diff --check
```

Expected: all tests pass, syntax check exits 0, and `git diff --check` reports no whitespace errors.

- [ ] **Step 7: Commit verified visual fixes, if any**

If QA required changes:

```powershell
git add roleplay-website/static/app.js roleplay-website/static/style.css roleplay-website/templates/map.html
git commit -m "fix: polish responsive chapter map"
```

If QA found no issues, do not create an empty commit.

---

## Completion Criteria

- All ten chapter worlds are visually distinct and generated without raster backgrounds.
- Main-route/side-scene ratios match the approved desktop and mobile designs.
- Thirty nodes render in top-to-bottom order and remain clickable in every state.
- Completed covers never remain black when extraction fails.
- Detail navigation and scroll restoration still work.
- All pytest, Node unit tests, JavaScript syntax checks, and browser QA checks pass.
