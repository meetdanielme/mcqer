import { Modal } from './Modal.jsx';
import { createSession, readStudy, questionKey } from './study.js';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, Check, ChevronLeft, ChevronRight, CircleHelp, Download, GraduationCap, Menu, Plus, RotateCcw, Upload, X } from 'lucide-react';
import { loadCourses, mergeBackup, mergeImport, questionCount, questionFingerprint, validateBackup, validateImport } from './data.js';
import { loadPublishedDocuments, mergePublishedCourses } from './published.js';
import { loadStoredCourses, saveStoredCourses } from './storage.js';
import { prepareImage, portableCourses } from './images.js';
import { MAX_ARTIFACT_BYTES, validateArtifact } from './artifacts.js';
import { QuestionArtifact } from './QuestionArtifact.jsx';
import { QuestionImage } from './QuestionImage.jsx';
import { PwaStatus } from './PwaStatus.jsx';
import '@fontsource/fira-sans/latin-400.css';
import '@fontsource/fira-sans/latin-500.css';
import '@fontsource/fira-sans/latin-600.css';
import '@fontsource/fira-sans/latin-700.css';
import '@fontsource/merriweather/latin-400.css';
import '@fontsource/merriweather/latin-700.css';
import './styles.css';

function App() {
  const [localCourses, setLocalCourses] = useState([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [questionImage, setQuestionImage] = useState(null);
  const [questionArtifact, setQuestionArtifact] = useState(null);
  const [artifactError, setArtifactError] = useState('');
  const [artifactLoading, setArtifactLoading] = useState(false);
  const artifactRequest = useRef(0);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [exporting, setExporting] = useState(false);
  const imageRequest = useRef(0);
  const [publishedDocuments, setPublishedDocuments] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [selectedCode, setSelectedCode] = useState(() => readStudy().session?.code || null);
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [study, setStudy] = useState(readStudy);
  const [practice, setPractice] = useState(() => readStudy().session);
  const [studyError, setStudyError] = useState('');
  const [search, setSearch] = useState('');
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [settings, setSettings] = useState({ limit: 20, shuffleQuestions: true, shuffleOptions: false });
  const [catalogRetry, setCatalogRetry] = useState(0);
  useEffect(() => {
    try { localStorage.setItem('mcqer-study-v1', JSON.stringify({ ...study, session: practice })); setStudyError(''); }
    catch { setStudyError('Study progress could not be saved. Keep this tab open to retain your session.'); }
  }, [study, practice]);
  const menuRef = useRef(null);
  const fileRef = useRef(null);
  const backupRef = useRef(null);
  const courses = useMemo(() => mergePublishedCourses(localCourses, publishedDocuments), [localCourses, publishedDocuments]);
  const publishedCodes = useMemo(() => new Set(publishedDocuments.map(item => item.course.code.trim().toLowerCase())), [publishedDocuments]);
  const course = courses.find(item => item.code.toLowerCase() === selectedCode?.toLowerCase()) || courses[0];
  const isPublished = Boolean(course && publishedCodes.has(course.code.toLowerCase()));
  useEffect(() => {
    loadStoredCourses().then(setLocalCourses).catch(() => {
      setLocalCourses(loadCourses());
      setStorageError('Device storage is unavailable. Download a backup to keep your changes.');
    }).finally(() => setStorageLoaded(true));
  }, []);
  useEffect(() => {
    if (!storageLoaded) return;
    saveStoredCourses(localCourses).then(() => setStorageError('')).catch(() => setStorageError('Your latest changes could not be saved on this device. Download a backup before closing MCQer.'));
  }, [localCourses, storageLoaded]);
  useEffect(() => {
    let active = true;
    loadPublishedDocuments(import.meta.env.BASE_URL, fetch, errors => { if (active) setCatalogError(errors.join(' ')); }).then(documents => {
      if (active) { setPublishedDocuments(documents); setCatalogLoading(false); }
    }).catch(error => {
      if (active) { setCatalogError(error.message); setCatalogLoading(false); }
    });
    return () => { active = false; };
  }, [catalogRetry]);
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(timer); } }, [notice]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 701px)');
    const closeOnDesktop = () => { if (desktop.matches) menuRef.current?.close(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  const closeMenu = () => menuRef.current?.close();
  const openModal = value => { closeMenu(); setModal(value); };
  useEffect(() => {
    imageRequest.current++; artifactRequest.current++;
    setQuestionArtifact(null); setArtifactError(''); setArtifactLoading(false);
    setQuestionImage(null); setImageError(''); setImageLoading(false);
  }, [modal]);
  const openImport = () => { closeMenu(); fileRef.current?.click(); };
  const updateCourse = updated => setLocalCourses(current => {
    const index = current.findIndex(item => item.code.toLowerCase() === updated.code.toLowerCase());
    if (index < 0) return [...current, updated];
    const next = [...current]; next[index] = updated; return next;
  });

  function saveCourse(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = String(form.get('code')).trim();
    const title = String(form.get('title')).trim();
    if (courses.some(item => item.code.toLowerCase() === code.toLowerCase())) { setNotice('A course with that code already exists.'); return; }
    if (!code || !title) { setNotice('Enter a course code and title.'); return; }
    const created = { id: crypto.randomUUID(), code, title, chapters: [] };
    setLocalCourses([...localCourses, created]); setSelectedCode(created.code); setModal(null);
  }
  function saveChapter(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title')).trim();
    if (!title) { setNotice('Enter a chapter title.'); return; }
    if (course.chapters.some(item => item.title.toLowerCase() === title.toLowerCase())) { setNotice('That chapter already exists.'); return; }
    const chapter = { id: crypto.randomUUID(), title, description: String(form.get('description')).trim(), questions: [] };
    updateCourse({ ...course, chapters: [...course.chapters, chapter] }); setModal(null);
  }
  function saveQuestion(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (imageLoading || imageError || artifactLoading || artifactError) return;
    const chapterId = String(form.get('chapterId'));
    const options = ['A', 'B', 'C', 'D'].map(id => ({ id, text: String(form.get('option' + id)).trim() }));
    const question = { id: crypto.randomUUID(), stem: String(form.get('stem')).trim(), options, correctOptionId: String(form.get('correctOptionId')), explanation: String(form.get('explanation')).trim(), source: String(form.get('source')).trim() };
    if (questionArtifact) question.artifact = { html: questionArtifact, title: String(form.get('artifactTitle')).trim() };
    if (questionImage) question.image = { src: questionImage, alt: String(form.get('imageAlt')).trim() };
    const issues = validateImport({ version: 1, course, chapters: [{ title: 'Question', questions: [question] }] });
    if (issues.length) { setNotice(issues.join(' ')); return; }
    if (course.chapters.some(chapter => chapter.questions.some(existing => questionFingerprint(existing) === questionFingerprint(question)))) { setNotice('That question already exists in this course.'); return; }
    updateCourse({ ...course, chapters: course.chapters.map(chapter => chapter.id === chapterId ? { ...chapter, questions: [...chapter.questions, question] } : chapter) }); setModal(null);
  }
  function deleteCourse() {
    if (isPublished) return;
    setLocalCourses(current => current.filter(item => item.code.toLowerCase() !== course.code.toLowerCase()));
    setSelectedCode(null); setPractice(null); setModal(null);
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
    let result;
    try { result = mergeImport(localCourses, input); } catch (error) { setModal({ type: 'errors', errors: [error.message] }); return; }
    setLocalCourses(result.courses); setSelectedCode(input.course.code.trim()); setPractice(null);
    setNotice('Imported ' + result.added + ' new and updated ' + result.updated + ' questions.' + (result.duplicates ? ' Skipped ' + result.duplicates + ' identical questions.' : ''));
  }
  async function restoreBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); } catch { setModal({ type: 'errors', errors: ['The backup is not valid JSON.'] }); return; }
    const errors = validateBackup(data);
    if (errors.length) { setModal({ type: 'errors', errors }); return; }
    let result;
    try { result = mergeBackup(localCourses, data); } catch (error) { setModal({ type: 'errors', errors: [error.message] }); return; }
    setLocalCourses(result.courses); setPractice(null);
    setNotice('Backup merged: ' + result.added + ' new and ' + result.updated + ' updated questions.' + (result.duplicates ? ' Skipped ' + result.duplicates + ' identical questions.' : ''));
  }
  async function selectQuestionArtifact(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    const request = ++artifactRequest.current;
    setQuestionArtifact(null); setArtifactError('');
    if (!file) { setArtifactLoading(false); return; }
    setArtifactLoading(true);
    try {
      if (!/\.html?$/i.test(file.name)) throw new Error('Choose an HTML file (.html or .htm).');
      if (file.size > MAX_ARTIFACT_BYTES) throw new Error('Choose an HTML file smaller than 512 KB.');
      const html = await file.text();
      const issue = validateArtifact({ html, title: file.name });
      if (issue) throw new Error(issue);
      if (request === artifactRequest.current) setQuestionArtifact(html);
    } catch (error) { if (request === artifactRequest.current) setArtifactError(error.message); }
    finally { if (request === artifactRequest.current) setArtifactLoading(false); }
  }
  async function selectQuestionImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    const request = ++imageRequest.current;
    setQuestionImage(null); setImageError('');
    if (!file) { setImageLoading(false); return; }
    setImageLoading(true);
    try {
      const image = await prepareImage(file);
      if (request === imageRequest.current) setQuestionImage(image);
    } catch (error) {
      if (request === imageRequest.current) setImageError(error.message);
    } finally { if (request === imageRequest.current) setImageLoading(false); }
  }
  async function exportData() {
    setExporting(true);
    try {
      const portable = await portableCourses(courses, import.meta.env.BASE_URL);
      const content = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), courses: portable }, null, 2);
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'mcqer-backup.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setNotice('Backup failed: ' + error.message); }
    finally { setExporting(false); }
  }
  const startPractice = chapter => { const session = createSession(chapter, course.code, settings); if (session.chapter.questions.length) setPractice(session); };
  const submitAnswer = () => {
    if (practice.submitted[currentQuestion.id]) return;
    const answer = selectedAnswer;
    setPractice({ ...practice, revealed: true, submitted: { ...practice.submitted, [currentQuestion.id]: answer } });
    setStudy(current => ({ ...current, attempts: [...current.attempts, { key: questionKey(practice.code, currentQuestion.id), answer, correct: answer === currentQuestion.correctOptionId, at: new Date().toISOString() }].slice(-5000) }));
  };
  const matches = question => (!bookmarksOnly || study.bookmarks.includes(questionKey(course.code, question.id))) && (!search.trim() || [question.stem, question.source, ...question.options.map(option => option.text)].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
  const matchingQuestions = course?.chapters.flatMap(chapter => chapter.questions).filter(matches) || [];
  const wrongKeys = new Set(study.attempts.filter(attempt => !attempt.correct).map(attempt => attempt.key));
  const questions = practice?.chapter.questions || [];
  const currentQuestion = questions[practice?.index || 0];
  const selectedAnswer = practice?.answers[currentQuestion?.id];
  const finished = practice && practice.index >= questions.length;
  const score = practice ? questions.filter(item => practice.submitted[item.id] === item.correctOptionId).length : 0;

  const navigation = <>
        <div className="sidebar-heading"><h2>Your courses</h2><button className="button small secondary" onClick={() => openModal({ type: 'course' })}><Plus size={16}/> Create course</button></div>
        {courses.length ? <nav className="course-list" aria-label="Choose a course">{courses.map(item => <button key={item.code} aria-current={course?.code === item.code ? 'page' : undefined} className={'course-item ' + (course?.code === item.code ? 'active' : '')} onClick={() => { setSelectedCode(item.code); setPractice(null); closeMenu(); }}><GraduationCap size={22}/><span><strong>{item.title}</strong><small>{item.chapters.length} {item.chapters.length === 1 ? 'chapter' : 'chapters'} · {questionCount(item)} {questionCount(item) === 1 ? 'question' : 'questions'}{publishedCodes.has(item.code.toLowerCase()) ? ' · Shared' : ''}</small></span></button>)}</nav> : <div className="sidebar-empty">{catalogLoading ? 'Loading shared questions…' : 'Create your first course or import a JSON file to begin.'}</div>}
        <div className="import-panel"><h2>Import questions</h2><p>Import a JSON file for your own practice. To share it with classmates, add the file to the repository.</p><button className="button secondary import-button" onClick={openImport}><Upload size={18}/> Import JSON file</button><hr/><h3>Expected file structure</h3><p>One course with one or more chapters. Each question has choices, a correct answer, and an explanation.</p><pre>{'{\n  "version": 1,\n  "course": {\n    "code": "EC2204",\n    "title": "Economics"\n  },\n  "chapters": [\n    { "title": "Markets",\n      "questions": [ ... ] }\n  ]\n}'}</pre><a className="guide-link" href={import.meta.env.BASE_URL + 'IMPORT_FORMAT.md'} target="_blank" rel="noreferrer"><CircleHelp size={17}/> Import and publish guide</a></div>
        <div className="sidebar-bottom"><button className="plain-link" onClick={() => { closeMenu(); exportData(); }} disabled={!courses.length || exporting}><Download size={17}/> {exporting ? 'Preparing backup…' : 'Download backup'}</button><button className="plain-link" onClick={() => { closeMenu(); backupRef.current?.click(); }}><Upload size={17}/> Restore backup</button></div>

  </>;

  if (!storageLoaded) return <div className="storage-loading" role="status">Opening your question bank…</div>;

  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="topbar"><button className="icon-button menu-toggle" aria-label="Open courses and tools" aria-haspopup="dialog" onClick={() => menuRef.current?.showModal()}><Menu size={25}/></button><div className="topbar-brand"><span className="brand-name">MCQer</span><span className="brand-divider"/><span className="brand-subtitle">Question bank</span></div><PwaStatus/></header>
    <dialog ref={menuRef} className="mobile-menu" aria-labelledby="menu-title" onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeMenu();
    }}>
      <div className="menu-heading"><h2 id="menu-title">Courses and tools</h2><button className="icon-button" aria-label="Close menu" onClick={closeMenu} autoFocus><X size={22}/></button></div>
      {navigation}
    </dialog>
    <div className="workspace">
      <aside className="sidebar" aria-label="Courses and tools">{navigation}</aside>
      <main id="main" className="main-content">
        {studyError && <div role="alert">{studyError}</div>}{storageError && <div className="catalog-error" role="alert">{storageError}</div>}
        {catalogError && <div className="catalog-error" role="alert">Shared questions could not load: {catalogError} <button className="button secondary" onClick={() => { setCatalogLoading(true); setCatalogError(''); setCatalogRetry(value => value + 1); }}>Retry shared courses</button></div>}
        {practice ? <>
          <button className="back-link" onClick={() => setPractice(null)}><ChevronLeft size={18}/> Back to {course?.title}</button>
          <div className="practice-heading"><div><p className="eyeline">{practice.chapter.title}</p><h1>{finished ? 'Practice complete' : 'Question ' + (practice.index + 1) + ' of ' + questions.length}</h1></div><span className="progress-label">{finished ? score + '/' + questions.length + ' correct' : Math.round((practice.index / questions.length) * 100) + '% complete'}</span></div>
          {finished ? <div className="result-panel"><div className="result-score">{score} <span>/ {questions.length}</span></div><h2>{score === questions.length ? 'Excellent work.' : 'Keep practicing.'}</h2><p>You answered {score} of {questions.length} questions correctly.</p><div className="row-actions"><button className="button primary" onClick={() => startPractice(practice.chapter)}><RotateCcw size={18}/> Try again</button><button className="button secondary" onClick={() => setPractice(null)}>Back to chapters</button></div></div> :
          <section className="question-panel"><div className="study-actions"><button className="button secondary" aria-pressed={study.bookmarks.includes(questionKey(practice.code, currentQuestion.id))} onClick={() => { const key = questionKey(practice.code, currentQuestion.id); setStudy(current => ({ ...current, bookmarks: current.bookmarks.includes(key) ? current.bookmarks.filter(item => item !== key) : [...current.bookmarks, key] })); }}>{study.bookmarks.includes(questionKey(practice.code, currentQuestion.id)) ? 'Bookmarked' : 'Bookmark'}</button><a href={'https://github.com/meetdanielme/mcqer/issues/new?title=' + encodeURIComponent('Question issue: ' + currentQuestion.id) + '&body=' + encodeURIComponent('Course: ' + practice.code + '\nQuestion: ' + currentQuestion.id + '\n' + currentQuestion.stem + '\n\nDescribe the issue and suggested correction:\n')} target="_blank" rel="noreferrer">Report an issue</a></div><div className="question-count">{practice.index + 1} / {questions.length}</div><h2>{currentQuestion.stem}</h2><>{currentQuestion.image && <QuestionImage key={'image-' + currentQuestion.id} image={currentQuestion.image}/>}{currentQuestion.artifact && <QuestionArtifact key={'artifact-' + currentQuestion.id} artifact={currentQuestion.artifact}/>}</><div className="answer-list">{currentQuestion.options.map(option => { const correct = option.id === currentQuestion.correctOptionId; const chosen = option.id === selectedAnswer; return <button key={option.id} aria-pressed={chosen} disabled={Boolean(practice.submitted[currentQuestion.id])} className={'answer-option ' + (chosen ? 'chosen ' : '') + (practice.revealed && correct ? 'correct ' : '') + (practice.revealed && chosen && !correct ? 'incorrect' : '')} onClick={() => setPractice({ ...practice, answers: { ...practice.answers, [currentQuestion.id]: option.id } })}><span className="option-letter">{option.id}</span><span>{option.text}</span>{practice.revealed && correct && <Check size={19}/>}</button>; })}</div>{practice.revealed && <div className="explanation" role="status"><strong>{selectedAnswer === currentQuestion.correctOptionId ? 'Correct' : 'Review this answer'}</strong><p>{currentQuestion.explanation}</p>{currentQuestion.source && <small>Source: {currentQuestion.source}</small>}</div>}<div className="question-footer"><button className="button secondary" disabled={!practice.index} onClick={() => setPractice({ ...practice, index: practice.index - 1, revealed: Boolean(practice.submitted[questions[practice.index - 1]?.id]) })}><ChevronLeft size={17}/> Previous</button>{practice.revealed ? <button className="button primary" onClick={() => setPractice({ ...practice, index: practice.index + 1, revealed: Boolean(practice.submitted[questions[practice.index + 1]?.id]) })}>{practice.index === questions.length - 1 ? 'View results' : 'Next question'} <ChevronRight size={17}/></button> : <button className="button primary" disabled={!selectedAnswer} onClick={submitAnswer}>Check answer</button>}</div></section>}
        </> : course ? <>
          <div className="breadcrumb">Courses <ChevronRight size={15}/> {course.title}</div>
          <div className="course-heading"><div><h1>{course.title}</h1><p>{course.code} · {course.chapters.length} {course.chapters.length === 1 ? 'chapter' : 'chapters'} / {questionCount(course)} {questionCount(course) === 1 ? 'question' : 'questions'}</p>{isPublished && <p className="shared-hint">Shared with classmates. Questions added in the app stay in this browser until published to the repo.</p>}</div>{!isPublished && <button className="button secondary" onClick={() => setModal({ type: 'delete-course' })}>Delete course</button>}</div>
          <section className="study-tools" aria-label="Study tools"><h2>Build a practice session</h2><label>Search questions<input value={search} onChange={event => setSearch(event.target.value)} type="search" placeholder="Topic, answer, or source"/></label><label><input type="checkbox" checked={bookmarksOnly} onChange={event => setBookmarksOnly(event.target.checked)}/> Bookmarked only</label><label>Question limit (0 = all)<input type="number" min="0" max="5000" value={settings.limit} onChange={event => setSettings({ ...settings, limit: Math.max(0, Number(event.target.value)) })}/></label><label><input type="checkbox" checked={settings.shuffleQuestions} onChange={event => setSettings({ ...settings, shuffleQuestions: event.target.checked })}/> Shuffle questions</label><label><input type="checkbox" checked={settings.shuffleOptions} onChange={event => setSettings({ ...settings, shuffleOptions: event.target.checked })}/> Shuffle answers</label><p>{matchingQuestions.length} matching questions · {study.attempts.filter(attempt => attempt.key.startsWith('[' + JSON.stringify(course.code.toLowerCase()) + ',')).length} answers submitted on this device</p><div className="row-actions"><button className="button primary" disabled={!matchingQuestions.length} onClick={() => startPractice({ title: 'Mixed practice', questions: matchingQuestions })}>Start mixed practice</button><button className="button secondary" disabled={!matchingQuestions.some(question => wrongKeys.has(questionKey(course.code, question.id)))} onClick={() => startPractice({ title: 'Review mistakes', questions: matchingQuestions.filter(question => wrongKeys.has(questionKey(course.code, question.id))) })}>Review mistakes</button></div>{(search.trim() || bookmarksOnly) && <ul className="search-results">{matchingQuestions.slice(0, 50).map(question => <li key={question.id}><button className="plain-link" onClick={() => startPractice({ title: 'Selected question', questions: [question] })}>{question.stem}</button></li>)}{matchingQuestions.length > 50 && <li>Showing the first 50 matches. Narrow your search to see more.</li>}</ul>}</section><div className="section-heading"><div><h2>Chapters</h2><p>Practice by chapter, or add more content to your question bank.</p></div><button className="button primary" onClick={() => setModal({ type: 'chapter' })}><Plus size={19}/> Add chapter</button></div>
          {course.chapters.length ? <div className="chapter-list">{course.chapters.map((chapter, index) => <article className="chapter-row" key={chapter.id}><span className="chapter-number">{index + 1}</span><div className="chapter-text"><h3>{chapter.title}</h3><p>{chapter.description || 'Questions for this chapter'}</p><button className="text-action" onClick={() => setModal({ type: 'question', chapterId: chapter.id })}><Plus size={15}/> Add question</button></div><span className="question-total">{chapter.questions.length} {chapter.questions.length === 1 ? 'question' : 'questions'}</span><button className="button secondary" disabled={!chapter.questions.filter(matches).length} onClick={() => startPractice({ ...chapter, questions: chapter.questions.filter(matches) })}>Start practice <ChevronRight size={16}/></button></article>)}</div> : <div className="empty-main"><BookOpen size={33}/><h3>No chapters yet</h3><p>Add a chapter or import questions generated from your lecture materials.</p><button className="button primary" onClick={() => setModal({ type: 'chapter' })}><Plus size={17}/> Add chapter</button></div>}
        </> : <div className="welcome"><BookOpen size={35}/><h1>Build your question bank</h1><p>Shared courses will appear here when published to the repository. You can also create a course or import JSON from your Notion AI agent for your own practice.</p><div className="row-actions"><button className="button primary" onClick={() => setModal({ type: 'course' })}><Plus size={18}/> Create course</button><button className="button secondary" onClick={() => fileRef.current?.click()}><Upload size={18}/> Import JSON</button></div></div>}
      </main>
    </div>
    <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importFile}/>
    <input ref={backupRef} type="file" accept=".json,application/json" hidden onChange={restoreBackup}/>
    {notice && <div className="toast" role="status">{notice}</div>}
    {modal && <Modal onClose={() => setModal(null)}><div className="modal-top"><h2 id="modal-title">{({ course: 'Create course', chapter: 'Add chapter', question: 'Add question', errors: 'Import needs attention', 'delete-course': 'Delete course' })[modal.type]}</h2><button className="icon-button" aria-label="Close" onClick={() => setModal(null)}><X size={20}/></button></div>
      {modal.type === 'course' && <form onSubmit={saveCourse}><label>Course code<input name="code" placeholder="e.g. EC2204" required maxLength="30"/></label><label>Course title<input name="title" placeholder="e.g. Business Economics 1" required maxLength="120"/></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button><button className="button primary">Create course</button></div></form>}
      {modal.type === 'chapter' && <form onSubmit={saveChapter}><label>Chapter title<input name="title" placeholder="e.g. Markets and price signals" required maxLength="150"/></label><label>Description <span className="optional">optional</span><textarea name="description" rows="3" placeholder="What does this chapter cover?"/></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button><button className="button primary">Add chapter</button></div></form>}
      {modal.type === 'question' && <form onSubmit={saveQuestion}><input type="hidden" name="chapterId" value={modal.chapterId}/><label>Question<input name="stem" required placeholder="Enter the question"/></label><fieldset className="image-upload"><legend>Question image <span className="optional">optional</span></legend><label>Upload image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectQuestionImage}/></label><p>PNG, JPEG or WebP. Large images are resized for offline use.</p>{imageLoading && <p role="status">Preparing image…</p>}{imageError && <><p role="alert" className="image-error">{imageError}</p><button type="button" className="plain-link" onClick={() => setImageError('')}>Remove image</button></>}{questionImage && <><img className="upload-preview" src={questionImage} alt="Selected question image preview"/><label>Image description<input name="imageAlt" required maxLength="500" placeholder="Describe the diagram, chart or screenshot"/></label><button type="button" className="plain-link" onClick={() => { imageRequest.current++; setQuestionImage(null); setImageError(''); }}>Remove image</button></>}</fieldset><fieldset className="image-upload"><legend>HTML chart <span className="optional">optional</span></legend><label>Upload HTML chart<input type="file" accept=".html,.htm,text/html" onChange={selectQuestionArtifact}/></label><p>Self-contained HTML, up to 512 KB. Ask Notion for inline SVG or bundled CSS and JavaScript; external libraries and network requests are blocked.</p>{artifactLoading && <p role="status">Reading chart…</p>}{artifactError && <><p role="alert" className="image-error">{artifactError}</p><button type="button" className="plain-link" onClick={() => setArtifactError('')}>Remove chart</button></>}{questionArtifact && <><label>Chart description<input name="artifactTitle" required maxLength="500" placeholder="e.g. Demand and supply equilibrium"/></label><QuestionArtifact artifact={{html: questionArtifact, title: 'Selected chart preview'}}/><button type="button" className="plain-link" onClick={() => { artifactRequest.current++; setQuestionArtifact(null); setArtifactError(''); }}>Remove chart</button></>}</fieldset><div className="option-fields">{['A','B','C','D'].map(id => <label key={id}>Option {id}<input name={'option' + id} required placeholder={'Answer ' + id}/></label>)}</div><label>Correct answer<select name="correctOptionId">{['A','B','C','D'].map(id => <option key={id} value={id}>Option {id}</option>)}</select></label><label>Explanation<textarea name="explanation" rows="3" required placeholder="Why is this answer correct?"/></label><label>Source <span className="optional">optional</span><input name="source" placeholder="e.g. Week 3 lecture slides"/></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button><button className="button primary" disabled={imageLoading || Boolean(imageError) || artifactLoading || Boolean(artifactError)}>Add question</button></div></form>}
      {modal.type === 'errors' && <div className="error-content"><p>No questions were imported. Please fix these issues:</p><ul>{modal.errors.map((error, index) => <li key={index}>{error}</li>)}</ul><button className="button primary" onClick={() => setModal(null)}>Close</button></div>}
      {modal.type === 'delete-course' && <div className="error-content"><p>Delete <strong>{course.title}</strong> and all its chapters and questions from this browser? This cannot be undone without a backup.</p><div className="modal-actions"><button className="button secondary" onClick={() => setModal(null)}>Cancel</button><button className="button danger" onClick={deleteCourse}>Delete course</button></div></div>}
    </Modal>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
