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

test('duplicate stems with altered typography are rejected across chapters', () => {
  const input = structuredClone(example);
  const original = input.chapters[0].questions[0];
  input.chapters.push({ title: 'Repeated topic', questions: [{ ...original, id: 'REPEATED-QUESTION', stem: '  ' + original.stem.replaceAll(' ', '  ') + '  ' }] });
  assert.match(validateImport(input).join(' '), /stem duplicates/);
});

test('different SQL operators, code case and visual inputs remain distinct questions', () => {
  const input = structuredClone(example);
  const original = input.chapters[0].questions[0];
  const stems = ["What does sal > 2000 select?", "What does sal >= 2000 select?", "What does name = 'a' select?", "What does name = 'A' select?", "What is 2²?", "What is 22?"];
  input.chapters[0].questions = stems.map((stem, index) => ({ ...original, id: 'SQL-' + index, stem }));
  input.chapters[0].questions.push(...['first', 'second'].map(id => ({ ...original, id, stem: 'What does the diagram show?', artifact: { title: 'Diagram', html: '<p>' + id + '</p>' } })));
  assert.deepEqual(validateImport(input), []);
});

test('retirement metadata cannot contain duplicates or active question IDs', () => {
  const input = structuredClone(example);
  input.retiredQuestionIds = [input.chapters[0].questions[0].id];
  assert.match(validateImport(input).join(' '), /id is retired/);
  input.retiredQuestionIds = ['OLD-ID', 'OLD-ID'];
  assert.match(validateImport(input).join(' '), /retiredQuestionIds/);
});

test('importing an existing prompt under a new ID in another chapter skips the duplicate', () => {
  const current = mergeImport([], example).courses;
  const incoming = structuredClone(example);
  incoming.chapters[0].title = 'A different chapter';
  incoming.chapters[0].questions[0].id = 'RENUMBERED-QUESTION';
  const result = mergeImport(current, incoming);
  assert.equal(result.duplicates, 1);
  assert.equal(result.added, 0);
  assert.equal(result.courses[0].chapters.length, 1);
  assert.equal(result.courses[0].chapters[0].questions[0].id, example.chapters[0].questions[0].id);
});

test('restoring a renumbered copy reports skipped duplicates without replacing existing data', () => {
  const current = mergeImport([], example).courses;
  const backup = structuredClone({ version: 1, courses: current });
  backup.courses[0].chapters[0].questions[0].id = 'RENUMBERED-QUESTION';
  const result = mergeBackup(current, backup);
  assert.equal(result.duplicates, 1);
  assert.equal(result.updated, 0);
  assert.deepEqual(result.courses, current);
});

test('moving a stable question ID to another imported chapter does not leave an older copy', () => {
  const current = mergeImport([], example).courses;
  const incoming = structuredClone(example);
  incoming.chapters[0].title = 'Reorganised chapter';
  incoming.chapters[0].questions[0].explanation = 'Revised explanation after moving.';
  const result = mergeImport(current, incoming);
  const questions = result.courses[0].chapters.flatMap(chapter => chapter.questions);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].id, example.chapters[0].questions[0].id);
  assert.equal(questions[0].explanation, 'Revised explanation after moving.');
  assert.equal(result.added, 0);
  assert.equal(result.updated, 1);
  assert.equal(current[0].chapters[0].questions.length, 1);
});
