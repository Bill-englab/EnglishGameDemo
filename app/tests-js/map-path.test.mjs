// app/tests-js/map-path.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { buildSmoothPath } from "../static/map-path.mjs";
import * as pathModel from "../static/map-path.mjs";

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

test("path segments join at current node without losing or mutating points", () => {
  assert.equal(typeof pathModel.splitPathPoints, "function");
  const points = Object.freeze([{x:1,y:2},{x:3,y:4},{x:5,y:6},{x:7,y:8}].map(Object.freeze));
  assert.deepEqual(pathModel.splitPathPoints(points,2), {traveled: [{x:1,y:2},{x:3,y:4}], upcoming:[{x:3,y:4},{x:5,y:6},{x:7,y:8}]});
  assert.deepEqual(pathModel.splitPathPoints(points,0), {traveled:[],upcoming:points});
  assert.deepEqual(pathModel.splitPathPoints(points,-1), {traveled:points,upcoming:[]});
  assert.deepEqual(pathModel.splitPathPoints(points,4), {traveled:points,upcoming:[]});
  assert.deepEqual(pathModel.splitPathPoints([],0), {traveled:[],upcoming:[]});
});
