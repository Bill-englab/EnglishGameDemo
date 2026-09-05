# My English Adventure

<p>
  <a href="https://github.com/Bill-englab/EnglishGameDemo/releases/tag/v0.1.0"><img alt="version" src="https://img.shields.io/badge/version-v0.1.0-blue"></a>
  <img alt="license" src="https://img.shields.io/badge/license-MIT-green">
  <img alt="platform" src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey">
  <img alt="status" src="https://img.shields.io/badge/status-stage%204%20live-brightgreen">
</p>

An interactive adventure map that turns parent-child English role-play into a visual journey. Every completed performance lights up a node with its demo frame when available and one gold completion star—never a score or star rating.

Built for a 4-year-old, designed around one insight: **the real reward isn't a badge — it's watching yourself perform.**

---

## Why This Exists

Children who can already communicate in English still need richer sentence patterns. The traditional fix — flashcards, apps, quizzes — doesn't stick with a 4-year-old. What does stick is **performing**.

This project makes role-play feel like a game:

- **No teaching engine.** Learning happens offline, face-to-face. The website never grades or corrects.
- **No star ratings.** A level is either done or not — there's a `performance.mp4`, or there isn't.
- **The child's own performance is the reward.** A completed level shows a frame from the demo animation as its cover. The performance video is always one click away.

### Curriculum design guide

The curriculum is a systematic 4–6-year-old life-English journey. The app displays [`curriculum/04`](curriculum/04) as Stage 1: 30 reviewed Lessons for age four, following the learner profile, age progression, three-session practice model, and authenticity gate in the [curriculum architecture design](docs/specs/2026-09-04-curriculum-architecture-design.md). The website reads this canonical curriculum directly.

All 30 lessons now use `three-by-ten-v2` and have **three standalone video prompt drafts each** (A/B/C, each constrained to about 10 seconds): [browse the 90 synchronized prompts](prompts/04/README.md). Speech is exported directly from canonical lessons; per-lesson staging preserves physical continuity and bounded emotion. See the [production and maintenance guide](prompts/README.md) and [complete Stage 1 review](curriculum/04/FINAL-REVIEW.md). Prompt availability is not `video_ready` approval or evidence of a finished video.

---

## How It Works

Each level follows the same loop — watch, practice, perform, record, replay:

<img src="docs/attach/process.jpg" alt="Role-play workflow: watch demo, practice together, record performance, upload, level lights up, replay" width="100%">

The performance is recorded **in-browser** using the PC's webcam — no phone transfer, no file copying. The child performs in front of the screen, hits stop, watches the instant replay, and saves. The level lights up immediately.

### Starting the App

**Windows:** Double-click `run.bat` — it launches the server and opens the browser.

**Command line (any OS):**

```bash
cd app
.venv/Scripts/python app.py      # Windows
# macOS/Linux:  .venv/bin/python app.py
```

Then open http://127.0.0.1:5000.

The app runs entirely on your machine. No internet required (fonts are bundled), and recorded videos stay on your disk — nothing is sent to any server.

### Personal Profile

Open the account menu → **My Profile** to upload an avatar, preview it, and save a nickname. Cancel keeps the existing profile; Use Default restores the built-in avatar. Login usernames, lesson progress, and recording paths never change.

Photos stay on your server, are resized to 256×256, and have embedded metadata removed. JPEG, PNG and static WebP are supported (up to 5 MiB / 16 megapixels). Update the Python requirements before starting; existing sessions need one fresh login after upgrading. See the [profile design and privacy rules](docs/specs/2026-09-04-personal-profile-design.md).

### Recording a Performance

1. Open a level's detail page.
2. In the **Your Show** panel, click **Start recording** (or "Record again" if replacing).
3. The browser asks for camera + microphone permission (grant once).
4. A live camera preview appears (mirrored, so the child sees themselves).
5. Click the red circle to start recording → it becomes a square, a red dot blinks, and a timer runs.
6. Click again (or wait 5 minutes) to stop.
7. The recording plays back immediately. Click **Redo** to try again, or **Save** to keep it.
8. The level lights up on the map.

Recordings are saved as `.webm` (Chrome/Firefox) or `.mp4` (Safari) — the app handles both formats automatically.

---

## The Map

**10 chapters × 3 levels = 30 levels**, arranged as a winding path climbing upward through ten illustrated worlds.

Each chapter has its own local **Modern Toy Theatre** scene: soft clay, painted wood and fabric around an open grass corridor. Twenty separate WebP backgrounds provide desktop (1920×1200) and mobile (1080×1920) compositions. Screens below 768px select the mobile asset; missing assets fall back within the same chapter, then to a quiet material surface.

| State | Appearance | Meaning |
| --- | --- | --- |
| Locked | Demo cover or numbered material node with a lock | Previous lesson is not complete; click to preview. |
| Current | Demo cover or numbered node with a teal ring and location marker | The next lesson to practice; it is still incomplete. |
| Completed | Demo cover or material node with one gold star | A performance exists. The one star means complete, not a rating; click to replay it. |

