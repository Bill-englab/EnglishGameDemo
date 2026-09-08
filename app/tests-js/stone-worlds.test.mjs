import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneStripLayout, stoneWorldCandidates } from '../static/stone-worlds.mjs';
import { mapAsset } from '../static/map-assets.mjs';

test('scene strips fill wide screens without grass sidebars and cover tall chapters', () => {
  for (const width of [320, 390, 800, 1280, 1920, 2560]) {
    for (const height of [900, 1800, 3200]) {
      const scene = sceneStripLayout(width,height);
      assert.equal(scene.width, width);
      assert.ok(Math.abs(scene.height / scene.width - (width >= 768 ? 2/3 : 1.5)) < 0.001);
      assert.equal(scene.tops[0],0);
      assert.ok(scene.tops.at(-1)+scene.height >= height);
      for(let i=1;i<scene.tops.length;i++) assert.ok(scene.tops[i] < scene.tops[i-1]+scene.height);
    }
  }
});
test('map art is preferred while preserving the exact same-world fallback order', () => {
  const fallback=['/static/worlds-v2/color-market-mobile.webp','/static/worlds/02-refusing-bargaining.png'];
  assert.deepEqual(stoneWorldCandidates('color-market',fallback),[mapAsset('/static/worlds-map/color-market.png'),...fallback]);
  assert.equal(fallback.length,2);
  assert.deepEqual(stoneWorldCandidates('color-market',fallback,1440),[mapAsset('/static/worlds-map/color-market-desktop.png'),mapAsset('/static/worlds-map/color-market.png'),...fallback]);
});
