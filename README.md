# My English Adventure

<p>
  <a href="https://github.com/Bill-englab/EnglishGameDemo/releases/tag/v0.1.0"><img alt="version" src="https://img.shields.io/badge/version-v0.1.0-blue"></a>
  <img alt="license" src="https://img.shields.io/badge/license-MIT-green">
  <img alt="platform" src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey">
  <img alt="status" src="https://img.shields.io/badge/status-WIP%20(7%2F30%20demo)-orange">
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

---

## How It Works

Each level follows the same loop — watch, practice, perform, record, replay:

<img src="docs/attach/process.jpg" alt="Role-play workflow: watch demo, practice together, record performance, upload, level lights up, replay" width="100%">

### Starting the App

**Windows:** Double-click `run.bat` — it launches the server and opens the browser.

**Command line (any OS):**

```bash
cd app
.venv/Scripts/python app.py      # Windows
# macOS/Linux:  .venv/bin/python app.py
```

Then open http://127.0.0.1:5000.

The app runs entirely on your machine. No internet required (fonts are bundled), and uploaded videos stay on your disk — nothing is sent to any server.

---

## The Map

**10 chapters × 3 levels = 30 levels**, arranged as a winding path climbing upward through ten illustrated worlds.

Each chapter has its own full-bleed background illustration (Pixar-style storybook art). As you scroll, backgrounds cross-fade smoothly while the path and nodes stay in motion — a parallax effect that makes the journey feel continuous.

| State | Appearance | Meaning |
| --- | --- | --- |
| 🔒 Locked | Gray lock icon | Previous level not yet completed. If a demo exists, a small play badge invites a sneak peek. |
| ▶️ Current | White glowing button | This is the level to practice now. |
| 🌟 Completed | Demo animation frame + gold star | Done. Click to replay the performance anytime. |

---

## The Detail Page

Each level opens to a three-panel detail view:

- **Watch & Learn** — the demo animation video (0.75× speed for clarity). Upload or replace directly by clicking the video area.
- **Your Turn** — the child's performance video. Empty slots show a `+` placeholder; click to upload.
- **Read Together** — the full dialogue (Dad + Child chat bubbles) and variation prompts.

A **VideoGen** panel in the bottom-right reveals the Sora prompt text (Part A / Part B) used to generate the demo, each with a one-click **Copy** button.

Prev / Next navigation spans the full width at the bottom, letting kids move between levels without returning to the map.

---

## Curriculum

Thirty levels across ten language themes, progressing in difficulty:

| Ch | Theme | Patterns |
| --- | --- | --- |
| 1 | wants-requests | Can I have ___? / I want ___ |
| 2 | refusing-bargaining | I don't want to ___ / What if ___? |
| 3 | asking-help | Can you help me ___? / It's stuck |
| 4 | where-locating | Where's ___? / Is ___ in/on ___? |
| 5 | why-how-come | Why do I ___? / How come ___? |
| 6 | feelings-preferences | I'm ___ / I don't like ___ |
| 7 | reasoning | because ___ / That's why ___ |
| 8 | recounting-day | I went ___ / and then ___ |
| 9 | reporting-others | He said ___ / She told me ___ |
| 10 | planning-predicting | We're going to ___ / First ___, then ___ |

Every level includes a full dialogue (Dad + Child alternating), target patterns, and variation prompts for re-enactment. Demo animations are AI-generated (Sora) with fixed characters: Dad = cartoon dog, Child = cartoon tiger cub.

---

## Progress

| Component | Status |
| --- | --- |
| Curriculum scripts | 30/30 ✅ |
| Background illustrations | 8/10 |
| Demo animations | 7/30 |
| Sora prompts | 60/60 ✅ |

See [`demo/PROGRESS.md`](demo/PROGRESS.md) for detailed production tracking.

---

## For Developers

Tech stack: Flask + vanilla ES Modules. No build step, no database, no npm dependencies. Fonts self-hosted. Python and JS test suites included.

See [`AGENTS.md`](AGENTS.md) for full development guide — directory layout, testing, conventions, and architecture notes.

---

## License

[MIT](LICENSE)
