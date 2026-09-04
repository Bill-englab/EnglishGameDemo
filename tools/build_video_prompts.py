"""Render/check three-part prompt exports; dialogue comes only from curriculum.

Default is read-only. --write replaces only derived a/b/c.txt after validating
the entire selected stage. Visual staging is authored in production.json.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re


CAST = {
    "child": "Child — a four-year-old cartoon tiger, orange fur with black stripes, yellow T-shirt, short rounded toddler proportions; clear natural child voice.",
    "dad": "Dog Dad — a warm brown cartoon dog with large floppy ears, olive-green T-shirt, gentle natural adult male voice.",
    "mom": "Pig Mom — a pink pig with a coral cardigan over a cream top, gentle natural adult female voice.",
    "teacher": "Rabbit Teacher — a cream rabbit with upright ears and a lavender cardigan, calm natural adult voice.",
    "peer": "Bear Peer — the same small brown bear in a teal T-shirt in every peer lesson; age four, child-sized proportions and a distinct natural child voice, never an adult.",
}
PARTS = ("A", "B", "C")


def _required_text(value, name):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"missing or invalid {name}")
    return value


def render_prompts(lesson, production, source):
    """Return a/b/c text, rejecting stale revisions and discontinuous staging."""
    revision = lesson.get("content_revision")
    production_revision = production.get("content_revision")
    if type(revision) is not int or revision < 1 or type(production_revision) is not int or production_revision != revision:
        raise ValueError("production content_revision must match source revision")
    parts = lesson.get("parts", [])
    notes = production.get("parts", {})
    if [p.get("id") for p in parts] != list(PARTS) or set(notes) != set(PARTS):
        raise ValueError("exactly A/B/C parts in authored order are required")
    roles = lesson.get("roles", [])
    if len(roles) != 2 or len(set(roles)) != 2 or "child" not in roles or any(r not in CAST for r in roles):
        raise ValueError("exactly child and one known partner role are required")
    scene = _required_text(production.get("scene"), "scene")
    for i, part in enumerate(parts):
        visual = notes[part["id"]]
        for field in ("start", "action", "end"):
            _required_text(visual.get(field), f"{part['id']}.{field}")
        if i and visual["start"] != notes[PARTS[i - 1]]["end"]:
            raise ValueError(f"broken continuity before Part {part['id']}")
        if not part.get("turns"):
            raise ValueError("each part needs spoken turns")
        for turn in part["turns"]:
            if turn.get("speaker") not in roles:
                raise ValueError("spoken role not in lesson cast")
            _required_text(turn.get("line"), "dialogue line")

    digest = hashlib.sha256(json.dumps(lesson, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()
    cast = "\n".join(CAST[role] for role in roles)
    result = {}
    for part in parts:
        key = part["id"]
        visual = notes[key]
        word_count = sum(len(re.findall(r"\b[\w]+(?:['’-][\w]+)*\b", t["line"])) for t in part["turns"])
        pacing = (
            "PACING REVIEW: this part has more than 22 spoken words. Target about 10 seconds, "
            "but allow 12-15 seconds if a natural read needs it; never rush, omit or paraphrase dialogue."
            if word_count > 22 else
            "Target about 10 seconds. Speak clearly at an unhurried conversational pace with short turn-taking pauses. "
            "If a natural read does not fit, extend the clip rather than rush or omit words."
        )
        speech = "\n".join(f'{t["speaker"].title()}: "{t["line"]}"' for t in part["turns"])
        result[key.lower()] = f"""{lesson['title']} — Part {key} ({part['beat']})
Production prompt draft | Source: {source} | Content revision: {revision}
Source SHA256: {digest}
The source/revision above are production metadata, not spoken words or on-screen text.

