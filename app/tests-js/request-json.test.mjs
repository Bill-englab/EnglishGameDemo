import test from 'node:test';
import assert from 'node:assert/strict';
import { requestJSON, observeMediaQuery } from '../static/request-json.mjs';

test('request deadline covers a stalled JSON body and aborts the request', async () => {
  let signal;
  const fetcher = async (_, options) => {
    signal = options.signal;
    return { ok: true, json: () => new Promise(() => {}) };
  };
  await assert.rejects(requestJSON('/api/library', { timeout: 20, fetcher }), /timed out/);
  assert.equal(signal.aborted, true);
});

test('successful responses resolve without waiting for the deadline', async () => {
  const value = await requestJSON('/api/library', {
    fetcher: async () => ({ ok: true, json: async () => ({ lessons: 30 }) }),
  });
  assert.deepEqual(value, { lessons: 30 });
});

test('expired sessions are distinguishable from connection failures', async () => {
  await assert.rejects(requestJSON('/api/me', {
    fetcher: async () => ({ ok: true, redirected: true, url: 'https://example.test/login' }),
  }), error => error.status === 401);
});

test('older media-query APIs can register responsive layout updates', () => {
  const listener = () => {};
  let registered;
  observeMediaQuery({ addListener(callback) { registered = callback; } }, listener);
  assert.equal(registered, listener);
});
