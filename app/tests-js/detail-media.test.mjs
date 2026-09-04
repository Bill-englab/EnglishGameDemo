import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMediaView as resolve } from '../static/detail-media.mjs';

test('desktop keeps both media panels visible without changing the selected mobile tab', async () => {
  assert.deepEqual(await resolve({ mobile: false, selected: 'demo', cameraActive: false }),
    { selected: 'demo', showDemo: true, showPerformance: true });
});

test('mobile starts with the child’s show, including when selection is invalid', async () => {
  assert.deepEqual(await resolve({ mobile: true, selected: 'unknown', cameraActive: false }),
    { selected: 'performance', showDemo: false, showPerformance: true });
});

test('mobile demo selection hides the performance panel', async () => {
  assert.deepEqual(await resolve({ mobile: true, selected: 'demo', cameraActive: false }),
    { selected: 'demo', showDemo: true, showPerformance: false });
});

test('camera activity keeps the performance panel visible on mobile', async () => {
  assert.deepEqual(await resolve({ mobile: true, selected: 'demo', cameraActive: true }),
    { selected: 'performance', showDemo: false, showPerformance: true });
});

test('a desktop camera session remains selected when resizing to mobile', async () => {
  assert.deepEqual(await resolve({ mobile: false, selected: 'demo', cameraActive: true }),
    { selected: 'performance', showDemo: true, showPerformance: true });
});
