from pathlib import Path
import json

from curriculum import load_stage

# Supported video file extensions. The in-browser recorder (MediaRecorder)
# produces .webm on Chrome/Firefox and .mp4 on Safari; legacy file uploads
# are .mp4. Both are recognized so a level lights up regardless of format.
VIDEO_EXTENSIONS = (".mp4", ".webm")
ROLE_LABELS = {
    "child": "Child",
    "dad": "Dad",
    "mom": "Mom",
    "teacher": "Teacher",
    "peer": "Friend",
}


def _has_video(root: Path, chapter: str, level: str, name: str) -> bool:
    """True if a video file of any supported extension exists for this kind."""
    d = root / chapter / level
    return any((d / f"{name}{ext}").exists() for ext in VIDEO_EXTENSIONS)


def scan_library(content_root: Path, demo_root: Path, recordings_root: Path,
                 username: str | None = None) -> list[dict]:
    """Walk the content root, return chapters (each with levels) in order.

    Curriculum text (meta.json) lives under content_root/<chapter>/<level>/.
    Videos live in separate trees: demo_root/<chapter>/<level>/demo.<ext> and
    recordings_root/<chapter>/<level>/performance.<ext> (ext = mp4 or webm).
    Directories must be zero-prefixed so string sort matches intended order.

    When ``username`` is given, performance videos are looked up under
    recordings_root/<username>/<chapter>/<level>/ so each user's recordings
    stay isolated. demo videos remain shared under demo_root/<chapter>/<level>/.
    With ``username=None`` the layout is unchanged (single-user / tests /
    Electron mode).

    Each level: { chapter, level, title, scene, patterns, dialogue, variations,
                  has_demo, has_performance }.
    """
    chapters: list[dict] = []
    if not content_root.exists():
        return chapters
    # Performance videos are per-user when a username is supplied: they live
    # under recordings_root/<username>/<chapter>/<level>/. Without a username
    # the legacy layout recordings_root/<chapter>/<level>/ is used. The caller
    # (app layer) is responsible for validating the username; here we only
    # build the path.
    recordings_base = recordings_root / username if username else recordings_root
    for chapter_dir in sorted(p for p in content_root.iterdir() if p.is_dir()):
        levels = []
        for level_dir in sorted(p for p in chapter_dir.iterdir() if p.is_dir()):
            meta = _read_meta(level_dir)
            chapter, level = chapter_dir.name, level_dir.name
            levels.append({
                "chapter": chapter,
                "level": level,
                "title": meta.get("title", level),
                "scene": meta.get("scene", ""),
                "patterns": meta.get("patterns", []),
                "dialogue": meta.get("dialogue", []),
                "variations": meta.get("variations", ""),
                "has_demo": _has_video(demo_root, chapter, level, "demo"),
                "has_performance": _has_video(recordings_base, chapter, level, "performance"),
            })
        if levels:
            chapters.append({"name": chapter_dir.name, "levels": levels})
    return chapters


def scan_curriculum_library(
    curriculum_root: Path,
    stage_id: str,
    demo_root: Path,
    recordings_root: Path,
    username: str | None = None,
) -> list[dict]:
    """Project one canonical Stage into the map library interface.

    Stage-aware media lives below ``<root>/<stage>/<chapter>/<lesson>``;
    performance media also includes the username before the Stage when one is
    supplied. The returned shape intentionally keeps the existing map fields
    while exposing the richer Lesson contract for the detail view.
    """

    stage = load_stage(Path(curriculum_root), stage_id)
    demo_base = Path(demo_root) / stage_id
    recordings_base = Path(recordings_root)
    if username:
        recordings_base /= username
    recordings_base /= stage_id
    chapters = []
    for chapter in stage.get("chapters", []):
        chapter_id = chapter["id"]
        levels = []
        for lesson in chapter.get("lessons", []):
            lesson_id = lesson["id"]
            dialogue = []
            for part in lesson.get("parts", []):
                for turn in part.get("turns", []):
                    dialogue.append(
                        {
                            **turn,
                            "speaker": ROLE_LABELS.get(
                                turn.get("speaker"), str(turn.get("speaker", "")).title()
                            ),
                            "part": part.get("id"),
                            "beat": part.get("beat"),
                        }
                    )
            levels.append(
                {
                    "chapter": chapter_id,
                    "level": lesson_id,
                    "title": lesson.get("title", lesson_id),
                    "title_zh": lesson.get("title_zh", ""),
                    "scene": lesson.get("setting", ""),
                    "can_do": lesson.get("can_do", ""),
                    "trigger": lesson.get("trigger", ""),
                    "conversation_move": lesson.get("conversation_move", {}),
                    "patterns": [
                        value
                        for value in (
                            lesson.get("core_response"),
                            lesson.get("stretch_response"),
                            lesson.get("repair_response"),
                        )
                        if value
                    ],
                    "dialogue": dialogue,
                    "parts": lesson.get("parts", []),
                    "replay_cards": lesson.get("replay_cards", []),
                    "variations": "",
                    "parent_support": lesson.get("parent_support", []),
                    "status": lesson.get("status", "draft"),
                    "content_revision": lesson.get("content_revision", 1),
                    "has_demo": _has_video(demo_base, chapter_id, lesson_id, "demo"),
                    "has_performance": _has_video(
                        recordings_base, chapter_id, lesson_id, "performance"
                    ),
                }
            )
        if levels:
            chapters.append(
                {
                    "name": chapter_id,
                    "title": chapter.get("title", chapter_id),
                    "title_zh": chapter.get("title_zh", ""),
                    "background_asset": chapter.get("background_asset", chapter_id),
                    "phase": chapter.get("phase"),
                    "levels": levels,
                }
            )
    return chapters


def _read_meta(level_dir: Path) -> dict:
    meta = level_dir / "meta.json"
    if not meta.exists():
        return {}
    try:
        return json.loads(meta.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def annotate_states(chapters: list[dict]) -> list[dict]:
    """Set each level's state (locked/unlocked/completed) and mark current.

    Walks levels in global order. First level is unlocked. Each later level is
    unlocked iff the previous level has a performance video. Completed iff
    has_performance. The first unlocked-but-not-completed level is 'current'.
    Mutates and returns the input.
    """
    flat = [lv for ch in chapters for lv in ch["levels"]]
    prev_completed = True  # the first level has nothing required before it
    current_set = False
    for lv in flat:
        if lv["has_performance"]:
            lv["state"] = "completed"
            lv["current"] = False
        elif prev_completed:
            lv["state"] = "unlocked"
            lv["current"] = not current_set
            current_set = True
        else:
            lv["state"] = "locked"
            lv["current"] = False
        prev_completed = lv["has_performance"]
    return chapters
