import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { mergeImport, mergeBackup, validateImport, validateBackup } from '../src/data.js';
import { imageUrl, validateImage } from '../src/images.js';
import { artifactDocument, validateArtifact } from '../src/artifacts.js';
import { publishImages, validatePublishedImages } from '../scripts/question-images.mjs';

const example = JSON.parse(await readFile(new URL('../example-import.json', import.meta.url), 'utf8'));
const image = { src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT1sAAAAASUVORK5CYII=', alt: 'Supply and demand curves' };
const artifact = { html: '<svg viewBox="0 0 400 200"><text x="20" y="30">Demand curve</text></svg>', title: 'Demand curve' };

test('image and HTML questions survive import updates and backup restore', () => {
  const document = structuredClone(example);
  Object.assign(document.chapters[0].questions[0], { image, artifact });
  assert.deepEqual(validateImport(document), []);
  const imported = mergeImport([], document).courses;
  const backup = { version: 1, courses: imported };
  assert.deepEqual(validateBackup(backup), []);
  const restored = mergeBackup([], backup).courses;
  assert.deepEqual(restored[0].chapters[0].questions[0].image, image);
  assert.deepEqual(restored[0].chapters[0].questions[0].artifact, artifact);
  const textOnly = mergeImport(restored, example).courses;
  assert.equal(textOnly[0].chapters[0].questions[0].image, undefined);
  assert.equal(textOnly[0].chapters[0].questions[0].artifact, undefined);
});

test('reject unsupported images, unsafe paths, invalid content and oversized payloads', () => {
  for (const src of ['https://example.com/chart.png', 'javascript:alert(1)', 'questions/images/../secret.png', '/questions/images/chart.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,aGVsbG8=']) assert.ok(validateImage({ src, alt: 'Chart' }), src);
  assert.ok(validateImage({ ...image, alt: '' }));
  assert.ok(validateImage({ src: 'data:image/png;base64,' + 'A'.repeat(1400000), alt: 'Chart' }));
  assert.equal(validateImage(image), '');
  assert.equal(validateImage({ src: 'questions/images/chart.webp', alt: 'Chart' }), '');
  assert.equal(imageUrl('questions/images/chart.png', '/mcqer/'), '/mcqer/questions/images/chart.png');
  assert.equal(imageUrl(image.src, '/mcqer/'), image.src);
});

test('HTML charts require descriptions and self-contained bounded HTML', () => {
  assert.equal(validateArtifact(artifact), '');
  assert.ok(validateArtifact({ ...artifact, title: '' }));
  assert.ok(validateArtifact({ ...artifact, html: '' }));
  assert.ok(validateArtifact({ ...artifact, html: 'x'.repeat(512 * 1024 + 1) }));
  assert.ok(validateArtifact({ ...artifact, html: '<script src="https://cdn.example/chart.js"></script>' }));
  const document = artifactDocument('<script>document.body.dataset.rendered="yes"</script>');
  assert.match(document, /connect-src 'none'/);
  assert.ok(document.indexOf('Content-Security-Policy') < document.indexOf('<script>'));
});

test('publication extracts embedded images, reuses identical files and validates missing assets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mcqer-images-'));
  try {
    const document = structuredClone(example);
    document.chapters[0].questions[0].image = image;
    const published = await publishImages(document, root);
    const src = published.chapters[0].questions[0].image.src;
    assert.match(src, /^questions\/images\/[a-f0-9]{64}\.png$/);
    assert.equal((await publishImages(document, root)).chapters[0].questions[0].image.src, src);
    await validatePublishedImages(published, root);
    assert.equal(document.chapters[0].questions[0].image.src, image.src);
    published.chapters[0].questions[0].image.src = 'questions/images/missing.png';
    await assert.rejects(validatePublishedImages(published, root), /ENOENT/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
