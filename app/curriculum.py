"""Load and validate the stage-aware curriculum authoring source."""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any


THREE_BY_TEN_CONTRACT = "three-by-ten-v2"
ALLOWED_STATUSES = {
    "draft",
    "logic_reviewed",
    "language_reviewed",
    "video_ready",
    "video_produced",
}
REQUIRED_REVIEWS = {
    "motivation",
    "causality",
    "physical",
    "adult_behavior",
    "child_language",
    "knowledge_safety",
    "resolution",
    "replay_logic",
}
REQUIRED_LESSON_FIELDS = {
    "id",
    "title",
    "title_zh",
    "can_do",
    "conversation_move",
    "trigger",
    "core_response",
    "stretch_response",
    "repair_response",
    "recycle",
    "roles",
    "setting",
    "essential_props",
    "parts",
    "replay_cards",
    "parent_support",
    "reviews",
    "status",
    "content_revision",
}


class CurriculumLoadError(RuntimeError):
    """Raised when a curriculum source file cannot be loaded."""


@dataclass(frozen=True)
class ValidationIssue:
    path: str
    code: str
    message: str


def _read_json(path: Path, root: Path) -> dict[str, Any]:
    relative = path.relative_to(root)
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise CurriculumLoadError(f"Cannot load {relative}: {exc}") from exc
    if not isinstance(value, dict):
        raise CurriculumLoadError(f"Cannot load {relative}: expected a JSON object")
    return value


def load_stage(root: Path, stage_id: str) -> dict[str, Any]:
    """Load a stage and discover its prefixed chapter and lesson folders."""

    root = Path(root)
    stage_dir = root / stage_id
    stage = _read_json(stage_dir / "stage.json", root)
    stage["id"] = stage_id
    chapters = []
    if stage_dir.exists():
        chapter_dirs = sorted(
            path
            for path in stage_dir.iterdir()
            if path.is_dir() and (path / "chapter.json").is_file()
        )
    else:
        chapter_dirs = []
    for chapter_dir in chapter_dirs:
        chapter = _read_json(chapter_dir / "chapter.json", root)
        chapter["id"] = chapter_dir.name
        lessons = []
        lesson_dirs = sorted(
            path
            for path in chapter_dir.iterdir()
            if path.is_dir() and (path / "lesson.json").is_file()
        )
        for lesson_dir in lesson_dirs:
            lesson = _read_json(lesson_dir / "lesson.json", root)
            lesson["id"] = lesson_dir.name
            lesson["path_ids"] = {
                "stage": stage_id,
                "chapter": chapter_dir.name,
                "lesson": lesson_dir.name,
            }
            lessons.append(lesson)
        chapter["lessons"] = lessons
        chapters.append(chapter)
    stage["chapters"] = chapters
    return stage


def _add(issues: list[ValidationIssue], path: str, code: str, message: str) -> None:
    issues.append(ValidationIssue(path=path, code=code, message=message))


def _dialogue_word_count(parts: Any) -> int:
    if not isinstance(parts, list):
        return 0
    return sum(
        len(str(turn.get("line", "")).split())
        for part in parts
        if isinstance(part, dict)
        for turn in part.get("turns", [])
        if isinstance(turn, dict)
    )


def _speaker_word_count(parts: Any, speaker: str) -> int:
    if not isinstance(parts, list):
        return 0
    return sum(
        len(str(turn.get("line", "")).split())
        for part in parts
        if isinstance(part, dict)
        for turn in part.get("turns", [])
        if isinstance(turn, dict) and turn.get("speaker") == speaker
    )


def _speaker_turn_count(parts: Any, speaker: str) -> int:
    if not isinstance(parts, list):
        return 0
    return sum(
        1
        for part in parts
        if isinstance(part, dict)
        for turn in part.get("turns", [])
        if isinstance(turn, dict) and turn.get("speaker") == speaker
    )


