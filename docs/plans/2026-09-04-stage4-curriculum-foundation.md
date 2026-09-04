# Stage 4 Curriculum Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the canonical, stage-aware curriculum source and validation workflow, then replace the first nine v1 lessons with fully reviewed Stage 4 Phase A lessons.

**Architecture:** Keep the currently served `content/` and `prompts/` trees untouched while the redesign is incomplete. Author the new single source of truth under `curriculum/04/`; load and validate it with a pure Python module in `app/curriculum.py`, and expose the same checks through a small CLI. Phase A lesson files contain teaching intent, three-part dialogue, replay cards, review state, and revision metadata; later app migration will consume this source directly.

**Tech Stack:** Python 3.11 standard library, JSON curriculum files, pytest, Markdown documentation. No new runtime dependency, database, builder, or external service.

## Global Constraints

- The product remains a trophy cabinet for offline role-play, not an in-app teaching or scoring engine.
- A Lesson introduces one primary Conversation Move and recycles one or two earlier moves.
- Each Lesson contains three approximately 10-second parts, two speakers, two Replay Cards, and no more than one essential prop.
- Child lines distinguish Core, Stretch, Repair, and Playful language; playful lines are never mastery requirements.
- Content must pass motivation, causality, physical logic, adult behavior, child language, knowledge/safety, resolution, and replay-logic review before `video_ready`.
- At least 70% of Stage 4 Lessons use Dad or Mom as the conversation partner.
- Filesystem content remains the database; frontend code remains native ES Modules without a build step.
- Existing `content/`, `prompts/`, `demo/`, and `recordings/` paths are not deleted or moved in this plan.
- Do not create or commit video files, thumbnails, `config.json`, `users.json`, `.venv`, or `node_modules`.

---

### Task 1: Define the canonical curriculum loader and validation contract

**Files:**
- Create: `app/curriculum.py`
- Create: `app/tests/test_curriculum.py`
- Create: `curriculum/04/stage.json`
- Create: `curriculum/README.md`

**Interfaces:**
- Produces: `load_stage(root: Path, stage_id: str) -> dict`
- Produces: `validate_stage(stage: dict, *, require_complete: bool = False) -> list[ValidationIssue]`
- Produces: `ValidationIssue(path: str, code: str, message: str)`
- Lesson source path: `curriculum/<stage>/<chapter>/<lesson>/lesson.json`

- [x] **Step 1: Write loader tests against a temporary curriculum tree**

Add tests that create one `stage.json`, one `chapter.json`, and one `lesson.json`, then assert stable numeric-prefix ordering and injected `stage`, `chapter`, and `lesson` path identifiers:

```python
def test_load_stage_discovers_chapters_and_lessons_in_prefix_order(tmp_path):
    root = make_curriculum(tmp_path, chapters={
        "02-boundaries": ["02-more-time", "01-not-yet"],
        "01-choosing": ["01-can-i-have"],
    })
    stage = load_stage(root, "04")
    assert [c["id"] for c in stage["chapters"]] == ["01-choosing", "02-boundaries"]
    assert [l["id"] for l in stage["chapters"][1]["lessons"]] == [
        "01-not-yet", "02-more-time"
    ]
```

- [x] **Step 2: Run the loader test and confirm the missing-module failure**

Run: `cd app && python -m pytest tests/test_curriculum.py::test_load_stage_discovers_chapters_and_lessons_in_prefix_order -v`

Expected: FAIL because `curriculum.py` does not exist.

- [x] **Step 3: Implement the pure loader**

Implement a `ValidationIssue` frozen dataclass and a loader that reads:

```text
curriculum/04/stage.json
curriculum/04/01-choosing-requests/chapter.json
curriculum/04/01-choosing-requests/01-can-i-have/lesson.json
```

Malformed or missing JSON must become a `CurriculumLoadError` containing the relative path; it must not silently become empty content.

- [x] **Step 4: Write validation tests for the Lesson contract**

Cover these exact validation codes:

```text
required-field
invalid-role
invalid-status
invalid-dialogue-part
speaker-count
missing-child-turn
missing-replay-card
too-many-essential-props
review-gate
word-budget
unknown-recycle
```

