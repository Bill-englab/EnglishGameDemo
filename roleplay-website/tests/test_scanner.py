from pathlib import Path
import json
from scanner import scan_library


def make_level(parent: Path, name: str, *, demo=False, performance=False, title=None):
    d = parent / name
    d.mkdir(parents=True)
    if title is not None:
        (d / "meta.json").write_text(
            json.dumps({"title": title}), encoding="utf-8")
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


def test_scan_ignores_stray_files_at_chapter_level(tmp_path):
    root = tmp_path / "lib"
    (root / "01-c").mkdir(parents=True)
    (root / "01-c" / "notes.txt").write_text("ignore me", encoding="utf-8")
    make_level(root / "01-c", "01-s", demo=True)
    chapters = scan_library(root)
    assert len(chapters[0]["levels"]) == 1
