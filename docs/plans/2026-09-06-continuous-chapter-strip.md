# Continuous Chapter Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the full-screen void between every third lesson so all 30 lessons read as one naturally flowing route with compact chapter checkpoints.

**Architecture:** Keep the existing chapter DOM and background cross-fade boundaries, but make each `.chapter-world` content-sized instead of viewport-sized. Extend the isolated rendered-map QA to measure all 29 vertical node gaps and every background activation; CSS then owns the compact checkpoint spacing while the existing global horizontal offsets and SVG center measurement remain unchanged.

**Tech Stack:** Native HTML/CSS/ES modules, SVG, Node `node:test`, isolated Playwright/Edge acceptance harness.

## Global Constraints

- Cross-chapter node-center gaps target 1.2–1.4 times the within-chapter median and must never exceed 1.5 times it.
- Desktop cross-chapter gaps must stay at or below 300px; mobile gaps must stay at or below 240px.
- The first chapter's three lessons remain visible in the desktop opening viewport; its current locator must not overlap the first checkpoint.
- Exactly one chapter background remains active while scrolling through every chapter boundary.
- Do not change course order, state semantics, horizontal scenic offsets, path materials, media paths, recordings or user data.

---

### Task 1: Reproduce the broken chapter rhythm in rendered QA

**Files:**
- Modify: `app/tests-browser/modern-toy-ui.cjs`

**Interfaces:**
- Consumes: the existing `scenicRouteRhythm(page, viewport, output)` flow and rendered `.level-node-wrap`, `.chapter-world`, `.chapter-heading`, `.bg-layer__slide` elements.
- Produces: measured `withinChapterGaps`, `chapterBoundaryGaps`, `withinMedian` and background-activation assertions at 1536×1024 and 390×844.

- [ ] **Step 1: Add vertical rhythm measurements**

Extend each geometry record with `centerY`. Split the 29 adjacent gaps using `(index + 1) % 3`, calculate the literal median from the sorted within-chapter gaps, and assert:

```js
const withinChapterGaps = verticalGaps.filter((_, index) => (index + 1) % 3 !== 0);
const chapterBoundaryGaps = verticalGaps.filter((_, index) => (index + 1) % 3 === 0);
const orderedWithin = withinChapterGaps.slice().sort((a, b) => a - b);
const withinMedian = orderedWithin[Math.floor(orderedWithin.length / 2)];
assert.ok(chapterBoundaryGaps.every(gap => gap >= withinMedian * 1.1));
assert.ok(chapterBoundaryGaps.every(gap => gap <= withinMedian * 1.5));
assert.ok(Math.max(...chapterBoundaryGaps) <= (viewport.width < 768 ? 240 : 300));
```

The lower automated bound allows rendering rounding while the screenshot review keeps the approved 1.2–1.4 visual target.

- [ ] **Step 2: Add checkpoint and background assertions**

Assert each chapter heading ends before its first lesson wrapper begins. Scroll each chapter to the viewport center, wait two animation frames, and verify exactly one `.bg-layer__slide.is-active` exists and its `data-chapter` matches the centered chapter.

- [ ] **Step 3: Run the focused browser test and confirm RED**

Run:

```powershell
$env:NODE_PATH='C:\Users\q00679663\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:TOY_QA_PYTHON='E:\project\EnglishGameDemo\app\.venv\Scripts\python.exe'
node tests-browser/modern-toy-ui.cjs --focus=scenic-route
```

Expected: FAIL because current desktop boundary gaps are 614–713px and mobile boundary gaps are 486–557px.

---

### Task 2: Convert chapters into one continuous spatial strip

**Files:**
- Modify: `app/static/style.css`
- Modify: `app/tests-browser/modern-toy-ui.cjs`
- Modify: `docs/specs/2026-09-05-modern-toy-theatre-ui-design.md`

**Interfaces:**
- Consumes: existing `renderMap`, global `getScenicRouteOffset`, `drawMapPath` and `updateBgOnScroll`; none change signature.
- Produces: content-sized `.chapter-world` sections and compact `.chapter-heading` checkpoint spacing.

- [ ] **Step 1: Remove the viewport-sized chapter floor**

Change `.chapter-world` from `min-height: max(720px,100vh)` to content-sized layout and allow node/path shadows to remain visible at section edges. Keep `#map-view` as the only map scroll container.

- [ ] **Step 2: Tighten only the cross-chapter checkpoint spacing**

Reduce `.chapter-main` vertical padding and the default `.chapter-heading` bottom margin until the measured boundary gaps satisfy the test. Preserve a larger first-chapter heading margin so the current locator retains at least 4px clearance, using `.chapter-world:first-child .chapter-heading` rather than enlarging every boundary.

- [ ] **Step 3: Run focused QA and confirm GREEN**

Run `node tests-browser/modern-toy-ui.cjs --focus=scenic-route` with the bundled Playwright environment.

Expected: PASS at desktop and mobile; screenshots show a compact chapter plaque between a continuous curved route, no full-screen straight connector, and one correct active background per chapter.

- [ ] **Step 4: Run complete verification**

Run:

```powershell
cd app
npm test
.venv/Scripts/python -m pytest -q
node tests-browser/modern-toy-ui.cjs
git diff --check
```

Expected: 46 Node tests, the complete Python suite and all isolated rendered flows pass with no page or console errors.

- [ ] **Step 5: Record acceptance and commit**

Update the design status from pending to implemented and append actual desktop/mobile gap ranges, viewports, background result, screenshot evidence and remaining device limitation to this plan. Commit only source, tests and documentation:

```bash
git add app/static/style.css app/tests-browser/modern-toy-ui.cjs docs/specs/2026-09-05-modern-toy-theatre-ui-design.md docs/plans/2026-09-06-continuous-chapter-strip.md
git commit -m "fix: connect chapters into one flowing route"
```