The valid fixture must contain the required fields:

```json
{
  "id": "01-can-i-have",
  "title": "The Apple One",
  "title_zh": "我想要苹果那个",
  "can_do": "礼貌请求一个明确物品",
  "conversation_move": {"id": "request-item", "label": "request an item"},
  "trigger": "The partner offers or shows two choices.",
  "core_response": "Can I have the apple, please?",
  "stretch_response": "Can I have the red apple, please?",
  "repair_response": "No, I mean the apple.",
  "recycle": [],
  "roles": ["child", "mom"],
  "setting": "Snack time at home.",
  "essential_props": ["two snack choices"],
  "parts": [
    {"id": "A", "beat": "goal", "turns": [{"speaker": "mom", "line": "Apple or banana?", "kind": "input"}, {"speaker": "child", "line": "Can I have the apple, please?", "kind": "core"}]},
    {"id": "B", "beat": "change", "turns": [{"speaker": "mom", "line": "The banana?", "kind": "input"}, {"speaker": "child", "line": "No, I mean the apple.", "kind": "repair"}]},
    {"id": "C", "beat": "resolve", "turns": [{"speaker": "mom", "line": "One red apple coming up!", "kind": "input"}, {"speaker": "child", "line": "Thank you!", "kind": "playful"}]}
  ],
  "replay_cards": [
    {"title": "Choose a drink", "setting": "At breakfast", "change": "Choose water or milk", "challenge": "The partner hands over the wrong drink"},
    {"title": "Choose a shirt", "setting": "Getting dressed", "change": "Choose the red or blue shirt", "challenge": "The partner points to the wrong shirt"}
  ],
  "parent_support": ["Offer two visible choices.", "Pause before modeling the first three words."],
  "reviews": {"motivation": true, "causality": true, "physical": true, "adult_behavior": true, "child_language": true, "knowledge_safety": true, "resolution": true, "replay_logic": true},
  "status": "language_reviewed",
  "content_revision": 1
}
```

- [x] **Step 5: Implement structural and cross-Lesson validation**

`validate_stage` must enforce:

- stage roles are limited to `child`, `dad`, `mom`, `teacher`, and `peer`;
- Lesson dialogue parts are exactly `A`, `B`, `C` in order;
- dialogue contains exactly two distinct speakers and one is `child`;
- each part includes at least one child turn;
- each Lesson has exactly two Replay Cards;
- each Lesson has zero or one essential prop entry;
- `video_ready` and `video_produced` require all eight review flags to be true;
- total spoken dialogue is 35–65 whitespace-delimited words during Stage 4 authoring;
- every `recycle` move id was introduced by an earlier Lesson;
- `require_complete=True` enforces the policy counts from `stage.json`.

- [x] **Step 6: Add the Stage 4 policy file and authoring README**

`stage.json` must declare:

```json
{
  "id": "04",
  "title": "I Can Take Part",
  "age": 4,
  "version": 1,
  "status": "draft",
  "expected_chapters": 10,
  "expected_lessons": 30,
  "minimum_family_partner_ratio": 0.7,
  "roles": ["child", "dad", "mom", "teacher", "peer"],
  "dialogue_parts": ["A", "B", "C"]
}
```

`curriculum/README.md` must identify `curriculum/` as the new canonical authoring source, explain that `content/` remains the v1 runtime source during migration, and link to the curriculum architecture design.

- [x] **Step 7: Run Task 1 tests**

Run: `cd app && python -m pytest tests/test_curriculum.py -v`

Expected: all curriculum loader and validator tests PASS.

- [x] **Step 8: Commit the curriculum contract**

```bash
git add app/curriculum.py app/tests/test_curriculum.py curriculum/04/stage.json curriculum/README.md
git commit -m "feat: add stage-aware curriculum contract"
```

---

### Task 2: Add the curriculum validation command and coverage report

**Files:**
- Create: `tools/validate_curriculum.py`
- Modify: `tools/README.md`
- Modify: `app/tests/test_curriculum.py`

