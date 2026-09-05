import test from "node:test";
import assert from "node:assert/strict";
import { CHAPTER_THEMES } from "../static/map-model.mjs";
import { getWorldAssetUrls, WORLD_ASSET_ROOT, WORLD_LEGACY_ASSETS } from "../static/world-assets.mjs";

const legacyNames = [
  "01-wants-requests", "02-refusing-bargaining", "03-asking-help",
  "04-where-locating", "05-why-how-come", "06-feelings-preferences",
  "07-reasoning", "08-recounting-day", "09-reporting-others", "10-planning-predicting",
];

test("every chapter resolves desktop and mobile WebP before its legacy fallbacks", () => {
  assert.equal(WORLD_ASSET_ROOT, "/static/worlds-v2");
  Object.values(CHAPTER_THEMES).forEach(({ world }, index) => {
    const legacy = legacyNames[index];
    assert.equal(WORLD_LEGACY_ASSETS[world], legacy);
    for (const mobile of [false, true]) {
      assert.deepEqual(getWorldAssetUrls(world, mobile), [
        `/static/worlds-v2/${world}-${mobile ? "mobile" : "desktop"}.webp`,
        `/static/worlds/${legacy}.webp`,
        `/static/worlds/${legacy}.png`,
        `/static/worlds/${legacy}.jpg`,
      ]);
    }
    assert.notEqual(getWorldAssetUrls(world, false)[0], getWorldAssetUrls(world, true)[0]);
  });
});

test("unknown and inherited world names safely resolve the first chapter", () => {
  for (const world of ["missing", "", "../escape", "constructor", "toString", "__proto__", null, undefined]) {
    for (const mobile of [false, true]) {
      assert.deepEqual(getWorldAssetUrls(world, mobile), getWorldAssetUrls("morning-picnic", mobile));
    }
  }
});

test("callers cannot mutate the next fallback list", () => {
  getWorldAssetUrls("morning-picnic", false).splice(0);
  assert.equal(getWorldAssetUrls("morning-picnic", false).length, 4);
});
