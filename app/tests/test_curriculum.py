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


@pytest.mark.parametrize("lesson_id, partner, move", [
    ("01-request-an-item", "mom", "request-item"),
    ("02-specify-a-choice", "dad", "specify-choice"),
    ("03-change-a-choice", "mom", "change-choice"),
])
def test_chapter_1_meets_three_by_ten_authoring_contract(lesson_id, partner, move):
    chapter = load_stage(CURRICULUM_ROOT, "04")["chapters"][0]
    lesson = next(item for item in chapter["lessons"] if item["id"] == lesson_id)
    production_path = REPO_ROOT / "prompts/04" / chapter["id"] / lesson_id / "production.json"
    production = json.loads(production_path.read_text(encoding="utf-8"))
    turns = [turn for part in lesson["parts"] for turn in part["turns"]]
    child_turns = [turn for turn in turns if turn["speaker"] == "child"]

    checks = {
        "three-by-ten-v2 is required": lesson.get("dialogue_contract") == "three-by-ten-v2",
        "the chapter identity stays stable": chapter["id"] == "01-choosing-requests",
        "only Child and the assigned partner speak": lesson["roles"] == ["child", partner]
        and {turn["speaker"] for turn in turns} == {"child", partner},
        "the assigned move stays stable": lesson["conversation_move"]["id"] == move,
        "A/B/C preserve goal/change/resolve order": [
            (part["id"], part["beat"]) for part in lesson["parts"]
        ] == [("A", "goal"), ("B", "change"), ("C", "resolve")],
        "the lesson has 9-11 turns": 9 <= len(turns) <= 11,
        "Child has 4-5 turns": 4 <= len(child_turns) <= 5,
        "the lesson has 45-58 spoken words": 45 <= sum(len(turn["line"].split()) for turn in turns) <= 58,
        "Child has 18-28 spoken words": 18 <= sum(len(turn["line"].split()) for turn in child_turns) <= 28,
        "two complete Replay Cards remain": len(lesson["replay_cards"]) == 2
        and all(all(card.get(field) for field in ("title", "setting", "change", "challenge"))
                for card in lesson["replay_cards"]),
        "lesson and production are revision 2": lesson["content_revision"] == production["content_revision"] == 2,
        "the lesson remains language_reviewed": lesson["status"] == "language_reviewed",
        "all ten content reviews passed": all(lesson["reviews"].get(review) is True for review in (
            "motivation", "causality", "physical", "adult_behavior", "child_language",
            "knowledge_safety", "resolution", "replay_logic", "character_continuity", "emotion_stability",
        )),
        "production bounds the emotional performance": all(
            isinstance(production.get("emotion", {}).get(field), str)
            and production["emotion"][field].strip()
            for field in ("baseline", "allowed_shift", "forbidden")
        ),
        "production has exactly A/B/C": list(production["parts"]) == ["A", "B", "C"],
    }
    for part in lesson["parts"]:
        checks[f"Part {part['id']} has 3-4 turns"] = 3 <= len(part["turns"]) <= 4
        checks[f"Part {part['id']} has 12-20 spoken words"] = (
            12 <= sum(len(turn["line"].split()) for turn in part["turns"]) <= 20
        )
        checks[f"Part {part['id']} includes Child"] = any(
            turn["speaker"] == "child" for turn in part["turns"]
        )
    for before, after in (("A", "B"), ("B", "C")):
        checks[f"production preserves {before}/{after} continuity"] = (
            production["parts"][before]["end"] == production["parts"][after]["start"]
        )

    assert all(checks.values()), [requirement for requirement, passed in checks.items() if not passed]


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