**Interfaces:**
- Consumes: `load_stage`, `validate_stage`, and `ValidationIssue` from `app/curriculum.py`
- Produces: `python tools/validate_curriculum.py --stage 04 [--complete]`
- Produces: a deterministic text coverage report with partner ratio, introduced moves, recycled moves, and orphan moves

- [x] **Step 1: Write CLI result tests**

Test the pure entry function:

```python
def test_format_report_lists_structure_and_move_coverage(valid_stage):
    report = format_report(valid_stage, [])
    assert "Stage 04" in report
    assert "family partner ratio" in report
    assert "request-item" in report
    assert "orphan moves" in report
```

Also test that a validation issue produces exit code `1`, while a valid draft stage produces exit code `0` without `--complete`.

- [x] **Step 2: Run the CLI tests and confirm failure**

Run: `cd app && python -m pytest tests/test_curriculum.py -k "report or cli" -v`

Expected: FAIL because the report and CLI entry functions do not exist.

- [x] **Step 3: Implement the command**

The script resolves the repository root from `__file__`, inserts `app/` into `sys.path`, loads the selected Stage, prints every issue as:

```text
ERROR <code> <path>: <message>
```

Then print summary lines for chapter count, Lesson count, family-partner percentage, move introductions, recycle counts, and moves not yet recycled. Draft stages may report incomplete counts without failing unless `--complete` is supplied.

- [x] **Step 4: Document exact commands**

Add to `tools/README.md`:

```text
python tools/validate_curriculum.py --stage 04
python tools/validate_curriculum.py --stage 04 --complete
```

Explain that the first command supports incremental authoring and the second is the release gate before video production.

- [x] **Step 5: Run the CLI and tests**

Run: `python tools/validate_curriculum.py --stage 04`

Expected: exit `0`; report shows 0 authored Chapters and 0 authored Lessons.

Run: `cd app && python -m pytest tests/test_curriculum.py -v`

Expected: PASS.

- [x] **Step 6: Commit the validator command**

```bash
git add tools/validate_curriculum.py tools/README.md app/tests/test_curriculum.py
git commit -m "feat: validate curriculum structure and coverage"
```

---

### Task 3: Author Chapter 1 — Choosing and Requests

**Files:**
- Create: `curriculum/04/01-choosing-requests/chapter.json`
- Create: `curriculum/04/01-choosing-requests/01-request-an-item/lesson.json`
- Create: `curriculum/04/01-choosing-requests/02-specify-a-choice/lesson.json`
- Create: `curriculum/04/01-choosing-requests/03-change-a-choice/lesson.json`
- Modify: `app/tests/test_curriculum.py`

**Interfaces:**
- Introduces move ids: `request-item`, `specify-choice`, `change-choice`
- Lesson order and roles: `mom`, `dad`, `mom`
- Core responses: `Can I have ___, please?`, `I want the ___ one.`, `Actually, can I have ___ instead?`

- [x] **Step 1: Add a failing Chapter 1 content test**

Assert the exact Lesson ids, move ids, partner order, three-part dialogue shape, and that `specify-choice` recycles `request-item` while `change-choice` recycles both earlier moves.

- [x] **Step 2: Run the Chapter 1 test and confirm missing content**

Run: `cd app && python -m pytest tests/test_curriculum.py -k chapter_1 -v`

Expected: FAIL because `01-choosing-requests` does not exist.

- [x] **Step 3: Author the three Lessons**

Use these exact life tasks:

- 1.1 Mom offers two snack choices; Mom deliberately hands over the wrong one; the child requests and repairs.
- 1.2 Dad offers two shirts; the child identifies the desired one by color or visible feature.
- 1.3 Mom offers two cups; the child changes their mind before the drink is poured and does so without treating the first choice as a mistake.

Each Lesson must contain two complete Replay Cards, one with a home object and one with a different daily routine. Dialogue must pass all eight review flags before status becomes `language_reviewed`.

- [x] **Step 4: Run the validator and Chapter 1 tests**

Run: `python tools/validate_curriculum.py --stage 04`

