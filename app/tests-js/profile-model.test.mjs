import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNickname } from '../static/profile-model.mjs';

test('normalizes display nickname without altering its text meaning', () => {
  assert.equal(normalizeNickname('  小虎  '), '小虎');
  assert.equal(normalizeNickname(' '), '');
  assert.equal(normalizeNickname('<b>Tiger</b>'), '<b>Tiger</b>');
  assert.equal(normalizeNickname('🐯'.repeat(24)), '🐯'.repeat(24));
});

test('rejects control characters and overlong Unicode nicknames', () => {
  for (const value of ['a\u0000b', '\nx', '🐯'.repeat(25), null]) {
    assert.throws(() => normalizeNickname(value));
  }
});
