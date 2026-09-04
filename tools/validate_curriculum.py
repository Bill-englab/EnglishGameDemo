"""Validate a stage curriculum and print its coverage summary."""

from __future__ import annotations

import argparse
from collections import Counter
from pathlib import Path
import sys


REPO_ROOT = Path(__file__).resolve().parent.parent
APP_ROOT = REPO_ROOT / "app"
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from curriculum import CurriculumLoadError, ValidationIssue, load_stage, validate_stage


def _lessons(stage):
    return [
        lesson
        for chapter in stage.get("chapters", [])
        for lesson in chapter.get("lessons", [])
    ]


def format_report(stage: dict, issues: list[ValidationIssue]) -> str:
    lessons = _lessons(stage)
    introduced = [
        lesson.get("conversation_move", {}).get("id")
        for lesson in lessons
        if lesson.get("conversation_move", {}).get("id")
    ]
    recycled = Counter(
        move_id for lesson in lessons for move_id in lesson.get("recycle", [])
    )
    family_count = sum(
        bool({"dad", "mom"} & set(lesson.get("roles", []))) for lesson in lessons
    )
    ratio = family_count / len(lessons) if lessons else 0
    orphan_moves = [move_id for move_id in introduced if recycled[move_id] == 0]
    issue_lines = [
        f"ERROR {issue.code} {issue.path}: {issue.message}" for issue in issues
    ]
    summary = [
        f"Stage {stage.get('id', '?')}: {stage.get('title', '')}",
        f"chapters: {len(stage.get('chapters', []))}",
        f"lessons: {len(lessons)}",
        f"family partner ratio: {ratio:.1%} ({family_count}/{len(lessons)})",
        "introduced moves: " + (", ".join(introduced) or "none"),
        "recycled moves: "
        + (", ".join(f"{move}={count}" for move, count in sorted(recycled.items())) or "none"),
        "orphan moves: " + (", ".join(orphan_moves) or "none"),
        f"validation issues: {len(issues)}",
    ]
    return "\n".join(issue_lines + summary)


def run_validation(root: Path, stage_id: str, *, require_complete: bool = False):
    try:
        stage = load_stage(root, stage_id)
    except CurriculumLoadError as exc:
        return 1, f"ERROR load-stage {stage_id}: {exc}"
    issues = validate_stage(stage, require_complete=require_complete)
    return (1 if issues else 0), format_report(stage, issues)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stage", default="04", help="Stage directory id")
    parser.add_argument(
        "--complete",
        action="store_true",
        help="Enforce expected chapter, lesson, and partner-policy counts",
    )
    args = parser.parse_args(argv)
    exit_code, report = run_validation(
        REPO_ROOT / "curriculum", args.stage, require_complete=args.complete
    )
    print(report)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
