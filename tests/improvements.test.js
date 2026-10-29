import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateImport } from '../src/data.js';
import { loadPublishedDocuments, mergeQuestionDocuments } from '../src/published.js';
import { createSession, shuffled } from '../src/study.js';
const example = JSON.parse(readFileSync(new URL('../example-import.json', import.meta.url)));
test('reject invalid chapter descriptions before merge', () => {
  const input = structuredClone(example); input.chapters[0].description = 42;
  assert.match(validateImport(input).join(' '), /description must be a string/);
});
test('published question can move between chapters without duplication', () => {
 const moved = structuredClone(example); moved.chapters[0].title = 'Moved';
 const result = mergeQuestionDocuments(example, moved);
 assert.equal(result.chapters.flatMap(chapter => chapter.questions).length, 1);
 assert.equal(result.chapters.find(chapter => chapter.title === 'Moved').questions.length, 1);
});
test('healthy courses remain available after partial catalogue failure', async () => {
 let errors;
 const documents = await loadPublishedDocuments('/', async url => ({ok: !url.includes('broken'), json: async () => url.includes('manifest') ? {version:1,files:['good.json','broken.json']} : example}), value => errors = value);
 assert.equal(documents.length,1); assert.equal(errors.length,1);
});
test('session shuffle preserves answer IDs and does not mutate the bank', () => {
 const chapter = example.chapters[0]; const before = structuredClone(chapter);
 const session = createSession(chapter,'DEMO',{limit:1,shuffleOptions:true,shuffleQuestions:true});
 assert.deepEqual(chapter,before); assert.equal(session.chapter.questions.length,1);
 assert.equal(session.chapter.questions[0].correctOptionId,chapter.questions[0].correctOptionId);
 assert.deepEqual(shuffled([1,2,3],()=>0).sort(),[1,2,3]);
});
