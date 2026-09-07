# Stone map visual sample

**Goal:** Validate the approved photo-frame-on-stone design in the real Web/Electron shell, for the first three lessons only.

**Architecture:** An opt-in `?map-sample=1` renderer shares the existing library, shell, chapter background and detail navigation. Generated transparent stone/paver/star assets provide texture; rectangular media remains ordinary replaceable content. The normal map stays unchanged. A separate loopback preview runner uses temporary media/accounts and fictional sample footage; no family files or production startup scan.

**Constraints:** Native ES modules, no build/dependencies or cloud services. One binary completion star. Alternating left/right stone arcs, increased spacing, responsive rectangular thumbnails. No changes to curriculum, recording ownership, overall shell or detail layout. Prototype lives on `codex/stone-map-sample`.

## Work

- [x] Produce and inspect transparent pedestal, stepping-stone and star assets, plus clearly fictional sample media.
- [x] Reproduce the obsolete `groupDialogueByPart` import failure in the browser; remove the obsolete import.
- [x] Add `stone-map-sample.mjs` and scoped `stone-map-sample.css`; show three real lessons, prioritize performance media, retain numbered placeholders when footage is absent, keep status and titles accessible.
- [x] Use five separated pavers per gap: positions follow a sine arc with negative direction for gap 0 and positive for gap 1. Compute from actual frame/title rectangles; keep stones out of text/media.
- [x] Add a temporary-data preview runner and a browser acceptance script. Exercise default entry, sample states, detail/back, current focus, responsive reflow, missing media and native Electron controls.
- [x] Run both existing test suites, inspect concept and rendered desktop/mobile/Electron screenshots, record concrete fidelity differences and preview URL.

## Verification and visual comparison — 2026-09-07

- Node tests: 46 passed; Python tests: 346 passed. Syntax checks and `git diff --check` passed. The new entry-import test failed on the removed export before the fix and passed afterwards.
- Focused browser acceptance passed at 1440×960, 1024×1900, 800×600, 390×844, 320×568 and 844×390. Native Electron passed with real preload and isolated userData. No runtime errors in the tested happy paths. The older full browser suite was not claimed as passing: its dialogue-part expectations predate continuous dialogue.
- Independent review identified cross-port session-cookie collision in the preview; fixed by a preview-specific cookie name, covered by browser acceptance.
- Preview for this session: `http://127.0.0.1:42170/?map-sample=1`. Later sessions should use the runner's printed URL.
- Evidence: `C:/Users/q00679663/.codex/visualizations/2026/09/07/01a079ee-e01c-7801-ba32-5244a684abe8/stone-sample/`, including `results.json`, `sample-1024x1900.png`, `sample-390x844.png` and `sample-electron-800x600.png`.

| Aspect | Rendered result versus accepted concept |
| --- | --- |
| Composition | Rectangular ivory photo frame, broad shallow stone base, number and separate title plaque match the selected arrangement. Existing shell and responsive world backgrounds are retained. |
| Path | Five separate pavers per gap bend left then right. Spacing increased; screenshots and geometry checks confirm no overlaps with frames/titles. |
| Completion/status | Large faceted gold star is prominent. Teal locator and lock retain binary completion/current/locked meanings. |
| Material and shadows | Independent raster stone assets carry texture; CSS supplies frame/plaque depth. Current stone is lighter and contact shadows softer than the concept; these are not pixel-identical assets. |
| Media and responsive behavior | Media stays rectangular and replaceable. Fixture pictures are independently generated, so their characters/composition differ. Narrow screens scale components and scroll rather than squeezing all three lessons into one screen. |

## Review boundary

Follow-up: the progress/profile cluster now follows the Stage label compactly on the left. In sample mode, the existing background layer is mounted inside `#map-scroll` and covers the full three-lesson canvas, including the area behind the sticky header. Background and pavers move 1:1 through native scrolling; the header remains fixed. The responsive image loader and same-world fallback are reused. Browser acceptance first reproduced the fixed-background mismatch, then passed synchronized displacement checks at all six viewports and in Electron. The taller background uses cover cropping, so scenery framing differs from the earlier fixed viewport image.

This is a three-lesson visual sample, not a 30-lesson rollout or a claim of pixel-identical art. Real media uses `<video preload="metadata">` first frames for performances and existing demo thumbnails; media stays rectangular. Preview example progress comes only from isolated generated videos. Accepted concept: `exec-4e3c7605-f11b-4c68-8e77-e658a1aa045e.png` from the current task's generated-images directory.

The sample was subsequently promoted to `app/static/stone-map.mjs` and `stone-map.css`; final rollout and validation are recorded in `2026-09-07-stone-map-rollout.md`.
