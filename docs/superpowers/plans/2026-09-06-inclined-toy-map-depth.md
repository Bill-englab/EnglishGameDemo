# Inclined Toy Map Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the route, lesson discs, and map controls as one inclined 3D toy system faithful to the approved reference image.

**Architecture:** Keep all state and interaction behavior intact. Extend the existing SVG route layering and HTML/CSS node surfaces so geometry, sidewalls, shadows, and highlights share a single visual camera; regroup only the top-shell markup needed to overlap the account avatar with progress.

**Tech Stack:** Flask templates, native CSS, native ES modules, SVG, Node test runner, pytest, Playwright/Edge, Electron 31.

## Global Constraints

- No new dependency, bundler, database, or external asset service.
- Curriculum, binary completion rules, media paths, upload behavior, and profile behavior do not change.
- All interactive targets remain at least 44×44px and all existing keyboard/Electron behavior remains functional.
- Desktop target is the accepted 1536×1024 reference; responsive checks include 1440×960, 800×600, 390×844, and 844×390.

---

### Task 1: Lock the perspective and shell contract in acceptance tests

**Files:**
- Modify: `app/tests-browser/modern-toy-ui.cjs`

**Interfaces:**
- Consumes: existing `.trail--*`, `.level-node*`, `.topbar`, `.progress`, `.user-menu__trigger`, and `.current-lesson-button` DOM.
- Produces: acceptance assertions for route sidewall separation, elliptical top faces, shared shadow direction, progress/avatar overlap, and reference-like control placement.

- [x] Extend `mapDepthAndDensity()` to read route transforms, node aspect ratios, shell group rectangles, and avatar overlap.
- [x] Run `node tests-browser/modern-toy-ui.cjs --focus=map-depth` and confirm the new perspective assertions fail against the flat baseline.
- [x] Keep existing alignment, first-chapter density, minimum-target, and overflow assertions unchanged.

### Task 2: Rebuild route and lesson discs as inclined physical surfaces

**Files:**
- Modify: `app/static/app.js`
- Modify: `app/static/style.css`

**Interfaces:**
- Consumes: `drawMapPath()` DOM center points and `createLevelNode()` state/cover markup.
- Produces: route paths `ground-shadow`, `contact-shadow`, `sidewall`, `surface`, `highlight`, `seams`, plus CSS node top/sidewall/rim layers.

- [x] Rename and order the generated SVG layers so the material anatomy is explicit while preserving progress calculations.
- [x] Add route CSS with a lower/right sidewall and upper top face; tune desktop and mobile widths/offsets separately.
- [x] Give ordinary, video-cover, current, and locked nodes a slightly elliptical top plane, layered front sidewall and cast shadow while keeping the glyphs readable.
- [x] Preserve hover, active, focus-visible, reduced-motion, thumbnail fallback, and marker placement.
- [x] Run syntax, Node, and focused browser checks; correct path-center and responsive regressions.

### Task 3: Match the reference control composition

**Files:**
- Modify: `app/templates/map.html`
- Modify: `app/static/style.css`
- Modify: `app/static/titlebar.js`
- Modify: `app/tests/test_detail_layout.py`
- Modify: `app/tests-browser/modern-toy-ui.cjs`

**Interfaces:**
- Consumes: unchanged element IDs and account/window event bindings.
- Produces: `.shell-progress-account` composition with progress capsule and overlapping avatar/account target; Electron controls remain in `.shell-actions`.

- [x] Move the account trigger next to/over the progress capsule in markup without changing its IDs, popup, or behavior.
- [x] Style menu, Stage, progress/avatar, Current lesson, and Electron controls from shared elevation tokens; add hover/pressed/focus states.
- [x] Keep browser and Electron placement correct at all breakpoints; bound the account popup to the viewport.
- [x] Update structure and geometry tests and verify drawer/account/window-control interactions.

### Task 4: Visual fidelity, regression verification, and documentation

**Files:**
- Modify: `docs/specs/2026-09-05-modern-toy-theatre-ui-design.md`
- Modify: `docs/plans/2026-09-05-modern-toy-theatre-ui-implementation.md`

**Interfaces:**
- Consumes: approved concept `design/reference/modern-toy-theatre-map.png` and fresh browser/Electron screenshots.
- Produces: final fidelity ledger and reproducible verification record.

- [x] Run `node --check static/app.js`, `npm test`, and `.venv/Scripts/python -m pytest -q` from `app/`.
- [x] Run the complete Playwright acceptance with real Electron enabled and save temporary screenshots outside the repository.
- [x] Inspect the accepted concept and final 1536×1024/390×844 renders with `view_image`; compare camera, route, node, controls, typography, and responsive density.
- [x] Record the fidelity ledger and remaining intentional deviations; keep temporary screenshots outside the repository.
- [x] Run `git diff --check` and inspect `git status --short` before committing.
