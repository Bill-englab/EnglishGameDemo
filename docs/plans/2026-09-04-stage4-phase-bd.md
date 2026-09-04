# Stage 4 Phase B–D Authoring Plan

**Goal:** Complete Chapters 4–10 so Stage 4 contains 30 coherent, validated Lessons and is ready for runtime migration before any new demo production.

**Basis:** Phase A was approved in `curriculum/04/PHASE-A-REVIEW.md`. All new Lessons reuse its schema, three-part causal arc, two Replay Cards, two-speaker limit, one-prop-group limit, 35–65 total words, 18–28 child words, and eight review gates.

## Content sequence

| Chapter | Lessons | New Conversation Moves | Partners |
| --- | --- | --- | --- |
| 4 Body and Needs | hungry/thirsty; bathroom/rest; say what hurts | `state-body-need`, `request-a-pause`, `describe-discomfort` | mom, dad, mom |
| 5 Routines and Transitions | first/then; bedtime request; readiness check | `sequence-actions`, `request-before-boundary`, `report-readiness` | dad, mom, dad |
| 6 Finding and Belonging | ask where; check a location; say whose | `ask-location`, `check-location`, `identify-belonging` | dad, mom, teacher |
| 7 Joining and Cooperation | join play; ask for a turn; negotiate play | `join-play`, `request-turn`, `suggest-shared-play` | peer, peer, peer |
| 8 Feelings and Repair | feeling plus reason; ask to stop; apologize/repair | `explain-feeling`, `set-stop-boundary`, `repair-relationship` | mom, dad, peer |
| 9 Outings and Safety | car journey; shop search; lost-child rehearsal | `ask-duration`, `ask-shop-location`, `seek-safe-adult-help` | dad, mom, mom |
| 10 Recounting and Planning | one event; two events; tomorrow plan | `recount-one-event`, `recount-two-events`, `contribute-to-plan` | teacher, dad, mom |

## Implementation tasks

- [ ] Add a failing outline test for exact Chapter, Lesson, Move, and partner order across Chapters 4–10.
- [ ] Author Chapter 4 with needs that cause a useful adult response; medical language stays descriptive, not diagnostic.
- [ ] Author Chapter 5 with genuine household transitions and clear, finite boundaries.
- [ ] Author Chapter 6 so every location question has an information gap and every ownership claim has evidence.
- [ ] Author Chapter 7 with a same-age peer; joining and turn-taking allow a real response rather than scripted compliance.
- [ ] Author Chapter 8 with valid feelings, immediate stop boundaries, and repair that changes the shared activity.
- [ ] Author Chapter 9 with minimal set dressing; the lost-child lesson is explicitly a calm home rehearsal using a named safe adult role.
- [ ] Author Chapter 10 with age-appropriate recounting: one event, then two linked events, then one contribution to a family plan.
- [ ] Run incremental validator after every Chapter and correct word budgets, recycling order, and partner ratios.
- [ ] Create `curriculum/04/FINAL-REVIEW.md` with per-Lesson word counts, move coverage, authenticity exceptions, and release decision.
- [ ] Run `python tools/validate_curriculum.py --stage 04 --complete`, full Python tests, and JavaScript tests.
- [ ] If all gates pass, set Stage status to `language_reviewed` and record completed phases A–D. Runtime migration remains a separate task.

## Content rules that can block approval

- A line cannot exist only to deliver a rule or vocabulary item; the preceding event must make it useful now.
- Adult mistakes must be plausible, brief, and corrected after the child repairs meaning.
- Safety practice must state whom to approach and what to say, without staging a frightening separation.
- A peer may disagree, finish a turn, or suggest a different idea; the child practices responding, not controlling the peer.
- The final exchange must visibly settle the opening goal. Praise alone is not a resolution.
- A recycled Move appears only where it serves the scene; coverage metrics do not justify unnatural dialogue.
