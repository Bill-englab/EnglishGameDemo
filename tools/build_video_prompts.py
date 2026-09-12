"""Render/check three-part prompt exports; dialogue comes only from curriculum.

Default is read-only. --write replaces only derived a/b/c.txt after validating
the entire selected stage. Visual staging is authored in production.json.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys


APP_ROOT = Path(__file__).resolve().parents[1] / "app"
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from curriculum import THREE_BY_TEN_CONTRACT, CONTINUOUS_DIALOGUE_CONTRACT, _dialogue_word_count


VISUAL_STYLE = (
    "Pixar-style 3D animated cartoon, soft warm lighting, cozy pastel color palette, cute, wholesome, family-friendly. "
    "Soft rounded character designs, expressive but restrained faces. "
    "Large round eyes and rounded cheeks describe fixed anatomy, not surprise or excitement; "
    "keep facial movements small and natural, following EMOTIONAL PERFORMANCE when provided."
)

CAST = {
    "child": "Child — a small four-year-old cartoon tiger boy, bright orange fur with bold black stripes, bright attentive eyes full of curiosity, chubby round cheeks, tiny rounded ears, wearing a little yellow T-shirt, short chubby toddler proportions; alert, clever and quick to smile, eyes tracking the conversation; clear natural child voice.",
    "dad": "Dog Dad — a young, friendly cartoon dog father, warm tan-brown fur, big soft floppy ears, bright round eyes with a lively spark, soft round snout, wearing an olive-green casual T-shirt; cheerful warm dad energy, warm natural adult male voice.",
    "mom": "Pig Mom — a young, pretty cartoon pig mother, soft rosy-pink fur, lighter blush on the cheeks, big warm round eyes with long lashes, small rounded snout, slim young-mother proportions, wearing a coral cardigan over a cream top; sweet gentle mom energy, warm natural adult female voice.",
    "teacher": "Rabbit Teacher — a cream rabbit with upright ears and a lavender cardigan, calm natural adult voice.",
    "peer": "Bear Peer — the same small brown bear in a teal T-shirt in every peer lesson; age four, child-sized proportions and a distinct natural child voice, never an adult.",
}
PARTS = ("A", "B", "C")
LEGACY_CHILD_CAST = "Child — a four-year-old cartoon tiger, orange fur with black stripes, yellow T-shirt, short rounded toddler proportions; clear natural child voice."

_NEGATIVE_DIRECTION = re.compile(
    r"\b(?:no|not|never|without|avoid|avoids|avoiding|forbid|forbids|forbidden|"
    r"prohibit|prohibits|prohibited|must\s+not|do\s+not|does\s+not|don't|doesn't|"
    r"cannot|can't|rather\s+than|instead\s+of)\b",
    re.IGNORECASE,
)
_DIRECTION_TARGET_NOUN = (
    r"(?:facial\s+or\s+body\s+shapes|faces?|shapes?|expressions?|features?|"
    r"gestures?|movements?|running|motion|search(?:es)?)"
)
_NEGATIVE_DIRECTION_SUFFIX = re.compile(
    rf"^\s+(?:{_DIRECTION_TARGET_NOUN}\s+)?(?:(?:is|are|was|were|stays?|remains?)\s+(?:strictly\s+)?"
    r"(?:forbidden|prohibited|not\s+allowed)|"
    r"(?:(?:do|does|did|is|are|was|were|has|have|had|will|would|can|could|"
    r"should|must|may|might)\s+)?(?:not|never)\b)",
    re.IGNORECASE,
)
_BOUNDED_EMOTION = re.compile(
    r"\b(?:brief|briefly|mild|mildly|small|quiet|quietly|restrained|ordinary|"
    r"slight|slightly|subtle|subtly|controlled|regulated|momentary|gentle|gently|"
    r"modest|low-key|normal-volume)\b",
    re.IGNORECASE,
)
_BOUNDED_EMOTION_SUFFIX = re.compile(
    r"^\s+(?:but\s+)?(?:only\s+)?(?:briefly|mildly|quietly|slightly|subtly|"
    r"gently|momentarily|brief|mild|quiet|restrained|controlled|regulated|"
    r"subtle|gentle|modest|low-key|normal-volume)\b",
    re.IGNORECASE,
)
_DIRECTION_SCOPE_BOUNDARY = re.compile(
    r"\b(?:but|while|although|however|yet|whereas|then|because|since|unless|"
    r"before|after|once|until|as)\b|"
    r"\b(?:and|when)\s+(?=(?:Child|Dad|Mom|Teacher|Peer|he|she|they|it)\b)|"
    r",\s*(?=(?:Child|Dad|Mom|Teacher|Peer|he|she|they|it)\b)",
    re.IGNORECASE,
)
_COORDINATION_BOUNDARY = re.compile(r",|\band\b", re.IGNORECASE)
_POSITIVE_CONTINUATION = re.compile(
    r"\b(?:not|never)\s+(?:stop|avoid)\s+$",
    re.IGNORECASE,
)
_COMPLETED_NO_PROHIBITION = re.compile(
    r"\b(?:is|are|was|were)\s+allowed\s*$",
    re.IGNORECASE,
)
_UNSAFE_DIRECTIONS = (
    re.compile(r"\bscream(?:s|ed|ing)?\b", re.IGNORECASE),
    re.compile(r"\bextreme(?:ly)?\s+excit(?:ement|ed)\b", re.IGNORECASE),
    re.compile(r"\brag(?:e(?:s|d)?|ing)\b", re.IGNORECASE),
    re.compile(r"\bdistort(?:s|ed|ing|ion|ions)?\b", re.IGNORECASE),
    re.compile(r"\bfrantic(?:ally)?\b", re.IGNORECASE),
    re.compile(r"\buncontrolled(?:\s+\w+){0,2}\s+(?:run|running|movement|motion)\b", re.IGNORECASE),
    re.compile(r"\bextend(?:s|ed|ing)?\s+the\s+clip\b", re.IGNORECASE),
    re.compile(r"\b12\s*[-–]\s*15\s+seconds\b", re.IGNORECASE),
)
_UNBOUNDED_EMOTIONS = re.compile(
    r"\b(?:excited|excitedly|excitement|shocked|shock|angry|anger)\b",
    re.IGNORECASE,
)
_PROHIBITED_LIST_LEAD = re.compile(
    r"\b(?:exaggerated|whining|shouting|theatrical|breathless|desperation|"
    r"screaming|nagging|frantic|impatience|accusation|automatic\s+agreement|"
    r"grabbing|instant\s+compliance|crying|separation|startled|excited|cheering|"
    r"dramatic|frightened|terrified|oversized|forced|visible|panic|alarm|loud|"
    r"dismissing|blame)\b",
    re.IGNORECASE,
)
_POSITIVE_EVENT_SUFFIX = re.compile(
    r"^\s+(?:(?:[A-Za-z][A-Za-z'’\-]*ly|always|often|sometimes|soon|now)\s+)*"
    r"(?!(?:facial|body|faces?|shapes?|expressions?|features?|gestures?|"
    r"movements?|running|motion)\b)"
    r"(?:(?:will|would|can|could|should|must|may|might)\s+"
    r"(?:(?:[A-Za-z][A-Za-z'’\-]*ly|always|often|sometimes|soon|now)\s+)*"
    r"[A-Za-z][A-Za-z'’\-]*|[A-Za-z][A-Za-z'’\-]*(?:s|ed)|is|was|has|does)\b",
    re.IGNORECASE,
)
_GIRL_SPECIFIC_GARMENT = r"(?:dress(?:es)?(?!\s+shirts?\b)|skirts?|blouses?|gowns?)"
_GARMENT_MODIFIER = (
    r"(?!(?:a|an|the|and|or|on|onto|in|into|beside|near|with|while|under|over|"
    r"by|for|to|from|of|child|dad|mom|teacher|peer|he|she|they|it)\b)"
    r"[A-Za-z][A-Za-z'’\-]*"
)
_GARMENT_PHRASE = (
    rf"(?:(?:a|an|the|his|her|their)\s+)?"
    rf"(?:(?:{_GARMENT_MODIFIER})"
    rf"(?:\s*,\s*(?:(?:and|or)\s+)?|\s+(?:(?:and|or)\s+)?)){{0,8}}"
    rf"{_GIRL_SPECIFIC_GARMENT}\b"
)
_CHILD_GIRL_GARMENT_PATTERNS = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        rf"\bChild\s+(?:(?:will|would|can|could|should|must)\s+)?"
        rf"(?:(?:is|was|be)\s+)?(?:wear(?:s|ing)?|wore|don(?:s|ned|ning)?)\s+"
        rf"{_GARMENT_PHRASE}",
        rf"\bChild\s+(?:(?:will|would|should|can|could|must)\s+be|is|was|"
        rf"remains?|stays?)\s+(?:dressed\s+)?in\s+{_GARMENT_PHRASE}",
        rf"\bChild\s+(?:(?:will|would|should|can|could|must)\s+be|is|are|was|were|"
        rf"gets?|got|has\s+been|had\s+been)\s+(?:being\s+)?"
        rf"(?:put|placed|dressed)\s+in\s+{_GARMENT_PHRASE}",
        rf"\bChild\s+(?:gets?|got|will\s+get)\s+dressed\s+in\s+{_GARMENT_PHRASE}",
        rf"\bChild\s+(?:changes?|changed|will\s+change)\s+into\s+{_GARMENT_PHRASE}",
        rf"\bChild\s+(?:puts?|pulls?|slips?)\s+{_GARMENT_PHRASE}\s+"
        rf"(?:on|onto)(?=\s*(?:himself\b|[.!?;]|$))",
        rf"\bChild\s+(?:puts?|pulls?|slips?)\s+on\s+{_GARMENT_PHRASE}",
        rf"\b(?:put|puts|place|places|placed|pull|pulls|slip|slips)\s+"
        rf"{_GARMENT_PHRASE}\s+(?:on|onto)\s+(?:the\s+)?Child\b",
        rf"\b{_GARMENT_PHRASE}\s+(?:is|was|gets?|will\s+be)\s+"
        rf"(?:put|placed|pulled|slipped)\s+(?:on|onto)\s+(?:the\s+)?Child\b",
        rf"\b{_GARMENT_PHRASE}\s+(?:is|was|will\s+be)\s+worn\s+by\s+"
        rf"(?:the\s+)?Child\b",
        rf"\b(?:dress|dresses|dressed|dressing)\s+(?:the\s+)?Child\s+in\s+"
        rf"{_GARMENT_PHRASE}",
        rf"\b(?:put(?:s|ting)?|place(?:s|d|ing)?|dress(?:es|ed|ing)?)\s+"
        rf"(?:the\s+)?Child\s+in\s+{_GARMENT_PHRASE}",
    )
)
_GARMENT_CLAUSE_BOUNDARY = re.compile(
    r",\s*(?:and\s+)?(?=(?:Child|Dad|Mom|Teacher|Peer|he|she|they|it)\b)",
    re.IGNORECASE,
)
_GARMENT_SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?])\s+")
_KNOWN_SUBJECT = re.compile(r"^\s*(Child|Dad|Mom|Teacher|Peer)\b", re.IGNORECASE)
_LEADING_HE = re.compile(r"^(\s*)He\b", re.IGNORECASE)
_NEGATED_GARMENT_ACTION = re.compile(
    r"\b(?:never|do\s+not|does\s+not|don't|doesn't)\s+$",
    re.IGNORECASE,
)


def _required_text(value, name):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"missing or invalid {name}")
    return value


def assigns_girl_specific_garment_to_child(text):
    """Return true only when a girl-specific garment is assigned to Child."""
    if not isinstance(text, str):
        return False
    antecedent = None
    for sentence in _GARMENT_SENTENCE_BOUNDARY.split(text):
        subject = _KNOWN_SUBJECT.match(sentence)
        if subject:
            antecedent = subject.group(1).lower()
        elif antecedent == "child" and _LEADING_HE.match(sentence):
            sentence = _LEADING_HE.sub(r"\1Child", sentence, count=1)
        clauses = _GARMENT_CLAUSE_BOUNDARY.split(sentence)
        for clause in clauses:
            for pattern in _CHILD_GIRL_GARMENT_PATTERNS:
                for match in pattern.finditer(clause):
                    if not _NEGATED_GARMENT_ACTION.search(clause[:match.start()]):
                        return True
    return False


def _text_values(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from _text_values(item)
    elif isinstance(value, (list, tuple)):
        for item in value:
            yield from _text_values(item)


def _direction_context(text, match):
    clause_start = max(text.rfind(mark, 0, match.start()) for mark in ".!?\n;") + 1
    following_stops = [
        position
        for mark in ".!?\n;"
        if (position := text.find(mark, match.end())) != -1
    ]
    clause_end = min(following_stops, default=len(text))
    before = text[clause_start:match.start()]
    boundaries = list(_DIRECTION_SCOPE_BOUNDARY.finditer(before))
    if boundaries:
        boundary = boundaries[-1]
        is_negative_comparison = (
            boundary.group(0).lower() == "as"
            and re.search(r"\bnot\s+as\s*$", before[:boundary.end()], re.IGNORECASE)
            and _UNBOUNDED_EMOTIONS.fullmatch(match.group(0))
        )
        if not is_negative_comparison:
            before = before[boundary.end():]
    coordinators = list(_COORDINATION_BOUNDARY.finditer(before))
    if coordinators:
        coordinator = coordinators[-1]
        prefix = before[:coordinator.start()]
        negatives = list(_NEGATIVE_DIRECTION.finditer(prefix))
        if not negatives:
            before = before[coordinator.end():]
        else:
            negative = negatives[-1]
            governed = prefix[negative.end():]
            has_unsafe_target = any(
                pattern.search(governed) for pattern in _UNSAFE_DIRECTIONS
            ) or _UNBOUNDED_EMOTIONS.search(governed)
            is_leading_no_list = (
                negative.group(0).lower() == "no"
                and not prefix[:negative.start()].strip()
                and _PROHIBITED_LIST_LEAD.search(governed)
            )
            completed_no_prohibition = (
                negative.group(0).lower() == "no"
                and _COMPLETED_NO_PROHIBITION.search(governed)
            )
            if completed_no_prohibition or (
                not has_unsafe_target and not is_leading_no_list
            ):
                before = before[coordinator.end():]
    return before, text[match.end():clause_end]


def _reject_unsafe_positive_direction(text, name):
    """Reject unsafe performance cues while permitting explicit prohibitions."""
    for pattern in _UNSAFE_DIRECTIONS:
        for match in pattern.finditer(text):
            before, after = _direction_context(text, match)
            requests_positive_continuation = _POSITIVE_CONTINUATION.search(before)
            positive_event_after_comma = (
                "," in before
                and _POSITIVE_EVENT_SUFFIX.search(after)
                and not _NEGATIVE_DIRECTION_SUFFIX.search(after)
            )
            if requests_positive_continuation or positive_event_after_comma or (
                not _NEGATIVE_DIRECTION.search(before)
                and not _NEGATIVE_DIRECTION_SUFFIX.search(after)
            ):
                raise ValueError(
                    f"unsafe-positive-direction: {name} requests {match.group(0)!r}"
                )
    for match in _UNBOUNDED_EMOTIONS.finditer(text):
        before, after = _direction_context(text, match)
        requests_positive_continuation = _POSITIVE_CONTINUATION.search(before)
        positive_event_after_comma = (
            "," in before
            and _POSITIVE_EVENT_SUFFIX.search(after)
            and not _NEGATIVE_DIRECTION_SUFFIX.search(after)
        )
        if (
            requests_positive_continuation
            or positive_event_after_comma
            or (
                not _NEGATIVE_DIRECTION.search(before)
                and not _NEGATIVE_DIRECTION_SUFFIX.search(after)
                and not _BOUNDED_EMOTION.search(before)
                and not _BOUNDED_EMOTION_SUFFIX.search(after)
            )
        ):
            raise ValueError(
                f"unsafe-positive-direction: {name} uses unbounded emotion {match.group(0)!r}"
            )


def _render_continuous(lesson, production, source):
    """Render three clip prompts for a continuous-dialogue-v1 lesson.

    The canonical lesson stores one uninterrupted ``dialogue.turns`` sequence;
    ``production.clips`` (exactly three) splits it into ~10s generation tasks by
    referencing turn indices. Keys stay ``a/b/c`` so the existing prompt files
    and the /api/prompts route keep working unchanged.
    """
    revision = lesson.get("content_revision")
    production_revision = production.get("content_revision")
    if type(revision) is not int or revision < 1 or type(production_revision) is not int or production_revision != revision:
        raise ValueError("production content_revision must match source revision")

    turns = lesson.get("dialogue", {}).get("turns", [])
    if not isinstance(turns, list) or not turns:
        raise ValueError("continuous dialogue needs at least one spoken turn")
    clips = production.get("clips")
    if not isinstance(clips, list) or len(clips) != 3:
        raise ValueError("exactly three clips are required")

    roles = lesson.get("roles", [])
    if len(roles) != 2 or len(set(roles)) != 2 or "child" not in roles or any(r not in CAST for r in roles):
        raise ValueError("exactly child and one known partner role are required")

    covered = []
    for index, clip in enumerate(clips):
        if not isinstance(clip, dict):
            raise ValueError(f"clip {index} must be an object")
        for field in ("start", "action", "end"):
            _required_text(clip.get(field), f"clip {index}.{field}")
        for turn_index in clip.get("turns", []):
            if not isinstance(turn_index, int) or not 0 <= turn_index < len(turns):
                raise ValueError(f"clip {index} turn index {turn_index} out of range")
            covered.append(turn_index)
    if covered != list(range(len(turns))):
        raise ValueError("clips must cover every turn exactly once, in order")

    for turn in turns:
        if turn.get("speaker") not in roles:
            raise ValueError("spoken role not in lesson cast")
        _required_text(turn.get("line"), "dialogue line")

    setting = _required_text(lesson.get("setting"), "setting")
    if any(
        assigns_girl_specific_garment_to_child(text)
        for text in _text_values((lesson, production))
    ):
        raise ValueError("child-garment-assignment: girl-specific garment assigned to Child")
    scene = _required_text(production.get("scene"), "scene")
    emotion = production.get("emotion")
    if not isinstance(emotion, dict):
        raise ValueError("production-emotion: emotion must be an object")
    emotion_lines = [
        _required_text(emotion.get(field), f"production-emotion.{field}")
        for field in ("baseline", "allowed_shift", "forbidden")
    ]
    _reject_unsafe_positive_direction(setting, "setting")
    _reject_unsafe_positive_direction(scene, "scene")
    for field, line in zip(("baseline", "allowed_shift", "forbidden"), emotion_lines):
        _reject_unsafe_positive_direction(line, f"emotion.{field}")
    emotion_block = "EMOTIONAL PERFORMANCE\n" + "\n".join(emotion_lines) + (
        "\nNo screaming, extreme excitement, rage, distorted facial or body shapes, frantic gestures or uncontrolled running.\n\n"
    )

    digest = hashlib.sha256(json.dumps(lesson, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()
    cast = "\n".join(CAST[role] for role in roles)

    result = {}
    for clip_index, clip in enumerate(clips):
        key = "abc"[clip_index]
        clip_turns = [turns[i] for i in clip["turns"]]
        word_count = sum(len(str(t["line"]).split()) for t in clip_turns)
        speech = "\n".join(f'{t["speaker"].title()}: "{t["line"]}"' for t in clip_turns)
        pacing = (
            "Fit this clip within about 10 seconds at a natural conversational pace. "
            "Use brief turn-taking pauses; never rush, omit, paraphrase or extend the clip."
        )
        result[key] = f"""{lesson['title']} — Clip {clip_index + 1}
