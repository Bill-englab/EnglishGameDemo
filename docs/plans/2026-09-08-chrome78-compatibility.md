# Chrome 78 loading failure

## Cause

The phone runs Chrome 78.0.3904.96. The authenticated `/api/library` opens normally, but the home page shows its static avatar, leaves controls inactive, then displays the startup timeout error.

The shared module graph used optional chaining and nullish coalescing, which Chrome 78 cannot parse. Chromium 78.0.3882.0 (official snapshot 686378, V8 7.8) reproduced `SyntaxError: Unexpected token '.'` before the application initialized. This is distinct from a slow image download or a failed curriculum API. [V8 documents optional chaining support starting in Chrome 80](https://v8.dev/features/optional-chaining).

## Changes

- Replace unsupported syntax and newer convenience APIs with equivalent checks and DOM operations. Keep the existing ES module structure and dependencies.
- Add feature-gated CSS fallbacks for positioning, frame/pedestal dimensions, responsive widths and spacing. Without these, the old engine loaded the map but collapsed empty covers and removed the gaps between lessons.
- Remove the misleading connection diagnosis from the generic loading error.
- Add a focused Node regression guard and an optional native Chromium 78 browser test.

## Verification

- Native Chromium 78: 390×844, 320×568 and 844×390. All 30 lessons render; backgrounds load; frames retain 16:9; lesson gaps remain 194px on mobile and 216px at desktop widths; no horizontal overflow. Account menu, profile dialog, lesson detail and course drawer respond. No runtime exceptions.
- Screenshots inspected for the corrected map and course drawer.
- Modern browser full map regression: all seven viewports, completion states, fallback assets, profile access and synchronized scrolling passed. Native Electron map, detail and minimize checks passed.
- Python: 351 passed. Node: 55 passed.

The old-engine test uses an isolated local preview with temporary accounts and media. It is a Chromium 78 desktop engine with phone-sized viewports, not the physical Android device or its exact Chrome patch version. Camera capture, native mobile file selection and video codec support were not verified in that engine. Server deployment and the user's phone refresh remain necessary to verify the deployed fix.
