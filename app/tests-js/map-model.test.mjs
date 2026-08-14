// app/tests-js/map-model.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  CHAPTER_THEMES,
  getChapterTheme,
  getLevelVisualState,
  getStableRotation,
  isFrameDark,
} from "../static/map-model.mjs";

test("defines ten distinct chapter worlds with accent colors", () => {
  assert.equal(Object.keys(CHAPTER_THEMES).length, 10);
  assert.equal(new Set(Object.values(CHAPTER_THEMES).map(theme => theme.world)).size, 10);
  for (const theme of Object.values(CHAPTER_THEMES)) {
    assert.ok(typeof theme.world === "string" && theme.world.length > 0);
    assert.ok(theme.accent.startsWith("#"));
  }
});

test("selects visual state without disabling locked levels", () => {
  assert.equal(getLevelVisualState({ has_performance: true, current: false }), "completed");
  assert.equal(getLevelVisualState({ has_performance: false, current: true }), "current");
  assert.equal(getLevelVisualState({ has_performance: false, current: false }), "locked");
});

test("completed-card rotation is stable and bounded", () => {
  const values = Array.from({ length: 30 }, (_, index) => getStableRotation(index));
  assert.deepEqual(values, Array.from({ length: 30 }, (_, index) => getStableRotation(index)));
  assert.ok(values.every(value => value >= -3 && value <= 3));
});

test("detects nearly black video frames", () => {
  assert.equal(isFrameDark(new Uint8ClampedArray([0, 0, 0, 255, 8, 8, 8, 255])), true);
  assert.equal(isFrameDark(new Uint8ClampedArray([230, 120, 60, 255, 250, 220, 180, 255])), false);
});

test("ignores transparent pixels while evaluating frame darkness", () => {
  const transparentBlackAndBright = new Uint8ClampedArray([0, 0, 0, 0, 240, 180, 80, 255]);
  assert.equal(isFrameDark(transparentBlackAndBright), false);
});
