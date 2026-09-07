"""Prompt exports must preserve canonical speech and reject stale staging."""
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "tools" / "build_video_prompts.py"


def renderer():
    assert SCRIPT.is_file(), "The canonical prompt renderer is missing"
    spec = importlib.util.spec_from_file_location("video_prompts", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def source():
    lesson = {
        "title": "Please help", "content_revision": 1, "roles": ["child", "mom"],
        "setting": "At home.", "essential_props": ["a box"],
        "parts": [
            {"id": "A", "beat": "goal", "turns": [{"speaker": "child", "line": "Can you help me?"}]},
            {"id": "B", "beat": "change", "turns": [{"speaker": "mom", "line": "The lid is stuck."}]},
            {"id": "C", "beat": "resolve", "turns": [{"speaker": "child", "line": "Thank you, Mom!"}]},
        ],
    }
    production = {"content_revision": 1, "scene": "Mom left, Child right, box between them.", "parts": {
        "A": {"start": "Lid closed.", "action": "Child reaches for the lid.", "end": "Child holds lid."},
        "B": {"start": "Child holds lid.", "action": "Mom loosens the lid.", "end": "Lid loose."},
        "C": {"start": "Lid loose.", "action": "Child opens it.", "end": "Lid open."},
    }}
    return lesson, production


@pytest.fixture
def v2_source(source):
    lesson, production = source
    lesson["dialogue_contract"] = "three-by-ten-v2"
    for part in lesson["parts"]:
        part["turns"] = [
            {"speaker": "mom", "line": "Would you like some help?"},
            {"speaker": "child", "line": "Yes, please help me, Mom."},
            {"speaker": "mom", "line": "Let us open it together."},
        ]
    production["emotion"] = {
        "baseline": "Calm, warm and regulated baseline.",
        "allowed_shift": "Brief mild puzzlement, then quiet relief.",
        "forbidden": "No crying or forceful lid pulling.",
    }
    return lesson, production


def test_exports_exact_lines_in_their_own_parts_with_only_the_used_cast(source):
    result = renderer().render_prompts(*source, "curriculum/04/01-test/01-help/lesson.json")
    assert list(result) == ["a", "b", "c"]
    expected = {'a': 'Child: "Can you help me?"', 'b': 'Mom: "The lid is stuck."', 'c': 'Child: "Thank you, Mom!"'}
    for part, text in result.items():
        dialogue = text.split("SPOKEN DIALOGUE (verbatim, in order):\n")[1].split("\n\n")[0]
        assert dialogue == expected[part]
        assert "pink pig" in text and "tiger" in text
        assert "Dog Dad" not in text and "Rabbit Teacher" not in text and "Bear Peer" not in text
        assert "16:9" in text and "10 seconds" in text


def test_all_stage_prompts_restore_original_art_and_anatomy_but_keep_restrained_acting():
    original_style = (ROOT / "prompts/01-wants-requests/D1a.txt").read_text(encoding="utf-8").splitlines()[0]
    outputs = renderer().collect_outputs(ROOT, "04")
    assert len(outputs) == 90
    for path, text in outputs.items():
        assert original_style in text, path
        for feature in ("bright orange fur with bold black stripes", "big round sparkly eyes",
                        "chubby round cheeks", "tiny rounded ears", "short chubby toddler proportions"):
            assert feature in text, (path, feature)
        if "Dog Dad —" in text:
            for feature in ("warm tan-brown fur", "big floppy droopy ears", "soft round snout", "gentle tired-but-loving eyes"):
                assert feature in text, (path, feature)
        assert "bouncy playful energy" not in text and "tail wags when excited" not in text
        assert "expressive but restrained faces" in text
        assert "No screaming, extreme excitement, rage, distorted facial or body shapes, frantic gestures or uncontrolled running." in text
        production = json.loads((path.parent / "production.json").read_text(encoding="utf-8"))
        for direction in production["emotion"].values():
            assert direction in text, path


@pytest.mark.parametrize("mutation, message", [
    (lambda l, p: p.update(content_revision=0), "revision"),
    (lambda l, p: p.update(content_revision=True), "revision"),
    (lambda l, p: p.update(content_revision=1.0), "revision"),
    (lambda l, p: p["parts"].pop("C"), "A/B/C"),
    (lambda l, p: p["parts"].update(D=p["parts"]["A"]), "A/B/C"),
    (lambda l, p: p["parts"]["B"].update(start="A different scene."), "continuity"),
    (lambda l, p: p["parts"]["A"].update(action=""), "action"),
    (lambda l, p: l["parts"][0]["turns"][0].update(speaker="stranger"), "role"),
])
def test_rejects_incomplete_stale_or_inconsistent_staging(source, mutation, message):
    mutation(*source)
    with pytest.raises(ValueError, match=message):
        renderer().render_prompts(*source, "lesson.json")


@pytest.mark.parametrize("first_line_words", [1, 11])
def test_v2_rejects_parts_outside_twelve_to_twenty_words(v2_source, first_line_words):
    # Other two lines contribute 10 words: totals are 11 and 21.
    v2_source[0]["parts"][0]["turns"][0]["line"] = " ".join(["word"] * first_line_words)
    with pytest.raises(ValueError, match="part-word-budget"):
        renderer().render_prompts(*v2_source, "lesson.json")


@pytest.mark.parametrize("field", ["baseline", "allowed_shift", "forbidden"])
@pytest.mark.parametrize("value", [None, "", "   ", 1, {}])
def test_v2_requires_three_nonempty_emotion_strings(v2_source, field, value):
    v2_source[1]["emotion"][field] = value
    with pytest.raises(ValueError, match="production-emotion"):
        renderer().render_prompts(*v2_source, "lesson.json")


@pytest.mark.parametrize("emotion", [None, [], "calm"])
def test_v2_requires_emotion_object(v2_source, emotion):
    v2_source[1]["emotion"] = emotion
    with pytest.raises(ValueError, match="production-emotion"):
        renderer().render_prompts(*v2_source, "lesson.json")


def test_v2_renders_restrained_emotion_boy_cast_and_ten_second_limit(v2_source):
    for text in renderer().render_prompts(*v2_source, "lesson.json").values():
        assert "EMOTIONAL PERFORMANCE\n" in text
        for value in v2_source[1]["emotion"].values():
            assert value in text
        assert "No screaming, extreme excitement, rage, distorted facial or body shapes, frantic gestures or uncontrolled running." in text
        assert "The clip must fit about 10 seconds; shorten source dialogue before export rather than rushing or extending the clip." in text
        assert "Fit this clip within about 10 seconds at a natural conversational pace. Use brief turn-taking pauses; never rush, omit, paraphrase or extend the clip." in text
        assert "four-year-old cartoon tiger boy" in text
        assert not re.search(r"\b(she|her|hers)\b", text, re.IGNORECASE)
        assert "12-15 seconds" not in text and "PACING REVIEW" not in text
        dialogue = text.split("SPOKEN DIALOGUE (verbatim, in order):\n")[1].split("\n\n")[0]
        assert dialogue == 'Mom: "Would you like some help?"\nChild: "Yes, please help me, Mom."\nMom: "Let us open it together."'


def test_rejects_unknown_nonempty_dialogue_contract_before_rendering(v2_source):
    lesson, production = v2_source
    lesson["dialogue_contract"] = "three-by-ten-v3"
    production["parts"]["A"]["action"] = "Child is raging throughout the scene."

    with pytest.raises(ValueError, match="dialogue-contract"):
        renderer().render_prompts(lesson, production, "lesson.json")


def test_empty_dialogue_contract_keeps_legacy_compatibility(source):
    source[0]["dialogue_contract"] = ""

    assert renderer().render_prompts(*source, "lesson.json")


@pytest.mark.parametrize("positive_direction", [
    "Child screams while reaching for the box.",
    "Child shows extreme excitement and jumps in place.",
    "Mom gives Child a distorted shocked face.",
    "Child looks excited.",
    "Mom looks shocked by the request.",
    "Child looks angry.",
    "No props move while Child screams.",
    "Child does not touch the box and screams.",
    "Child never looks away and extends the clip.",
    "Child does not touch the box, then screams.",
    "Child does not touch the box as he screams.",
    "Child does not touch the box because he screams.",
    "Child looks excited while Mom briefly smiles.",
    "Child briefly waves and looks excited.",
    "Child briefly touches the cup, looking excited.",
    "Child does not touch the box before screaming.",
    "Child does not move as screaming begins.",
    "No props move, screaming begins.",
    "No props shift, extreme excitement follows.",
    "No loud noise, screaming begins.",
    "No exaggerated surprise, screaming suddenly begins.",
    "No exaggerated surprise, screaming fills the room.",
    "No shouting, extreme excitement immediately follows.",
    "No exaggerated surprise, screaming will fill the room.",
    "No shouting, extreme excitement can follow.",
    "Do not stop screaming.",
    "Never avoid screaming.",
    "Child does not stop screaming.",
    "No screaming is allowed, frantic gestures are encouraged.",
    "Child is raging throughout the scene.",
    "Extend the clip so every action fits.",
    "Allow 12-15 seconds for the final action.",
])
def test_v2_rejects_unsafe_requested_positive_directions(v2_source, positive_direction):
    v2_source[1]["parts"]["A"]["action"] = positive_direction

    with pytest.raises(ValueError, match="unsafe-positive-direction"):
        renderer().render_prompts(*v2_source, "lesson.json")


@pytest.mark.parametrize("negative_direction", [
    "Child stays calm. Never scream or extend the clip.",
    "Never scream and extend the clip.",
    "Do not scream and distort the face.",
    "No exaggerated surprise, wide-eyed shock or screaming.",
    "No exaggerated surprise, screaming is forbidden.",
    "No exaggerated surprise, screaming is not allowed.",
    "No exaggerated surprise, screaming does not occur.",
    "No screaming, rage, frantic gestures, or distorted faces.",
    "No screaming is allowed, frantic gestures are prohibited.",
    "No screaming is allowed, frantic gestures are not allowed.",
])
def test_v2_allows_negative_safety_prohibitions_and_never_extend(
    v2_source, negative_direction
):
    v2_source[1]["parts"]["A"]["action"] = negative_direction
    v2_source[1]["emotion"]["allowed_shift"] = (
        "Brief mild excitement may show as one small smile."
    )
    v2_source[1]["emotion"]["forbidden"] = (
        "No screaming, extreme excitement, rage, distorted faces or frantic gestures."
    )

    assert renderer().render_prompts(*v2_source, "lesson.json")


def test_v2_allows_emotion_bounded_after_the_adjective(v2_source):
    v2_source[1]["emotion"]["allowed_shift"] = (
        "Child looks excited only briefly."
    )

    assert renderer().render_prompts(*v2_source, "lesson.json")


def test_v2_rejects_positive_unsafe_direction_mislabeled_as_forbidden(v2_source):
    v2_source[1]["emotion"]["forbidden"] = (
        "Child screams with extreme excitement."
    )

    with pytest.raises(ValueError, match="unsafe-positive-direction"):
        renderer().render_prompts(*v2_source, "lesson.json")


def test_v2_rejects_unsafe_positive_direction_in_lesson_setting(v2_source):
    v2_source[0]["setting"] = "At home. Child screams."

    with pytest.raises(ValueError, match="unsafe-positive-direction"):
        renderer().render_prompts(*v2_source, "lesson.json")


@pytest.mark.parametrize(("description", "expected"), [
    ("Child gets dressed beside Mom.", False),
    ("Child wears a dress shirt.", False),
    ("Never put a dress on Child.", False),
    ("Mom wears a skirt while Child waits.", False),
    ("Child helps Mom fold her dress.", False),
    ("Child is next to Mom, who is in a dress.", False),
    ("Child puts Mom's red dress on the table.", False),
    ("Child wears a red shirt beside Mom's pretty dress.", False),
    ("Child places Mom's pretty dress on the chair.", False),
    ("Child wears red shorts, Mom holds her blue dress.", False),
    ("Child wears red shorts, and Mom holds her blue dress.", False),
    ("Child wears red shorts, Mom folds her dress.", False),
    ("Child wears a dress for the scene.", True),
    ("Child will wear a dress.", True),
    ("Child wears a red dress.", True),
    ("Child will be wearing a blue dress.", True),
    ("Child wears dresses.", True),
    ("Child will don a dress.", True),
    ("Child wears a pretty dress.", True),
    ("Child wears a sparkly dress.", True),
    ("Child wears a polka-dot dress.", True),
    ("Child changes into a new skirt.", True),
    ("Child wears a red and blue dress.", True),
    ("Child wears a red or blue dress.", True),
    ("Child wears a red, white, and blue dress.", True),
    ("Child is put in a dress.", True),
    ("Child is being put in a dress.", True),
    ("Child is placed in a blue gown.", True),
    ("Child is dressed in a skirt.", True),
    ("Child was being dressed in a skirt.", True),
    ("Child got put in a blue gown.", True),
    ("Child puts the skirt on.", True),
    ("Child gets dressed in a gown.", True),
    ("Put the blouse on Child.", True),
    ("Put the red skirt on Child.", True),
    ("Put Child in a red dress.", True),
    ("Mom puts Child in a red dress.", True),
    ("Mom places Child in the blue gown.", True),
    ("A blouse is placed on Child.", True),
])
def test_child_garment_scan_targets_only_child_assignments(description, expected):
    assert renderer().assigns_girl_specific_garment_to_child(description) is expected


def test_v2_rejects_girl_specific_garment_assigned_to_child(v2_source):
    v2_source[1]["scene"] += " Child will wear a dress."

    with pytest.raises(ValueError, match="child-garment-assignment"):
        renderer().render_prompts(*v2_source, "lesson.json")


def test_v2_tracks_child_he_pronoun_for_garment_assignment(v2_source):
    v2_source[1]["scene"] = "Child stands here. He wears a skirt."

    with pytest.raises(ValueError, match="child-garment-assignment"):
        renderer().render_prompts(*v2_source, "lesson.json")


@pytest.mark.parametrize("first_line_words", [2, 10])
def test_v2_word_boundaries_ignore_visual_prose(v2_source, first_line_words):
    v2_source[0]["parts"][0]["turns"][0]["line"] = " ".join(["word"] * first_line_words)
    v2_source[1]["scene"] = "scene " * 100
    text = renderer().render_prompts(*v2_source, "lesson.json")["a"]
    assert f"PACING ({first_line_words + 10} spoken words)" in text


def test_source_hash_changes_even_when_revision_was_not_bumped(source):
    module = renderer()
    first = module.render_prompts(*source, "lesson.json")["a"]
    source[0]["title"] = "Changed title"
    second = module.render_prompts(*source, "lesson.json")["a"]
    assert re.search(r"Source SHA256: (\w+)", first).group(1) != re.search(r"Source SHA256: (\w+)", second).group(1)


def test_cli_check_does_not_write_and_write_regenerates_only_derived_prompts(tmp_path, source):
    renderer()
    lesson_dir = tmp_path / "curriculum/04/01-test/01-help"
    prompt_dir = tmp_path / "prompts/04/01-test/01-help"
    lesson_dir.mkdir(parents=True)
    prompt_dir.mkdir(parents=True)
    (lesson_dir / "lesson.json").write_text(json.dumps(source[0]), encoding="utf-8")
    (prompt_dir / "production.json").write_text(json.dumps(source[1]), encoding="utf-8")
    unrelated = prompt_dir / "notes.txt"
    unrelated.write_text("keep me", encoding="utf-8")
    cmd = [sys.executable, str(SCRIPT), "--root", str(tmp_path), "--stage", "04"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    assert result.returncode == 1 and not (prompt_dir / "a.txt").exists()
    assert subprocess.run(cmd + ["--write"], capture_output=True).returncode == 0
    assert subprocess.run(cmd + ["--check"], capture_output=True).returncode == 0
    (prompt_dir / "a.txt").write_text("obsolete", encoding="utf-8")
    assert subprocess.run(cmd + ["--check"], capture_output=True).returncode == 1
    assert (prompt_dir / "a.txt").read_text() == "obsolete"
    assert unrelated.read_text() == "keep me"


def test_all_canonical_lessons_have_synced_three_part_exports():
    module = renderer()
    lessons = sorted((ROOT / "curriculum/04").glob("*/*/lesson.json"))
    productions = sorted((ROOT / "prompts/04").glob("*/*/production.json"))
    exported_prompts = sorted((ROOT / "prompts/04").glob("*/*/[abc].txt"))
    assert len(lessons) == 30
    assert len(productions) == 30
    assert len(exported_prompts) == 90
    for path in lessons:
        lesson = json.loads(path.read_text(encoding="utf-8"))
        folder = ROOT / "prompts" / path.parent.relative_to(ROOT / "curriculum")
        production = json.loads((folder / "production.json").read_text(encoding="utf-8"))
        contract = lesson["dialogue_contract"]
        assert contract in ("three-by-ten-v2", "continuous-dialogue-v1")
        assert production["content_revision"] == lesson["content_revision"]
        assert not module.assigns_girl_specific_garment_to_child(
            json.dumps((lesson, production), ensure_ascii=False)
        )
        rendered = module.render_prompts(lesson, production, path.relative_to(ROOT).as_posix())
        assert list(rendered) == ["a", "b", "c"]
        if contract == "continuous-dialogue-v1":
            turns = lesson["dialogue"]["turns"]
            clips = production["clips"]
            for index, (part, expected) in enumerate(rendered.items()):
                actual = (folder / f"{part}.txt").read_text(encoding="utf-8")
                assert actual == expected
                assert "12-15 seconds" not in actual
                assert "extend the clip rather than" not in actual.lower()
                clip_turns = [turns[i] for i in clips[index]["turns"]]
                dialogue = actual.split("SPOKEN DIALOGUE (verbatim, in order):\n")[1].split("\n\n")[0]
                assert dialogue.splitlines() == [f'{t["speaker"].title()}: "{t["line"]}"' for t in clip_turns]
        else:
            turns = [turn for part in lesson["parts"] for turn in part["turns"]]
            child_turns = [turn for turn in turns if turn["speaker"] == "child"]
            assert 9 <= len(turns) <= 11
            assert 4 <= len(child_turns) <= 5
            for part, expected in rendered.items():
                actual = (folder / f"{part}.txt").read_text(encoding="utf-8")
                assert actual == expected
                assert "12-15 seconds" not in actual
                assert "extend the clip rather than" not in actual.lower()
                part_turns = lesson["parts"]["abc".index(part)]["turns"]
                dialogue = actual.split("SPOKEN DIALOGUE (verbatim, in order):\n")[1].split("\n\n")[0]
                assert dialogue.splitlines() == [f'{t["speaker"].title()}: "{t["line"]}"' for t in part_turns]


def test_every_real_lesson_serves_all_three_prompts_to_the_detail_page(tmp_path, monkeypatch):
    import app as app_module
    from werkzeug.security import generate_password_hash

    users = tmp_path / "users.json"
    users.write_text(json.dumps({"prompt-reader": generate_password_hash("test-only-password")}), encoding="utf-8")
    monkeypatch.setattr(app_module, "USERS_FILE", users)
    monkeypatch.setattr(app_module, "CURRICULUM_ROOT", ROOT / "curriculum")
    monkeypatch.setattr(app_module, "CURRICULUM_STAGE", "04")
    monkeypatch.setattr(app_module, "PROMPTS_ROOT", ROOT / "prompts")
    client = app_module.app.test_client()
    assert client.post("/login", data={"username": "prompt-reader", "password": "test-only-password"}).status_code == 302
    for path in sorted((ROOT / "curriculum/04").glob("*/*/lesson.json")):
        chapter, lesson = path.parent.parent.name, path.parent.name
        response = client.get(f"/api/prompts/{chapter}/{lesson}")
        assert response.status_code == 200
        assert set(response.json) == {"a", "b", "c"}
        for part, text in response.json.items():
            source = (ROOT / "prompts/04" / chapter / lesson / f"{part}.txt").read_text(encoding="utf-8")
            assert text == source.splitlines()[0] + '\n\nVIDEO AND SOUND\n' + source.split('\n\nVIDEO AND SOUND\n', 1)[1]
            assert "Production prompt draft" not in text and "Source SHA256:" not in text
            assert text.strip()
