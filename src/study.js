export function shuffled(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function createSession(chapter, code, settings) {
  let questions = settings.shuffleQuestions ? shuffled(chapter.questions) : [...chapter.questions];
  questions = questions.slice(0, settings.limit || questions.length).map(question => ({ ...question, options: settings.shuffleOptions ? shuffled(question.options) : question.options }));
  return { code, chapter: { ...chapter, questions }, index: 0, answers: {}, submitted: {}, revealed: false };
}
export function readStudy() {
  try { const data = JSON.parse(localStorage.getItem('mcqer-study-v1')); if (data?.version === 1 && Array.isArray(data.bookmarks) && Array.isArray(data.attempts)) { const session = data.session; if (session && (!session.code || !Array.isArray(session.chapter?.questions) || !session.chapter.questions.length || !Number.isInteger(session.index) || session.index < 0 || session.index > session.chapter.questions.length || !session.answers || !session.submitted)) data.session = null; return data; } } catch {}
  return { version: 1, session: null, bookmarks: [], attempts: [] };
}
export const questionKey = (code, id) => JSON.stringify([code.toLowerCase(), id]);
