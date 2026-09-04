# Curriculum Runtime Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the website serve the reviewed `curriculum/04` Lessons directly, including A/B/C dialogue and Replay Cards, without modifying or deleting legacy videos.

**Architecture:** Place the migration seam in one deep loader adapter, `scan_curriculum_library(...)`, which hides the canonical JSON layout and projects it into the library shape used by the map. Flask uses an implicit configured Stage (`04`) so existing URLs stay stable, while new video/recording/prompt files live under a Stage directory. The frontend renders structured Replay Cards and supports three prompt parts; it does not become a teaching engine.

**Tech Stack:** Python 3.10+ standard library, Flask, vanilla ES Modules, pytest, node:test. No new dependencies, database, build step, or external service.

## Global Constraints

- `curriculum/04` remains the only authoring source; runtime code must not regenerate or hand-sync `content/`.
- Existing `content/`, `prompts/`, `demo/`, and `recordings/` files are retained.
- New media layout is `demo/<stage>/<chapter>/<lesson>/` and `recordings/<username>/<stage>/<chapter>/<lesson>/`.
- Existing route shapes remain `/video/<chapter>/<level>/<kind>`, `/thumb/<chapter>/<level>`, and `/upload/<chapter>/<level>/<kind>`; the configured Stage is implicit.
- New prompt layout is `prompts/<stage>/<chapter>/<lesson>/{a,b,c}.txt`.
- Map completion remains binary and based only on a performance video.

---

### Task 1: Add the curriculum-to-library adapter

**Files:** `app/scanner.py`, `app/tests/test_scanner.py`, 10 `curriculum/04/*/chapter.json` files.

- [ ] Write a failing test for `scan_curriculum_library(curriculum_root, stage_id, demo_root, recordings_root, username=None)` using a real temporary Stage.
- [ ] Assert stable order, chapter title/background asset, Can-Do, Trigger, Core/Stretch/Repair patterns, flattened titled speakers, Replay Cards, review metadata, and Stage-prefixed media detection.
- [ ] Add `background_asset` to each Chapter (`01-wants-requests` through `10-planning-predicting`) so existing art remains usable after folder renaming.
- [ ] Implement the adapter while retaining `scan_library` for v1 compatibility and its existing tests.
- [ ] Run scanner and curriculum tests; commit.

### Task 2: Switch Flask routes to the configured Stage

**Files:** `app/app.py`, `app/tests/test_app.py`, `app/README.md`.

- [ ] Add failing route tests with a canonical temporary curriculum and `CURRICULUM_STAGE=04`.
- [ ] Add `CURRICULUM_ROOT` and `CURRICULUM_STAGE`; make `/api/library` call the new adapter.
- [ ] Resolve demo, thumbnail, upload, and per-user recording paths beneath the implicit Stage directory while preserving traversal guards.
- [ ] Read prompts from `prompts/<stage>/<chapter>/<lesson>/a.txt`, `b.txt`, and `c.txt`; return all three keys and 404 unknown Lessons.
- [ ] Update route tests for Stage-prefixed files and run the full Python suite; commit.

### Task 3: Render the new lesson contract

**Files:** `app/static/app.js`, `app/static/style.css`, `app/templates/map.html`, `app/tests/test_app.py`.

- [ ] Add a failing HTML/static-contract test for Can-Do, Trigger, two Replay Card containers, Parent Support, and Part C prompt rendering.
- [ ] Show the authored Chapter title rather than deriving it from the directory slug.
- [ ] Render dialogue with A/B/C dividers and correct Dad/Mom/Teacher/Peer speaker labels.
- [ ] Replace the v1 variation string with two compact Replay Cards showing setting, change, and challenge.
- [ ] Show Can-Do, Trigger, and Parent Support as adult-facing detail text without adding scoring or correction.
- [ ] Render optional prompt A/B/C blocks; when none exist, keep the existing empty state.
- [ ] Run syntax check, JS tests, and Python HTML tests; commit.

### Task 4: Verify and document the migration

**Files:** `README.md`, `PROJECT.md`, `AGENTS.md`, `content/README.md`, `demo/README.md`, `prompts/README.md`, this plan.

- [ ] Start the app with isolated temporary media roots and verify login → map → first Lesson detail → next Lesson.
- [ ] Check page identity, meaningful DOM, console errors/warnings, desktop screenshot, mobile screenshot, and one detail interaction through the Browser plugin.
- [ ] Run `python tools/validate_curriculum.py --stage 04 --complete`, full pytest, and `npm test`.
- [ ] Update documentation to say the runtime uses `curriculum/04`; keep v1 directories explicitly archived/reference-only.
- [ ] Mark this plan complete and commit the verified migration.
