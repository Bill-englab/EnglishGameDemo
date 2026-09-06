// app/tests-js/map-path.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { buildSmoothPath, getScenicRouteOffset } from "../static/map-path.mjs";
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

test("partial strokes retain the full route's neighboring control points", () => {
  const points = Object.freeze([
    { x: 0, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 200 }, { x: 100, y: 300 },
  ].map(Object.freeze));
  assert.equal(buildSmoothPath(points, { startIndex: 1, endIndex: 2 }),
    "M 100 100 C 100 132, 0 168, 0 200");
  assert.equal(buildSmoothPath(points, { endIndex: 1 }), "M 0 0 C 16 16, 100 68, 100 100");
  assert.equal(buildSmoothPath(points, { startIndex: 2, endIndex: 2 }), "");
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

test("global scenic offsets form broad varied arcs instead of chapter zigzags", () => {
  const offsets = Array.from({ length: 30 }, (_, index) => getScenicRouteOffset(index));

  assert.ok(offsets.every(({ desktopPx }) => Math.abs(desktopPx) <= 150));
  assert.ok(offsets.every(({ mobilePx }) => Math.abs(mobilePx) <= 46));
  assert.deepEqual(
    offsets.map(({ desktopPx }) => Math.sign(desktopPx)),
    offsets.map(({ mobilePx }) => Math.sign(mobilePx)),
  );

  const directionChanges = [];
  let lastDirection = 0;
  for (let index = 1; index < offsets.length; index += 1) {
    const direction = Math.sign(offsets[index].desktopPx - offsets[index - 1].desktopPx);
    if (direction && direction !== lastDirection) {
      directionChanges.push(index - 1);
      lastDirection = direction;
    }
  }
  assert.deepEqual(directionChanges, [0, 4, 8, 13, 18, 24]);

  const chapterShapes = Array.from({ length: 10 }, (_, chapter) => {
    const start = chapter * 3;
    return offsets.slice(start, start + 3)
      .map(({ desktopPx }) => Math.round(desktopPx / 10))
      .join(",");
  });
  assert.ok(new Set(chapterShapes).size >= 8);

  const chaptersWithVisibleSweep = Array.from({ length: 10 }, (_, chapter) => {
    const xValues = offsets.slice(chapter * 3, chapter * 3 + 3).map(point => point.desktopPx);
    return Math.max(...xValues) - Math.min(...xValues) >= 70;
  }).filter(Boolean).length;
  assert.ok(chaptersWithVisibleSweep >= 8);
});

test("scenic offsets return independent values and clamp outside the stage", () => {
  const first = getScenicRouteOffset(0);
  first.desktopPx = 999;

  assert.deepEqual(getScenicRouteOffset(0), { desktopPx: -108, mobilePx: -33 });
  assert.deepEqual(getScenicRouteOffset(-20), getScenicRouteOffset(0));
  assert.deepEqual(getScenicRouteOffset(99), getScenicRouteOffset(29));
});
