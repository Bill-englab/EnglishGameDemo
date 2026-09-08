import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { getWorldAssetUrls } from '../static/world-assets.mjs';

test('shared browser scripts avoid the Chrome 78 startup regressions', async () => {
  // Focused guard for the unsupported features found in this incident.
  // A real Chromium 78 run also verifies parsing, layout and interactions.
  const directory = new URL('../static/', import.meta.url);
  for (const file of await readdir(directory)) {
    if (!/\.(mjs|js)$/.test(file)) continue;
    const source = await readFile(new URL(file, directory), 'utf8');
    assert.doesNotMatch(source, /\?\.|\?\?|\.replaceChildren\(|\.at\(|Object\.hasOwn\(/, file);
  }
});

test('background lookup works without Object.hasOwn and rejects inherited keys', () => {
  const hasOwn = Object.hasOwn;
  try {
    Object.hasOwn = undefined;
    assert.equal(getWorldAssetUrls('color-market', true)[0], '/static/worlds-v2/color-market-mobile.webp');
    assert.equal(getWorldAssetUrls('constructor', true)[0], '/static/worlds-v2/morning-picnic-mobile.webp');
  } finally {
    Object.hasOwn = hasOwn;
  }
});
