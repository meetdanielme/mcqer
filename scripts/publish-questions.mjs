import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeQuestionDocuments, validateManifest } from '../src/published.js';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: pnpm publish:questions path/to/notion-ai-export.json');
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = join(root, 'public', 'questions');
const manifestPath = join(directory, 'manifest.json');
const input = JSON.parse(await readFile(resolve(inputPath), 'utf8'));
const code = input?.course?.code;
if (typeof code !== 'string' || !code.trim()) throw new Error('Input needs course.code.');
const filename = code.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.json';
if (filename === '.json') throw new Error('Course code needs letters or numbers.');
const outputPath = join(directory, filename);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const manifestIssues = validateManifest(manifest);
if (manifestIssues.length) throw new Error(manifestIssues.join(' '));
let existing;
try { existing = JSON.parse(await readFile(outputPath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const merged = mergeQuestionDocuments(existing, input);
if (!manifest.files.includes(filename)) manifest.files.push(filename);
manifest.files.sort();
await writeFile(outputPath, JSON.stringify(merged, null, 2) + '\n');
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const count = merged.chapters.reduce((sum, chapter) => sum + chapter.questions.length, 0);
console.log('Prepared ' + filename + ': ' + merged.chapters.length + ' chapters, ' + count + ' questions.');
console.log('Commit and push public/questions/ to share them on GitHub Pages.');
