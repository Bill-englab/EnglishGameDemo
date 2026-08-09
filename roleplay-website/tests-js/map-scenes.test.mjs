// roleplay-website/tests-js/map-scenes.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { buildSceneSpec } from "../static/map-scenes.mjs";

test("builds stable, balanced scenery for all ten chapters", () => {
  for (let chapter = 1; chapter <= 10; chapter += 1) {
    const name = `${String(chapter).padStart(2, "0")}-chapter`;
    const first = buildSceneSpec(name, 20260809);
    const second = buildSceneSpec(name, 20260809);
    assert.deepEqual(first, second);
    assert.ok(first.left.length >= 2 && first.left.length <= 3);
    assert.ok(first.right.length >= 2 && first.right.length <= 3);
    assert.ok([...first.left, ...first.right].every(prop => prop.x >= 4 && prop.x <= 88));
  }
});

test("chapter worlds have distinct identities", () => {
  const worlds = Array.from({ length: 10 }, (_, index) => buildSceneSpec(`${index + 1}-chapter`, 1).world);
  assert.equal(new Set(worlds).size, 10);
});
