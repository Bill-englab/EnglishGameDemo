import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('TigerTales branding preserves existing Electron user and session storage', () => {
  const { applyBranding } = require('../../electron/branding.cjs');
  let name = 'Electron';
  const overrides = new Map();
  const app = {
    getPath: kind => overrides.get(kind) ?? `/existing/${name}/${kind}`,
    setPath: (kind, value) => overrides.set(kind, value),
    setName: value => { name = value; },
  };
  const before = ['userData', 'sessionData'].map(kind => app.getPath(kind));
  applyBranding(app);
  assert.equal(name, 'TigerTales');
  assert.deepEqual(['userData', 'sessionData'].map(kind => app.getPath(kind)), before);
  applyBranding(app);
  assert.deepEqual(['userData', 'sessionData'].map(kind => app.getPath(kind)), before);
});