@pytest.mark.parametrize("lesson_id, partner, move", [
    ("01-not-ready-yet", "dad", "delay-boundary"),
    ("02-ask-for-time", "mom", "request-time"),
    ("03-propose-an-order", "dad", "propose-order"),
])
def test_chapter_2_meets_three_by_ten_negotiation_contract(lesson_id, partner, move):
    chapter = load_stage(CURRICULUM_ROOT, "04")["chapters"][1]
    lesson = next(item for item in chapter["lessons"] if item["id"] == lesson_id)
    production_path = REPO_ROOT / "prompts/04" / chapter["id"] / lesson_id / "production.json"
    production = json.loads(production_path.read_text(encoding="utf-8"))
    turns = [turn for part in lesson["parts"] for turn in part["turns"]]
    child_turns = [turn for turn in turns if turn["speaker"] == "child"]

    checks = {
        "the lesson has 9-11 turns": 9 <= len(turns) <= 11,
        "three-by-ten-v2 is required": lesson.get("dialogue_contract") == "three-by-ten-v2",
        "the chapter identity stays stable": chapter["id"] == "02-refusal-negotiation",
        "only Child and the assigned partner speak": lesson["roles"] == ["child", partner]
        and {turn["speaker"] for turn in turns} == {"child", partner},
        "the assigned move stays stable": lesson["conversation_move"]["id"] == move,
        "A/B/C preserve goal/change/resolve order": [
            (part["id"], part["beat"]) for part in lesson["parts"]
        ] == [("A", "goal"), ("B", "change"), ("C", "resolve")],
        "Child has 4-5 turns": 4 <= len(child_turns) <= 5,
        "the lesson has 45-58 spoken words": 45 <= sum(len(turn["line"].split()) for turn in turns) <= 58,
        "Child has 18-28 spoken words": 18 <= sum(len(turn["line"].split()) for turn in child_turns) <= 28,
        "one essential prop group": len(lesson["essential_props"]) <= 1,
        "two complete Replay Cards remain": len(lesson["replay_cards"]) == 2
        and all(all(card.get(field) for field in ("title", "setting", "change", "challenge"))
                for card in lesson["replay_cards"]),
        "lesson and production are revision 2": lesson["content_revision"] == production["content_revision"] == 2,
        "the lesson remains language_reviewed": lesson["status"] == "language_reviewed",
        "all ten content reviews passed": all(lesson["reviews"].get(review) is True for review in (
            "motivation", "causality", "physical", "adult_behavior", "child_language",
            "knowledge_safety", "resolution", "replay_logic", "character_continuity", "emotion_stability",
        )),
        "production bounds calm disagreement": all(
            isinstance(production.get("emotion", {}).get(field), str)
            and production["emotion"][field].strip()
            for field in ("baseline", "allowed_shift", "forbidden")
        ),
        "Part C has a spoken action by Child": any(
            turn["speaker"] == "child" and turn["kind"] == "action" and turn["line"].strip()
            for turn in lesson["parts"][-1]["turns"]
        ),
        "production has exactly A/B/C": list(production["parts"]) == ["A", "B", "C"],
    }
    for part in lesson["parts"]:
        checks[f"Part {part['id']} has 3-4 turns"] = 3 <= len(part["turns"]) <= 4
        checks[f"Part {part['id']} has 12-20 spoken words"] = (
            12 <= sum(len(turn["line"].split()) for turn in part["turns"]) <= 20
        )
        checks[f"Part {part['id']} includes Child"] = any(
            turn["speaker"] == "child" for turn in part["turns"]
        )
    for before, after in (("A", "B"), ("B", "C")):
        checks[f"production preserves {before}/{after} continuity"] = (
            production["parts"][before]["end"] == production["parts"][after]["start"]
        )

    assert all(checks.values()), [requirement for requirement, passed in checks.items() if not passed]


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


