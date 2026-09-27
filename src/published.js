import { mergeImport, validateImport } from './data.js';

const safeFile = /^[a-z0-9][a-z0-9-]*\.json$/;

export function validateManifest(manifest) {
  if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.files)) return ['Invalid published question manifest.'];
  const errors = [];
  if (new Set(manifest.files).size !== manifest.files.length) errors.push('Manifest has duplicate files.');
  for (const file of manifest.files) if (typeof file !== 'string' || !safeFile.test(file)) errors.push('Invalid question file name: ' + String(file));
  return errors;
}

export async function loadPublishedDocuments(baseUrl, fetcher = fetch) {
  const root = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  const manifestResponse = await fetcher(root + 'questions/manifest.json', { cache: 'no-store' });
  if (!manifestResponse.ok) throw new Error('Could not load the published question index.');
  const manifest = await manifestResponse.json();
  const errors = validateManifest(manifest);
  if (errors.length) throw new Error(errors.join(' '));
  const documents = await Promise.all(manifest.files.map(async file => {
    const response = await fetcher(root + 'questions/' + file, { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load published questions: ' + file);
    const document = await response.json();
    const issues = validateImport(document);
    if (issues.length) throw new Error(file + ': ' + issues.join(' '));
    return document;
  }));
  const codes = documents.map(document => document.course.code.trim().toLowerCase());
  if (new Set(codes).size !== codes.length) throw new Error('Published courses contain duplicate codes.');
  return documents;
}

export function mergePublishedCourses(localCourses, documents) {
  return documents.reduce((courses, document) => mergeImport(courses, document).courses, localCourses);
}

export function mergeQuestionDocuments(existing, incoming) {
  const issues = validateImport(incoming);
  if (issues.length) throw new Error(issues.join(' '));
  if (!existing) return incoming;
  const previousIssues = validateImport(existing);
  if (previousIssues.length) throw new Error('Existing file is invalid: ' + previousIssues.join(' '));
  if (existing.course.code.trim().toLowerCase() !== incoming.course.code.trim().toLowerCase()) throw new Error('Course codes do not match.');
  const chapters = existing.chapters.map(chapter => ({ ...chapter, questions: [...chapter.questions] }));
  for (const chapter of incoming.chapters) {
    const index = chapters.findIndex(item => item.title.trim().toLowerCase() === chapter.title.trim().toLowerCase());
    if (index < 0) { chapters.push(chapter); continue; }
    const current = chapters[index];
    const questions = [...current.questions];
    for (const question of chapter.questions) {
      const qi = questions.findIndex(item => item.id.trim() === question.id.trim());
      if (qi < 0) questions.push(question); else questions[qi] = question;
    }
    chapters[index] = { ...current, ...chapter, questions };
  }
  const merged = { version: 1, course: incoming.course, chapters };
  const mergedIssues = validateImport(merged);
  if (mergedIssues.length) throw new Error('Merged file is invalid: ' + mergedIssues.join(' '));
  return merged;
}
