# Stage 1 Dialogue Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite all 30 Stage 1 lessons and regenerate all 90 A/B/C prompts as natural 9–11-turn conversations that each fit three strict 10-second clips.

**Architecture:** Introduce an opt-in `three-by-ten-v2` lesson contract so chapters can migrate independently while every commit remains testable. Canonical dialogue stays in `curriculum/04`; each matching `production.json` owns visual continuity and bounded emotion, and `build_video_prompts.py` remains the only exporter of spoken lines. Migrate one chapter at a time, bumping both source and production revisions, then run full-stage review only after all 30 lessons carry the new contract.

**Tech Stack:** JSON curriculum/production sources, Python curriculum validator and prompt renderer, pytest, generated UTF-8 prompt text, existing Flask/Node regression suites.

## Global Constraints

- Each lesson has exactly A/B/C and each generated clip is approximately 10 seconds; no 12–15 second escape hatch.
- Each part has 3–4 turns and 12–20 spoken words, with 14–19 preferred.
- Each lesson has 9–11 turns and 45–58 spoken words; Child speaks 4–5 times and 18–28 words.
- Child is a four-year-old cartoon tiger boy. `get dressed` is valid, but he must not wear a girl's dress, skirt or wardrobe item inconsistent with his identity.
- Colors, games, toys and feelings are not restricted by gender stereotypes.
- Emotional performance is calm, warm and regulated: no screaming, extreme excitement, rage, distorted faces/bodies, frantic waving or uncontrolled running.
- Feeling and boundary lessons may show mild, accurate discomfort or disagreement; adults respond promptly and help return to calm.
- Each lesson introduces one Conversation Move, preserves spiral reuse, uses exactly Child plus one known partner, and has at most one essential prop group.
- `curriculum/04/**/lesson.json` is the only spoken-dialogue source; do not hand-edit dialogue in exported `a.txt`, `b.txt` or `c.txt`.
- Existing demo and performance media are never deleted or overwritten. Rewritten content remains `language_reviewed`, not `video_ready`.

## Chapter authoring protocol

Every chapter task below must satisfy this exact protocol:

1. Add a focused test asserting IDs, roles, moves, `three-by-ten-v2`, A/B/C order, 3–4 turns per part, 9–11 total turns, 4–5 Child turns, 45–58 total words, 18–28 Child words, two Replay Cards, revision match and all ten reviews.
2. Rewrite all three `lesson.json` files with causal A→B→C dialogue; set `dialogue_contract` to `three-by-ten-v2`, `content_revision` to 2, and reviews `character_continuity` and `emotion_stability` to true after human inspection.
3. Rewrite all three matching `production.json` files with `content_revision: 2`, exact A/B/C start/end continuity and an `emotion` object containing `baseline`, `allowed_shift` and `forbidden`.
4. Run `python tools/build_video_prompts.py --stage 04 --write`; inspect the nine changed prompt exports for exact dialogue, boy/garment continuity, restrained emotion and strict ten-second pacing.
5. Run the focused chapter test, `tests/test_video_prompts.py`, and `python tools/validate_curriculum.py --stage 04` before committing.

---

### Task 1: Enforce the three-by-ten contract and restrained production template

**Files:**
- Modify: `app/curriculum.py`
- Modify: `app/tests/test_curriculum.py`
- Modify: `tools/build_video_prompts.py`
- Modify: `app/tests/test_video_prompts.py`
- Modify: `curriculum/README.md`
- Modify: `prompts/README.md`

**Interfaces:**
- Produces: `THREE_BY_TEN_CONTRACT = "three-by-ten-v2"`; optional per-lesson `dialogue_contract`; validation codes `part-turn-budget`, `lesson-turn-budget`, `child-turn-budget`, `part-word-budget`, `dialogue-contract`, and `production-emotion`.
- Produces: production `emotion: { baseline: str, allowed_shift: str, forbidden: str }` rendered into an `EMOTIONAL PERFORMANCE` section.
- Consumes: existing A/B/C `parts`, `content_revision`, `roles`, and production continuity fields.

- [ ] **Step 1: Add failing validator tests**

Extend the canonical fixture to support the v2 contract and add parameterized failures:

