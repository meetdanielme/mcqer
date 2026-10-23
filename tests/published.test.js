import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { loadPublishedDocuments, mergePublishedCourses, mergeQuestionDocuments, validateManifest } from '../src/published.js';

const example = JSON.parse(readFileSync(new URL('../example-import.json', import.meta.url), 'utf8'));

test('published manifest loads valid course files from the deployment base path', async () => {
  const seen = [];
  const fetcher = async url => {
    seen.push(url);
    return { ok: true, json: async () => url.endsWith('manifest.json') ? { version: 1, files: ['demo101.json'] } : example };
  };
  const documents = await loadPublishedDocuments('/mcqer/', fetcher);
  assert.equal(documents.length, 1);
  assert.deepEqual(seen, ['/mcqer/questions/manifest.json', '/mcqer/questions/demo101.json']);
  assert.equal(mergePublishedCourses([], documents)[0].chapters[0].questions.length, 1);
});

test('published revisions replace a stable question without losing other chapters', () => {
  const addition = structuredClone(example);
  addition.chapters[0].questions[0].explanation = 'Updated explanation.';
  addition.chapters.push({ title: 'Next chapter', questions: [] });
  const merged = mergeQuestionDocuments(example, addition);
  assert.equal(merged.chapters.length, 2);
  assert.equal(merged.chapters[0].questions.length, 1);
  assert.equal(merged.chapters[0].questions[0].explanation, 'Updated explanation.');
});

test('manifest blocks paths outside the published question directory', () => {
  assert.match(validateManifest({ version: 1, files: ['../secret.json'] }).join(' '), /Invalid question file/);
});

test('shared cleanup hides retired and moved older copies while preserving personal additions', () => {
  const document = structuredClone(example);
  document.retiredQuestionIds = ['OLD-QUESTION'];
  const question = document.chapters[0].questions[0];
  const local = [{ id: 'local', code: document.course.code, title: document.course.title, chapters: [
    { id: 'old-chapter', title: 'Old organisation', questions: [{ ...question }, { ...question, id: 'OLD-QUESTION', stem: 'An old phrasing?' }] },
    { id: 'personal-chapter', title: 'Personal practice', questions: [{ ...question, id: 'MY-QUESTION', stem: 'My distinct personal question?' }] },
    { id: 'copied-chapter', title: 'Another copy', questions: [{ ...question, id: 'COPIED-WITH-NEW-ID' }] },
  ] }];
  const visible = mergePublishedCourses(local, [document]);
  const questions = visible[0].chapters.flatMap(chapter => chapter.questions);
  assert.deepEqual(questions.map(item => item.id).sort(), [question.id, 'MY-QUESTION'].sort());
  assert.equal(visible[0].chapters.some(chapter => chapter.title === 'Old organisation'), false);
  assert.equal(local[0].chapters[0].questions.length, 2);
});

test('republication cannot resurrect a retired question from an older export', () => {
  const existing = structuredClone(example);
  existing.retiredQuestionIds = ['OLD-QUESTION'];
  const older = structuredClone(example);
  older.chapters[0].questions.push({ ...older.chapters[0].questions[0], id: 'OLD-QUESTION', stem: 'Old duplicate phrasing?' });
  const merged = mergeQuestionDocuments(existing, older);
  assert.deepEqual(merged.retiredQuestionIds, ['OLD-QUESTION']);
  assert.equal(merged.chapters[0].questions.length, 1);
});
