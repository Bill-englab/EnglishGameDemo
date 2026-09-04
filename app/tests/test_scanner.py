from collections import namedtuple
from pathlib import Path
import json
from scanner import scan_curriculum_library, scan_library, annotate_states

Roots = namedtuple("Roots", ["content", "demo", "recordings"])


def make_roots(tmp_path) -> Roots:
    return Roots(tmp_path / "content", tmp_path / "demo", tmp_path / "recordings")


def make_level(roots: Roots, chapter: str, level: str, *,
               demo=False, performance=False, title=None, scene=None):
    """Create a level across the three trees: meta in content, videos in demo/recordings."""
    (roots.content / chapter / level).mkdir(parents=True, exist_ok=True)
    meta = {}
    if title is not None:
        meta["title"] = title
    if scene is not None:
        meta["scene"] = scene
    if meta:
        (roots.content / chapter / level / "meta.json").write_text(
            json.dumps(meta), encoding="utf-8")
    if demo:
        d = roots.demo / chapter / level
        d.mkdir(parents=True, exist_ok=True)
        (d / "demo.mp4").write_bytes(b"")
    if performance:
        r = roots.recordings / chapter / level
        r.mkdir(parents=True, exist_ok=True)
        (r / "performance.mp4").write_bytes(b"")


def scan(roots: Roots):
    return scan_library(roots.content, roots.demo, roots.recordings)


def test_scan_curriculum_projects_stage_lessons_and_stage_media(tmp_path):
    curriculum = tmp_path / "curriculum"
    demo = tmp_path / "demo"
    recordings = tmp_path / "recordings"
    stage_dir = curriculum / "04"
    (stage_dir / "02-second" / "01-lesson").mkdir(parents=True)
    (stage_dir / "01-first" / "02-lesson").mkdir(parents=True)
    (stage_dir / "01-first" / "01-lesson").mkdir(parents=True)
    (stage_dir / "stage.json").write_text(
        json.dumps({"title": "I Can Take Part"}), encoding="utf-8"
    )
    for chapter_id in ("01-first", "02-second"):
        (stage_dir / chapter_id / "chapter.json").write_text(
            json.dumps({"title": chapter_id.title(), "background_asset": "01-wants-requests"}),
            encoding="utf-8",
        )
    lesson = {
        "title": "A Real Choice",
        "title_zh": "真实选择",
        "can_do": "清楚选择一个物品",
        "trigger": "Mom offers two visible choices.",
        "core_response": "Can I have the apple?",
        "stretch_response": "Can I have the red apple, please?",
        "repair_response": "No, I mean the apple.",
        "conversation_move": {"id": "request-item", "label": "request an item"},
        "status": "language_reviewed",
        "content_revision": 2,
        "parent_support": ["Pause for the child."],
        "replay_cards": [{"title": "Drink", "setting": "Breakfast", "change": "Choose milk", "challenge": "Repair a mix-up"}],
        "parts": [
            {"id": "A", "turns": [{"speaker": "mom", "line": "Apple or banana?", "kind": "input"}, {"speaker": "child", "line": "The apple, please.", "kind": "core"}]},
            {"id": "B", "turns": [{"speaker": "mom", "line": "The banana?", "kind": "input"}, {"speaker": "child", "line": "No, the apple.", "kind": "repair"}]},
            {"id": "C", "turns": [{"speaker": "mom", "line": "Here it is.", "kind": "action"}, {"speaker": "child", "line": "Thank you!", "kind": "playful"}]},
        ],
    }
    for lesson_dir in (
        stage_dir / "01-first" / "01-lesson",
        stage_dir / "01-first" / "02-lesson",
        stage_dir / "02-second" / "01-lesson",
    ):
        (lesson_dir / "lesson.json").write_text(json.dumps(lesson), encoding="utf-8")
    demo_dir = demo / "04" / "01-first" / "01-lesson"
    demo_dir.mkdir(parents=True)
    (demo_dir / "demo.mp4").write_bytes(b"")
    performance_dir = recordings / "tiger" / "04" / "01-first" / "01-lesson"
    performance_dir.mkdir(parents=True)
    (performance_dir / "performance.webm").write_bytes(b"")

    chapters = scan_curriculum_library(
        curriculum, "04", demo, recordings, username="tiger"
    )

    assert [chapter["name"] for chapter in chapters] == ["01-first", "02-second"]
    assert [level["level"] for level in chapters[0]["levels"]] == ["01-lesson", "02-lesson"]
    assert chapters[0]["title"] == "01-First"
    assert chapters[0]["background_asset"] == "01-wants-requests"
    level = chapters[0]["levels"][0]
    assert level["can_do"] == "清楚选择一个物品"
    assert level["trigger"] == "Mom offers two visible choices."
    assert level["patterns"] == [
        "Can I have the apple?",
        "Can I have the red apple, please?",
        "No, I mean the apple.",
    ]
    assert [turn["speaker"] for turn in level["dialogue"]] == [
        "Mom", "Child", "Mom", "Child", "Mom", "Child"
    ]
    assert level["dialogue"][2]["part"] == "B"
    assert level["replay_cards"][0]["title"] == "Drink"
    assert level["content_revision"] == 2
    assert level["has_demo"] is True
    assert level["has_performance"] is True


def test_scan_empty_root_returns_empty_list(tmp_path):
    roots = make_roots(tmp_path)
    assert scan(roots) == []


def test_scan_returns_one_chapter_one_level_with_flags(tmp_path):
    roots = make_roots(tmp_path)
    make_level(roots, "01-chapter", "01-scene", demo=True, title="Scene One")
    chapters = scan(roots)
    assert len(chapters) == 1
    assert chapters[0]["name"] == "01-chapter"
    lv = chapters[0]["levels"][0]
    assert lv["title"] == "Scene One"
    assert lv["has_demo"] is True
    assert lv["has_performance"] is False
    assert lv["chapter"] == "01-chapter"
    assert lv["level"] == "01-scene"


