import copy
import json
from pathlib import Path
import sys

import pytest

from curriculum import CurriculumLoadError, load_stage, validate_stage

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tools.validate_curriculum import format_report, run_validation


ALL_REVIEWS = {
    "motivation": True,
    "causality": True,
    "physical": True,
    "adult_behavior": True,
    "child_language": True,
    "knowledge_safety": True,
    "resolution": True,
    "replay_logic": True,
}


def valid_lesson(move_id="request-item", *, recycle=None):
    return {
        "id": "01-can-i-have",
        "title": "The Apple One",
        "title_zh": "我想要苹果那个",
        "can_do": "礼貌请求一个明确物品",
        "conversation_move": {"id": move_id, "label": "request an item"},
        "trigger": "The partner offers or shows two choices.",
        "core_response": "Can I have the apple, please?",
        "stretch_response": "Can I have the red apple, please?",
        "repair_response": "No, I mean the apple.",
        "recycle": recycle or [],
        "roles": ["child", "mom"],
        "setting": "Snack time at home.",
        "essential_props": ["two snack choices"],
        "parts": [
            {
                "id": "A",
                "beat": "goal",
                "turns": [
                    {"speaker": "mom", "line": "Apple or banana for your snack today?", "kind": "input"},
                    {"speaker": "child", "line": "Can I have the apple, please?", "kind": "core"},
                ],
            },
            {
                "id": "B",
                "beat": "change",
                "turns": [
                    {"speaker": "mom", "line": "Here is the banana for you.", "kind": "input"},
                    {"speaker": "child", "line": "No, I mean the apple.", "kind": "repair"},
                ],
            },
            {
                "id": "C",
                "beat": "resolve",
                "turns": [
                    {"speaker": "mom", "line": "Oh, the red apple. Here you are!", "kind": "input"},
                    {"speaker": "child", "line": "Yes, thank you, Mom!", "kind": "playful"},
                ],
            },
        ],
        "replay_cards": [
            {
                "title": "Choose a drink",
                "setting": "At breakfast",
                "change": "Choose water or milk",
                "challenge": "The partner hands over the wrong drink",
            },
            {
                "title": "Choose a shirt",
                "setting": "Getting dressed",
                "change": "Choose the red or blue shirt",
                "challenge": "The partner points to the wrong shirt",
            },
        ],
        "parent_support": [
            "Offer two visible choices.",
            "Pause before modeling the first three words.",
        ],
        "reviews": dict(ALL_REVIEWS),
        "status": "language_reviewed",
        "content_revision": 1,
    }


def valid_stage(lessons=None):
    return {
        "id": "04",
        "title": "I Can Take Part",
        "age": 4,
        "version": 1,
        "status": "draft",
        "expected_chapters": 10,
        "expected_lessons": 30,
        "minimum_family_partner_ratio": 0.7,
        "roles": ["child", "dad", "mom", "teacher", "peer"],
        "dialogue_parts": ["A", "B", "C"],
        "chapters": [
            {
                "id": "01-choosing",
                "title": "Choosing",
                "lessons": lessons or [valid_lesson()],
            }
        ],
    }


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value), encoding="utf-8")


def test_load_stage_discovers_chapters_and_lessons_in_prefix_order(tmp_path):
    root = tmp_path / "curriculum"
    write_json(root / "04" / "stage.json", {"id": "04", "title": "Stage"})
    for chapter_id, lesson_ids in {
        "02-boundaries": ["02-more-time", "01-not-yet"],
        "01-choosing": ["01-can-i-have"],
    }.items():
        write_json(root / "04" / chapter_id / "chapter.json", {"title": chapter_id})
        for lesson_id in lesson_ids:
            write_json(
                root / "04" / chapter_id / lesson_id / "lesson.json",
                {"title": lesson_id},
            )

    stage = load_stage(root, "04")

    assert [chapter["id"] for chapter in stage["chapters"]] == [
        "01-choosing",
        "02-boundaries",
    ]
    assert [lesson["id"] for lesson in stage["chapters"][1]["lessons"]] == [
        "01-not-yet",
        "02-more-time",
    ]
    lesson = stage["chapters"][1]["lessons"][0]
    assert lesson["path_ids"] == {
        "stage": "04",
        "chapter": "02-boundaries",
        "lesson": "01-not-yet",
    }


def test_load_stage_reports_the_relative_path_for_malformed_json(tmp_path):
    root = tmp_path / "curriculum"
    path = root / "04" / "stage.json"
    path.parent.mkdir(parents=True)
    path.write_text("{broken", encoding="utf-8")

    with pytest.raises(CurriculumLoadError, match=r"04[/\\]stage.json"):
        load_stage(root, "04")


@pytest.mark.parametrize(
    ("mutate", "expected_code"),
    [
        (lambda lesson: lesson.pop("trigger"), "required-field"),
        (lambda lesson: lesson.update(roles=["child", "grandma"]), "invalid-role"),
        (lambda lesson: lesson.update(status="published"), "invalid-status"),
        (lambda lesson: lesson["parts"].reverse(), "invalid-dialogue-part"),
        (lambda lesson: lesson["roles"].append("dad"), "speaker-count"),
        (
            lambda lesson: lesson["parts"][0].update(
                turns=[{"speaker": "mom", "line": "Choose one.", "kind": "input"}]
            ),
            "missing-child-turn",
        ),
        (lambda lesson: lesson["replay_cards"].pop(), "missing-replay-card"),
        (lambda lesson: lesson["essential_props"].append("a tray"), "too-many-essential-props"),
        (
            lambda lesson: (
                lesson.update(status="video_ready"),
                lesson["reviews"].update(causality=False),
            ),
            "review-gate",
        ),
        (
            lambda lesson: lesson["parts"][0]["turns"][0].update(line="Go."),
            "word-budget",
        ),
        (lambda lesson: lesson.update(recycle=["not-introduced"]), "unknown-recycle"),
    ],
)
def test_validate_stage_reports_contract_breaks(mutate, expected_code):
    stage = valid_stage()
    mutate(stage["chapters"][0]["lessons"][0])

    codes = {issue.code for issue in validate_stage(stage)}

    assert expected_code in codes


def test_validate_stage_accepts_a_well_formed_draft():
    assert validate_stage(valid_stage()) == []


def test_complete_validation_enforces_counts_and_family_partner_ratio():
    issues = validate_stage(valid_stage(), require_complete=True)

    assert {issue.code for issue in issues} == {
        "chapter-count",
        "lesson-count",
    }


def test_recycle_can_reference_only_an_earlier_lesson():
    first = valid_lesson("request-item")
    first["id"] = "01-request"
    second = copy.deepcopy(valid_lesson("specify-choice", recycle=["request-item"]))
    second["id"] = "02-specify"

    assert validate_stage(valid_stage([first, second])) == []

    first["recycle"] = ["specify-choice"]
    assert "unknown-recycle" in {
        issue.code for issue in validate_stage(valid_stage([first, second]))
    }


def test_format_report_lists_structure_and_move_coverage():
    report = format_report(valid_stage(), [])

    assert "Stage 04" in report
    assert "family partner ratio" in report
    assert "request-item" in report
    assert "orphan moves" in report


def test_validation_exit_code_reflects_issues_without_rejecting_draft_counts(tmp_path):
    root = tmp_path / "curriculum"
    write_json(root / "04" / "stage.json", valid_stage() | {"chapters": []})

    assert run_validation(root, "04", require_complete=False)[0] == 0
    assert run_validation(root, "04", require_complete=True)[0] == 1