```python
lesson["dialogue_contract"] = "three-by-ten-v2"
lesson["reviews"].update(
    character_continuity=True,
    emotion_stability=True,
)

assert "part-turn-budget" in codes_for(part_with_two_turns)
assert "lesson-turn-budget" in codes_for(lesson_with_eight_turns)
assert "child-turn-budget" in codes_for(lesson_with_three_child_turns)
assert "part-word-budget" in codes_for(part_with_21_words)
```

Add a complete-stage assertion that every lesson must carry `three-by-ten-v2` when `require_complete=True`, while non-complete validation permits untouched v1 lessons during migration.

- [ ] **Step 2: Add failing prompt-renderer tests**

Change the long-part expectation from a 12–15 second warning to rejection, require the v2 production emotion object, and assert the rendered prompt contains:

```text
EMOTIONAL PERFORMANCE
Calm, warm and regulated baseline.
No screaming, extreme excitement, rage, distorted facial or body shapes, frantic gestures or uncontrolled running.
The clip must fit about 10 seconds; shorten source dialogue before export rather than rushing or extending the clip.
```

Also assert the fixed Child cast says `four-year-old cartoon tiger boy` and uses `he/him` only where a pronoun is necessary.

- [ ] **Step 3: Run focused tests and confirm failures**

```powershell
cd app
.venv\Scripts\python -m pytest tests/test_curriculum.py tests/test_video_prompts.py -q
```

Expected: missing contract validation, missing emotion block and old 12–15 second pacing behavior fail.

- [ ] **Step 4: Implement opt-in validation**

In `app/curriculum.py`, validate strict budgets only when `lesson.get("dialogue_contract") == THREE_BY_TEN_CONTRACT`; reject any other non-empty contract. Use helpers that count turns and words from structured parts. For v2 lessons at `language_reviewed` or later, require the original eight reviews plus `character_continuity` and `emotion_stability`. Under `require_complete=True`, require every Stage 04 lesson to be v2.

Use these hard checks:

```python
3 <= len(part["turns"]) <= 4
12 <= _dialogue_word_count([part]) <= 20
9 <= sum(len(part["turns"]) for part in parts) <= 11
4 <= _speaker_turn_count(parts, "child") <= 5
45 <= _dialogue_word_count(parts) <= 58
```

- [ ] **Step 5: Implement strict prompt rendering**

For v2 lessons, require all three emotion strings and reject parts outside 12–20 words. Replace all extension language with:

```python
pacing = (
    "Fit this clip within about 10 seconds at a natural conversational pace. "
    "Use brief turn-taking pauses; never rush, omit, paraphrase or extend the clip."
)
```

Render `EMOTIONAL PERFORMANCE` from the bounded production fields plus the fixed no-distortion sentence. Preserve exact canonical speech and continuity checks.

- [ ] **Step 6: Verify and document the migration contract**

Run the focused tests. Document that `--complete` intentionally fails until all 30 lessons migrate, while ordinary validation remains green chapter by chapter.

- [ ] **Step 7: Commit**

```powershell
git add app/curriculum.py app/tests/test_curriculum.py tools/build_video_prompts.py app/tests/test_video_prompts.py curriculum/README.md prompts/README.md
git commit -m "content: enforce three by ten dialogue contract"
```

---

### Task 2: Rewrite Chapter 1 — Choosing and Requests

**Files:**
- Modify: `curriculum/04/01-choosing-requests/*/lesson.json`
- Modify: `prompts/04/01-choosing-requests/*/production.json`
- Regenerate: `prompts/04/01-choosing-requests/*/{a,b,c}.txt`
- Modify: `app/tests/test_curriculum.py`

**Interfaces:** Produces v2 lessons `request-item`, `specify-choice`, `change-choice` and nine synchronized prompt exports.

- [ ] **Step 1: Add the Chapter 1 contract test and confirm current content fails**

Assert all Chapter authoring protocol budgets plus the exact roles `mom`, `dad`, `mom`. Run `pytest tests/test_curriculum.py -k chapter_1 -q`; expected failure is missing `three-by-ten-v2` and too few turns.

- [ ] **Step 2: Author the exact causal scenes**

