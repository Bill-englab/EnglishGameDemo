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


def test_long_part_gets_a_pacing_warning_without_deleting_words(source):
    source[0]["parts"][0]["turns"][0]["line"] = " ".join(["word"] * 27)
    text = renderer().render_prompts(*source, "lesson.json")["a"]
    assert "PACING REVIEW" in text and "12-15 seconds" in text
    assert 'Child: "' + " ".join(["word"] * 27) + '"' in text


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
    assert len(lessons) == 30
    for path in lessons:
        lesson = json.loads(path.read_text(encoding="utf-8"))
        folder = ROOT / "prompts" / path.parent.relative_to(ROOT / "curriculum")
        production = json.loads((folder / "production.json").read_text(encoding="utf-8"))
        rendered = module.render_prompts(lesson, production, path.relative_to(ROOT).as_posix())
        for part, expected in rendered.items():
            actual = (folder / f"{part}.txt").read_text(encoding="utf-8")
            assert actual == expected
            turns = lesson["parts"]["abc".index(part)]["turns"]
            dialogue = actual.split("SPOKEN DIALOGUE (verbatim, in order):\n")[1].split("\n\n")[0]
            assert dialogue.splitlines() == [f'{t["speaker"].title()}: "{t["line"]}"' for t in turns]


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
            assert text == (ROOT / "prompts/04" / chapter / lesson / f"{part}.txt").read_text(encoding="utf-8")
            assert text.strip()
