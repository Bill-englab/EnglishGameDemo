# Adventure Feedback UI Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the floating top controls on web, mobile and Electron, and restore a strong binary level-completion reward with one gold star per completed lesson.

**Architecture:** Keep `/api/library` and scanner state unchanged. Extend the existing pure map-presentation model for semantic markers, reshape the persistent shell into a three-column alignment grid, and let `app.js` consume a one-shot in-memory celebration after a performance save. CSS owns materials, path colors and reduced-motion behavior; the existing Playwright/Edge harness measures rendered geometry.

**Tech Stack:** Native ES modules, HTML, CSS, Flask template tests, Node `node:test`, existing Playwright/Edge and Electron acceptance harness.

## Global Constraints

- Completion remains binary and depends only on `has_performance`; no score or one-to-three-star system.
- A completed node shows exactly one gold star badge while its demo/performance cover remains the visual subject.
- Desktop shell uses a 56px visual rail and 52px brand/progress/account capsules; click targets remain at least 44×44px.
- Mobile top controls stay on one line at 390px without horizontal overflow.
- Current uses a target/locator and no gold star; locked uses a lock.
- Celebration runs once after a successful performance save and does not replay after refresh.
- `prefers-reduced-motion: reduce` removes celebration/current movement.
- Do not modify scanner semantics, curriculum, prompts, demo files, recordings or profiles.

---

### Task 1: Align the persistent shell and bound the account popup

**Files:**
- Modify: `app/templates/map.html:17-34`
- Modify: `app/static/style.css:110-220`
- Modify: `app/static/titlebar.js`
- Modify: `app/tests/test_detail_layout.py`
- Modify: `app/tests-browser/modern-toy-ui.cjs`

**Interfaces:**
- Consumes: existing `#star-count`, `#star-total`, `#adventure-progress`, `#user-menu`, and `[data-window-controls]` mounts.
- Produces: `.shell-left`, `.shell-progress`, and `.shell-actions` grid cells with a stable center column; no element IDs or event handlers change.

- [ ] **Step 1: Add failing structural and geometry checks**

In `test_detail_layout.py`, assert that the map topbar contains three direct alignment cells and that account/window mounts live inside `.shell-actions`. In `modern-toy-ui.cjs`, measure brand, progress and account rectangles at 1440×960, 800×600 and 390×844:

```js
const shell = await page.locator('.topbar').evaluate(el => {
  const rect = selector => {
    const r = el.querySelector(selector).getBoundingClientRect();
    return { top: r.top, height: r.height, center: r.left + r.width / 2 };
  };
  return { brand: rect('.adventure-brand'), progress: rect('.progress'), account: rect('.user-menu__trigger') };
});
expectClose(shell.brand.top, shell.progress.top, 1);
expectClose(shell.brand.height, 52, 1);
expectClose(shell.progress.height, 52, 1);
expectClose(shell.account.height, 52, 1);
expectClose(shell.progress.center, viewport.width / 2, 1);
```

Add an 800×600 admin fixture with five users and assert the popup has `scrollHeight > clientHeight`, `overflowY === "auto"`, and that scrolling reveals Logout fully inside the viewport.

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```powershell
cd app
.venv\Scripts\python -m pytest tests/test_detail_layout.py -q
$env:NODE_PATH='C:/Users/q00679663/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
node tests-browser/modern-toy-ui.cjs --focus=account
```

Expected: structure/geometry assertions fail because the topbar uses independent flex items of unequal heights and the account popup has no viewport height bound.

- [ ] **Step 3: Implement the three-cell shell**

Wrap the existing controls without changing their IDs:

```html
<header class="topbar">
  <div class="shell-left"><div class="adventure-brand shell-group">…</div></div>
  <div class="shell-progress"><div class="progress shell-group">…</div></div>
  <div class="shell-actions">
    <div class="user-menu" id="user-menu">…</div>
    <div data-window-controls></div>
  </div>
</header>
```

Use an overlay grid so the progress remains centered independent of Electron buttons:

```css
.topbar { display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr); align-items:start; }
.shell-left { grid-column:1; justify-self:start; }
.shell-progress { grid-column:2; justify-self:center; }
.shell-actions { grid-column:3; justify-self:end; display:flex; align-items:center; gap:8px; }
.adventure-brand, .topbar .progress, .user-menu__trigger { height:52px; min-height:52px; }
.user-menu__popup { max-height:calc(100vh - 84px); overflow-y:auto; overscroll-behavior:contain; }
```