@pytest.mark.parametrize("lesson_id, partner, move, repair_cue", [
    ("01-ask-for-help", "dad", "request-help", "Hold it here"),
    ("02-say-i-dont-understand", "teacher", "signal-nonunderstanding", "First clap, then tap"),
    ("03-correct-a-misunderstanding", "mom", "repair-meaning", "No, I mean the blue cup"),
])
def test_chapter_3_meets_three_by_ten_repair_contract(lesson_id, partner, move, repair_cue):
    chapter = load_stage(CURRICULUM_ROOT, "04")["chapters"][2]
    lesson = next(item for item in chapter["lessons"] if item["id"] == lesson_id)
    production_path = REPO_ROOT / "prompts/04" / chapter["id"] / lesson_id / "production.json"
    production = json.loads(production_path.read_text(encoding="utf-8"))
    turns = [turn for part in lesson["parts"] for turn in part["turns"]]
    child_turns = [turn for turn in turns if turn["speaker"] == "child"]

    checks = {
        "the lesson has 9-11 turns": 9 <= len(turns) <= 11,
        "three-by-ten-v2 is required": lesson.get("dialogue_contract") == "three-by-ten-v2",
        "the chapter identity stays stable": chapter["id"] == "03-help-clarification",
        "only Child and the assigned partner speak": lesson["roles"] == ["child", partner]
        and {turn["speaker"] for turn in turns} == {"child", partner},
        "the assigned move stays stable": lesson["conversation_move"]["id"] == move,
        "A/B/C preserve goal/change/resolve order": [
            (part["id"], part["beat"]) for part in lesson["parts"]
        ] == [("A", "goal"), ("B", "change"), ("C", "resolve")],
        "Child has 4-5 turns": 4 <= len(child_turns) <= 5,
        "the lesson has 45-58 spoken words": 45 <= sum(len(turn["line"].split()) for turn in turns) <= 58,
        "Child has 18-28 spoken words": 18 <= sum(len(turn["line"].split()) for turn in child_turns) <= 28,
        "no more than one essential prop group": len(lesson["essential_props"]) <= 1,
        "two complete Replay Cards remain": len(lesson["replay_cards"]) == 2
        and all(all(card.get(field) for field in ("title", "setting", "change", "challenge"))
                for card in lesson["replay_cards"]),
        "lesson and production are revision 2": lesson["content_revision"] == production["content_revision"] == 2,
        "the lesson remains language_reviewed": lesson["status"] == "language_reviewed",
        "all ten content reviews passed": all(lesson["reviews"].get(review) is True for review in (
            "motivation", "causality", "physical", "adult_behavior", "child_language",
            "knowledge_safety", "resolution", "replay_logic", "character_continuity", "emotion_stability",
        )),
        "production bounds emotional performance": all(
            isinstance(production.get("emotion", {}).get(field), str)
            and production["emotion"][field].strip()
            for field in ("baseline", "allowed_shift", "forbidden")
        ),
        "Child supplies the missing help or meaning before the adult responds": any(
            turn["speaker"] == "child" and turn["kind"] == "repair"
            and repair_cue in turn["line"] and turns[index + 1]["speaker"] == partner
            for index, turn in enumerate(turns[:-1])
        ),
        "Part C includes the physical outcome": any(
            turn["kind"] == "action" for turn in lesson["parts"][-1]["turns"]
        ),
        "the clap-tap lesson needs no prop": partner != "teacher" or lesson["essential_props"] == [],
        "production has exactly A/B/C": list(production["parts"]) == ["A", "B", "C"],
    }
    for part in lesson["parts"]:
        checks[f"Part {part['id']} has 3-4 turns"] = 3 <= len(part["turns"]) <= 4
        checks[f"Part {part['id']} has 12-20 spoken words"] = (
            12 <= sum(len(turn["line"].split()) for turn in part["turns"]) <= 20
        )
        checks[f"Part {part['id']} includes Child"] = any(
            turn["speaker"] == "child" for turn in part["turns"]
        )
        exported = production_path.with_name(f"{part['id'].lower()}.txt").read_text(encoding="utf-8")
        checks[f"Part {part['id']} export is revision 2"] = "Content revision: 2\n" in exported
        expected_speech = "\n".join(f'{turn["speaker"].title()}: "{turn["line"]}"' for turn in part["turns"])
        checks[f"Part {part['id']} export preserves canonical speech"] = (
            exported.split("SPOKEN DIALOGUE (verbatim, in order):\n")[1].split("\n\n")[0]
            == expected_speech
        )
    for before, after in (("A", "B"), ("B", "C")):
        checks[f"production preserves {before}/{after} continuity"] = (
            production["parts"][before]["end"] == production["parts"][after]["start"]
        )

    assert all(checks.values()), [requirement for requirement, passed in checks.items() if not passed]


