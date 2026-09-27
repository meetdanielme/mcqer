import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { mergeBackup, mergeImport, validateBackup, validateImport } from '../src/data.js';

const example = JSON.parse(readFileSync(new URL('../example-import.json', import.meta.url), 'utf8'));

test('example import is valid and repeating it updates rather than duplicates', () => {
  assert.deepEqual(validateImport(example), []);
  const first = mergeImport([], example);
  assert.equal(first.added, 1);
  const second = mergeImport(first.courses, example);
  assert.equal(second.added, 0);
  assert.equal(second.updated, 1);
  assert.equal(second.courses[0].chapters[0].questions.length, 1);
});

test('invalid answer reference rejects the whole import', () => {
  const invalid = structuredClone(example);
  invalid.chapters[0].questions[0].correctOptionId = 'Z';
  assert.match(validateImport(invalid).join(' '), /correctOptionId/);
  invalid.chapters[0].questions[0].correctOptionId = 2;
  assert.match(validateImport(invalid).join(' '), /correctOptionId/);
});

test('backup merges without dropping existing questions', () => {
  const original = mergeImport([], example).courses;
  const backup = { version: 1, courses: original };
  assert.deepEqual(validateBackup(backup), []);
  const merged = mergeBackup(original, backup);
  assert.equal(merged.added, 0);
  assert.equal(merged.updated, 1);
  assert.equal(merged.courses[0].chapters[0].questions.length, 1);
});
