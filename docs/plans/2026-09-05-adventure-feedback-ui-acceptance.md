# Adventure feedback UI — current acceptance

Verified on 2026-09-05 after the final corrections to the [approved specification](../specs/2026-09-05-adventure-feedback-ui-correction.md).

## Result

- Gold and teal inner strokes use the same neighboring control points as the full ivory route. Rendered checks sample 19 positions between endpoints per stroke at desktop and mobile widths; deviation is below 1px (observed below 0.001px).
- Save A → Next B → Back celebrates A and its newly completed chapter once. The map drains every eligible pending key. Re-recording, refresh and a later Back do not replay consumed celebrations.
- Both lesson and chapter effects clean up on animation end, cancellation and view teardown. Reduced motion leaves static state markers and starts no completion motion.
- Completed / Current lesson / Locked are included in button accessible names. The current node also has a small visible `Current lesson` label. Completion still means only `has_performance`, with exactly one gold star and no score.
- The 56px rail retains 52px capsules with a shared 16px radius. At 390px the brand ellipsizes within its own column; progress remains centered and the avatar remains fully visible. Existing account target-size and five-user internal-scroll checks pass.

## Repeatable checks

Run from `app/`, using existing dependencies:

```powershell
npm test
.venv\Scripts\python.exe -m pytest -q
node --check static/app.js
node --check static/map-path.mjs
node --check static/map-interactions.mjs
node --check tests-browser/modern-toy-ui.cjs
node --check tests-browser/feedback-regressions.cjs
node tests-browser/modern-toy-ui.cjs --self-test

$env:NODE_PATH='<existing Playwright node_modules>'
$env:TOY_QA_PYTHON='<Python executable with app requirements>'
$env:TOY_QA_OUTPUT='<absolute screenshot directory outside the repository>'
$env:TOY_QA_ELECTRON='1'
node tests-browser/modern-toy-ui.cjs
node tests-browser/modern-toy-ui.cjs --focus=account
node tests-browser/modern-toy-ui.cjs --focus=evidence
git diff --check
```

Focused final-fix regressions also run independently with `--focus=route`, `--focus=navigation-celebration`, `--focus=cancel-celebration` and `--focus=accessible-state`. The full run includes these behaviors. The `evidence` flow additionally proves a failed save earns no celebration and a completed demo cover retains exactly one corner star.

Current automated counts: **44 Node tests, 160 Python tests**. Harness self-tests cover expected-404 filtering, time-bounded waits and cleanup. The successful full acceptance run has no page errors or unexpected console errors.

## Environment and limits

Windows, Node 24.11.1, Python 3.10.0, Playwright 1.62.1, Microsoft Edge 152.0.4191.62 and real Electron 31.7.7/preload. Browser plugin not available; the existing Playwright/Edge harness is used. Viewports: 1440×960, 800×600, 390×844, 844×390 and a hidden native Electron 800×600 window. Native minimize, maximize, restore, close and drawer input are exercised.

The harness imports Flask into a temporary server on a random loopback port, copies curriculum into its own fixture and isolates accounts, media and profiles. Successful performance tests save only generated test recordings inside that fixture; other upload cases are intercepted. No production startup scan or user's Electron window is used. Temporary resources are removed on exit.

Screenshots and RED/GREEN logs are stored outside the repository. Real family recordings/cameras, Safari/iOS, other screen readers and deployment environments are not part of this acceptance. Accessible names are checked through Playwright role queries; this is not a manual screen-reader audit. The initial combined run encountered an intermittent legacy account-control measurement failure; the isolated account run and subsequent full run passed, with diagnostic details retained in the test if it recurs.
