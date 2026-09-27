import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, Check, ChevronLeft, ChevronRight, CircleHelp, Download, GraduationCap, Plus, RotateCcw, Upload, X } from 'lucide-react';
import { loadCourses, mergeBackup, mergeImport, questionCount, STORAGE_KEY, validateBackup, validateImport } from './data.js';
import './styles.css';

function App() {
  const [courses, setCourses] = useState(loadCourses);
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [practice, setPractice] = useState(null);
  const fileRef = useRef(null);
  const backupRef = useRef(null);
  const course = courses.find(item => item.id === selectedId) || courses[0];
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(courses)); }, [courses]);
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(timer); } }, [notice]);
  const updateCourse = updated => setCourses(current => current.map(item => item.id === updated.id ? updated : item));

  function saveCourse(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = String(form.get('code')).trim();
    const title = String(form.get('title')).trim();
    if (courses.some(item => item.code.toLowerCase() === code.toLowerCase())) { setNotice('A course with that code already exists.'); return; }
    const created = { id: crypto.randomUUID(), code, title, chapters: [] };
    setCourses([...courses, created]); setSelectedId(created.id); setModal(null);
  }
  function saveChapter(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title')).trim();
    if (course.chapters.some(item => item.title.toLowerCase() === title.toLowerCase())) { setNotice('That chapter already exists.'); return; }
    const chapter = { id: crypto.randomUUID(), title, description: String(form.get('description')).trim(), questions: [] };
    updateCourse({ ...course, chapters: [...course.chapters, chapter] }); setModal(null);
  }
  function saveQuestion(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const chapterId = String(form.get('chapterId'));
    const options = ['A', 'B', 'C', 'D'].map(id => ({ id, text: String(form.get('option' + id)).trim() }));
    const question = { id: crypto.randomUUID(), stem: String(form.get('stem')).trim(), options, correctOptionId: String(form.get('correctOptionId')), explanation: String(form.get('explanation')).trim(), source: String(form.get('source')).trim() };
    updateCourse({ ...course, chapters: course.chapters.map(chapter => chapter.id === chapterId ? { ...chapter, questions: [...chapter.questions, question] } : chapter) }); setModal(null);
  }
  function deleteCourse() {
    setCourses(current => current.filter(item => item.id !== course.id));
    setSelectedId(null); setPractice(null); setModal(null);
    setNotice('Course deleted.');
  }
  async function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    let input;
    try { input = JSON.parse(await file.text()); } catch { setModal({ type: 'errors', errors: ['The file is not valid JSON.'] }); return; }
    const errors = validateImport(input);
    if (errors.length) { setModal({ type: 'errors', errors }); return; }
    const result = mergeImport(courses, input);
    setCourses(result.courses); setSelectedId(result.courseId); setPractice(null);
    setNotice('Imported ' + result.added + ' new and updated ' + result.updated + ' questions.');
  }
  async function restoreBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); } catch { setModal({ type: 'errors', errors: ['The backup is not valid JSON.'] }); return; }
    const errors = validateBackup(data);
    if (errors.length) { setModal({ type: 'errors', errors }); return; }
    const result = mergeBackup(courses, data);
    setCourses(result.courses); setPractice(null);
    setNotice('Backup merged: ' + result.added + ' new and ' + result.updated + ' updated questions.');
  }
  function exportData() {
    const content = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), courses }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'mcqer-backup.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const startPractice = chapter => setPractice({ chapter, index: 0, answers: {}, revealed: false });
  const questions = practice?.chapter.questions || [];
  const currentQuestion = questions[practice?.index || 0];
  const selectedAnswer = practice?.answers[currentQuestion?.id];
  const finished = practice && practice.index >= questions.length;
  const score = practice ? questions.filter(item => practice.answers[item.id] === item.correctOptionId).length : 0;

  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="topbar"><div className="topbar-brand"><span className="brand-name">MCQer</span><span className="brand-divider"/><span className="brand-subtitle">Question bank</span></div><span className="topbar-note">Local-first · Your questions stay on this device</span></header>
    <div className="workspace">
      <aside className="sidebar" aria-label="Courses">
        <div className="sidebar-heading"><h2>Your courses</h2><button className="button small secondary" onClick={() => setModal({ type: 'course' })}><Plus size={16}/> Create course</button></div>
        {courses.length ? <nav className="course-list">{courses.map(item => <button key={item.id} className={'course-item ' + (course?.id === item.id ? 'active' : '')} onClick={() => { setSelectedId(item.id); setPractice(null); }}><GraduationCap size={22}/><span><strong>{item.title}</strong><small>{item.chapters.length} {item.chapters.length === 1 ? 'chapter' : 'chapters'} · {questionCount(item)} {questionCount(item) === 1 ? 'question' : 'questions'}</small></span></button>)}</nav> : <div className="sidebar-empty">Create your first course or import a JSON file to begin.</div>}
        <div className="sidebar-bottom"><button className="plain-link" onClick={exportData} disabled={!courses.length}><Download size={17}/> Download backup</button><button className="plain-link" onClick={() => backupRef.current?.click()}><Upload size={17}/> Restore backup</button></div>
      </aside>
      <main id="main" className="main-content">
        {practice ? <>
          <button className="back-link" onClick={() => setPractice(null)}><ChevronLeft size={18}/> Back to {course?.title}</button>
          <div className="practice-heading"><div><p className="eyeline">{practice.chapter.title}</p><h1>{finished ? 'Practice complete' : 'Question ' + (practice.index + 1) + ' of ' + questions.length}</h1></div><span className="progress-label">{finished ? score + '/' + questions.length + ' correct' : Math.round((practice.index / questions.length) * 100) + '% complete'}</span></div>
          {finished ? <div className="result-panel"><div className="result-score">{score} <span>/ {questions.length}</span></div><h2>{score === questions.length ? 'Excellent work.' : 'Keep practicing.'}</h2><p>You answered {score} of {questions.length} questions correctly.</p><div className="row-actions"><button className="button primary" onClick={() => startPractice(practice.chapter)}><RotateCcw size={18}/> Try again</button><button className="button secondary" onClick={() => setPractice(null)}>Back to chapters</button></div></div> :
          <section className="question-panel"><div className="question-count">{practice.index + 1} / {questions.length}</div><h2>{currentQuestion.stem}</h2><div className="answer-list">{currentQuestion.options.map(option => { const correct = option.id === currentQuestion.correctOptionId; const chosen = option.id === selectedAnswer; return <button key={option.id} disabled={practice.revealed} className={'answer-option ' + (chosen ? 'chosen ' : '') + (practice.revealed && correct ? 'correct ' : '') + (practice.revealed && chosen && !correct ? 'incorrect' : '')} onClick={() => setPractice({ ...practice, answers: { ...practice.answers, [currentQuestion.id]: option.id } })}><span className="option-letter">{option.id}</span><span>{option.text}</span>{practice.revealed && correct && <Check size={19}/>}</button>; })}</div>{practice.revealed && <div className="explanation"><strong>{selectedAnswer === currentQuestion.correctOptionId ? 'Correct' : 'Review this answer'}</strong><p>{currentQuestion.explanation}</p>{currentQuestion.source && <small>Source: {currentQuestion.source}</small>}</div>}<div className="question-footer"><button className="button secondary" disabled={!practice.index} onClick={() => setPractice({ ...practice, index: practice.index - 1, revealed: false })}><ChevronLeft size={17}/> Previous</button>{practice.revealed ? <button className="button primary" onClick={() => setPractice({ ...practice, index: practice.index + 1, revealed: false })}>{practice.index === questions.length - 1 ? 'View results' : 'Next question'} <ChevronRight size={17}/></button> : <button className="button primary" disabled={!selectedAnswer} onClick={() => setPractice({ ...practice, revealed: true })}>Check answer</button>}</div></section>}
        </> : course ? <>
          <div className="breadcrumb">Courses <ChevronRight size={15}/> {course.title}</div>
          <div className="course-heading"><div><h1>{course.title}</h1><p>{course.code} · {course.chapters.length} {course.chapters.length === 1 ? 'chapter' : 'chapters'} / {questionCount(course)} {questionCount(course) === 1 ? 'question' : 'questions'}</p></div><button className="button secondary" onClick={() => setModal({ type: 'delete-course' })}>Delete course</button></div>
          <div className="section-heading"><div><h2>Chapters</h2><p>Practice by chapter, or add more content to your question bank.</p></div><button className="button primary" onClick={() => setModal({ type: 'chapter' })}><Plus size={19}/> Add chapter</button></div>
          {course.chapters.length ? <div className="chapter-list">{course.chapters.map((chapter, index) => <article className="chapter-row" key={chapter.id}><span className="chapter-number">{index + 1}</span><div className="chapter-text"><h3>{chapter.title}</h3><p>{chapter.description || 'Questions for this chapter'}</p><button className="text-action" onClick={() => setModal({ type: 'question', chapterId: chapter.id })}><Plus size={15}/> Add question</button></div><span className="question-total">{chapter.questions.length} {chapter.questions.length === 1 ? 'question' : 'questions'}</span><button className="button secondary" disabled={!chapter.questions.length} onClick={() => startPractice(chapter)}>Start practice <ChevronRight size={16}/></button></article>)}</div> : <div className="empty-main"><BookOpen size={33}/><h3>No chapters yet</h3><p>Add a chapter or import questions generated from your lecture materials.</p><button className="button primary" onClick={() => setModal({ type: 'chapter' })}><Plus size={17}/> Add chapter</button></div>}
        </> : <div className="welcome"><BookOpen size={35}/><h1>Build your question bank</h1><p>Create a course, add chapters, and practice MCQs from your lecture material. You can also import a JSON file prepared by your Notion AI agent.</p><div className="row-actions"><button className="button primary" onClick={() => setModal({ type: 'course' })}><Plus size={18}/> Create course</button><button className="button secondary" onClick={() => fileRef.current?.click()}><Upload size={18}/> Import JSON</button></div></div>}
      </main>
      <aside className="info-sidebar"><div className="import-panel"><h2>Import questions</h2><p>Add MCQs from a JSON file. Everything stays on this device.</p><button className="button secondary import-button" onClick={() => fileRef.current?.click()}><Upload size={18}/> Import JSON file</button><hr/><h3>Expected file structure</h3><p>One course with one or more chapters. Each question has choices, a correct answer, and an explanation.</p><pre>{'{\n  "version": 1,\n  "course": {\n    "code": "EC2204",\n    "title": "Economics"\n  },\n  "chapters": [\n    { "title": "Markets",\n      "questions": [ ... ] }\n  ]\n}'}</pre><a className="guide-link" href={import.meta.env.BASE_URL + 'IMPORT_FORMAT.md'} target="_blank" rel="noreferrer"><CircleHelp size={17}/> View full format guide</a></div></aside>
    </div>
    <footer><strong>MCQer</strong><span>A local-first study tool</span><span className="footer-end">Built for better practice</span></footer>
    <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importFile}/>
    <input ref={backupRef} type="file" accept=".json,application/json" hidden onChange={restoreBackup}/>
    {notice && <div className="toast" role="status">{notice}</div>}
    {modal && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setModal(null); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-top"><h2 id="modal-title">{({ course: 'Create course', chapter: 'Add chapter', question: 'Add question', errors: 'Import needs attention', 'delete-course': 'Delete course' })[modal.type]}</h2><button className="icon-button" aria-label="Close" onClick={() => setModal(null)}><X size={20}/></button></div>
      {modal.type === 'course' && <form onSubmit={saveCourse}><label>Course code<input name="code" placeholder="e.g. EC2204" required maxLength="30"/></label><label>Course title<input name="title" placeholder="e.g. Business Economics 1" required maxLength="120"/></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button><button className="button primary">Create course</button></div></form>}
      {modal.type === 'chapter' && <form onSubmit={saveChapter}><label>Chapter title<input name="title" placeholder="e.g. Markets and price signals" required maxLength="150"/></label><label>Description <span className="optional">optional</span><textarea name="description" rows="3" placeholder="What does this chapter cover?"/></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button><button className="button primary">Add chapter</button></div></form>}
      {modal.type === 'question' && <form onSubmit={saveQuestion}><input type="hidden" name="chapterId" value={modal.chapterId}/><label>Question<input name="stem" required placeholder="Enter the question"/></label><div className="option-fields">{['A','B','C','D'].map(id => <label key={id}>Option {id}<input name={'option' + id} required placeholder={'Answer ' + id}/></label>)}</div><label>Correct answer<select name="correctOptionId">{['A','B','C','D'].map(id => <option key={id} value={id}>Option {id}</option>)}</select></label><label>Explanation<textarea name="explanation" rows="3" required placeholder="Why is this answer correct?"/></label><label>Source <span className="optional">optional</span><input name="source" placeholder="e.g. Week 3 lecture slides"/></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button><button className="button primary">Add question</button></div></form>}
      {modal.type === 'errors' && <div className="error-content"><p>No questions were imported. Please fix these issues:</p><ul>{modal.errors.map((error, index) => <li key={index}>{error}</li>)}</ul><button className="button primary" onClick={() => setModal(null)}>Close</button></div>}
      {modal.type === 'delete-course' && <div className="error-content"><p>Delete <strong>{course.title}</strong> and all its chapters and questions from this browser? This cannot be undone without a backup.</p><div className="modal-actions"><button className="button secondary" onClick={() => setModal(null)}>Cancel</button><button className="button danger" onClick={deleteCourse}>Delete course</button></div></div>}
    </div></div>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