| Lesson | Required causal chain |
| --- | --- |
| The Apple, Please | Mom offers apple/banana → Child politely requests apple → Mom mistakenly hands banana → Child repairs with apple/red detail → Mom acknowledges mistake → Child confirms and closes politely. Use the approved 3/3/4-turn sample verbatim. |
| The Dinosaur Shirt | Two red shirts only: stripes and dinosaur → `I want the red one` is insufficient → Dad asks which pattern → Child specifies dinosaur → confirms → receives it and continues getting dressed. Use the approved 3/4/4-turn sample verbatim. |
| Water Instead | Mom is about to fill one visible cup → Child first chooses milk → notices he wants water before pouring → uses `Actually, can I have water instead?` → Mom confirms before acting → Child accepts. No deliberate waste or already-poured reversal. |

- [ ] **Step 3: Update production continuity and emotion**

Use calm snack/dressing/table two-shots. For the shirt lesson, both shirts remain red and keep their stripe/dinosaur identity; Child wears his yellow T-shirt and receives the chosen shirt without a wardrobe jump. Baseline is attentive and relaxed; allowed shift is mild correction/pleasure; forbidden includes exaggerated surprise and bouncing.

- [ ] **Step 4: Generate, inspect and verify**

Run the Chapter authoring protocol commands and confirm exactly the three Chapter 1 lessons plus their productions/exports changed.

- [ ] **Step 5: Commit**

```powershell
git add curriculum/04/01-choosing-requests prompts/04/01-choosing-requests app/tests/test_curriculum.py
git commit -m "content: expand choosing and requests dialogues"
```

---

### Task 3: Rewrite Chapter 2 — Refusal and Negotiation

**Files:**
- Modify: `curriculum/04/02-refusal-negotiation/*/lesson.json`
- Modify: `prompts/04/02-refusal-negotiation/*/production.json`
- Regenerate: `prompts/04/02-refusal-negotiation/*/{a,b,c}.txt`
- Modify: `app/tests/test_curriculum.py`

**Interfaces:** Produces v2 `delay-boundary`, `request-time`, and `propose-order` lessons.

- [ ] **Step 1: Add and run the failing Chapter 2 test**

Assert Dad/Mom/Dad roles, agreed actions in every Part C, v2 budgets and calm disagreement. Run `pytest tests/test_curriculum.py -k chapter_2 -q`; expected failure is the six-turn v1 structure.

- [ ] **Step 2: Author the exact causal scenes**

| Lesson | Required causal chain |
| --- | --- |
| Not Ready Yet | Dad announces cleanup while Child is finishing a block roof → Child says he does not want to stop yet and names the unfinished roof → Dad allows one final piece → Child places it → agrees to clean up. |
| Two More Minutes | Mom says it is time to leave while Child's drawing lacks the sun → Child requests two more minutes → Mom sets a clear short boundary → Child finishes the sun → reports ready and leaves. |
| Blocks First | Dad asks to put blocks and cars away → Child proposes blocks first, then cars → Dad accepts the order → both complete the first group → Child initiates the second. |

- [ ] **Step 3: Update production and bounded emotion**

Use one block set, one drawing, or one toy-group arrangement. Disagreement remains mild: no shouting, stomping, arm flinging or angry distortion. Adult boundaries remain calm and specific.

- [ ] **Step 4: Generate and verify the nine prompts**

Run the protocol commands; inspect that every Part C ends in the agreed physical action.

- [ ] **Step 5: Commit**

```powershell
git add curriculum/04/02-refusal-negotiation prompts/04/02-refusal-negotiation app/tests/test_curriculum.py
git commit -m "content: expand refusal and negotiation dialogues"
```

---

### Task 4: Rewrite Chapter 3 — Help and Clarification

**Files:**
- Modify: `curriculum/04/03-help-clarification/*/lesson.json`
- Modify: `prompts/04/03-help-clarification/*/production.json`
- Regenerate: `prompts/04/03-help-clarification/*/{a,b,c}.txt`
- Modify: `curriculum/04/PHASE-A-REVIEW.md`
- Modify: `app/tests/test_curriculum.py`

**Interfaces:** Produces v2 `request-help`, `signal-nonunderstanding`, and `repair-meaning` lessons and closes the revised Phase A review.

- [ ] **Step 1: Add and run the failing Chapter 3 test**

Assert Dad/Teacher/Mom roles, an effective repair turn in each lesson, v2 budgets and exact prompt revisions. Run `pytest tests/test_curriculum.py -k chapter_3 -q`.

