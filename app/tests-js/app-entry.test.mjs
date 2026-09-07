import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as lessonView from '../static/lesson-view.mjs';

test('the browser entry only imports available lesson-view bindings after content migrations', async () => {
  const entry = await readFile(new URL('../static/app.js', import.meta.url), 'utf8');
  const declaration = entry.match(/import\s*\{([^}]+)\}\s*from\s*["']\.\/lesson-view\.mjs["']/);
  assert.ok(declaration, 'the real entry must retain its lesson-view import');
  for (const name of declaration[1].split(',').map(value => value.trim())) {
    assert.ok(Object.hasOwn(lessonView, name), `Browser entry imports missing export: ${name}`);
  }
});