@pytest.mark.parametrize("lesson_id, partner, move, title", [
    ("01-hungry-or-thirsty", "mom", "state-body-need", "Water First"),
    ("02-request-a-pause", "dad", "request-a-pause", "Bathroom Break"),
    ("03-say-what-hurts", "mom", "describe-discomfort", "My Knee Hurts"),
])
def test_chapter_4_meets_three_by_ten_body_need_contract(lesson_id, partner, move, title):
    chapter = load_stage(CURRICULUM_ROOT, "04")["chapters"][3]
    lesson = next(item for item in chapter["lessons"] if item["id"] == lesson_id)
    production_path = REPO_ROOT / "prompts/04" / chapter["id"] / lesson_id / "production.json"
    production = json.loads(production_path.read_text(encoding="utf-8"))
    turns = [turn for part in lesson["parts"] for turn in part["turns"]]
    child_turns = [turn for turn in turns if turn["speaker"] == "child"]

    checks = {
        "the lesson has 9-11 turns": 9 <= len(turns) <= 11,
        "three-by-ten-v2 is required": lesson.get("dialogue_contract") == "three-by-ten-v2",
        "the chapter identity stays stable": chapter["id"] == "04-body-needs",
        "the scene matches the assigned body need": lesson["title"] == title,
        "only Child and the assigned partner speak": lesson["roles"] == ["child", partner]
        and {turn["speaker"] for turn in turns} == {"child", partner},
        "the assigned move stays stable": lesson["conversation_move"]["id"] == move,
        "A/B/C preserve goal/change/resolve order": [
            (part["id"], part["beat"]) for part in lesson["parts"]
        ] == [("A", "goal"), ("B", "change"), ("C", "resolve")],
        "Child has 4-5 turns": 4 <= len(child_turns) <= 5,
        "the lesson has 45-58 spoken words": 45 <= sum(len(turn["line"].split()) for turn in turns) <= 58,
        "Child has 18-28 spoken words": 18 <= sum(len(turn["line"].split()) for turn in child_turns) <= 28,
        "no more than one essential prop group": len(lesson["essential_props"]) <= 1,
        "two complete Replay Cards remain": len(lesson["replay_cards"]) == 2
        and all(all(card.get(field) for field in ("title", "setting", "change", "challenge"))
                for card in lesson["replay_cards"]),
        "lesson and production are revision 2": lesson["content_revision"] == production["content_revision"] == 2,
        "the lesson remains language_reviewed": lesson["status"] == "language_reviewed",
        "all ten content reviews passed": all(lesson["reviews"].get(review) is True for review in (
            "motivation", "causality", "physical", "adult_behavior", "child_language",
            "knowledge_safety", "resolution", "replay_logic", "character_continuity", "emotion_stability",
        )),
        "production bounds emotional performance": all(
            isinstance(production.get("emotion", {}).get(field), str)
            and production["emotion"][field].strip()
            for field in ("baseline", "allowed_shift", "forbidden")
        ),
        "Part C includes the physical outcome": any(
            turn["kind"] == "action" for turn in lesson["parts"][-1]["turns"]
        ),
        "production has exactly A/B/C": list(production["parts"]) == ["A", "B", "C"],
    }
    for part in lesson["parts"]:
        checks[f"Part {part['id']} has 3-4 turns"] = 3 <= len(part["turns"]) <= 4
        checks[f"Part {part['id']} has 12-20 spoken words"] = (
            12 <= sum(len(turn["line"].split()) for turn in part["turns"]) <= 20
        )
        checks[f"Part {part['id']} includes Child"] = any(
            turn["speaker"] == "child" for turn in part["turns"]
        )
        exported = production_path.with_name(f"{part['id'].lower()}.txt").read_text(encoding="utf-8")
        checks[f"Part {part['id']} export is revision 2"] = "Content revision: 2\n" in exported
        expected_speech = "\n".join(f'{turn["speaker"].title()}: "{turn["line"]}"' for turn in part["turns"])
        checks[f"Part {part['id']} export preserves canonical speech"] = (
            exported.split("SPOKEN DIALOGUE (verbatim, in order):\n")[1].split("\n\n")[0]
            == expected_speech
        )
    for before, after in (("A", "B"), ("B", "C")):
        checks[f"production preserves {before}/{after} continuity"] = (
            production["parts"][before]["end"] == production["parts"][after]["start"]
        )

    assert all(checks.values()), [requirement for requirement, passed in checks.items() if not passed]