- [ ] **Step 2: Author the exact causal scenes**

| Lesson | Required causal chain |
| --- | --- |
| Help With the Track | A train-track piece will not connect → Child identifies the stuck join and asks Dad for help → Dad asks which side → Child specifies it → Dad holds one side while Child connects the piece → train can continue. |
| Show Me Again | Rabbit Teacher gives a short clap-tap movement pattern → Child says he does not understand and asks for a demonstration → Teacher repeats slowly with hands visible → Child checks the order → performs it successfully. No prop required. |
| The Blue Cup | Child requests the blue cup; Mom reaches for green after hearing incorrectly → Child says `No, I mean the blue cup` and adds its visible handle → Mom checks the correct cup → Child confirms and receives it. |

- [ ] **Step 3: Update production and Phase A review**

Keep gestures small and readable. Teacher is patient, not theatrical; misunderstanding produces only a brief puzzled look. Update PHASE-A-REVIEW with revised word/turn counts and note all nine Phase A lessons now use the v2 contract.

- [ ] **Step 4: Generate, validate and commit**

Run the protocol commands, then:

```powershell
git add curriculum/04/03-help-clarification curriculum/04/PHASE-A-REVIEW.md prompts/04/03-help-clarification app/tests/test_curriculum.py
git commit -m "content: expand help and clarification dialogues"
```

---

### Task 5: Rewrite Chapter 4 — Body and Needs

**Files:**
- Modify: `curriculum/04/04-body-needs/*/lesson.json`
- Modify: `prompts/04/04-body-needs/*/production.json`
- Regenerate: `prompts/04/04-body-needs/*/{a,b,c}.txt`
- Modify: `app/tests/test_curriculum.py`

**Interfaces:** Produces v2 `state-body-need`, `request-a-pause`, and `describe-discomfort` lessons.

- [ ] **Step 1: Add and run the failing Chapter 4 test**

Assert Mom/Dad/Mom roles, immediate adult response to bathroom/pain, no delayed care and all v2 budgets. Run `pytest tests/test_curriculum.py -k chapter_4 -q`.

- [ ] **Step 2: Author the exact causal scenes**

| Lesson | Required causal chain |
| --- | --- |
| Water First | After quiet play Child says he is thirsty → Mom offers water and a snack → Child asks for water first → Mom hands it over → Child confirms the need is met. |
| Bathroom Break | During a tabletop game Child says he needs the bathroom → Dad stops immediately and keeps the game in place → Child says he will come back → Dad agrees → activity pauses safely. |
| My Knee Hurts | Child bumps his knee during ordinary play → tells Mom exactly where it hurts and that it stings → Mom stops the activity, checks calmly and offers a cold cloth → Child accepts help. No diagnosis. |

- [ ] **Step 3: Update production emotion and safety continuity**

Pain is a mild wince and quieter voice, never screaming or graphic injury. Bathroom need is never delayed for another English line. Adult actions happen immediately after the signal.

- [ ] **Step 4: Generate, validate and commit**

Run the protocol commands, then commit with `content: expand body and needs dialogues` including the exact Chapter 4 curriculum, production, exports and test files.

---

### Task 6: Rewrite Chapter 5 — Routines and Transitions

**Files:**
- Modify: `curriculum/04/05-routines-transitions/*/lesson.json`
- Modify: `prompts/04/05-routines-transitions/*/production.json`
- Regenerate: `prompts/04/05-routines-transitions/*/{a,b,c}.txt`
- Modify: `app/tests/test_curriculum.py`

**Interfaces:** Produces v2 `sequence-actions`, `request-before-boundary`, and `report-readiness` lessons.

- [ ] **Step 1: Add and run the failing Chapter 5 test**

Assert Dad/Mom/Dad roles, explicit sequencing/readiness outcomes and v2 budgets. Run `pytest tests/test_curriculum.py -k chapter_5 -q`.

- [ ] **Step 2: Author the exact causal scenes**