At `<768px`, retain the same three cells, reduce gaps/padding and let the brand text ellipsize; do not use `flex-wrap`. Update `titlebar.js` to populate only the existing right-side mount.

- [ ] **Step 4: Verify focused layout and Electron input**

Run the focused Python/browser checks and:

```powershell
$env:TOY_QA_ELECTRON='1'
node tests-browser/modern-toy-ui.cjs --focus=electron
```

Expected: all capsules align; the centered progress differs from viewport center by at most 1px; five-user popup scrolls internally; native window controls and account menu remain clickable.

- [ ] **Step 5: Commit**

```powershell
git add app/templates/map.html app/static/style.css app/static/titlebar.js app/tests/test_detail_layout.py app/tests-browser/modern-toy-ui.cjs
git commit -m "fix: align adventure shell controls"
```

---

### Task 2: Restore semantic star rewards and stronger current targets

**Files:**
- Modify: `app/static/map-model.mjs`
- Modify: `app/static/app.js:538-590`
- Modify: `app/static/style.css:300-340`
- Modify: `app/tests-js/map-presentation.test.mjs`
- Modify: `app/tests-browser/modern-toy-ui.cjs`

**Interfaces:**
- Consumes: `resolveMapPresentation(level, index)` and the existing completed/current/locked state.
- Produces: presentation markers `star`, `locator`, and `lock`; `.level-node__marker--star`; chapter labels with a visible `★ n/3` count.

- [ ] **Step 1: Write failing marker and chapter-count tests**

Change the pure expectation to:

```js
assert.deepEqual(
  model.resolveMapPresentation({ has_performance:true, current:false, has_demo:true }, 0),
  { state:'completed', number:1, showCover:true, marker:'star' }
);
```

In browser acceptance, assert completed nodes contain one `.level-node__marker--star`, current contains no star and one locator, locked contains one lock, and chapter headings expose text matching `★ 2/3` in the partial-completion fixture.

- [ ] **Step 2: Run tests and confirm the old check marker fails**

Run:

```powershell
cd app
node --test tests-js/map-presentation.test.mjs
```

Expected: completed marker is `check`, not `star`.

- [ ] **Step 3: Implement the binary star presentation**

Update `resolveMapPresentation`:

```js
marker: { completed: 'star', current: 'locator', locked: 'lock' }[state]
```

Add a filled five-point star SVG to `MAP_MARKERS.star`. Keep `has_performance` as the only route to completed. Render chapter completion copy as `★ ${completed}/${total}` from the same library summary; do not create a score field.

Style completed stars with restrained gold materials (`#e3a92f`, ivory rim, warm brown shadow), current with a more legible double teal target ring and raised shadow, and locked with lower contrast. Do not cover more than a small corner of the video thumbnail.

- [ ] **Step 4: Restore path progression hierarchy**

Keep the existing three path layers. Change only the completed inner line to muted gold and retain teal for the short transition into the current node:

```css
.trail--done .trail__progress { stroke:#d6a63a; filter:drop-shadow(0 1px 2px #5a431b55); }
.level-node__marker--star { background:linear-gradient(#f5c85a,#d99a22); color:#fffaf2; }
```

Confirm the path split still joins at the current node and does not change `splitPathPoints` semantics.

- [ ] **Step 5: Run unit and rendered state checks**

Run:

```powershell
npm test
$env:NODE_PATH='C:/Users/q00679663/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
node tests-browser/modern-toy-ui.cjs --focus=progress
```

Expected: 0/30, 2/30 and 30/30 fixtures show correct lock/locator/star shapes and gold completed route without horizontal overflow.

- [ ] **Step 6: Commit**

```powershell
git add app/static/map-model.mjs app/static/app.js app/static/style.css app/tests-js/map-presentation.test.mjs app/tests-browser/modern-toy-ui.cjs
git commit -m "feat: restore binary star rewards"
```

---

### Task 3: Add one-shot completion and chapter celebrations

**Files:**
- Modify: `app/static/app.js`
- Modify: `app/static/style.css`
- Modify: `app/static/map-interactions.mjs`
- Modify: `app/tests-js/map-presentation.test.mjs`
- Modify: `app/tests-browser/modern-toy-ui.cjs`