@pytest.mark.parametrize("lesson_id, signal, partner", [
    ("02-request-a-pause", "bathroom", "dad"),
    ("03-say-what-hurts", "hurts", "mom"),
])
def test_chapter_4_stops_activity_on_the_first_bathroom_or_pain_signal(lesson_id, signal, partner):
    lessons = load_stage(CURRICULUM_ROOT, "04")["chapters"][3]["lessons"]
    lesson = next(item for item in lessons if item["id"] == lesson_id)
    first_part = lesson["parts"][0]["turns"]
    signal_index = next(index for index, turn in enumerate(first_part)
                        if turn["speaker"] == "child" and signal in turn["line"].lower())

    # A request for more detail must never replace or precede the adult's stop.
    assert signal_index + 1 < len(first_part), "Immediate adult care must occur in Part A."
    response = first_part[signal_index + 1]
    assert response["speaker"] == partner
    assert response["kind"] == "action"
    assert "stopping now" in response["line"].lower()


def test_chapter_4_bathroom_departure_finishes_in_a_before_a_later_return():
    lesson_id = "02-request-a-pause"
    lesson = next(item for item in load_stage(CURRICULUM_ROOT, "04")["chapters"][3]["lessons"]
                  if item["id"] == lesson_id)
    production_path = REPO_ROOT / "prompts/04/04-body-needs" / lesson_id / "production.json"
    production = json.loads(production_path.read_text(encoding="utf-8"))

    assert "Child has left the room" in production["parts"]["A"]["end"], (
        "Finish departure in A; B/C must not stretch the walk across the same room."
    )
    opening = lesson["parts"][0]["turns"]
    assert opening[-2]["speaker"] == "child" and "come back" in opening[-2]["line"]
    assert opening[-1]["speaker"] == "dad", "Dad agrees while Child is already leaving."

    return_action = production["parts"]["B"]["action"]
    assert "time ellipsis" in return_action and "after the bathroom break" in return_action
    assert "both seated" in production["parts"]["B"]["end"]
    assert "both seated" in production["parts"]["C"]["start"]
    assert lesson["parts"][2]["turns"][0]["speaker"] == "child"
    assert lesson["parts"][2]["turns"][0]["line"].startswith("Yes."), (
        "Only a ready Child resumes the saved game after returning."
    )


