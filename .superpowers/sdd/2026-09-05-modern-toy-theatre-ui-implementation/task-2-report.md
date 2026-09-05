# Task 2 report: adventure navigation model

## Implementation

Added `app/static/adventure-navigation.mjs` with three pure exports:

- `STAGES`: the exact three fixed stage records from the brief, with only `04` available.
- `summarizeAdventure(library)`: returns overall completion, total, current lesson, and chapter summaries. It clones level records, counts performance completion, and adds `chapter`/`chapterTitle` context only to the distinct current lesson.
- `globalLessonNumber(library, chapterName, levelName)`: returns the one-based global lesson position in input order, or `null` when absent.

Added focused Node tests in `app/tests-js/adventure-navigation.test.mjs` covering empty libraries, cross-chapter totals, completion/current separation, all-complete behavior, numbering, stage records, and non-mutation.

## TDD evidence

RED command:

```text
cd app && node --test tests-js/adventure-navigation.test.mjs
```

Result: failed as expected with `ERR_MODULE_NOT_FOUND` for `static/adventure-navigation.mjs`.

GREEN command:

```text
cd app && npm test
```

Result: 26 tests passed, 0 failed.

## Files

- `app/static/adventure-navigation.mjs`
- `app/tests-js/adventure-navigation.test.mjs`

## Self-review

- The model uses map/reduce/find over new arrays and does not write to scanner output.
- Current selection is limited to `current === true && !has_performance`, taking the first match in chapter/level order.
- Global numbering follows actual nested library order and is independent of progress state.

## Concerns

No known concerns. The stage array itself is frozen as required; its individual records retain the exact brief-provided shape and values.
