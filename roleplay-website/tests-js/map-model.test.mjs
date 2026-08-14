// roleplay-website/tests-js/map-model.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  CHAPTER_THEMES,
  getChapterTheme,
  getLevelVisualState,
  getLayoutForWidth,
  getStableRotation,
  isFrameDark,
} from "../static/map-model.mjs";

test("defines ten distinct chapter worlds", () => {
  assert.equal(Object.keys(CHAPTER_THEMES).length, 10);
  assert.equal(new Set(Object.values(CHAPTER_THEMES).map(theme => theme.world)).size, 10);
  for (const theme of Object.values(CHAPTER_THEMES)) {
    assert.match(theme.gradient, /^linear-gradient\(/);
    assert.ok(theme.accent.startsWith("#"));
    assert.ok(theme.props.length >= 3 && theme.props.length <= 5);
    assert.equal(theme.heroes.length, 2);
  }
  assert.equal(new Set(Object.values(CHAPTER_THEMES).flatMap(theme => theme.heroes)).size, 20);
});

test("selects visual state without disabling locked levels", () => {
  assert.equal(getLevelVisualState({ has_performance: true, current: false }), "completed");
  assert.equal(getLevelVisualState({ has_performance: false, current: true }), "current");
  assert.equal(getLevelVisualState({ has_performance: false, current: false }), "locked");
});

test("uses approved desktop and mobile proportions", () => {
  assert.deepEqual(getLayoutForWidth(1440), { left: 18, main: 64, right: 18, node: 220, currentNode: 244 });
  assert.deepEqual(getLayoutForWidth(390), { left: 12, main: 76, right: 12, node: 140, currentNode: 152 });
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