def validate_stage(
    stage: dict[str, Any], *, require_complete: bool = False
) -> list[ValidationIssue]:
    """Return every structural or sequencing problem in a loaded stage."""

    issues: list[ValidationIssue] = []
    allowed_roles = set(stage.get("roles", []))
    expected_parts = stage.get("dialogue_parts", ["A", "B", "C"])
    introduced: set[str] = set()
    lessons_seen = 0
    family_lessons = 0

    for chapter in stage.get("chapters", []):
        chapter_id = chapter.get("id", "<chapter>")
        for lesson in chapter.get("lessons", []):
            lessons_seen += 1
            lesson_id = lesson.get("id", "<lesson>")
            path = f"{chapter_id}/{lesson_id}"
            contract = lesson.get("dialogue_contract")
            is_three_by_ten = contract == THREE_BY_TEN_CONTRACT
            if contract not in (None, "", THREE_BY_TEN_CONTRACT):
                _add(
                    issues, f"{path}.dialogue_contract", "dialogue-contract",
                    f"Unknown dialogue contract: {contract}",
                )
            elif require_complete and stage.get("id") == "04" and not is_three_by_ten:
                _add(
                    issues, f"{path}.dialogue_contract", "dialogue-contract",
                    f"Complete Stage 04 requires {THREE_BY_TEN_CONTRACT}",
                )
            missing = sorted(REQUIRED_LESSON_FIELDS - set(lesson))
            for field in missing:
                _add(issues, f"{path}.{field}", "required-field", f"Missing {field}")

            roles = lesson.get("roles", [])
            if not isinstance(roles, list):
                roles = []
            invalid_roles = [role for role in roles if role not in allowed_roles]
            for role in invalid_roles:
                _add(issues, f"{path}.roles", "invalid-role", f"Unknown role: {role}")
            if "dad" in roles or "mom" in roles:
                family_lessons += 1

            status = lesson.get("status")
            if status not in ALLOWED_STATUSES:
                _add(issues, f"{path}.status", "invalid-status", f"Unknown status: {status}")

            parts = lesson.get("parts", [])
            actual_parts = [part.get("id") for part in parts if isinstance(part, dict)]
            if actual_parts != expected_parts:
                _add(
                    issues,
                    f"{path}.parts",
                    "invalid-dialogue-part",
                    f"Expected parts {expected_parts}, got {actual_parts}",
                )

            speakers = {
                turn.get("speaker")
                for part in parts
                if isinstance(part, dict)
                for turn in part.get("turns", [])
                if isinstance(turn, dict)
            }
            if len(roles) != 2 or len(speakers) != 2 or set(roles) != speakers:
                _add(
                    issues,
                    f"{path}.roles",
                    "speaker-count",
                    "Lesson must use exactly the two declared speakers",
                )
            for index, part in enumerate(parts):
                if not isinstance(part, dict):
                    continue
                part_id = part.get("id", index)
                if is_three_by_ten:
                    turn_count = len(part.get("turns", []))
                    if not 3 <= turn_count <= 4:
                        _add(
                            issues, f"{path}.parts.{part_id}", "part-turn-budget",
                            f"Each part needs 3-4 turns; found {turn_count}",
                        )
                    part_words = _dialogue_word_count([part])
                    if not 12 <= part_words <= 20:
                        _add(
                            issues, f"{path}.parts.{part_id}", "part-word-budget",
                            f"Each part needs 12-20 spoken words; found {part_words}",
                        )
                if not any(
                    turn.get("speaker") == "child"
                    for turn in part.get("turns", [])
                    if isinstance(turn, dict)
                ):
                    _add(
                        issues,
                        f"{path}.parts.{part_id}",
                        "missing-child-turn",
                        "Every part needs a child turn",
                    )

            replay_cards = lesson.get("replay_cards", [])
            if not isinstance(replay_cards, list) or len(replay_cards) != 2:
                _add(
                    issues,
                    f"{path}.replay_cards",
                    "missing-replay-card",
                    "Exactly two complete replay cards are required",
                )

            props = lesson.get("essential_props", [])
            if not isinstance(props, list) or len(props) > 1:
                _add(
                    issues,
                    f"{path}.essential_props",
                    "too-many-essential-props",
                    "A lesson may require at most one prop group",
                )

            reviews = lesson.get("reviews", {})
            required_reviews = REQUIRED_REVIEWS
            review_statuses = {"video_ready", "video_produced"}
            if is_three_by_ten:
                required_reviews = REQUIRED_REVIEWS | {"character_continuity", "emotion_stability"}
                review_statuses = review_statuses | {"language_reviewed"}
            if status in review_statuses and not all(
                reviews.get(review) is True for review in required_reviews
            ):
                _add(
                    issues,
                    f"{path}.reviews",
                    "review-gate",
                    f"{status} content must pass all {len(required_reviews)} required reviews",
                )

            word_count = _dialogue_word_count(parts)
            minimum_words, maximum_words = (45, 58) if is_three_by_ten else (35, 65)
            if not minimum_words <= word_count <= maximum_words:
                _add(
                    issues,
                    f"{path}.parts",
                    "word-budget",
                    f"Stage 4 dialogue needs {minimum_words}-{maximum_words} words; found {word_count}",
                )
            if is_three_by_ten:
                turn_count = sum(
                    len(part.get("turns", [])) for part in parts if isinstance(part, dict)
                )
                if not 9 <= turn_count <= 11:
                    _add(
                        issues, f"{path}.parts", "lesson-turn-budget",
                        f"Lesson needs 9-11 turns; found {turn_count}",
                    )
                child_turns = _speaker_turn_count(parts, "child")
                if not 4 <= child_turns <= 5:
                    _add(
                        issues, f"{path}.parts", "child-turn-budget",
                        f"Lesson needs 4-5 child turns; found {child_turns}",
                    )
            child_word_count = _speaker_word_count(parts, "child")
            if not 18 <= child_word_count <= 28:
                _add(
                    issues,
                    f"{path}.parts",
                    "child-word-budget",
                    f"Stage 4 child dialogue needs 18-28 words; found {child_word_count}",
                )

            for move_id in lesson.get("recycle", []):
                if move_id not in introduced:
                    _add(
                        issues,
                        f"{path}.recycle",
                        "unknown-recycle",
                        f"Move was not introduced earlier: {move_id}",
                    )
            move = lesson.get("conversation_move", {})
            if isinstance(move, dict) and move.get("id"):
                introduced.add(move["id"])

    if require_complete:
        chapters = stage.get("chapters", [])
        expected_chapters = stage.get("expected_chapters")
        expected_lessons = stage.get("expected_lessons")
        if len(chapters) != expected_chapters:
            _add(
                issues,
                "chapters",
                "chapter-count",
                f"Expected {expected_chapters} chapters; found {len(chapters)}",
            )
        if lessons_seen != expected_lessons:
            _add(
                issues,
                "lessons",
                "lesson-count",
                f"Expected {expected_lessons} lessons; found {lessons_seen}",
            )
        minimum_ratio = stage.get("minimum_family_partner_ratio", 0)
        ratio = family_lessons / lessons_seen if lessons_seen else 0
        if ratio < minimum_ratio:
            _add(
                issues,
                "lessons",
                "family-partner-ratio",
                f"Family partner ratio {ratio:.1%} is below {minimum_ratio:.1%}",
            )
    return issues
