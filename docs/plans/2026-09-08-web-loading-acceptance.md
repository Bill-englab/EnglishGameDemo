# Web loading and mobile login — 2026-09-08

## Changes

- Keep full-resolution chapter art; export delivery WebP and correctly sized transparent sprites. The 24 source assets total 86.17 MB; their delivery equivalents total 17.07 MB. No source PNG artwork was modified.
- Content-addressed images cache for one year. JS, CSS and unversioned assets revalidate, avoiding stale module combinations after deployment.
- Stable thumbnail and video URLs replace per-render timestamps. Media stays private and revalidates; changed recordings return new content, and logged-out requests cannot reuse a protected response. Account APIs remain uncached.
- Session and library requests have 15-second deadlines covering both connection and JSON body reads. A separate inline startup guard exposes retry if an ES module fails or takes over 30 seconds. Failed initialization retries the page; failed library requests retry without discarding an existing map.
- Responsive listeners support older `MediaQueryList.addListener`. Flask explicitly serves `.mjs` as JavaScript even when host MIME tables are generic.

## Reproduction and verification

An isolated mobile-sized Chromium browser loaded the previous code normally, but remained on “Loading your adventure” when a module download failed, a library request never finished, or `MediaQueryList.addEventListener` was absent. This reproduces failure modes, not a confirmed diagnosis of the user's deployed server; its URL and response headers were not available.

Temporary real login fixture (no production accounts, configuration or media):

```powershell
.\app\.venv\Scripts\python.exe tools/preview_stone_map.py --port 42172 --login
$env:STONE_QA_URL='http://127.0.0.1:42172/'
node app/tests-browser/loading-cache.cjs
```

The fixture account is `preview` / `preview-only` and exists only in temporary storage. It permits the login POST; media and profile mutations remain blocked.

Measured at 390×844 with 2 Mbps throughput and 150 ms simulated latency:

| Check | Result |
| --- | --- |
| Login to usable map | 2,625 ms |
| Login to loaded first-screen artwork and fonts | 10,896 ms |
| Requested map artwork, including nearby preload | 1,947,694 bytes |
| Repeat-visit map image transfer | 0 bytes |
| Missing module, stalled module, stalled library, stalled session | Error replaces loading; retry recovers |
| Legacy media-query API | Map loads |
| Lesson open after login | Correct title and media panel |

`stone-map-full.cjs` passed at 1920×1080, 1440×960, 1024×1900, 800×600, 390×844, 320×568 and 844×390, including chapter boundaries, synchronized scroll, compact header, profile access, upload feedback, empty/all-complete maps, background fallback, and isolated native Electron. Screenshots were visually inspected at desktop and phone sizes.

Python: **351 passed**. Node: **53 passed**. After the final startup-script ordering adjustment, the shell tests and mobile loading/cache checks also passed.

These timings are local bandwidth simulation, not measurements of the deployed server or a physical phone. Server-side proxies must preserve asset headers and JavaScript MIME types. Deploy all changed application/static files together and restart the service; front-end changes alone do not apply the cache policy.