**Interfaces:**
- Produces: `createCelebrationQueue()` with `queue(levelKey)`, `consume(levelKey)` and `clear()`; `app.js` queues only after a successful performance upload and consumes after the map becomes visible.
- Consumes: canonical level key `${chapter.id}/${level.id}` and existing upload/reopen/close-detail flow.

- [ ] **Step 1: Write failing pure queue tests**

Add to `map-presentation.test.mjs`:

```js
const queue = createCelebrationQueue();
queue.queue('01-choosing-requests/01-request-an-item');
assert.equal(queue.consume('01-choosing-requests/01-request-an-item'), true);
assert.equal(queue.consume('01-choosing-requests/01-request-an-item'), false);
queue.queue('x');
queue.clear();
assert.equal(queue.consume('x'), false);
```

- [ ] **Step 2: Run the focused test and confirm missing export**

Run `node --test tests-js/map-presentation.test.mjs`.

Expected: import/export failure for `createCelebrationQueue`.

- [ ] **Step 3: Implement and wire the in-memory queue**

Implement a closure-backed `Set` in `map-interactions.mjs`. In `uploadRecording`, queue only when `kind === 'performance'` and the upload response is successful. When returning from detail to the visible map, consume the current key and add `.level-node-wrap--just-completed` plus `.chapter-world--just-completed` when the chapter count became 3/3. Remove classes on `animationend`.

Do not use localStorage, sessionStorage or profile data: a page refresh must reset pending celebration state.

- [ ] **Step 4: Add reduced-motion and non-blocking animation**

Use a 500–700ms star scale/settle animation and a single 700ms chapter-title glow. The animation must not move the node hit target, trap focus or block pointer input. Under reduced motion, disable both keyframes and retain the final static star.

- [ ] **Step 5: Prove save, return and refresh behavior**

Extend the isolated browser upload fixture:

1. Open current lesson.
2. Save a performance response.
3. Return to map and assert both completion class and gold star appear.
4. Wait for `animationend` and assert classes clear while the star remains.
5. Reload and assert no celebration class appears.

Run the focused browser flow and `npm test`.

- [ ] **Step 6: Commit**

```powershell
git add app/static/app.js app/static/style.css app/static/map-interactions.mjs app/tests-js/map-presentation.test.mjs app/tests-browser/modern-toy-ui.cjs
git commit -m "feat: celebrate completed lessons once"
```

---

### Task 4: Full visual and native acceptance

**Files:**
- Modify: `app/README.md`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/specs/2026-09-05-adventure-feedback-ui-correction.md`

**Interfaces:**
- Consumes: final shell, account overflow, marker states and celebration behavior.
- Produces: accurate operational documentation and repeatable acceptance evidence outside the repository.

- [ ] **Step 1: Run syntax and full automated suites**

```powershell
cd app
node --check static/app.js
node --check static/map-model.mjs
node --check static/map-interactions.mjs
npm test
.venv\Scripts\python -m pytest -q
```

Expected: all commands exit 0.

- [ ] **Step 2: Run browser and Electron acceptance**

```powershell
$env:NODE_PATH='C:/Users/q00679663/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
node tests-browser/modern-toy-ui.cjs --self-test
$env:TOY_QA_ELECTRON='1'
node tests-browser/modern-toy-ui.cjs
```

Capture map/header/state screenshots for 1440×960, 800×600, 390×844 and Electron 800×600 into a temporary directory outside the repository. Verify no page errors or unexplained console errors.

- [ ] **Step 3: Compare against the approved correction spec**

Record a short mismatch ledger covering: equal capsule heights, true progress centering, mobile single-row fit, one-star completion, current target, locked state, gold completed path, chapter `★ n/3`, and reduced-motion behavior. Fix any unintentional mismatch before proceeding.

- [ ] **Step 4: Update documentation**

Document the one-star binary meaning, topbar layout, account internal scrolling and one-shot celebration. Remove stale references to teal completion checks where they describe the map node.

- [ ] **Step 5: Final repository checks and commit**

```powershell
git diff --check
git status --short
git add app/README.md README.md AGENTS.md docs/specs/2026-09-05-adventure-feedback-ui-correction.md
git commit -m "docs: record adventure feedback acceptance"
```