The ivory path has a muted gold inner line through completed lessons and a teal inner line to the current lesson. The 56px top rail keeps brand, real **completed / 30** progress and account aligned; on phones it stays one row, with a compact title and avatar. The account menu scrolls internally when its choices exceed the available height. **Current lesson** scrolls to and focuses that lesson; it does not open or record it. Once every lesson has a performance, the action becomes a completion message. Saving a newly completed performance plays one short, non-blocking celebration for that page session; refreshes and re-recording do not replay it.

The course menu contains ten chapter groups with real per-chapter progress and every lesson. Stage 1 is available (the existing `curriculum/04`); Stage 2 and Stage 3 display **Planned** and are disabled. Escape, the close button or the backdrop closes the menu and returns focus. Choosing a lesson opens its complete detail page.

The [current UI acceptance record](docs/plans/2026-09-05-adventure-feedback-ui-acceptance.md) covers shared route geometry, accessible states, one-shot celebrations across navigation and cancellation, 16px shell capsules, and mobile/Electron checks. The [original visual implementation record](docs/plans/2026-09-05-modern-toy-theatre-ui-implementation.md) preserves the earlier concept comparison. Run the isolated acceptance harness using [app/README.md](app/README.md).

---

## The Detail Page

Each level opens with a compact title toolbar. Desktop places videos on the left and the complete reading flow on the right; narrower screens use video tabs above a single reading column. Only the page scrolls—dialogue, replay situations and prompts have no nested scrollbars.

- **Your Show** — the child's performance video, prioritized above the demo. **Start recording** opens the camera; saved performances offer playback and Record again.
- **Watch & Learn** — the demo animation with native playback controls at normal speed. Use **Add demo** or **Replace**; an absent demo occupies only a compact strip.
- **Read Together** — the full causal dialogue, divided into Part A / B / C with the actual partner label (Dad, Mom, Teacher, or Peer).
- **Replay Together** — two complete transfer situations showing the setting, what changes, and the speaking challenge.
- **Grown-up Notes** — collapsed lesson intent, response patterns and support; a separate collapsed VideoGen entry keeps the three prompts easy to find.

A **VideoGen** disclosure reveals Sora prompt text (Part A / B / C), each with a one-click **Copy** button. All 30 current lessons have complete draft prompts. Final staging, timing and audiovisual checks are still required before `video_ready` and formal video production.

Prev / Next navigation spans the full width at the bottom, letting kids move between levels without returning to the map.

Hidden mobile videos pause when switching tabs. Camera sessions remain visible across resizing, and leaving a lesson releases tracks, timers and preview URLs. This detail-only refresh does not implement the remaining map/menu redesign, countdown or speed controls; see [scope and verification](docs/plans/2026-09-04-detail-reading-redesign.md).

---

## Stage 1 Curriculum (`curriculum/04`)

Thirty Lessons across ten daily-communication chapters, progressing from expressing intent to participating, cooperating, and recounting:

| Ch | Theme | Patterns |
| --- | --- | --- |
| 1 | choosing and requests | Ask, specify, and change a choice |
| 2 | refusal and negotiation | State a boundary, ask for time, propose an order |
| 3 | help and clarification | Ask for help, signal non-understanding, repair meaning |
| 4 | body and needs | Hunger/thirst, pause needs, mild discomfort |
| 5 | routines and transitions | Sequence actions, request within a boundary, report readiness |
| 6 | finding and belonging | Ask/check location and identify belongings |
| 7 | joining and cooperation | Join peer play, take turns, combine ideas |
| 8 | feelings and repair | Explain feelings, stop a body interaction, repair a mistake |
| 9 | outings and safety | Car questions, shop finding, calm lost-child rehearsal |
| 10 | recounting and planning | One event, two linked events, tomorrow's plan |

Every Lesson includes one primary Conversation Move, a 9–11-turn causal dialogue split into three strict ~10-second parts, two complete Replay Cards, parent support, and ten structured review gates. The complete review also answers eleven human content questions for each of the 30 lessons. The cast is a cartoon dog dad, pig mom, rabbit teacher, four-year-old tiger boy, and one recurring same-age friend. The old `content/` tree and root-level prompt files are retained only as v1 reference material.

---

## Progress

| Component | Status |
| --- | --- |
| Stage 1 reviewed curriculum (`curriculum/04`) | 30/30 `three-by-ten-v2` ✅ |
| Runtime migration to new curriculum | Complete ✅ |
| Background illustrations | 8/10 |
| Legacy revision 1 / v1 demo record | 14/30, all stale against revision 2–4 (paused) |
| Stage 1 A/B/C prompt drafts | 90/90 synchronized; 0 lessons `video_ready` |
| In-browser webcam recording | ✅ |

See [`demo/PROGRESS.md`](demo/PROGRESS.md) for detailed production tracking.

---

## For Developers

Tech stack: Flask + vanilla ES Modules. No build step, no database, no npm dependencies. Fonts self-hosted. Python and JS test suites included.

See [`AGENTS.md`](AGENTS.md) for full development guide — directory layout, testing, conventions, and architecture notes.

---

## License

[MIT](LICENSE)
