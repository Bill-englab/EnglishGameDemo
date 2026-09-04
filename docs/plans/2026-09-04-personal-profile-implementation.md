# Personal Profile Implementation Plan

> Execution: inline using executing-plans; repository policy keeps daily work on main. Implementation was not delegated; requesting-code-review required an independent read-only reviewer. Approved spec: ../specs/2026-09-04-personal-profile-design.md.

**Goal:** Add private avatars and display nicknames without changing account identity or recordings.

**Architecture:** A profile store owns validation, image conversion and atomic filesystem persistence. Flask owns session/CSRF and current-user routes. An isolated browser module owns a native dialog and draft lifecycle, mounted in the existing account menu; the wider B redesign remains separate.

**Tech Stack:** Flask, Python standard library, Pillow, native HTML/CSS/ES Modules, pytest, node:test and existing bundled Playwright/Edge.

## Global constraints

- No database, cloud service, frontend framework or build step.
- Username stays unchanged; profiles never affect Stage, curriculum or recordings.
- JPEG/PNG/static WebP only, 5 MiB per image, 16 million pixels, 256×256 JPEG output with metadata stripped.
- Nickname: trimmed, at most 24 Unicode code points, no control characters; empty falls back to username.
- Profile request limit 6 MiB, independent of video limit. Session identity and CSRF required.
- Runtime profiles ignored by Git; all tests use temporary roots.

## Files and interfaces

- `app/profile_store.py`: `read_profile(root, username) -> dict`, `save_profile(root, username, nickname, image=None, reset=False) -> dict`, `read_avatar(root, username) -> bytes | None`, `delete_profile(root, username) -> None`. Public dict: nickname, displayName, avatarUrl. Image validation raises ValueError; disk failures raise OSError. Per-user OS file locks serialize updates and deletion across processes.
- `app/app.py`: `PROFILES_ROOT`, profile routes, CSRF issuance/checking, api/me additive fields, account deletion cleanup.
- `app/static/profile.mjs`: `initProfile(initialProfile) -> {clear()}`; draft state, loading/saving, session-response guards, native dialog lifecycle.
- `app/static/profile-model.mjs`: `normalizeNickname(value) -> string`, throws on invalid input; shared UI validation tested independently.
- `app/templates/map.html`, `app/static/profile.css`, `app/static/avatar-default.svg`: isolated accessible profile surface.
- `app/static/app.js`: initialize profile UI with api/me data, clear before logout.
- `app/tests/test_profiles.py`, `app/tests-js/profile-model.test.mjs`: behavior regression tests.
- `.gitignore`, `app/requirements.txt`, READMEs and AGENTS: storage/dependency/usage documentation.

## Task 1 — Profile store and authenticated routes

- [x] Write isolated integration tests first. Missing endpoints must fail before implementation:

```python
def test_default_profile(client):
    response = client.get('/api/profile')
    assert response.status_code == 200
    assert response.json['displayName'] == 'alice'
    assert response.json['avatarUrl'] is None
```

- [x] Run `python -m pytest tests/test_profiles.py -q`; confirm missing routes fail with 404.
- [x] Implement store: validate basename and resolved containment; decode images under Pillow decompression warnings-as-errors; EXIF transpose, center fit, composite transparency, encode a fresh RGB image with no metadata. Generate random avatar filename, write it completely, then `os.replace` temporary profile JSON. Only remove old avatar after metadata commit. Lock reads and writes with OS file locks. On validation/write failure keep old profile.

```python
with profile_lock(root, username):
    # New media is fully written before publishing its reference.
    temporary.replace(directory / 'profile.json')
```

- [x] Add routes. GET issues CSRF; POST validates header before parsing multipart and rejects unknown fields, ambiguous reset/upload, oversized input and stale/deleted sessions. JSON errors use 400/401/403/413/503; responses are private/no-store. Read avatar bytes while locked so replacement cannot race send_file. Add identity fields to api/me; clean profiles when deleting accounts, never recordings.

```python
if not secrets.compare_digest(session_token, request.headers.get('X-CSRF-Token', '')):
    return jsonify(error='Please reopen My Profile and try again.'), 403
```