@pytest.mark.parametrize("lesson_id, partner, move, title, revision", [
    ("01-first-then", "dad", "sequence-actions", "Shoes, Then Jacket", 3),
    ("02-before-bed", "mom", "request-before-boundary", "One Book Before Bed", 2),
    ("03-check-readiness", "dad", "report-readiness", "I Still Need My Bottle", 3),
])
def test_chapter_5_meets_three_by_ten_routine_contract(lesson_id, partner, move, title, revision):
    chapter = load_stage(CURRICULUM_ROOT, "04")["chapters"][4]
    lesson = next(item for item in chapter["lessons"] if item["id"] == lesson_id)
    production_path = REPO_ROOT / "prompts/04" / chapter["id"] / lesson_id / "production.json"
    production = json.loads(production_path.read_text(encoding="utf-8"))
    turns = [turn for part in lesson["parts"] for turn in part["turns"]]
    child_turns = [turn for turn in turns if turn["speaker"] == "child"]

    checks = {
        "the lesson has 9-11 turns": 9 <= len(turns) <= 11,
        "three-by-ten-v2 is required": lesson.get("dialogue_contract") == "three-by-ten-v2",
        "the chapter identity stays stable": chapter["id"] == "05-routines-transitions",
        "the scene matches the assigned routine": lesson["title"] == title,
        "only Child and the assigned partner speak": lesson["roles"] == ["child", partner]
        and {turn["speaker"] for turn in turns} == {"child", partner},
        "the assigned move stays stable": lesson["conversation_move"]["id"] == move,
        "A/B/C preserve goal/change/resolve order": [
            (part["id"], part["beat"]) for part in lesson["parts"]
        ] == [("A", "goal"), ("B", "change"), ("C", "resolve")],
        "Child has 4-5 turns": 4 <= len(child_turns) <= 5,
        "the lesson has 45-58 spoken words": 45 <= sum(len(turn["line"].split()) for turn in turns) <= 58,
        "Child has 18-28 spoken words": 18 <= sum(len(turn["line"].split()) for turn in child_turns) <= 28,
        "no more than one essential prop group": len(lesson["essential_props"]) <= 1,
        "two complete Replay Cards remain": len(lesson["replay_cards"]) == 2
        and all(all(card.get(field) for field in ("title", "setting", "change", "challenge"))
                for card in lesson["replay_cards"]),
        "lesson and production share the reviewed revision": (
            lesson["content_revision"] == production["content_revision"] == revision
        ),
        "the lesson remains language_reviewed": lesson["status"] == "language_reviewed",
        "all ten content reviews passed": all(lesson["reviews"].get(review) is True for review in (
            "motivation", "causality", "physical", "adult_behavior", "child_language",
            "knowledge_safety", "resolution", "replay_logic", "character_continuity", "emotion_stability",
        )),
        "production bounds emotional performance": all(
            isinstance(production.get("emotion", {}).get(field), str)
            and production["emotion"][field].strip()
            for field in ("baseline", "allowed_shift", "forbidden")
        ),
        "Part C includes the physical outcome": any(
            turn["kind"] == "action" for turn in lesson["parts"][-1]["turns"]
        ),
        "production has exactly A/B/C": list(production["parts"]) == ["A", "B", "C"],
    }
    for part in lesson["parts"]:
        checks[f"Part {part['id']} has 3-4 turns"] = 3 <= len(part["turns"]) <= 4
        checks[f"Part {part['id']} has 12-20 spoken words"] = (
            12 <= sum(len(turn["line"].split()) for turn in part["turns"]) <= 20
        )
        checks[f"Part {part['id']} includes Child"] = any(
            turn["speaker"] == "child" for turn in part["turns"]
        )
        exported = production_path.with_name(f"{part['id'].lower()}.txt").read_text(encoding="utf-8")
        checks[f"Part {part['id']} export matches the reviewed revision"] = (
            f"Content revision: {revision}\n" in exported
        )
        expected_speech = "\n".join(f'{turn["speaker"].title()}: "{turn["line"]}"' for turn in part["turns"])
        checks[f"Part {part['id']} export preserves canonical speech"] = (
            exported.split("SPOKEN DIALOGUE (verbatim, in order):\n")[1].split("\n\n")[0]
            == expected_speech
        )
    for before, after in (("A", "B"), ("B", "C")):
        checks[f"production preserves {before}/{after} continuity"] = (
            production["parts"][before]["end"] == production["parts"][after]["start"]
        )

    assert all(checks.values()), [requirement for requirement, passed in checks.items() if not passed]


def test_chapter_5_sequences_visible_clothing_before_reporting_ready():
    lesson = load_stage(CURRICULUM_ROOT, "04")["chapters"][4]["lessons"][0]
    sequence = next(turn["line"].lower() for turn in lesson["parts"][0]["turns"]
                    if turn["speaker"] == "child")

    assert sequence.index("first") < sequence.index("shoes") < sequence.index("then")
    assert "jacket" in sequence.split("then", 1)[1]
    resolution = lesson["parts"][2]["turns"]
    assert any(turn["speaker"] == "dad" and "shoes on" in turn["line"].lower()
               for turn in resolution[:-1])
    assert resolution[-1]["speaker"] == "child" and resolution[-1]["kind"] == "action"
    assert "ready" in resolution[-1]["line"].lower()