Production prompt draft | Source: {source} | Content revision: {revision}
Source SHA256: {digest}
The source/revision above are production metadata, not spoken words or on-screen text.

VIDEO AND SOUND
Create one 16:9 animated clip for a preschool family role-play. {VISUAL_STYLE} A locked medium two-shot with both faces and task-relevant hands visible; use the scene-specific safe framing below when seats/props require it. No camera orbit, zoom, unrelated cutaways, montage, extra characters or extra voices. No music over speech, narrator, subtitles, captions, title cards or UI. A physical object label explicitly required by the scene is allowed. Clean natural English, exact speaker attribution, synchronized mouth movements; silent listener reacts without mouthing the other's line.

FIXED CAST (only these two)
{cast}

{emotion_block}SETTING
{setting}

SCENE AND PROP CONTINUITY
{scene}
Keep base character designs, garment identities, lighting, set and camera consistent across the three clips; allow the explicitly scripted dressing or undressing actions. Track hands and props continuously through the scripted movements rather than freezing their positions. The START FRAME below specifies this clip's current state; do not reset to the scene's initial arrangement. If the generation workflow supports reference frames, reuse the established character references and the preceding clip's final frame; text instructions alone do not guarantee visual consistency.

START FRAME
{clip['start']}

ACTION AND REACTIONS
{clip['action']}

