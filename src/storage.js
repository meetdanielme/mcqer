import { loadCourses } from './data.js';

let database;
let writes = Promise.resolve();
function openDatabase() {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open('mcqer', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('data');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(error => { database = undefined; throw error; });
  return database;
}

export async function loadStoredCourses() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('data').objectStore('data').get('courses');
    request.onsuccess = () => resolve(request.result ?? loadCourses());
    request.onerror = () => reject(request.error);
  });
}

export function saveStoredCourses(courses) {
  writes = writes.catch(() => {}).then(async () => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('data', 'readwrite');
      transaction.objectStore('data').put(courses, 'courses');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Storage write cancelled.'));
    });
  });
  return writes;
}
