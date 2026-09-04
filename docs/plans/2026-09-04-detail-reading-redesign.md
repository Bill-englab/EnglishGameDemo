# Detail reading redesign

Status: COMPLETE. Independent task review and final integration review approved on 2026-09-04. Revised option 2 approved by user: left media / right dialogue. Earlier oversized-header concept rejected. No production UI had changed before this selection. Earlier red-phase tests were replaced by tests for this selection.

## Goal and scope

Implement the detail portion of `docs/specs/2026-09-04-immersive-ui-redesign.md`, without changing the map, curriculum, media storage, completion rules or desktop launcher. This is a focused improvement, not completion of the entire B redesign.

Desktop: compact ~56px toolbar (Map/title/chapter plus Electron controls); left 320–360px media rail (Your Show recording/playback first, Watch & Learn demo second); right flexible reading column (complete A/B/C, two complete replay situations, collapsed grown-up notes and production tools); previous/next below. Only the page scrolls; no dialogue, replay or prompt scrollboxes. Empty media uses compact explicit buttons, not two ambiguous giant plus signs. Existing recordings remain the playback focus when present. Below ~900px use a single column with mobile media tabs, then complete reading flow.

## Visual contract

Selected ImageGen reference: [`detail-compact-split-concept.png`](../../design/reference/detail-compact-split-concept.png). Warm off-white page, dark brown text, rounded Fredoka headings / Nunito reading text, apricot child bubbles, max1280px content, 320px left rail / flexible reading column, restrained separators. Controls at least44px. No pattern pills until grown-up notes expanded. No bitmap UI assets needed.

Intentional reference corrections: Your Show must say Record your roleplay / Start recording, not the generated mistaken No demo yet / Add demo; no duplicate Add demo action there. Replay text comes verbatim from canonical data, not the image's paraphrases. Preserve all authored lines, A/B/C labels, saved-performance status and native Electron controls. Omit redundant app brand from compact toolbar if space is needed for actual lesson title; no invented decorative icons or metrics. Mobile uses the already-approved two media tabs.

## Task 1: Implement the approved detail reading surface (TDD)

- [x] Add structural HTML regression tests for order and closed grown-up/tools disclosure, and pure media-state tests; verify red on current implementation.
- [x] Change `app/templates/map.html` only within detail; retain all rendering IDs. Replace obsolete detail layout rules in `app/static/style.css`; keep map and recording classes stable.
- [x] Add `resolveMediaView({mobile, selected, cameraActive})` in `app/static/detail-media.mjs`; returns selected/showDemo/showPerformance. Wire accessible mobile tabs in `app.js`, pause hidden playback, retain existing DOM through resize, show performance during camera use.
- [x] Add descriptive empty-state buttons, metadata-only video preload, guard late prompt/upload/camera results by detail visit, release camera/timers/blob URLs on navigation. Do not introduce an unsaved-change confirmation or recording history.
- [x] Verify full dialogue/replay text against `/api/library`, desktop + mobile + 800×600, uploads/cancel/error, media playback/tab pause, recorder stop/redo/save/resize/navigation, previous/next/map and Electron controls. Use an isolated temporary media/user server; never test uploads against family recordings.
- [x] Full Python/Node tests, syntax checks, read-only code review, visual comparison and docs update.

## Deferred

Map redesign, curriculum drawer, Stage display, countdown, playback speed controls and one-tap-current remain outside this focused change. Compression backend issues remain documented in their audit; do not mutate family media to test them.

## Verification record

Baseline: 116 pytest tests and 13 Node tests passed. Browser plugin unavailable; browser verification uses bundled Playwright with installed Microsoft Edge, without adding repository dependencies.

Implementation `015bf8d`: 133 Python tests and 18 Node tests passed. HTML order/disclosure and pure media-state tests were red before implementation. Browser regression checks also verified red/green for compact mobile empty state, stale library refresh, immediate Stop-button disable and recorder-start failure cleanup. Root's final review and verification are recorded below when complete.

### Visual comparison

Compared the selected 1494×1052 reference with the app at the same viewport, plus 390×844 mobile and 800×600 small-window views.

| Reference point | Implemented result / intentional adjustment |
| --- | --- |
| Compact top | 56px toolbar; Map, lesson title, chapter; redundant brand omitted |
| Desktop hierarchy | Your Show then Watch & Learn on left; complete reading on right |
| Palette | Warm off-white, brown text, apricot child bubbles, thin neutral borders |
| Type | Fredoka headings, Nunito reading text; dialogue/replay 17px |
| Reading flow | Complete A/B/C and replay fields; one page scroll, no nested reading boxes |
| Above-fold copy | Corrected the image's mistaken demo wording to Record your roleplay / Start recording; preserved canonical dialogue rather than image paraphrases |
| Grown-up tools | Support and VideoGen are separate closed disclosures under Grown-up Notes |
| Mobile | Single column; media tabs; empty recording panel 116px, real video 16:9 |

Longer canonical replay text and retained tools intentionally place Previous/Next below the reference screenshot's initial viewport. No invented replay thumbnails, inactive chevrons, grading stars or decorative metrics were added.

### Functional and platform evidence

- Isolated Flask fixtures use temporary accounts/profiles/demo/recordings; canonical curriculum/prompts are read-only. No startup media scan or family-media writes.
- Browser checks: exact dialogue/replay against library; all 30 prompt routes and real A/B/C clipboard copying; upload cancel/error/retry; playable WebM; recording preview/start/stop/redo/save; resize retains media DOM; hidden playback pauses; navigation releases tracks/timers/blob URLs; late camera/picker/prompt/library responses cannot replace a newer detail.
- Actual Electron executable and repository preload: hidden isolated window, CSS viewports 1280×900 and 800×600, measured header 56px, no horizontal overflow, real minimize/maximize/close IPC. QA used port 65492 and unique temporary userData; process exited 0 with empty stderr. The existing user window/port 28289 was untouched.
- Limits: physical camera/microphone and iOS/Safari were not tested; browser recording used Edge fake devices. Five-minute recording cap was not timed end-to-end. Missing-thumbnail fallback was tested, not real ffmpeg compression in this environment.
- The existing Electron backend may cache the old template: do not promise that reloading that window alone updates it. A new/restarted backend is needed; do not close a potentially unsaved user recording without approval.

### Independent review repair

Task review found same-lesson demo upload completion could reconstruct the whole detail and discard a newly started recording or unsaved playback. Fix `99412cf` updates only the demo panel; performance ownership is untouched. Persistent optional regression `app/tests-browser/detail-upload.cjs` starts an ephemeral isolated Flask fixture and intercepts uploads. Both capture and unsaved-playback cases failed before the fix and passed afterward (identical element/source retained, live tracks or Save action preserved). Root independently reran it successfully.

Final combined verification after that fix: `python -m pytest -q` 133 passed; `npm test` 18 passed; both JS syntax checks passed. Prompt export check: 90/30 synchronized, one explicit pacing warning; complete curriculum validation: 0 issues. Real clipboard and same-size desktop/mobile comparison passed. No production data was modified.

Scoped rereview approved the repair with no new blocking issue. Final independent integration review of `bc61bd2..99412cf` approved with no Critical/Important findings. No deferred review findings. Test services on 65492/65493 were stopped; handoff screenshots retained. Existing user Electron was not restarted. Work remains in local main commits; no push or PR was performed.
