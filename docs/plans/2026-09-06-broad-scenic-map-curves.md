# Broad Scenic Map Curves Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chapter-reset zigzag with the approved B layout: one continuous sequence of broad, varied scenic arcs across all 30 lessons.

**Architecture:** Add a pure route-layout function beside the existing SVG path builder. It maps a global lesson index to separate desktop and mobile horizontal offsets from one authored 30-point rhythm; `app.js` writes those offsets as CSS variables and CSS only applies the responsive transform. The SVG continues to measure real node centers, so completed/current/upcoming path semantics remain unchanged.

**Tech Stack:** Native ES modules, CSS custom properties, SVG, Node `node:test`, existing isolated Edge/Playwright QA harness.

## Global Constraints

- Keep one continuous route through all 30 lessons; never restart the layout at a chapter boundary.
- A main turn spans roughly 4–6 lessons, with deliberately varied spans rather than one repeated waveform.
- Desktop offsets stay within ±150px; mobile offsets stay within ±46px and preserve the same direction changes.
- Do not change lesson order, completion rules, media paths, background assets, node semantics or the 3D route material.
- Do not touch real demo, recording, profile, account or configuration data during testing.

---

### Task 1: Define and integrate the global scenic route rhythm

**Files:**
- Modify: `app/static/map-path.mjs`
- Modify: `app/tests-js/map-path.test.mjs`
- Modify: `app/static/app.js`
- Modify: `app/static/style.css`

**Interfaces:**
- Produces: `getScenicRouteOffset(index: number) -> { desktopPx: number, mobilePx: number }`.
- Consumes: the global zero-based lesson index already calculated by `renderMap`.
- Keeps: `buildSmoothPath(points, options)` and its completed/current segment behavior unchanged.

- [ ] **Step 1: Write the failing route-rhythm tests**

Add tests that import `getScenicRouteOffset`, sample indexes `0..29`, and assert:

```js
const offsets = Array.from({ length: 30 }, (_, index) => getScenicRouteOffset(index));
assert.equal(offsets.length, 30);
assert.ok(offsets.every(({ desktopPx }) => Math.abs(desktopPx) <= 150));
assert.ok(offsets.every(({ mobilePx }) => Math.abs(mobilePx) <= 46));
assert.deepEqual(offsets.map(point => Math.sign(point.desktopPx)),
  offsets.map(point => Math.sign(point.mobilePx)));
const chapterTriples = Array.from({ length: 10 }, (_, chapter) =>
  offsets.slice(chapter * 3, chapter * 3 + 3).map(point => point.desktopPx).join(","));
assert.ok(new Set(chapterTriples).size >= 8);
assert.notEqual(offsets[2].desktopPx, -offsets[3].desktopPx);
assert.notEqual(offsets[5].desktopPx, -offsets[6].desktopPx);
```

Also freeze the returned objects in the test and confirm later calls are unaffected, so callers cannot mutate the authored rhythm.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `cd app && node --test tests-js/map-path.test.mjs`

Expected: FAIL because `getScenicRouteOffset` is not exported.

- [ ] **Step 3: Implement the minimal pure layout function**

In `map-path.mjs`, define seven uneven turning anchors at global indexes `0, 4, 8, 13, 18, 24, 29`, interpolate between them with smoothstep, and scale the normalized value to `150px` desktop and `46px` mobile. Clamp invalid indexes to the available `0..29` range and return a fresh object.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `cd app && node --test tests-js/map-path.test.mjs`

Expected: PASS with the pre-existing smooth-path tests unchanged.

- [ ] **Step 5: Integrate global offsets without changing path drawing**

Import `getScenicRouteOffset` in `app.js`. When each node wrapper is created, set:

```js
const routeOffset = getScenicRouteOffset(i);
wrap.style.setProperty("--route-x-desktop", `${routeOffset.desktopPx}px`);
wrap.style.setProperty("--route-x-mobile", `${routeOffset.mobilePx}px`);
```

Replace both chapter/nth-child transform rule groups with one rule using `--route-x-desktop`; inside the existing mobile media query, switch to `--route-x-mobile`. Keep hover transforms on `.level-node`, not the wrapper, so SVG center measurement remains stable.

- [ ] **Step 6: Run syntax and complete Node verification**

Run: `cd app && node --check static/app.js && node --check static/map-path.mjs && npm test`

Expected: all Node tests pass with no syntax errors.

- [ ] **Step 7: Commit the behavior change**

```bash
git add app/static/map-path.mjs app/tests-js/map-path.test.mjs app/static/app.js app/static/style.css
git commit -m "fix: shape the map into broad scenic curves"
```

---

### Task 2: Verify full-route continuity and responsive safety

**Files:**
- Modify: `docs/plans/2026-09-06-broad-scenic-map-curves.md`

**Interfaces:**
- Consumes: the rendered map at `/` and the existing isolated browser fixture.
- Produces: a concise acceptance record in this plan; no production API changes.

- [ ] **Step 1: Run the existing isolated rendered-map QA**

Run the repository's `tests-browser/modern-toy-ui.cjs` flow against its temporary curriculum, account, profile and media roots. Do not start production Electron or scan the real media directories.

- [ ] **Step 2: Inspect desktop and mobile route screenshots**

At desktop `1440×960` and mobile `390×844`, verify the path passes through every rendered node center, no node or path overflows horizontally, and chapter boundaries continue the existing arc rather than restarting a three-node zigzag.

- [ ] **Step 3: Exercise the target interaction**

Use `Current lesson`, confirm the viewport centers the real current node, open that node, return to the map, and verify the same route layout is restored without horizontal shift.

- [ ] **Step 4: Record evidence and complete verification**

Append the tested viewports, browser path, route continuity result, console result and any intentional limitation to this plan. Then run:

```bash
cd app
npm test
.venv/Scripts/python -m pytest -q
git diff --check
```

- [ ] **Step 5: Commit the acceptance record**

```bash
git add docs/plans/2026-09-06-broad-scenic-map-curves.md
git commit -m "docs: record broad curve map acceptance"
```