| Lesson | Required causal chain |
| --- | --- |
| Shoes, Then Jacket | Dad asks what remains before the park → Child says first shoes, then jacket → locates each visible item → completes the order → reports ready. |
| One Book Before Bed | Mom states the bedtime boundary and offers one story → Child requests the bear book → Mom confirms one book → they finish it → Child accepts lights-out. |
| I Still Need My Bottle | Dad asks if Child is ready at the door → Child says he is ready but still needs his water bottle → Dad gives a location clue → Child finds and packs it → confirms readiness. |

- [ ] **Step 3: Update production continuity and calm transitions**

Use real boy clothing and one necessary prop group. No rushed dressing montage, nagging adult lecture, whining distortion or sudden scene reset.

- [ ] **Step 4: Generate, validate and commit**

Run the protocol commands and commit exact Chapter 5 files with `content: expand routines and transitions dialogues`.

---

### Task 7: Rewrite Chapter 6 — Finding and Belonging

**Files:**
- Modify: `curriculum/04/06-finding-belonging/*/lesson.json`
- Modify: `prompts/04/06-finding-belonging/*/production.json`
- Regenerate: `prompts/04/06-finding-belonging/*/{a,b,c}.txt`
- Modify: `app/tests/test_curriculum.py`

**Interfaces:** Produces v2 `ask-location`, `check-location`, and `identify-belonging` lessons.

- [ ] **Step 1: Add and run the failing Chapter 6 test**

Assert Dad/Mom/Teacher roles, location language changes the search result, ownership includes a visible feature and all v2 budgets. Run `pytest tests/test_curriculum.py -k chapter_6 -q`.

- [ ] **Step 2: Author the exact causal scenes**

| Lesson | Required causal chain |
| --- | --- |
| Where Is My Car? | Child cannot find one toy car → asks Dad where it is → Dad gives a shelf clue → Child checks and asks whether it is behind the box → finds and confirms it. |
| Under the Bed? | Child and Mom seek one missing sock → Child checks under the bed → Mom notes it is not there → Child proposes the chair → finds it on the chair and states the location. |
| Mine Has a Dinosaur | Rabbit Teacher holds two similar bottles → asks whose one is → Child says his has a dinosaur sticker → Teacher checks the visible feature → returns the correct bottle → Child confirms. |

- [ ] **Step 3: Update production object identity**

All search objects keep color/feature/location across frames. Teacher remains calm; ownership is resolved without accusation or grabbing.

- [ ] **Step 4: Generate, validate and commit**

Run the protocol commands and commit exact Chapter 6 files with `content: expand finding and belonging dialogues`.

---

### Task 8: Rewrite Chapter 7 — Joining and Cooperation

**Files:**
- Modify: `curriculum/04/07-joining-cooperation/*/lesson.json`
- Modify: `prompts/04/07-joining-cooperation/*/production.json`
- Regenerate: `prompts/04/07-joining-cooperation/*/{a,b,c}.txt`
- Modify: `app/tests/test_curriculum.py`

**Interfaces:** Produces v2 `join-play`, `request-turn`, and `suggest-shared-play` lessons with the same Bear Peer.

- [ ] **Step 1: Add and run the failing Chapter 7 test**

Assert three Peer lessons, same peer identity, mutual choices rather than automatic agreement and all v2 budgets. Run `pytest tests/test_curriculum.py -k chapter_7 -q`.

- [ ] **Step 2: Author the exact causal scenes**

| Lesson | Required causal chain |
| --- | --- |
| Can I Build Too? | Peer is building a road → Child asks to join → Peer says a bridge is still needed → Child offers to build it → Peer accepts → they place connected pieces. |
| After Your Turn | Peer is rolling one ball → Child asks for a turn after Peer → Peer asks for one final roll → Child confirms the order → Peer completes it and passes the ball → Child thanks him. |
| Space Pirates | Peer wants pirate play; Child wants space play → each states an idea → Child proposes space pirates → Peer adds a spaceship condition → Child agrees → shared play begins. |

- [ ] **Step 3: Update production and peer emotion**

Peer is friendly but not automatically compliant. Excitement stays at ordinary play level: smiles and small gestures, no jumping frenzy, shouting or elastic faces.

- [ ] **Step 4: Generate, validate and commit**

Run the protocol commands and commit exact Chapter 7 files with `content: expand joining and cooperation dialogues`.

---

### Task 9: Rewrite Chapter 8 — Feelings and Repair

