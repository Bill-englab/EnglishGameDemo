// roleplay-website/tests-js/map-path.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { buildSmoothPath } from "../static/map-path.mjs";

test("returns empty path for fewer than two points", () => {
  assert.equal(buildSmoothPath([]), "");
  assert.equal(buildSmoothPath([{ x: 10, y: 20 }]), "");
});

test("creates one continuous cubic path through top-to-bottom points", () => {
  const path = buildSmoothPath([{ x: 100, y: 20 }, { x: 40, y: 180 }, { x: 160, y: 340 }]);
  assert.match(path, /^M 100 20 C /);
  assert.equal((path.match(/ C /g) || []).length, 2);
  assert.ok(path.endsWith("160 340"));
});
