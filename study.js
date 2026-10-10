// study.js
// Study material for a passage: the Latin Vulgate, cross-references, and
// what the Fathers of the Church wrote about it.
//
// Each book's material is a file of its own, fetched when first wanted and
// kept by the service worker afterwards:
//   study-BOOK.json    { latin: [[verse, ...], ...], xrefs: { chapter: { verse: [[book, c, v, c2?, v2?]] } } }
//   fathers-BOOK.json  { authors: [{ name, year?, note? }],
//                             entries: [{ a: author, s: [c1, v1, c2, v2], w: work, q: passage, c?: 1 }] }
//   data-fathers.json       { books: { BOOK: count } }
//
// A book's commentary names its own authors, earliest first, so that a file
// saved on the device stays right whatever a later release changes.

import { saveForOffline } from './bible.js';

export const STUDY_PREFIX = 'study-';
export const FATHERS_PREFIX = 'fathers-';

const studyBooks = new Map();
const fathersBooks = new Map();
let fathersIndex = null;

async function fetchJson(path, what) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${what} could not be loaded.`);
  return response.json();
}

async function once(cache, key, load) {
  if (!cache.has(key)) {
    // A failed load is forgotten, so that it can be tried again once back online.
    cache.set(key, load().catch((error) => { cache.delete(key); throw error; }));
  }
  return cache.get(key);
}

/** The Latin text and cross-references of one book. */
export function loadStudy(bookId) {
  return once(studyBooks, bookId, () => fetchJson(`${STUDY_PREFIX}${bookId}.json`, 'The Latin text'));
}

/** Which books have commentary, and how much: { books: { BOOK: count } }. */
export async function loadFathersIndex() {
  if (!fathersIndex) fathersIndex = await fetchJson('data-fathers.json', 'The list of the Fathers');
  return fathersIndex;
}

/** The commentary on one book: { authors, entries }, both empty for a book with none. */
export async function loadFathers(bookId) {
  const index = await loadFathersIndex();
  if (!index.books[bookId]) return { authors: [], entries: [] };
  return once(fathersBooks, bookId, () => fetchJson(`${FATHERS_PREFIX}${bookId}.json`, 'The Fathers’ commentary'));
}

/** The Latin of one chapter, verse by verse (index 0 is verse 1), or null if it cannot be had. */
export async function latinFor(bookId, chapter) {
  const study = await loadStudy(bookId);
  return study.latin[chapter - 1] || null;
}

/** Cross-references from the verses of a span, without repeats: [[book, c1, v1, c2, v2]]. */
export async function crossReferences(bookId, chapter, first, last) {
  const study = await loadStudy(bookId);
  const byVerse = study.xrefs[String(chapter)] || {};
  const seen = new Set();
  const found = [];
  for (let verse = first; verse <= last; verse += 1) {
    for (const [book, c1, v1, c2, v2] of byVerse[String(verse)] || []) {
      const span = [book, c1, v1, c2 || c1, v2 || v1];
      const key = span.join('.');
      if (!seen.has(key)) {
        seen.add(key);
        found.push(span);
      }
    }
  }
  return found;
}

const position = (chapter, verse) => chapter * 1000 + verse;

/**
 * What the Fathers wrote on a span of verses, grouped by writer, earliest
 * first, with those whose date is not known at the end.
 *
 * @returns {Promise<Array<{name, year, note, passages: Array<{span, work, text, catena, close}>}>>}
 *   `close` is true for a passage written on these verses in particular,
 *   false for one that covers a much longer stretch that includes them.
 */
export async function commentaryOn(bookId, chapter, first, last) {
  const { authors, entries } = await loadFathers(bookId);
  const from = position(chapter, first);
  const to = position(chapter, last);
  const byAuthor = new Map();
  for (const entry of entries) {
    const [c1, v1, c2, v2] = entry.s;
    const start = position(c1, v1);
    const end = position(c2, v2);
    if (end < from || start > to) continue;
    const reach = c1 === c2 ? v2 - v1 + 1 : 999;
    const passage = { span: entry.s, work: entry.w, text: entry.q, catena: Boolean(entry.c), close: reach <= Math.max(12, (last - first + 1) * 3) };
    if (!byAuthor.has(entry.a)) byAuthor.set(entry.a, []);
    byAuthor.get(entry.a).push(passage);
  }
  return [...byAuthor.entries()]
    .sort((a, b) => a[0] - b[0]) // the author list is in order of date
    .map(([authorIndex, passages]) => ({
      ...authors[authorIndex],
      passages: passages.sort((a, b) => Number(b.close) - Number(a.close) || position(a.span[0], a.span[1]) - position(b.span[0], b.span[1])),
    }));
}

/** As saveLoadedBooks() in bible.js, for the study files already in memory. */
export async function saveLoadedStudy() {
  await saveForOffline([
    ...[...studyBooks.keys()].map((id) => `${STUDY_PREFIX}${id}.json`),
    ...[...fathersBooks.keys()].map((id) => `${FATHERS_PREFIX}${id}.json`),
  ]);
}

/**
 * Whether the study files of every book are already in the offline cache.
 * False where the browser gives no way of knowing.
 */
export async function studySavedOffline(bookIds) {
  if (!('caches' in window)) return false;
  const index = await loadFathersIndex();
  const wanted = studyPaths(bookIds, index);
  const found = await Promise.all(wanted.map((path) => caches.match(path, { ignoreSearch: true })));
  return found.every(Boolean);
}

function studyPaths(bookIds, index) {
  return [
    ...bookIds.map((id) => `${STUDY_PREFIX}${id}.json`),
    ...bookIds.filter((id) => index.books[id]).map((id) => `${FATHERS_PREFIX}${id}.json`),
  ];
}

/**
 * Fetch every study file, so that the Latin and the commentary are in the
 * offline cache. The files are only passed through to the cache, not kept in
 * memory: together they are several times the size of the Bible. Calls
 * onProgress(done, total) as it goes.
 */
export async function loadAllStudy(bookIds, onProgress) {
  if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
    throw new Error('Offline storage is not ready yet. Close the app, open it again, and try once more.');
  }
  const index = await loadFathersIndex();
  const paths = studyPaths(bookIds, index);
  let done = 0;
  for (const path of paths) {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Some files could not be saved. Check your connection and try again.');
    // Reading to the end makes sure the whole file arrived before it is counted.
    await response.arrayBuffer();
    done += 1;
    if (onProgress) onProgress(done, paths.length);
  }
}