**Files:**
- Modify: `curriculum/04/08-feelings-repair/*/lesson.json`
- Modify: `prompts/04/08-feelings-repair/*/production.json`
- Regenerate: `prompts/04/08-feelings-repair/*/{a,b,c}.txt`
- Modify: `app/tests/test_curriculum.py`

**Interfaces:** Produces v2 `explain-feeling`, `set-stop-boundary`, and `repair-relationship` lessons.

- [ ] **Step 1: Add and run the failing Chapter 8 test**

Assert emotion cause, immediate stop after a boundary, apology plus repair action, regulated emotion reviews and all v2 budgets. Run `pytest tests/test_curriculum.py -k chapter_8 -q`.

- [ ] **Step 2: Author the exact causal scenes**

| Lesson | Required causal chain |
| --- | --- |
| I Feel Frustrated | A puzzle piece is missing → Child says he feels frustrated because he cannot find it → Mom acknowledges → Child asks for help → they search one place and find it → Child reports feeling better. |
| Please Stop | Dad playfully tickles once → Child says `Please stop. I don't like that` → Dad stops immediately with hands down → asks whether Child wants space or a high five → Child chooses → Dad follows the choice. |
| Let's Build It Again | Child accidentally knocks part of Peer's block build → notices the effect, asks if Peer is okay and apologizes → Peer says the tower fell → Child offers to rebuild → Peer accepts → they restart together. |

- [ ] **Step 3: Update production with explicit emotional ceilings**

Frustration is a small frown and pause; boundary is firm normal-volume speech; apology is sincere and calm. No crying spectacle, rage, shame posture, forced hug or automatic smile.

- [ ] **Step 4: Generate, validate and commit**

Run the protocol commands and commit exact Chapter 8 files with `content: expand feelings and repair dialogues`.

---

### Task 10: Rewrite Chapter 9 — Outings and Safety

**Files:**
- Modify: `curriculum/04/09-outings-safety/*/lesson.json`
- Modify: `prompts/04/09-outings-safety/*/production.json`
- Regenerate: `prompts/04/09-outings-safety/*/{a,b,c}.txt`
- Modify: `app/tests/test_curriculum.py`

**Interfaces:** Produces v2 `ask-duration`, `ask-shop-location`, and `seek-safe-adult-help` lessons.

- [ ] **Step 1: Add and run the failing Chapter 9 test**

Assert Dad/Mom/Mom roles, safe adult language, no real separation, calm affect and all v2 budgets. Run `pytest tests/test_curriculum.py -k chapter_9 -q`.

- [ ] **Step 2: Author the exact causal scenes**

| Lesson | Required causal chain |
| --- | --- |
| How Much Longer? | In the car Child asks how much longer → Dad answers five minutes/two songs → Child checks whether arrival is after the bridge → Dad confirms → Child accepts and chooses the next song. |
| Where Is the Pasta? | In a simple shop setting Child asks Mom where to find pasta → Mom gives an aisle/shelf clue → Child identifies the requested package by visible color/shape → Mom confirms → Child places it in the basket. |
| I Can't Find My Mom | Calm practice at home: Mom explains she will pretend to be a store worker → Child states he cannot find his mom and gives his name → asks for help → Mom-as-worker says they will stay at the desk and call her → Child repeats that he stays with the trusted worker. |

- [ ] **Step 3: Update production safety and emotion**

The safety rehearsal remains visibly at home and calm. Do not depict an actual lost child, parking lot movement, panic, stranger touch or dramatic crying.

- [ ] **Step 4: Generate, validate and commit**

Run the protocol commands and commit exact Chapter 9 files with `content: expand outings and safety dialogues`.

---

### Task 11: Rewrite Chapter 10 — Recounting and Planning

**Files:**
- Modify: `curriculum/04/10-recounting-planning/*/lesson.json`
- Modify: `prompts/04/10-recounting-planning/*/production.json`
- Regenerate: `prompts/04/10-recounting-planning/*/{a,b,c}.txt`
- Modify: `app/tests/test_curriculum.py`

**Interfaces:** Produces v2 `recount-one-event`, `recount-two-events`, and `contribute-to-plan` lessons.

- [ ] **Step 1: Add and run the failing Chapter 10 test**

