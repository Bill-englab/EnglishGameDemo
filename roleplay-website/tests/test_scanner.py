from pathlib import Path
import json
from scanner import scan_library, annotate_states


def make_level(parent: Path, name: str, *, demo=False, performance=False,
               title=None, scene=None):
    d = parent / name
    d.mkdir(parents=True)
    meta = {}
    if title is not None:
        meta["title"] = title
    if scene is not None:
        meta["scene"] = scene
    if meta:
        (d / "meta.json").write_text(json.dumps(meta), encoding="utf-8")
    if demo:
        (d / "demo.mp4").write_bytes(b"")
    if performance:
        (d / "performance.mp4").write_bytes(b"")
    return d


def test_scan_empty_root_returns_empty_list(tmp_path):
    assert scan_library(tmp_path / "does-not-exist") == []


def test_scan_returns_one_chapter_one_level_with_flags(tmp_path):
    root = tmp_path / "lib"
    make_level(root / "01-chapter", "01-scene", demo=True, title="Scene One")
    chapters = scan_library(root)
    assert len(chapters) == 1
    assert chapters[0]["name"] == "01-chapter"
    lv = chapters[0]["levels"][0]
    assert lv["title"] == "Scene One"
    assert lv["has_demo"] is True
    assert lv["has_performance"] is False
    assert lv["chapter"] == "01-chapter"
    assert lv["level"] == "01-scene"


def test_scan_orders_chapters_and_levels_by_name(tmp_path):
    root = tmp_path / "lib"
    make_level(root / "02-b", "02-y", demo=True)
    make_level(root / "02-b", "01-x", demo=True)
    make_level(root / "01-a", "01-w", demo=True)
    chapters = scan_library(root)
    assert [c["name"] for c in chapters] == ["01-a", "02-b"]
    assert [lv["level"] for lv in chapters[1]["levels"]] == ["01-x", "02-y"]


def test_scan_falls_back_to_dir_name_when_no_meta(tmp_path):
    root = tmp_path / "lib"
    make_level(root / "01-c", "01-s", demo=True)  # no title
    chapters = scan_library(root)
    assert chapters[0]["levels"][0]["title"] == "01-s"


def test_scan_records_performance_presence(tmp_path):
    root = tmp_path / "lib"
    make_level(root / "01-c", "01-s", demo=True, performance=True)
    chapters = scan_library(root)
    assert chapters[0]["levels"][0]["has_performance"] is True


def test_scan_reads_scene_from_meta(tmp_path):
    root = tmp_path / "lib"
    make_level(root / "01-c", "01-s", demo=True, title="Scene One",
               scene="Snack time. He picks which snack.")
    chapters = scan_library(root)
    assert chapters[0]["levels"][0]["scene"] == "Snack time. He picks which snack."


def test_scan_scene_defaults_to_empty_when_absent(tmp_path):
    root = tmp_path / "lib"
    make_level(root / "01-c", "01-s", demo=True, title="Scene One")
    chapters = scan_library(root)
    assert chapters[0]["levels"][0]["scene"] == ""


def test_scan_passes_through_dialogue_and_patterns(tmp_path):
    root = tmp_path / "lib"
    d = root / "01-c" / "01-s"
    d.mkdir(parents=True)
    (d / "meta.json").write_text(json.dumps({
        "title": "Can I have the apple one?",
        "scene": "Snack time.",
        "patterns": ["Can I have ___?", "I want ___"],
        "dialogue": [{"speaker": "Dad", "line": "Pick one."},
                     {"speaker": "Child", "line": "Can I have the apple one?"}],
        "variations": "apple -> banana",
    }), encoding="utf-8")
    lv = scan_library(root)[0]["levels"][0]
    assert lv["patterns"] == ["Can I have ___?", "I want ___"]
    assert lv["dialogue"][1] == {"speaker": "Child", "line": "Can I have the apple one?"}
    assert lv["variations"] == "apple -> banana"


def test_scan_ignores_stray_files_at_chapter_level(tmp_path):
    root = tmp_path / "lib"
    (root / "01-c").mkdir(parents=True)
    (root / "01-c" / "notes.txt").write_text("ignore me", encoding="utf-8")
    make_level(root / "01-c", "01-s", demo=True)
    chapters = scan_library(root)
    assert len(chapters[0]["levels"]) == 1


def lib_with(*specs, tmp_path):
    """specs: tuples of (chapter, level, has_performance). Returns scanned+annotated."""
    root = tmp_path / "lib"
    for ch, lv, perf in specs:
        make_level(root / ch, lv, demo=True, performance=perf)
    return annotate_states(scan_library(root))


def _flat(chapters):
    return [lv for ch in chapters for lv in ch["levels"]]


def test_first_level_is_unlocked_and_current(tmp_path):
    chapters = lib_with(("01-c", "01-s", False), tmp_path=tmp_path)
    lv = _flat(chapters)[0]
    assert lv["state"] == "unlocked"
    assert lv["current"] is True


def test_completed_level_marks_next_unlocked_current(tmp_path):
    chapters = lib_with(
        ("01-c", "01-s", True), ("01-c", "02-s", False), tmp_path=tmp_path)
    flat = _flat(chapters)
    assert flat[0]["state"] == "completed"
    assert flat[1]["state"] == "unlocked"
    assert flat[1]["current"] is True
    assert flat[0].get("current", False) is False


def test_locked_when_previous_not_completed(tmp_path):
    chapters = lib_with(
        ("01-c", "01-s", False), ("01-c", "02-s", False), tmp_path=tmp_path)
    flat = _flat(chapters)
    assert flat[0]["state"] == "unlocked"
    assert flat[1]["state"] == "locked"


def test_state_carries_across_chapters(tmp_path):
    chapters = lib_with(
        ("01-c", "01-s", True), ("02-c", "01-s", False), tmp_path=tmp_path)
    flat = _flat(chapters)
    assert flat[0]["state"] == "completed"
    assert flat[1]["state"] == "unlocked"
    assert flat[1]["chapter"] == "02-c"


def test_all_completed_has_no_current(tmp_path):
    chapters = lib_with(("01-c", "01-s", True), tmp_path=tmp_path)
    flat = _flat(chapters)
    assert flat[0]["state"] == "completed"
    assert flat[0].get("current", False) is False