SPOKEN DIALOGUE (verbatim, in order):
{speech}

END FRAME
{clip['end']}
Leave a short natural settling beat, without adding speech. Do not repeat earlier clips' lines.

PACING ({word_count} spoken words)
{pacing}
Let simple gestures happen during speech; do not postpone all actions until after the final line. Keep emotionally important responses immediate. Review timing, lip-sync, physical continuity and child comfort before marking this lesson video_ready; this prompt is not a production approval.
"""
    return result


def render_prompts(lesson, production, source):
    """Return a/b/c text, rejecting stale revisions and discontinuous staging."""
    dialogue_contract = lesson.get("dialogue_contract")
    if dialogue_contract == CONTINUOUS_DIALOGUE_CONTRACT:
        return _render_continuous(lesson, production, source)
    if dialogue_contract not in (None, "", THREE_BY_TEN_CONTRACT):
        raise ValueError(f"dialogue-contract: unsupported {dialogue_contract!r}")
    is_three_by_ten = dialogue_contract == THREE_BY_TEN_CONTRACT
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
    setting = _required_text(lesson.get("setting"), "setting")
    if is_three_by_ten and any(
        assigns_girl_specific_garment_to_child(text)
        for text in _text_values((lesson, production))
    ):
        raise ValueError("child-garment-assignment: girl-specific garment assigned to Child")
    scene = _required_text(production.get("scene"), "scene")
    emotion_block = ""
    if is_three_by_ten:
        emotion = production.get("emotion")
        if not isinstance(emotion, dict):
            raise ValueError("production-emotion: emotion must be an object")
        emotion_lines = [
            _required_text(emotion.get(field), f"production-emotion.{field}")
            for field in ("baseline", "allowed_shift", "forbidden")
        ]
        _reject_unsafe_positive_direction(setting, "setting")
        _reject_unsafe_positive_direction(scene, "scene")
        for field, line in zip(("baseline", "allowed_shift", "forbidden"), emotion_lines):
            _reject_unsafe_positive_direction(line, f"emotion.{field}")
        emotion_block = "EMOTIONAL PERFORMANCE\n" + "\n".join(emotion_lines) + (
            "\nNo screaming, extreme excitement, rage, distorted facial or body shapes, frantic gestures or uncontrolled running.\n\n"
        )
    for i, part in enumerate(parts):
        visual = notes[part["id"]]
        for field in ("start", "action", "end"):
            value = _required_text(visual.get(field), f"{part['id']}.{field}")
            if is_three_by_ten:
                _reject_unsafe_positive_direction(value, f"{part['id']}.{field}")
        if i and visual["start"] != notes[PARTS[i - 1]]["end"]:
            raise ValueError(f"broken continuity before Part {part['id']}")
        if not part.get("turns"):
            raise ValueError("each part needs spoken turns")
        for turn in part["turns"]:
            if turn.get("speaker") not in roles:
                raise ValueError("spoken role not in lesson cast")
            _required_text(turn.get("line"), "dialogue line")
        if is_three_by_ten and not 12 <= _dialogue_word_count([part]) <= 20:
            raise ValueError(f"part-word-budget: Part {part['id']} needs 12-20 spoken words; shorten or revise source dialogue before export")

    digest = hashlib.sha256(json.dumps(lesson, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()
    # Keep v1 exports stable until their lesson opts into the migration contract.
    cast = "\n".join(
        LEGACY_CHILD_CAST if role == "child" and not is_three_by_ten else CAST[role]
        for role in roles
    )
    result = {}
    for part in parts:
        key = part["id"]
        visual = notes[key]
        word_count = _dialogue_word_count([part]) if is_three_by_ten else sum(
            len(re.findall(r"\b[\w]+(?:['’-][\w]+)*\b", t["line"])) for t in part["turns"]
        )
        pacing = (
            "PACING REVIEW: this part has more than 22 spoken words. Target about 10 seconds, "
            "but allow 12-15 seconds if a natural read needs it; never rush, omit or paraphrase dialogue."
            if word_count > 22 else
            "Target about 10 seconds. Speak clearly at an unhurried conversational pace with short turn-taking pauses. "
            "If a natural read does not fit, extend the clip rather than rush or omit words."
        )
        if is_three_by_ten:
            pacing = (
                "Fit this clip within about 10 seconds at a natural conversational pace. "
                "Use brief turn-taking pauses; never rush, omit, paraphrase or extend the clip."
                "\nThe clip must fit about 10 seconds; shorten source dialogue before export rather than rushing or extending the clip."
            )
        speech = "\n".join(f'{t["speaker"].title()}: "{t["line"]}"' for t in part["turns"])
        result[key.lower()] = f"""{lesson['title']} — Part {key} ({part['beat']})
Production prompt draft | Source: {source} | Content revision: {revision}
Source SHA256: {digest}
The source/revision above are production metadata, not spoken words or on-screen text.

VIDEO AND SOUND
Create one 16:9 animated clip for a preschool family role-play. {VISUAL_STYLE} A locked medium two-shot with both faces and task-relevant hands visible; use the scene-specific safe framing below when seats/props require it. No camera orbit, zoom, unrelated cutaways, montage, extra characters or extra voices. An explicit time ellipsis below is an allowed exception to continuous time. No music over speech, narrator, subtitles, captions, title cards or UI. A physical object label explicitly required by the scene is allowed. Clean natural English, exact speaker attribution, synchronized mouth movements; silent listener reacts without mouthing the other's line.

FIXED CAST (only these two)
{cast}

{emotion_block}SETTING
{setting}

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