Assert Teacher/Dad/Mom roles, one-event then two-event progression, a child contribution to the plan and all v2 budgets. Run `pytest tests/test_curriculum.py -k chapter_10 -q`.

- [ ] **Step 2: Author the exact causal scenes**

| Lesson | Required causal chain |
| --- | --- |
| I Built a Tower | Rabbit Teacher asks for one thing Child did today → Child says he built a tower with a peer → Teacher asks one concrete follow-up → Child says it fell and they rebuilt it → Teacher acknowledges the complete event. |
| First We Painted | Dad asks what happened at school → Child says first they painted, then washed the brushes → Dad asks what he painted → Child adds one detail → Dad restates the two-event sequence → Child confirms. |
| Tomorrow's Plan | Mom says tomorrow's plan and offers park/library choices → Child contributes one choice and reason → Mom introduces a simple rain condition → Child proposes the indoor alternative → they agree on the plan. |

- [ ] **Step 3: Update production narration restraint**

Keep both characters in one conversational setting; do not generate flashback montage or extra voices. Recounting uses small illustrative hand gestures only.

- [ ] **Step 4: Generate, validate and commit**

Run the protocol commands and commit exact Chapter 10 files with `content: expand recounting and planning dialogues`.

---

### Task 12: Complete-stage review, prompt synchronization and documentation

**Files:**
- Modify: `curriculum/04/stage.json`
- Modify: `curriculum/04/FINAL-REVIEW.md`
- Modify: `curriculum/README.md`
- Modify: `prompts/04/README.md`
- Modify: `demo/PROGRESS.md`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/specs/2026-09-05-stage-1-dialogue-expansion.md`

**Interfaces:**
- Consumes: all 30 v2 lessons, 30 matching productions and 90 generated prompts.
- Produces: stage-level `dialogue_contract: "three-by-ten-v2"`, accurate aggregate review tables, and explicit stale status for existing demos.

- [ ] **Step 1: Add aggregate contract assertions**

In `test_curriculum.py` and `test_video_prompts.py`, assert:

```python
assert len(lessons) == 30
assert all(lesson["dialogue_contract"] == "three-by-ten-v2" for lesson in lessons)
assert all(9 <= total_turns(lesson) <= 11 for lesson in lessons)
assert all(4 <= child_turns(lesson) <= 5 for lesson in lessons)
assert all(production["content_revision"] == lesson["content_revision"] for lesson, production in pairs)
assert len(exported_prompts) == 90
```

Add scans rejecting girl-specific garments assigned to Child, unbounded emotional adjectives in v2 production, and any prompt containing `12-15 seconds`, `extend the clip`, `scream`, `extreme excitement`, or `distorted` as a requested positive action. The fixed negative-safety sentence is allowed.

- [ ] **Step 2: Run complete validation and fix every reported lesson**

```powershell
py -3.10 tools/validate_curriculum.py --stage 04 --complete
py -3.10 tools/build_video_prompts.py --stage 04 --check
```

Expected: 10 chapters, 30 lessons, 90 synchronized prompts, family ratio at least 70%, no budget/review/continuity issue and zero stale export.

- [ ] **Step 3: Perform human content review**

For each lesson, read A→B→C and answer all eleven content-contract questions from the approved spec. Then read each production start/action/end sequence and confirm props, hands, garments, boy identity, emotional ceiling and final physical state. Record exact per-lesson total/Child word counts and turns in FINAL-REVIEW.

- [ ] **Step 4: Mark media status accurately**

Do not alter video files. Update `demo/PROGRESS.md` to state that the existing 14 demo videos were produced against revision 1 and are stale relative to revision 2; production remains paused until individual lessons become `video_ready` again.

- [ ] **Step 5: Run all regression suites**

```powershell
cd app
npm test
.venv\Scripts\python -m pytest -q
cd ..
git diff --check
```

Expected: all suites and diff checks pass.

- [ ] **Step 6: Commit the final review**

```powershell
git add curriculum/04/stage.json curriculum/04/FINAL-REVIEW.md curriculum/README.md prompts/04/README.md demo/PROGRESS.md README.md AGENTS.md docs/specs/2026-09-05-stage-1-dialogue-expansion.md app/tests/test_curriculum.py app/tests/test_video_prompts.py
git commit -m "content: complete stage 1 dialogue expansion review"
```