Expected: 1 Chapter, 3 Lessons, no structural errors, and `request-item` shown as recycled.

Run: `cd app && python -m pytest tests/test_curriculum.py -k chapter_1 -v`

Expected: PASS.

- [x] **Step 5: Read all three dialogues aloud and record the manual logic review**

For every turn, verify and retain `reviews.* = true` only when the preceding turn explains why it occurs. Confirm visible actions match the setting, the resolution closes the opening goal, and each Replay Card has its own coherent obstacle and resolution.

- [x] **Step 6: Commit Chapter 1**

```bash
git add curriculum/04/01-choosing-requests app/tests/test_curriculum.py
git commit -m "content: rebuild choosing and requests lessons"
```

---

### Task 4: Author Chapter 2 — Refusal and Negotiation

**Files:**
- Create: `curriculum/04/02-refusal-negotiation/chapter.json`
- Create: `curriculum/04/02-refusal-negotiation/01-not-ready-yet/lesson.json`
- Create: `curriculum/04/02-refusal-negotiation/02-ask-for-time/lesson.json`
- Create: `curriculum/04/02-refusal-negotiation/03-propose-an-order/lesson.json`
- Modify: `app/tests/test_curriculum.py`

**Interfaces:**
- Introduces move ids: `delay-boundary`, `request-time`, `propose-order`
- Lesson order and roles: `dad`, `mom`, `dad`
- Core responses: `I don't want to stop yet.`, `Can I have two more minutes?`, `What if we ___ first?`
- Recycles: `request-item`, `specify-choice`, and `change-choice` where the situation naturally supports them

- [x] **Step 1: Add a failing Chapter 2 content test**

Assert the exact Lesson and move ids, partner order, prior-move references, and that each resolution results in a concrete agreed next action rather than adult victory or child avoidance.

- [x] **Step 2: Run the Chapter 2 test and confirm missing content**

Run: `cd app && python -m pytest tests/test_curriculum.py -k chapter_2 -v`

Expected: FAIL because `02-refusal-negotiation` does not exist.

- [x] **Step 3: Author the three Lessons**

Use these exact life tasks:

- 2.1 Dad announces cleanup while the child is finishing one visible part of a build; the child states a boundary and names what remains.
- 2.2 Mom announces it is time to leave; the child requests two minutes, Mom sets a timer, and the child transitions when it rings.
- 2.3 Dad asks for toys to be put away before a shared activity; the child proposes a workable order and both act on it.

Do not frame calm acceptance of `No` as obedience or a prize. The adult may keep a boundary while acknowledging the child's reason.

- [x] **Step 4: Validate structure and read the dialogue aloud**

Run: `python tools/validate_curriculum.py --stage 04`

Expected: 2 Chapters, 6 Lessons, no structural errors.

Run: `cd app && python -m pytest tests/test_curriculum.py -k chapter_2 -v`

Expected: PASS.

Confirm each scene works with one essential prop or less and no line exists solely to teach a rule.

- [x] **Step 5: Commit Chapter 2**

```bash
git add curriculum/04/02-refusal-negotiation app/tests/test_curriculum.py
git commit -m "content: rebuild refusal and negotiation lessons"
```

---

### Task 5: Author Chapter 3 — Help and Clarification

**Files:**
- Create: `curriculum/04/03-help-clarification/chapter.json`
- Create: `curriculum/04/03-help-clarification/01-ask-for-help/lesson.json`
- Create: `curriculum/04/03-help-clarification/02-say-i-dont-understand/lesson.json`
- Create: `curriculum/04/03-help-clarification/03-correct-a-misunderstanding/lesson.json`
- Modify: `app/tests/test_curriculum.py`

**Interfaces:**
- Introduces move ids: `request-help`, `signal-nonunderstanding`, `repair-meaning`
- Lesson order and roles: `dad`, `teacher`, `mom`
- Core responses: `Can you help me ___?`, `I don't understand.`, `No, I mean ___.`
- Recycles: requests, choice descriptions, boundaries, and negotiated order from Chapters 1–2

- [x] **Step 1: Add a failing Chapter 3 content test**

