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
