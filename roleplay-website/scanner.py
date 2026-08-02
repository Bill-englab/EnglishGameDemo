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