Assert exact Lesson ids, move ids, partner order, recycle references, and the presence of a successful Repair Response in every Lesson.

- [x] **Step 2: Run the Chapter 3 test and confirm missing content**

Run: `cd app && python -m pytest tests/test_curriculum.py -k chapter_3 -v`

Expected: FAIL because `03-help-clarification` does not exist.

- [x] **Step 3: Author the three Lessons**

Use these exact life tasks:

- 3.1 The child wants to cut out a paper star, asks Dad for child-safe scissors, attempts the task, receives action-specific help, and accepts a slightly wiggly but recognizable result.
- 3.2 Rabbit Teacher gives one simple activity direction; the child openly says they do not understand, asks for a demonstration, and then completes the action.
- 3.3 Mom mishears which drink the child chose; the child says what they meant and confirms the corrected choice.

The paper-star Lesson replaces the v1 anti-example. A safety instruction may appear only when an observable action makes it relevant; the ending must resolve the child's wish to do the task independently.

- [x] **Step 4: Validate structure, coverage, and dialogue logic**

Run: `python tools/validate_curriculum.py --stage 04`

Expected: 3 Chapters, 9 Lessons, family-partner ratio at least 77%, no structural errors, and multiple earlier move ids shown as recycled.

Run: `cd app && python -m pytest tests/test_curriculum.py -k "chapter_3 or curriculum" -v`

Expected: PASS.

Read all three dialogues aloud. Confirm Rabbit Teacher responds to non-understanding without praise for guessing or criticism for asking.

- [x] **Step 5: Commit Chapter 3**

```bash
git add curriculum/04/03-help-clarification app/tests/test_curriculum.py
git commit -m "content: rebuild help and clarification lessons"
```

---

### Task 6: Review the Phase A pilot as a release candidate for further authoring

**Files:**
- Create: `curriculum/04/PHASE-A-REVIEW.md`
- Modify: `curriculum/04/stage.json`
- Modify: `docs/plans/2026-09-04-stage4-curriculum-foundation.md`

**Interfaces:**
- Consumes: all nine Phase A Lesson files and the validation report
- Produces: a written gate deciding whether Chapters 4–10 may reuse this schema and dialogue pattern

- [x] **Step 1: Run all automated verification**

Run:

```text
python tools/validate_curriculum.py --stage 04
cd app
python -m pytest -q
npm test
```

Expected: curriculum validator exits `0`; Python and JavaScript suites pass.

- [x] **Step 2: Write the Phase A review**

For each of the nine Lessons, list:

- whether the Can-Do is observable;
- whether the Trigger creates a real need to respond;
- whether each turn follows causally;
- whether the action is physically performable;
- whether the child has a genuine choice or repair opportunity;
- whether both Replay Cards remain coherent;
- spoken word count and child word count;
- introduced and recycled move ids.

End with one of two exact decisions: `APPROVED FOR PHASE B–D AUTHORING` or `REVISION REQUIRED BEFORE EXPANSION`, followed by concrete Lesson ids and reasons when revision is required.

- [x] **Step 3: Record Phase A in stage metadata**

If approved, add `"completed_phases": ["A"]` to `stage.json`. Keep Stage status as `draft`; 30-Lesson completeness is not claimed.

- [x] **Step 4: Mark completed plan checkboxes and commit the pilot review**

```bash
git add curriculum/04/PHASE-A-REVIEW.md curriculum/04/stage.json docs/plans/2026-09-04-stage4-curriculum-foundation.md
git commit -m "docs: approve stage 4 phase A content model"
```

## Out of Scope for This Plan

- Authoring Chapters 4–10; this begins only after the Phase A review gate.
- Replacing the runtime `content/` tree or deleting v1 curriculum files.
- Changing map routing, stage selection, recording storage paths, or visual themes.
- Generating Sora prompt text or producing demo videos.
- Designing the Peer's animal species, name, or visual model sheet.
- Detailed Stage 5 and Stage 6 syllabi.
- Configuration and deployment hardening, which is an independent plan after the curriculum pilot.
