# Three-part video prompts implementation plan

**Goal:** Supply all 30 Stage 04 lessons with three standalone, copyable A/B/C video prompts, using the existing curriculum production design.

**Architecture:** Canonical lesson JSON owns spoken words, roles, setting and revision. Per-lesson `production.json` owns only visual staging (scene and A/B/C start/action/end). A small standard-library renderer produces/checks `a.txt`, `b.txt`, `c.txt`; no app route changes are required.

**Tech stack:** Python standard library, existing pytest, existing `/api/prompts` and Copy buttons. No generation API, dependency or media processing is added.

## Constraints

- Preserve every authored line, order, role and curriculum status. Draft prompts do not certify video_ready or generated-video quality.
- Three nominal ~10s clips; explicitly flag >22 spoken words for pacing review. Never speed up or omit a line to meet duration. Extend a difficult part to 12–15s when needed, still three parts.
- Fixed Child/Dad/Mom/Teacher/Peer visuals; only the two roles used by each lesson. Peer is one consistent brown bear of the same age, not another adult.
- True physical causality, minimal props, matching endpoints. Time ellipses must be explicit when two minutes/five minutes or a bathroom trip cannot occur in real clip time.
- No UI implementation while layout choices are under review. Do not change old prompts, source curriculum, recordings, videos or server startup.

## Tasks and interfaces

- [x] Author and review 30 `prompts/04/<chapter>/<lesson>/production.json` files. Schema: `content_revision: int`, `scene: str`, `parts: {A|B|C: {start: str, action: str, end: str}}`. B.start equals A.end, C.start equals B.end. Separate chapter halves can be authored independently.
- [x] TDD renderer `render_prompts(lesson: dict, production: dict, source: str) -> dict[str,str]`; keys a/b/c. Tests detect changed dialogue/order, wrong cast, missing/extra part, stale revision, broken continuity, and omitted timing warning. Red first using `python -m pytest tests/test_video_prompts.py -q`.
- [x] Implement `tools/build_video_prompts.py`: defaults are read-only `--check`; `--write` explicitly regenerates derived files, validates every lesson before writing. Source hash in each prompt detects source changes even without revision increment. Paths come from canonical lesson discovery, not free-form production text. Example output assembly: `"\n".join(f'{turn["speaker"].title()}: "{turn["line"]}"' for turn in part["turns"])`.
- [x] Generate 90 files, document source/visual editing workflow, cast, timing limitations and video_ready gate in prompts README + stage index. Retain v1 reference untouched.
- [x] Test all 30 actual prompt routes return all 3 files byte-for-byte and preserve authored utterances. Use isolated login/client; test page Copy flow without touching user media. Full Python/Node tests and curriculum validation; record counts and manual staging review issues.

## Review gates

This implements the already-agreed three-part content workflow, not a new curriculum. Inspect generated first/last/safety/timing cases; verify `python tools/build_video_prompts.py --stage 04 --check` succeeds. A clean check verifies synchronization and structure, not that a video generator can speak/animate the complete part naturally in ten seconds.

## Evidence (2026-09-04)

- TDD: missing renderer first produced 11 expected failures; then 10 focused cases passed before exports, 12 passed after exports + all-course route coverage. Independent review caught bool/float revision equality; two regression cases failed before correction, all 14 then passed.
- `--check`: 90 prompts / 30 lessons synchronized. Only 9.2 C exceeds the 22-word pacing threshold (25 words); warning retained, not treated as video approval.
- Curriculum complete validator: 10 chapters, 30 lessons, no issues; canonical JSON/statuses unchanged.
- Final combined suite with the completed detail changes: 133 pytest / 18 Node tests passed. Independent integration review approved the combined implementation.
- Real Edge/Playwright browser, isolated users/media: first lesson displays three real prompt blocks; each Copy puts exact complete text on the clipboard without opening the disclosure; no page errors. All 30 API routes separately checked byte-for-byte.
- Independent content review read all 30 lessons / 90 storyboard parts. Fixed shop camera-vs-character sightline geometry; clarified scripted dressing vs stable garment identity in the global prompt. Scoped rereview found both addressed, no new issue.
- No image/video generation service was called for lesson media. No family recordings or demo files changed. Actual generated clip duration, lip-sync, visual consistency and quality remain unverified.
