import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGES,
  getStageById,
  summarizeAdventure,
  globalLessonNumber,
} from "../static/adventure-navigation.mjs";

const fixture = [
  {
    name: "01-requests",
    title: "Requests",
    levels: [
      { level: "01-first", has_performance: true, current: false },
      { level: "02-current", has_performance: false, current: true },
    ],
  },
  {
    name: "02-help",
    title: "Help",
    levels: [{ level: "01-next", has_performance: false, current: false }],
  },
];

test("summarizes completion and preserves a distinct current lesson", () => {
  const before = structuredClone(fixture);
  assert.deepEqual(fixture, before);
  const result = summarizeAdventure(fixture);
  assert.equal(globalLessonNumber(fixture, "02-help", "01-next"), 3);
  assert.deepEqual({ completed: result.completed, total: result.total }, { completed: 1, total: 3 });
  assert.equal(result.current.level, "02-current");
  assert.equal(result.current.chapter, "01-requests");
  assert.equal(result.current.chapterTitle, "Requests");
  assert.equal(result.chapters[0].completed, 1);
  assert.equal(result.chapters[0].total, 2);
  assert.deepEqual(fixture, before);
});

test("summarizes an empty library", () => {
  assert.deepEqual(summarizeAdventure([]), {
    completed: 0,
    total: 0,
    current: null,
    chapters: [],
  });
});

test("returns no current lesson when every level is complete", () => {
  const result = summarizeAdventure([
    { name: "01", title: "One", levels: [{ level: "01", has_performance: true, current: false }] },
  ]);
  assert.equal(result.completed, 1);
  assert.equal(result.current, null);
});

test("numbers lessons in their real chapter and level order", () => {
  assert.equal(globalLessonNumber(fixture, "01-requests", "01-first"), 1);
  assert.equal(globalLessonNumber(fixture, "01-requests", "02-current"), 2);
  assert.equal(globalLessonNumber(fixture, "02-help", "01-next"), 3);
  assert.equal(globalLessonNumber(fixture, "missing", "01-next"), null);
  assert.equal(globalLessonNumber(fixture, "02-help", "missing"), null);
});

test("exposes four roadmap stages; availability is runtime-driven", () => {
  assert.deepEqual(STAGES, [
    { id: "04", label: "Stage 1", theme: "I can take part" },
    { id: "05", label: "Stage 2", theme: "I can keep it going" },
    { id: "06", label: "Stage 3", theme: "I can explain and adapt" },
    { id: "07", label: "Stage 4", theme: "I can read and retell" },
  ]);
  assert.equal(Object.isFrozen(STAGES), true);
  // Enterability is not part of the metadata: the server decides via /api/stages.
  for (const stage of STAGES) assert.equal("available" in stage, false);
});

test("resolves stages by id and falls back to undefined", () => {
  assert.equal(getStageById("05").label, "Stage 2");
  assert.equal(getStageById("07").theme, "I can read and retell");
  assert.equal(getStageById("99"), undefined);
  assert.equal(getStageById(undefined), undefined);
});