- [x] Extend tests: supported formats, orientation, transparency, metadata, animation, corrupt/oversized images, Unicode, session/CSRF, path escape, user isolation, fallback, failure atomicity, simultaneous writes and account recreation.
- [x] Run targeted and full pytest; commit backend with tests and dependencies.

## Task 2 — Profile dialog and account integration

- [x] Add failing pure validation tests, and exercise absent profile trigger in a temporary browser script before adding UI.

```js
assert.equal(normalizeNickname('  小虎  '), '小虎');
assert.throws(() => normalizeNickname('a\u0000b'));
assert.throws(() => normalizeNickname('a'.repeat(25)));
```

- [x] Run `npm test` and confirm new module is missing; implement normalization without HTML insertion.
- [x] Add a native dialog outside the main app scroll containers; labelled fields, status/error region, image preview, photo/default actions and Save/Cancel. Use minimum 44px controls, mobile safe-area and no-drag; remove maximum-scale viewport restriction.
- [x] Implement `initProfile`: show current profile, fetch fresh token when opening, retain draft until Save; preview with browser-decoded image and centered cover. Use request generation guards and AbortController to discard closed or old-session responses. Revoke blob URLs on replace/close. Disable duplicate saves; on failure preserve draft. Disable profile access during recording/countdown. Save response refreshes nickname/avatar; default resets the image but not nickname. Refresh avatar with a new request after save, no persistent browser cache.

```js
nameElement.textContent = profile.displayName;
avatar.src = profile.avatarUrl || '/static/avatar-default.svg';
```

- [x] Wire init and logout cleanup in app.js; retain user management and logout behavior. No map restyle.
- [x] Run JS syntax checks, node tests, pytest and browser flows at desktop and phone widths; commit UI with tests.

## Task 3 — Verification and handoff

- [x] Browser plugin absent: use existing bundled Playwright + installed Edge. Isolated Flask instance must import app without running startup media optimization; override profiles/users/media to temporary locations.
- [x] Verify login → avatar menu → My Profile → choose image → preview → save → reload persists; cancel/default/error; keyboard Escape/focus return; second user sees default. Check 1440×900 and 390×844 plus 360px width, no horizontal overflow or console errors. Save screenshots outside repository.
- [x] Run both full test suites, syntax checks, curriculum validator and `git diff --check`. Review touched paths for sensitive data.
- [x] Update README, app README, AGENTS and spec status; record actual test counts and platform limits. No real Electron/iOS claim without testing those platforms. Commit only implementation/doc paths.

## Self-review

All spec sections map to tasks 1–3. Public fields agree across store/routes/UI. Wider B redesign, compression fixes and real video operations remain out of scope. Baseline: 87 pytest and 11 node tests pass; Pillow 12.1.1 available in the current Python environment.

## Delivery record

- Added 29 profile/backend tests and two nickname tests: final expected suite totals 116 pytest / 13 node tests; the handoff uses the fresh final run rather than this count as proof.
- Observed failing missing-route and missing-UI tests before implementation; security regressions reproduced before fixes (Windows case-distinct identity, non-ASCII CSRF, stale/legacy sessions).
- Profile directory changed from raw username to `u-<ASCII hex>` after review reproduced a Windows case-insensitivity collision; this is documented in the approved spec's implementation notes. Login identity and recordings were not renamed.
- Added login-bound HMAC account stamps and locked authorization checks. Existing sessions need one new login; no password change required. Cross-process OS locks are implemented; automated contention test covers threads, not a multi-worker production deployment.
- Backend and UI are delivered in one verified feature commit, rather than the two intermediate commits proposed above.
- Browser plugin unavailable; used installed Edge with bundled Playwright at http://127.0.0.1:65492, isolated accounts/roots, no startup video optimization. Desktop 1440×900, phone 390×844 and 360×844 passed login, preview/upload, save/reload, cancel, default, validation, simulated save failure, Escape/focus and account switch. Page identity, nonblank content, modal layout and touch targets checked. No page runtime errors; expected background-image format probes still return 404, and the negative save case deliberately returned 503.
- Screenshots were saved and visually reviewed outside the repository. No real Electron window, mobile keyboard or iOS Safari/device was tested.
- Independent review returned no remaining actionable security/isolation finding after targeted re-review. Neither B-map redesign nor video compression is claimed complete.
