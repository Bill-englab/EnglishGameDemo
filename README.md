# My English Adventure

<p>
  <a href="https://github.com/Bill-englab/EnglishGameDemo/releases/tag/v0.1.0"><img alt="version" src="https://img.shields.io/badge/version-v0.1.0-blue"></a>
  <img alt="license" src="https://img.shields.io/badge/license-MIT-green">
  <img alt="platform" src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey">
  <img alt="status" src="https://img.shields.io/badge/status-stage%204%20live-brightgreen">
</p>

An interactive adventure map that turns parent-child English role-play into a visual journey. Every completed performance lights up a node on the map — not with a star, but with a frame from the demo animation.

Built for a 4-year-old, designed around one insight: **the real reward isn't a badge — it's watching yourself perform.**

---

## Why This Exists

Children who can already communicate in English still need richer sentence patterns. The traditional fix — flashcards, apps, quizzes — doesn't stick with a 4-year-old. What does stick is **performing**.

This project makes role-play feel like a game:

- **No teaching engine.** Learning happens offline, face-to-face. The website never grades or corrects.
- **No star ratings.** A level is either done or not — there's a `performance.mp4`, or there isn't.
- **The child's own performance is the reward.** A completed level shows a frame from the demo animation as its cover. The performance video is always one click away.

### Curriculum design guide

The curriculum is a systematic 4–6-year-old life-English journey. Stage 4 has 30 reviewed Lessons in [`curriculum/04`](curriculum/04), following the learner profile, age progression, three-session practice model, and authenticity gate in the [curriculum architecture design](docs/specs/2026-09-04-curriculum-architecture-design.md). The website now reads this canonical curriculum directly.

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

### Recording a Performance

1. Open a level's detail page.
2. In the **Your Turn** panel, click the `+` (or "Record again" if replacing).
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

Each chapter has its own full-bleed background illustration (Pixar-style storybook art). As you scroll, backgrounds cross-fade smoothly while the path and nodes stay in motion — a parallax effect that makes the journey feel continuous.

| State | Appearance | Meaning |
| --- | --- | --- |
| 🔒 Locked | Gray lock over dimmed demo screenshot | Previous level not yet completed. If a demo exists, a small play badge invites a sneak peek. |
| ▶️ Current | Demo screenshot with breathing glow + scaling cover + play button | This is the level to practice now. The cover gently pulses to draw attention. |
| 🌟 Completed | Demo screenshot + gold star (spinning + twinkling) + golden glow | Done. Click to replay the performance anytime. |

The winding path changes color as you progress: **traveled segments turn golden** (completed + current levels), while upcoming segments stay white. The transition happens at the current level — a visual trail of how far you've come.

---

## The Detail Page

Each level opens to a three-panel detail view:

- **Watch & Learn** — the demo animation video (0.75× speed for clarity). Upload or replace directly by clicking the video area.
- **Your Turn** — the child's performance video. Empty slots show a `+` placeholder; click to start the in-browser recorder. Hover the `?` next to "Your Turn" to see where the file is stored.
- **Read Together** — the full causal dialogue, divided into Part A / B / C with the actual partner label (Dad, Mom, Teacher, or Friend).
- **Replay Together** — two complete transfer situations showing the setting, what changes, and the speaking challenge.
- **For the Grown-up** — brief support for prompting without turning the performance into a test.

A **VideoGen** panel in the bottom-right reveals any available Sora prompt text (Part A / B / C), each with a one-click **Copy** button. New prompts are intentionally produced only after a Lesson reaches `video_ready`.

Prev / Next navigation spans the full width at the bottom, letting kids move between levels without returning to the map.

---

## Stage 4 Curriculum

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

Every Lesson includes one primary Conversation Move, a three-part causal dialogue, two complete Replay Cards, parent support, and eight review gates. The cast is a cartoon dog dad, pig mom, rabbit teacher, tiger child, and one recurring same-age friend. See the [full Stage 4 review](curriculum/04/FINAL-REVIEW.md). The old `content/` tree and root-level prompt files are retained only as v1 reference material.

---

## Progress

| Component | Status |
| --- | --- |
| Stage 4 reviewed curriculum | 30/30 ✅ |
| Runtime migration to new curriculum | Complete ✅ |
| Background illustrations | 8/10 |
| Legacy v1 demo production record | 14/30 (paused) |
| Stage 4 A/B/C prompts | Deferred until video production resumes |
| In-browser webcam recording | ✅ |

See [`demo/PROGRESS.md`](demo/PROGRESS.md) for detailed production tracking.

---

## For Developers

Tech stack: Flask + vanilla ES Modules. No build step, no database, no npm dependencies. Fonts self-hosted. Python and JS test suites included.

See [`AGENTS.md`](AGENTS.md) for full development guide — directory layout, testing, conventions, and architecture notes.

---

## License

[MIT](LICENSE)
