# Stone map rollout implementation plan

**Goal:** Apply the approved sandstone/photo-frame map and synchronized scenery scrolling to all 30 lessons; reduce the top chrome while preserving its compact left alignment.

**Architecture:** Promote the sample DOM renderer and CSS to shared native modules. The default entry renders every chapter; `?map-sample=1` retains the three-lesson comparison. Each chapter owns a scrolling background slide, using the existing responsive asset loader/fallback. Separate stepping stones connect lessons, with chapter headings as gateways. Existing library state, detail/upload navigation, shell and completion queues stay authoritative. Defer media loading until near the viewport.

**Stack:** Native ES modules, HTML/CSS, existing Flask/Electron, Node tests and isolated Playwright/real-preload Electron QA. No new runtime dependencies.

- [x] Promote renderer/assets, preserve global numbering, binary states, current focus, thumbnail fallbacks and completion animation hooks. Remove superseded map-rendering orchestration.
- [x] Render chapter-sized backgrounds in the same scrolling canvas and connect all lessons without crossing chapter headings. Verify resize and detail/back restoration.
- [x] Reduce header controls consistently for desktop/mobile/Electron, preserving separated avatar and left placement.
- [x] Exercise full 30-lesson map, chapter boundaries, near-viewport media, current beyond chapter 1, all-complete/empty data, missing background/media, detail/menu/upload feedback and six viewport sizes.
- [x] Run both unit suites and focused browser/native checks, inspect rendered evidence, request independent review and document final result.

Use isolated preview accounts and generated fixtures only; never start the production Electron main or scan family media. Keep the existing work on `codex/stone-map-sample`; no merge or publish is part of this task.

## Completed verification — 2026-09-07

- `npm test`: 46 passed. `.venv/Scripts/python -m pytest -q`: 346 passed. Entry/module syntax and `git diff --check` passed.
- `stone-map-sample.cjs`: selected three-lesson visual comparison and hidden Electron checks passed.
- `stone-map-full.cjs`: all 30 numbers, 10 distinct scenes, all 29 alternating routes, six viewports, chapter gateways, 1:1 scroll, separated compact avatar/progress, profile dialog, later current, intercepted save feedback and chapter completion, single-use celebration, all-complete, empty library, deferred video load and both legacy/fully-missing artwork fallback passed. Native Electron full-map/detail/minimize passed with real preload.
- Independent reviewer found no actionable defects. No family data or production media scan was used. The old full visual suite was not used because its map and dialogue assertions describe superseded UI.
- Rendered first-screen and chapter-boundary desktop/mobile evidence inspected at `C:/Users/q00679663/.codex/visualizations/2026/09/07/01a079ee-e01c-7801-ba32-5244a684abe8/stone-rollout/`; `full-results.json` records acceptance.
- Live isolated preview for this session: `http://127.0.0.1:42170/`. It has fictional footage in the first three lessons only. The normal application uses authenticated family media; `?map-sample=1` remains available for comparison.
- Art remains based on the approved reconstructed assets, not a pixel-identical copy of the concept. Chapter cover cropping varies with the responsive scene dimensions. First-frame video covers are lazy; a cached performance-thumbnail endpoint is a possible later optimization.
