# TigerTales

**EN** | [ZH](README.zh-CN.md)

TigerTales organizes parent–child English role-play into an adventure map: watch a demo, practice together, record a performance, and return to replay it. Parents and children do the practice; the app provides dialogue, stores recordings, and tracks progress.

## How to play

![The full cycle: watch, practice, record, upload, complete a lesson, and replay](process.jpg)

1. **Watch** the demo to see the situation and dialogue, or read the lines together if no video is available.
2. **Practice** by taking roles and acting out the conversation with everyday props.
3. **Record** with the camera in the app or another device.
4. **Save or upload** after reviewing the recording. Try again if needed.
5. **Complete the lesson** to add a gold star and performance cover, and unlock the next lesson.
6. **Replay and continue**: watch your performance from the map, try a different situation, or move to the next lesson.

## Features

### Map and progress

Ten themed chapters contain 30 everyday conversations along a stepping-stone path. Scenery scrolls with the lessons. The course menu opens any lesson, and the current-lesson marker helps you pick up where you left off.

Completed lessons show a performance frame and one gold star. Incomplete lessons show a demo thumbnail or placeholder. A star means a performance has been saved, not a score. Locked lessons can still be previewed.

![Map with performance covers, completion stars, and a current-lesson marker](docs/screenshots/adventure-map.jpg)

*Interface screenshots use sample media.*

### Videos, dialogue, and practice in one lesson

| Feature | What it provides |
| --- | --- |
| Your Show | Record, replay, or replace your performance. |
| Watch & Learn | Play, add, or replace a demo video. |
| Read Together | Read the complete conversation, organized by speaker. |
| Replay Together | Try two variations per lesson with different props or settings. |
| Grown-up Notes | Open the lesson's purpose and guidance for the parent when needed. |

![Lesson detail with performances, demos, dialogue, and practice variations](docs/screenshots/lesson-detail.jpg)

### Recording and personal progress

Record in the app, review immediately, then retry or save. Existing videos can also be uploaded. Saving a performance updates the map. Each account keeps separate recordings and progress, with a nickname and avatar.

### Demo production

VideoGen provides three copyable production prompts per lesson. Use an external video tool to generate the clips, combine them, and upload the result as the lesson demo. The three clips are a production split; the lesson presents one complete conversation.

There are currently 90 prompt drafts across 30 lessons. The app does not generate videos, and finished demo videos are not bundled with the repository.

### Desktop and Web

The Windows Electron app and Web version share the same interface. Desktop places videos beside the dialogue; phones use video tabs and one reading column. Local use keeps recordings on your computer. Hosting on your own server is also supported.

[Development](DEVELOPMENT.md) · [Curriculum](curriculum/README.md) · [MIT License](LICENSE)