def test_chapter_5_finishes_the_agreed_story_before_lights_out():
    lesson = load_stage(CURRICULUM_ROOT, "04")["chapters"][4]["lessons"][1]
    opening = lesson["parts"][0]["turns"]
    assert opening[0]["speaker"] == "mom"
    assert "one story" in opening[0]["line"].lower() and "lights out" in opening[0]["line"].lower()
    assert any(turn["speaker"] == "child" and "bear book" in turn["line"].lower()
               for turn in opening)

    resolution = lesson["parts"][2]["turns"]
    assert "end" in resolution[0]["line"].lower() and "lights out" in resolution[0]["line"].lower()
    assert resolution[1]["speaker"] == "child" and resolution[1]["line"].startswith("Yes.")
    assert resolution[-1]["speaker"] == "mom" and resolution[-1]["kind"] == "action"
    production = json.loads((REPO_ROOT / "prompts/04/05-routines-transitions/02-before-bed/production.json")
                            .read_text(encoding="utf-8"))
    assert "time ellipsis" in production["parts"]["C"]["action"]
    assert "lamp is off" in production["parts"]["C"]["end"]


def test_chapter_5_packs_the_missing_bottle_before_confirming_readiness():
    lesson = load_stage(CURRICULUM_ROOT, "04")["chapters"][4]["lessons"][2]
    opening = lesson["parts"][0]["turns"]
    assert "ready" in opening[0]["line"].lower()
    assert any(turn["speaker"] == "child" and "still need my water bottle" in turn["line"].lower()
               for turn in opening)
    middle = lesson["parts"][1]["turns"]
    assert any(turn["speaker"] == "dad" and "table" in turn["line"].lower() for turn in middle)
    resolution = lesson["parts"][2]["turns"]
    assert any(turn["speaker"] == "child" and turn["kind"] == "action" and "put it in" in turn["line"].lower()
               for turn in resolution[:-1])
    assert resolution[-1]["speaker"] == "child" and "ready now" in resolution[-1]["line"].lower()


@pytest.mark.parametrize("lesson_id, card_title, mistake, repair, outcome", [
    (
        "01-first-then", "Pajamas and teeth", "mishears the order",
        "No, pajamas first. Teeth come next.", "then helps with brushing",
    ),
    (
        "03-check-readiness", "Missing sun hat", "mistakenly assumes",
        "Wait, not yet. I still need my hat.", "put on the hat",
    ),
])
def test_chapter_5_replay_repairs_correct_an_adult_misunderstanding(lesson_id, card_title, mistake, repair, outcome):
    lessons = load_stage(CURRICULUM_ROOT, "04")["chapters"][4]["lessons"]
    lesson = next(item for item in lessons if item["id"] == lesson_id)
    card = next(item for item in lesson["replay_cards"] if item["title"] == card_title)
    help_turns = [turn for part in lesson["parts"] for turn in part["turns"]
                  if turn["speaker"] == "child" and turn["line"] == "Can you help me?"]

    checks = {
        "ordinary help extends the routine rather than claiming a repair": bool(help_turns)
        and all(turn["kind"] == "stretch" for turn in help_turns),
        "the Replay Card establishes an adult misunderstanding": mistake in card["change"].lower(),
        "the child explicitly corrects that misunderstanding": f'"{repair}"' in card["challenge"],
        "the repair example is the actual corrective reply": lesson["repair_response"] == repair,
        "the stretch example is practiced in the same complete card": (
            f'"{lesson["stretch_response"]}"' in card["challenge"]
        ),
        "the corrected plan leads to a physical outcome": outcome in card["challenge"].lower(),
        "the card retains all required context": all(card.get(field) for field in (
            "title", "setting", "change", "challenge",
        )),
    }
    assert all(checks.values()), [requirement for requirement, passed in checks.items() if not passed]


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
