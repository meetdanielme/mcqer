import { readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateImport } from '../src/data.js';
import { validateManifest } from '../src/published.js';

const directory = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'public', 'questions');
const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
const manifestIssues = validateManifest(manifest);
if (manifestIssues.length) throw new Error(manifestIssues.join(' '));
const codes = new Set();
let questionCount = 0;
for (const file of manifest.files) {
  const document = JSON.parse(await readFile(join(directory, file), 'utf8'));
  const issues = validateImport(document);
  if (issues.length) throw new Error(file + ': ' + issues.join(' '));
  const code = document.course.code.trim().toLowerCase();
  if (codes.has(code)) throw new Error('Duplicate published course code: ' + code);
  codes.add(code);
  questionCount += document.chapters.reduce((total, chapter) => total + chapter.questions.length, 0);
}
console.log('Validated ' + manifest.files.length + ' published courses and ' + questionCount + ' questions.');