def test_scan_orders_chapters_and_levels_by_name(tmp_path):
    roots = make_roots(tmp_path)
    make_level(roots, "02-b", "02-y", demo=True)
    make_level(roots, "02-b", "01-x", demo=True)
    make_level(roots, "01-a", "01-w", demo=True)
    chapters = scan(roots)
    assert [c["name"] for c in chapters] == ["01-a", "02-b"]
    assert [lv["level"] for lv in chapters[1]["levels"]] == ["01-x", "02-y"]


def test_scan_falls_back_to_dir_name_when_no_meta(tmp_path):
    roots = make_roots(tmp_path)
    make_level(roots, "01-c", "01-s", demo=True)  # no title
    chapters = scan(roots)
    assert chapters[0]["levels"][0]["title"] == "01-s"


def test_scan_records_performance_presence(tmp_path):
    roots = make_roots(tmp_path)
    make_level(roots, "01-c", "01-s", demo=True, performance=True)
    chapters = scan(roots)
    assert chapters[0]["levels"][0]["has_performance"] is True


def test_scan_detects_demo_and_performance_in_separate_trees(tmp_path):
    """Videos live in demo/ and recordings/, not co-located with meta.json."""
    roots = make_roots(tmp_path)
    make_level(roots, "01-c", "01-s", demo=True, performance=True)
    # nothing video-like under content/
    assert not (roots.content / "01-c" / "01-s" / "demo.mp4").exists()
    assert not (roots.content / "01-c" / "01-s" / "performance.mp4").exists()
    lv = scan(roots)[0]["levels"][0]
    assert lv["has_demo"] is True
    assert lv["has_performance"] is True


def test_scan_detects_webm_performance(tmp_path):
    """The in-browser recorder produces .webm; scanner must recognize it."""
    roots = make_roots(tmp_path)
    (roots.content / "01-c" / "01-s").mkdir(parents=True)
    r = roots.recordings / "01-c" / "01-s"
    r.mkdir(parents=True)
    (r / "performance.webm").write_bytes(b"")
    lv = scan(roots)[0]["levels"][0]
    assert lv["has_performance"] is True


def test_scan_with_username_isolates_performance(tmp_path):
    """When a username is given, performance is read from
    recordings_root/<username>/<chapter>/<level>/ — so userA's recording is
    invisible to userB, and None falls back to the shared layout."""
    roots = make_roots(tmp_path)
    make_level(roots, "01-c", "01-s", demo=True)  # no shared performance
    # Only userA has a performance video, under their own folder.
    r = roots.recordings / "userA" / "01-c" / "01-s"
    r.mkdir(parents=True)
    (r / "performance.mp4").write_bytes(b"")

    # userA sees their recording.
    chapters = scan_library(roots.content, roots.demo, roots.recordings,
                            username="userA")
    assert chapters[0]["levels"][0]["has_performance"] is True
    # userB does not — recordings are isolated per user.
    chapters = scan_library(roots.content, roots.demo, roots.recordings,
                            username="userB")
    assert chapters[0]["levels"][0]["has_performance"] is False
    # Backward compat: username=None looks at the shared recordings layout
    # (no <username> layer), where no performance file exists.
    chapters = scan_library(roots.content, roots.demo, roots.recordings)
    assert chapters[0]["levels"][0]["has_performance"] is False


def test_scan_reads_scene_from_meta(tmp_path):
    roots = make_roots(tmp_path)
    make_level(roots, "01-c", "01-s", demo=True, title="Scene One",
               scene="Snack time. He picks which snack.")
    chapters = scan(roots)
    assert chapters[0]["levels"][0]["scene"] == "Snack time. He picks which snack."


def test_scan_scene_defaults_to_empty_when_absent(tmp_path):
    roots = make_roots(tmp_path)
    make_level(roots, "01-c", "01-s", demo=True, title="Scene One")
    chapters = scan(roots)
    assert chapters[0]["levels"][0]["scene"] == ""


def test_scan_passes_through_dialogue_and_patterns(tmp_path):
    roots = make_roots(tmp_path)
    d = roots.content / "01-c" / "01-s"
    d.mkdir(parents=True)
    (d / "meta.json").write_text(json.dumps({
        "title": "Can I have the apple one?",
        "scene": "Snack time.",
        "patterns": ["Can I have ___?", "I want ___"],
        "dialogue": [{"speaker": "Dad", "line": "Pick one."},
                     {"speaker": "Child", "line": "Can I have the apple one?"}],
        "variations": "apple -> banana",
    }), encoding="utf-8")
    lv = scan(roots)[0]["levels"][0]
    assert lv["patterns"] == ["Can I have ___?", "I want ___"]
    assert lv["dialogue"][1] == {"speaker": "Child", "line": "Can I have the apple one?"}
    assert lv["variations"] == "apple -> banana"


def test_scan_ignores_stray_files_at_chapter_level(tmp_path):
    roots = make_roots(tmp_path)
    (roots.content / "01-c").mkdir(parents=True)
    (roots.content / "01-c" / "notes.txt").write_text("ignore me", encoding="utf-8")
    make_level(roots, "01-c", "01-s", demo=True)
    chapters = scan(roots)
    assert len(chapters[0]["levels"]) == 1


def lib_with(*specs, tmp_path):
    """specs: tuples of (chapter, level, has_performance). Returns scanned+annotated."""
    roots = make_roots(tmp_path)
    for ch, lv, perf in specs:
        make_level(roots, ch, lv, demo=True, performance=perf)
    return annotate_states(scan(roots))


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
