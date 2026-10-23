import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { repositoryImagePattern, validateImage } from '../src/images.js';

export async function validatePublishedImages(document, publicRoot) {
  for (const chapter of document.chapters) for (const question of chapter.questions) {
    if (!question.image || !repositoryImagePattern.test(question.image.src)) continue;
    const bytes = await readFile(join(publicRoot, question.image.src));
    const extension = question.image.src.split('.').pop();
    const mime = extension === 'jpg' ? 'jpeg' : extension;
    const issue = validateImage({ ...question.image, src: `data:image/${mime};base64,${bytes.toString('base64')}` });
    if (issue) throw new Error(question.id + ': image ' + issue);
  }
}

export async function publishImages(document, publicRoot) {
  const copy = structuredClone(document);
  const pending = new Map();
  await validatePublishedImages(copy, publicRoot);
  for (const chapter of copy.chapters) for (const question of chapter.questions) {
    if (!question.image?.src.startsWith('data:')) continue;
    const [prefix, encoded] = question.image.src.split(',');
    const bytes = Buffer.from(encoded, 'base64');
    const extension = prefix.slice('data:image/'.length).split(';')[0];
    const filename = createHash('sha256').update(bytes).digest('hex') + '.' + extension;
    question.image.src = 'questions/images/' + filename;
    pending.set(filename, bytes);
  }
  if (pending.size) await mkdir(join(publicRoot, 'questions', 'images'), { recursive: true });
  for (const [filename, bytes] of pending) await writeFile(join(publicRoot, 'questions', 'images', filename), bytes);
  return copy;
}