VIDEO AND SOUND
Create one 16:9 animated clip for a preschool family role-play. Polished warm 3D family-animation style, soft pastel materials, warm light, expressive but restrained faces. A locked medium two-shot with both faces and task-relevant hands visible; use the scene-specific safe framing below when seats/props require it. No camera orbit, zoom, unrelated cutaways, montage, extra characters or extra voices. An explicit time ellipsis below is an allowed exception to continuous time. No music over speech, narrator, subtitles, captions, title cards or UI. A physical object label explicitly required by the scene is allowed. Clean natural English, exact speaker attribution, synchronized mouth movements; silent listener reacts without mouthing the other's line.

FIXED CAST (only these two)
{cast}

SETTING
{lesson['setting']}

SCENE AND PROP CONTINUITY
{scene}
Keep base character designs, garment identities, lighting, set and camera consistent across A/B/C; allow the explicitly scripted dressing or undressing actions. Track hands and props continuously through the scripted movements rather than freezing their positions. The START FRAME below specifies this segment's current state; do not reset to the scene's initial arrangement. If the generation workflow supports reference frames, reuse the established character references and the preceding segment's final frame; text instructions alone do not guarantee visual consistency.

START FRAME
{visual['start']}

ACTION AND REACTIONS
{visual['action']}

SPOKEN DIALOGUE (verbatim, in order):
{speech}

END FRAME
{visual['end']}
Leave a short natural settling beat, without adding speech. Do not repeat earlier segments' lines.

PACING ({word_count} spoken words)
{pacing}
Let simple gestures happen during speech; do not postpone all actions until after the final line. Keep emotionally important responses immediate. Review timing, lip-sync, physical continuity and child comfort before marking this lesson video_ready; this prompt is not a production approval.
"""
    return result


def collect_outputs(root, stage):
    if not re.fullmatch(r"[0-9]{2}", stage):
        raise ValueError("stage must be a two-digit ID")
    curriculum = root / "curriculum" / stage
    prompts = root / "prompts" / stage
    lessons = sorted(curriculum.glob("*/*/lesson.json"))
    if not lessons:
        raise ValueError("no canonical lessons found")
    output = {}
    for path in lessons:
        folder = prompts / path.parent.relative_to(curriculum)
        # Never follow a prompt-directory symlink outside the selected stage.
        if not folder.resolve().is_relative_to(prompts.resolve()):
            raise ValueError(f"prompt path escapes stage: {folder}")
        try:
            lesson = json.loads(path.read_text(encoding="utf-8"))
            production = json.loads((folder / "production.json").read_text(encoding="utf-8"))
            rendered = render_prompts(lesson, production, path.relative_to(root).as_posix())
        except (ValueError, OSError, KeyError, TypeError) as exc:
            raise ValueError(f"{path.relative_to(root)}: {exc}") from exc
        for part, text in rendered.items():
            target = folder / f"{part}.txt"
            if target.is_symlink():
                raise ValueError(f"refusing symlink output: {target}")
            output[target] = text
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--stage", default="04")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="regenerate derived a/b/c.txt only")
    mode.add_argument("--check", action="store_true", help="read-only synchronization check (default)")
    args = parser.parse_args()
    try:
        output = collect_outputs(args.root.resolve(), args.stage)
        mismatches = []
        for path, text in output.items():
            if args.write:
                path.write_text(text, encoding="utf-8", newline="\n")
            elif not path.is_file() or path.read_text(encoding="utf-8") != text:
                mismatches.append(path)
        for path in mismatches:
            print(f"MISSING OR STALE: {path}")
        if mismatches:
            return 1
        warned = [p for p, t in output.items() if "PACING REVIEW:" in t]
        print(f"{'Wrote' if args.write else 'Checked'} {len(output)} prompts / {len(output) // 3} lessons; {len(warned)} parts need pacing review.")
        for path in warned:
            print(f"PACING REVIEW: {path.relative_to(args.root.resolve()).as_posix()}")
        return 0
    except (ValueError, OSError) as exc:
        print(f"ERROR: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
