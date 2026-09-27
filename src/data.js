export const STORAGE_KEY = 'mcqer-data-v1';
const hasText = value => typeof value === 'string' && value.trim().length > 0;

export function loadCourses() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export const questionCount = course => course.chapters.reduce((n, chapter) => n + chapter.questions.length, 0);

export function validateImport(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ['Root must be an object.'];
  if (data.version !== 1) errors.push('version must be 1.');
  if (!data.course || !hasText(data.course.code) || !hasText(data.course.title)) errors.push('course.code and course.title are required.');
  if (!Array.isArray(data.chapters) || !data.chapters.length) return [...errors, 'chapters must be a non-empty array.'];
  const titles = new Set();
  const questionIds = new Set();
  data.chapters.forEach((chapter, ci) => {
    const path = 'chapters[' + ci + ']';
    if (!chapter || !hasText(chapter.title)) { errors.push(path + '.title is required.'); return; }
    const title = chapter.title.trim().toLowerCase();
    if (titles.has(title)) errors.push(path + '.title is duplicated.');
    titles.add(title);
    if (!Array.isArray(chapter.questions)) { errors.push(path + '.questions must be an array.'); return; }
    chapter.questions.forEach((question, qi) => {
      const qpath = path + '.questions[' + qi + ']';
      if (!question || !hasText(question.id) || !hasText(question.stem)) { errors.push(qpath + ' needs id and stem.'); return; }
      const questionId = question.id.trim();
      if (questionIds.has(questionId)) errors.push(qpath + '.id is duplicated.');
      questionIds.add(questionId);
      if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 6) { errors.push(qpath + '.options must contain 2–6 choices.'); return; }
      const ids = question.options.map(option => hasText(option?.id) ? option.id.trim() : option?.id);
      if (ids.some(id => !hasText(id)) || new Set(ids).size !== ids.length || question.options.some(option => !hasText(option?.text))) errors.push(qpath + '.options need unique ids and non-empty text.');
      if (!hasText(question.correctOptionId) || !ids.includes(question.correctOptionId.trim())) errors.push(qpath + '.correctOptionId must match an option id.');
      if (!hasText(question.explanation)) errors.push(qpath + '.explanation is required.');
      if (question.source !== undefined && typeof question.source !== 'string') errors.push(qpath + '.source must be a string.');
    });
  });
  return errors;
}

export function mergeImport(courses, data) {
  const code = data.course.code.trim();
  const index = courses.findIndex(course => course.code.toLowerCase() === code.toLowerCase());
  const existing = index < 0 ? { id: crypto.randomUUID(), code, title: data.course.title.trim(), chapters: [] } : courses[index];
  const chapters = [...existing.chapters];
  let added = 0, updated = 0;
  for (const incoming of data.chapters) {
    const chapterIndex = chapters.findIndex(chapter => chapter.title.toLowerCase() === incoming.title.trim().toLowerCase());
    const current = chapterIndex < 0 ? { id: crypto.randomUUID(), title: incoming.title.trim(), description: '', questions: [] } : chapters[chapterIndex];
    const questions = [...current.questions];
    for (const item of incoming.questions) {
      const question = { ...item, id: item.id.trim(), stem: item.stem.trim(), explanation: item.explanation.trim(), correctOptionId: item.correctOptionId.trim(), options: item.options.map(option => ({ id: option.id.trim(), text: option.text.trim() })) };
      const qi = questions.findIndex(value => value.id === question.id);
      if (qi < 0) { questions.push(question); added++; } else { questions[qi] = question; updated++; }
    }
    const merged = { ...current, description: incoming.description?.trim() || current.description, questions };
    if (chapterIndex < 0) chapters.push(merged); else chapters[chapterIndex] = merged;
  }
  const course = { ...existing, title: data.course.title.trim(), chapters };
  const next = [...courses];
  if (index < 0) next.push(course); else next[index] = course;
  return { courses: next, courseId: course.id, added, updated };
}

export function validateBackup(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.courses)) return ['Not an MCQer backup file.'];
  const errors = [];
  data.courses.forEach((course, index) => {
    if (!hasText(course?.code) || !hasText(course?.title) || !Array.isArray(course?.chapters)) { errors.push('courses[' + index + '] is invalid.'); return; }
    if (course.chapters.length) errors.push(...validateImport({ version: 1, course: { code: course.code, title: course.title }, chapters: course.chapters }).map(error => 'courses[' + index + ']: ' + error));
  });
  return errors;
}

export function mergeBackup(courses, data) {
  let next = courses;
  let added = 0, updated = 0;
  for (const item of data.courses) {
    if (!item.chapters.length) {
      if (!next.some(course => course.code.toLowerCase() === item.code.toLowerCase())) next = [...next, { id: crypto.randomUUID(), code: item.code, title: item.title, chapters: [] }];
      continue;
    }
    const result = mergeImport(next, { version: 1, course: { code: item.code, title: item.title }, chapters: item.chapters });
    next = result.courses; added += result.added; updated += result.updated;
  }
  return { courses: next, added, updated };
}
