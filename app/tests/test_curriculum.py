import copy
import json
from pathlib import Path
import sys

import pytest

from curriculum import CurriculumLoadError, load_stage, validate_stage

REPO_ROOT = Path(__file__).resolve().parents[2]
CURRICULUM_ROOT = REPO_ROOT / "curriculum"
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


def valid_lesson(move_id="request-item", *, recycle=None, v2=False):
    lesson = {
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
                    {"speaker": "child", "line": "Yes, that is the apple I wanted. Thank you, Mom!", "kind": "playful"},
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
    if v2:
        lesson["dialogue_contract"] = "three-by-ten-v2"
        lesson["reviews"].update(character_continuity=True, emotion_stability=True)
        # 3/4/3 turns, 15/16/15 words, four child turns and 19 child words.
        dialogue = [
            [("mom", "Would you like a snack?"), ("child", "Can I have an apple?"), ("mom", "Yes, here is your apple.")],
            [("child", "This apple is too big."), ("mom", "Would you like it cut?"), ("child", "Yes, please cut it."), ("mom", "All right.")],
            [("mom", "Here are two small pieces."), ("child", "Thank you, I like these."), ("mom", "You can eat them now.")],
        ]
        for part, turns in zip(lesson["parts"], dialogue):
            part["turns"] = [{"speaker": speaker, "line": line, "kind": "input"} for speaker, line in turns]
    return lesson


@pytest.mark.parametrize("mutation, expected_code", [
    (lambda l: l["parts"][0]["turns"].pop(), "part-turn-budget"),
    (lambda l: l["parts"][1]["turns"].append({"speaker": "mom", "line": "Okay."}), "part-turn-budget"),
    (lambda l: (l["parts"][0]["turns"].pop(), l["parts"][2]["turns"].pop()), "lesson-turn-budget"),
    (lambda l: (l["parts"][0]["turns"].append({"speaker": "mom", "line": "Okay."}), l["parts"][2]["turns"].append({"speaker": "mom", "line": "Okay."})), "lesson-turn-budget"),
    (lambda l: l["parts"][0]["turns"][1].update(speaker="mom"), "child-turn-budget"),
    (lambda l: (l["parts"][0]["turns"][0].update(speaker="child"), l["parts"][2]["turns"][0].update(speaker="child")), "child-turn-budget"),
    (lambda l: l["parts"][0]["turns"][0].update(line="word " * 11), "part-word-budget"),
    (lambda l: l["parts"][0]["turns"][0].update(line="One."), "part-word-budget"),
    (lambda l: l["parts"][0]["turns"][0].update(line="Take a snack."), "word-budget"),
    (lambda l: (l["parts"][0]["turns"][0].update(line="word " * 10), l["parts"][1]["turns"][1].update(line="word " * 9), l["parts"][2]["turns"][0].update(line="word " * 9)), "word-budget"),
])
def test_v2_rejects_turn_and_word_budget_violations(mutation, expected_code):
    lesson = valid_lesson(v2=True)
    mutation(lesson)
    assert expected_code in {issue.code for issue in validate_stage(valid_stage([lesson]))}


@pytest.mark.parametrize("status", ["language_reviewed", "video_ready", "video_produced"])
@pytest.mark.parametrize("review", sorted(ALL_REVIEWS) + ["character_continuity", "emotion_stability"])
def test_v2_requires_all_ten_reviews_from_language_reviewed(status, review):
    lesson = valid_lesson(v2=True)
    lesson["status"] = status
    lesson["reviews"].pop(review)
    assert "review-gate" in {issue.code for issue in validate_stage(valid_stage([lesson]))}


def test_v2_accepts_valid_dialogue_and_does_not_count_production_prose():
    lesson = valid_lesson(v2=True)
    lesson["setting"] = "scene " * 100
    assert validate_stage(valid_stage([lesson])) == []
    lesson["status"] = "logic_reviewed"
    lesson["reviews"] = {}
    assert validate_stage(valid_stage([lesson])) == []


@pytest.mark.parametrize("contract", ["three-by-ten-v3", "legacy", 123, {"version": 2}])
def test_unknown_dialogue_contract_is_rejected(contract):
    lesson = valid_lesson()
    lesson["dialogue_contract"] = contract
    assert "dialogue-contract" in {issue.code for issue in validate_stage(valid_stage([lesson]))}


def test_complete_stage_requires_every_lesson_to_migrate_but_incremental_accepts_v1():
    stage = valid_stage([valid_lesson(v2=True), valid_lesson("second-move")])
    stage.update(expected_chapters=1, expected_lessons=2)
    assert validate_stage(stage) == []
    issues = validate_stage(stage, require_complete=True)
    assert [issue.code for issue in issues] == ["dialogue-contract"]
    stage["chapters"][0]["lessons"][1] = valid_lesson("second-move", v2=True)
    assert validate_stage(stage, require_complete=True) == []


def test_complete_other_stage_does_not_force_stage_04_migration():
    stage = valid_stage()
    stage.update(id="05", expected_chapters=1, expected_lessons=1)
    assert validate_stage(stage, require_complete=True) == []


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
            lambda lesson: lesson["parts"][0]["turns"][0].update(line="word " * 70),
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


def test_validate_stage_rejects_dialogue_that_gives_the_child_too_few_words():
    stage = valid_stage()
    lesson = stage["chapters"][0]["lessons"][0]
    for part in lesson["parts"]:
        for turn in part["turns"]:
            if turn["speaker"] == "child":
                turn["line"] = "Yes."
    lesson["parts"][0]["turns"][0]["line"] += (
        " Please look carefully because both choices are here on the table."
    )

    assert "child-word-budget" in {
        issue.code for issue in validate_stage(stage)
    }


def test_complete_validation_enforces_counts_and_family_partner_ratio():
    issues = validate_stage(valid_stage(), require_complete=True)

    assert {issue.code for issue in issues} == {
        "chapter-count",
        "lesson-count",
        "dialogue-contract",
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


def test_chapter_1_builds_requests_through_recycled_moves():
    chapter = load_stage(CURRICULUM_ROOT, "04")["chapters"][0]
    lessons = chapter["lessons"]

    assert chapter["id"] == "01-choosing-requests"
    assert [lesson["id"] for lesson in lessons] == [
        "01-request-an-item",
        "02-specify-a-choice",
        "03-change-a-choice",
    ]
    assert [lesson["conversation_move"]["id"] for lesson in lessons] == [
        "request-item",
        "specify-choice",
        "change-choice",
    ]
    assert [lesson["roles"][1] for lesson in lessons] == ["mom", "dad", "mom"]
    assert lessons[0]["recycle"] == []
    assert lessons[1]["recycle"] == ["request-item"]
    assert lessons[2]["recycle"] == ["request-item", "specify-choice"]
    assert all([part["id"] for part in lesson["parts"]] == ["A", "B", "C"] for lesson in lessons)
    assert validate_stage(load_stage(CURRICULUM_ROOT, "04")) == []


def test_chapter_2_ends_each_negotiation_with_an_agreed_action():
    chapter = load_stage(CURRICULUM_ROOT, "04")["chapters"][1]
    lessons = chapter["lessons"]

    assert chapter["id"] == "02-refusal-negotiation"
    assert [lesson["id"] for lesson in lessons] == [
        "01-not-ready-yet",
        "02-ask-for-time",
        "03-propose-an-order",
    ]
    assert [lesson["conversation_move"]["id"] for lesson in lessons] == [
        "delay-boundary",
        "request-time",
        "propose-order",
    ]
    assert [lesson["roles"][1] for lesson in lessons] == ["dad", "mom", "dad"]
    assert lessons[0]["recycle"] == ["specify-choice"]
    assert lessons[1]["recycle"] == ["request-item"]
    assert lessons[2]["recycle"] == ["change-choice"]
    assert all(lesson["parts"][-1]["beat"] == "resolve" for lesson in lessons)
    assert all(
        any(turn["kind"] == "action" for turn in lesson["parts"][-1]["turns"])
        for lesson in lessons
    )
    assert validate_stage(load_stage(CURRICULUM_ROOT, "04")) == []


def test_chapter_3_makes_help_and_repairs_change_the_outcome():
    chapter = load_stage(CURRICULUM_ROOT, "04")["chapters"][2]
    lessons = chapter["lessons"]

    assert chapter["id"] == "03-help-clarification"
    assert [lesson["id"] for lesson in lessons] == [
        "01-ask-for-help",
        "02-say-i-dont-understand",
        "03-correct-a-misunderstanding",
    ]
    assert [lesson["conversation_move"]["id"] for lesson in lessons] == [
        "request-help",
        "signal-nonunderstanding",
        "repair-meaning",
    ]
    assert [lesson["roles"][1] for lesson in lessons] == ["dad", "teacher", "mom"]
    assert lessons[0]["recycle"] == ["request-item", "propose-order"]
    assert lessons[1]["recycle"] == ["request-help"]
    assert lessons[2]["recycle"] == ["request-item", "specify-choice"]
    assert all(lesson["repair_response"] for lesson in lessons)
    assert all(
        any(
            turn["kind"] == "repair"
            for part in lesson["parts"]
            for turn in part["turns"]
        )
        for lesson in lessons
    )
    assert validate_stage(load_stage(CURRICULUM_ROOT, "04")) == []


def test_chapters_4_to_10_follow_the_approved_stage_outline():
    stage = load_stage(CURRICULUM_ROOT, "04")
    expected = {
        "04-body-needs": (
            ["01-hungry-or-thirsty", "02-request-a-pause", "03-say-what-hurts"],
            ["state-body-need", "request-a-pause", "describe-discomfort"],
            ["mom", "dad", "mom"],
        ),
        "05-routines-transitions": (
            ["01-first-then", "02-before-bed", "03-check-readiness"],
            ["sequence-actions", "request-before-boundary", "report-readiness"],
            ["dad", "mom", "dad"],
        ),
        "06-finding-belonging": (
            ["01-ask-where", "02-check-a-place", "03-say-whose"],
            ["ask-location", "check-location", "identify-belonging"],
            ["dad", "mom", "teacher"],
        ),
        "07-joining-cooperation": (
            ["01-join-play", "02-ask-for-a-turn", "03-plan-the-game"],
            ["join-play", "request-turn", "suggest-shared-play"],
            ["peer", "peer", "peer"],
        ),
        "08-feelings-repair": (
            ["01-feeling-and-reason", "02-ask-to-stop", "03-apologize-and-repair"],
            ["explain-feeling", "set-stop-boundary", "repair-relationship"],
            ["mom", "dad", "peer"],
        ),
        "09-outings-safety": (
            ["01-how-much-longer", "02-find-it-in-a-shop", "03-safe-adult-help"],
            ["ask-duration", "ask-shop-location", "seek-safe-adult-help"],
            ["dad", "mom", "mom"],
        ),
        "10-recounting-planning": (
            ["01-one-event-today", "02-first-and-then", "03-plan-tomorrow"],
            ["recount-one-event", "recount-two-events", "contribute-to-plan"],
            ["teacher", "dad", "mom"],
        ),
    }

    actual = {}
    for chapter in stage["chapters"][3:]:
        lessons = chapter["lessons"]
        actual[chapter["id"]] = (
            [lesson["id"] for lesson in lessons],
            [lesson["conversation_move"]["id"] for lesson in lessons],
            [lesson["roles"][1] for lesson in lessons],
        )

    assert actual == expected


def test_shop_search_ends_with_the_identified_item_taken_for_purchase():
    stage = load_stage(CURRICULUM_ROOT, "04")
    lesson = stage["chapters"][8]["lessons"][1]

    resolution = lesson["parts"][2]
    assert any(turn["kind"] == "action" for turn in resolution["turns"])
