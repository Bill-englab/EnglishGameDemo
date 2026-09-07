# Stone map detail pass — 2026-09-07

## Requested result

Make sparse/blurry backgrounds richer and clearer, strengthen stone shadows, and restore VideoGen for every lesson. Preserve the approved map, alternating route, synchronized scrolling and compact left header.

## Implementation

- Generated ten detailed overhead chapter scenes plus a ground texture. Originals and prompt recipe: `app/static/worlds-map/README.md`. Actual portrait resolution is 1024×1536, not 4K.
- Added `stone-worlds.mjs`: cap artwork at 1024 CSS px, compose overlapping strips over repeating ground. Existing same-chapter responsive/legacy fallback remains. Scene loading begins within 800px of the viewport after geometry is established, avoiding eager transfer of all roughly 42 MB.
- Added contact and lower-right cast shadows to pedestals and pavers, reduced for mobile.
- VideoGen's missing content came from the isolated preview omitting `prompts/04`. The runner now copies all 90 canonical prompts. A visible shortcut under Watch & Learn opens/focuses the disclosure. Request failures have retry and are distinct from a valid empty response. Generation still takes place in the user's video tool; the app supplies prompts and accepts the resulting demo.

## Verification

- Node: 48 passing; Python: 346 passing.
- Full map: six viewport sizes, all 30 lessons, chapter transitions, synchronized scroll, bounded artwork, deferred backgrounds, shadows, completion/save feedback, empty/all-complete states and fallback. Real isolated Electron with preload, detail navigation and minimize also passes.
- VideoGen: all 30 lessons, all 90 canonical prompt values and actual Copy actions, desktop/mobile shortcut, failure/retry and empty state pass.
- Desktop/mobile screenshots visually inspected. Preview at port 42170 uses temporary curriculum, prompts, account and media; browser save tests intercept requests, leaving family recordings untouched.

## Desktop width correction

User feedback: the 1024px cap made desktop look like a portrait strip with unrelated grass sidebars. Replaced that cap and horizontal edge masks with full-width scenery. Ten dedicated1536×1024 desktop PNGs now complement the original mobile portraits; the768px breakpoint chooses the appropriate variant. Vertical overlap and viewport-proximity loading remain. The rendering uses proportional cover, including same-chapter portrait fallback when a desktop image is unavailable.

Verification:48 Node tests pass, including the regression test first observed failing under the previous cap/candidate selection. The full browser suite passes at1920×1080 plus the prior six sizes, asserting full-width art and correct desktop/mobile selection; scroll, chapter transitions, completion feedback, fallback and isolated native Electron checks pass. Inspected wide first-screen and chapter-transition screenshots in `stone-wide-pass` outside the repo. Backend unchanged in this correction.
