from pathlib import Path
import json


def scan_library(root: Path) -> list[dict]:
    """Walk the library root, return chapters (each with levels) in order.

    Each level: { chapter, level, title, has_demo, has_performance }.
    Directories must be zero-prefixed so string sort matches intended order.
    """
    chapters: list[dict] = []
    if not root.exists():
        return chapters
    for chapter_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        levels = []
        for level_dir in sorted(p for p in chapter_dir.iterdir() if p.is_dir()):
            levels.append({
                "chapter": chapter_dir.name,
                "level": level_dir.name,
                "title": _read_title(level_dir),
                "has_demo": (level_dir / "demo.mp4").exists(),
                "has_performance": (level_dir / "performance.mp4").exists(),
            })
        if levels:
            chapters.append({"name": chapter_dir.name, "levels": levels})
    return chapters


def _read_title(level_dir: Path) -> str:
    meta = level_dir / "meta.json"
    if not meta.exists():
        return level_dir.name
    try:
        return json.loads(meta.read_text(encoding="utf-8")).get(
            "title", level_dir.name)
    except (json.JSONDecodeError, OSError):
        return level_dir.name


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
