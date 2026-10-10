// bible.js
// The Bible text and everything about references: loading books, naming
// verses, formatting and parsing citations.
//
// A verse id is "BOOK.chapter.verse" ("GEN.1.1"), using the three-letter
// codes in data-books.json. Ids are what notes, highlights and links store,
// so their form must never change.

// Each book is one file: this prefix, the book's id, then ".json".
export const TEXT_PREFIX = 'drb-';

let index = null; // parsed data-books.json
let byId = new Map();
const loaded = new Map(); // book id -> chapters (array of arrays of verse text)
const pending = new Map();

export async function loadIndex() {
  if (!index) {
    const response = await fetch('data-books.json');
    if (!response.ok) throw new Error('The book list could not be loaded.');
    index = await response.json();
    byId = new Map(index.books.map((book, position) => [book.id, { ...book, position }]));
  }
  return index;
}

export function books() {
  return index ? index.books : [];
}

export function book(id) {
  return byId.get(id) || null;
}

export function translation() {
  return index ? index.translation : null;
}

/** The Vulgate number for a modern psalm number, or null when they agree. */
export function vulgatePsalm(chapter) {
  const label = index && index.vulgatePsalms ? index.vulgatePsalms[String(chapter)] : null;
  return label && label !== String(chapter) ? label : null;
}

export async function loadBook(id) {
  if (loaded.has(id)) return loaded.get(id);
  if (!pending.has(id)) {
    pending.set(id, (async () => {
      try {
        const response = await fetch(`${TEXT_PREFIX}${id}.json`);
        if (!response.ok) throw new Error(`${book(id) ? book(id).name : id} could not be loaded.`);
        const data = await response.json();
        loaded.set(id, data.chapters);
        return data.chapters;
      } finally {
        // Whether it worked or not, the next request starts afresh: a book
        // that failed to load while offline can be fetched once back online.
        pending.delete(id);
      }
    })());
  }
  return pending.get(id);
}

/**
 * Fetch every book, so the whole Bible is in the offline cache and in memory.
 * Calls onProgress(done, total) after each book.
 */
export async function loadAllBooks(onProgress) {
  const all = books();
  let done = 0;
  for (const entry of all) {
    await loadBook(entry.id);
    done += 1;
    if (onProgress) onProgress(done, all.length);
  }
  await saveLoadedBooks();
}

/**
 * Make sure every book in memory is also in the offline cache. A book read
 * before the service worker took charge, as happens on a first visit, was
 * fetched past it and never saved; fetching it once more puts that right.
 */
export async function saveLoadedBooks() {
  await saveForOffline([...loaded.keys()].map((id) => `${TEXT_PREFIX}${id}.json`));
}

/** How many books of the Bible are in the offline cache, or null where the browser cannot say. */
export async function savedBookCount() {
  if (!('caches' in window)) return null;
  const found = await Promise.all(books().map((entry) => caches.match(`${TEXT_PREFIX}${entry.id}.json`, { ignoreSearch: true })));
  return found.filter(Boolean).length;
}

/** Fetch, through the service worker, whichever of these files the offline cache lacks. */
export async function saveForOffline(paths) {
  if (!('caches' in window) || !navigator.serviceWorker || !navigator.serviceWorker.controller) return;
  for (const path of paths) {
    if (await caches.match(path, { ignoreSearch: true })) continue;
    const response = await fetch(path);
    // Reading to the end makes sure the whole file arrived.
    await response.arrayBuffer();
  }
}

export function isLoaded(id) {
  return loaded.has(id);
}

export function loadedCount() {
  return loaded.size;
}

// ---------------------------------------------------------------------------
// Verse ids
// ---------------------------------------------------------------------------

export function verseId(bookId, chapter, verse) {
  return `${bookId}.${chapter}.${verse}`;
}

export function parseVerseId(id) {
  const [bookId, chapter, verse] = id.split('.');
  return { book: bookId, chapter: Number(chapter), verse: Number(verse) };
}

/** A number that sorts verse ids in canonical order. */
export function verseOrder(id) {
  const { book: bookId, chapter, verse } = parseVerseId(id);
  const entry = book(bookId);
  return (entry ? entry.position : 99) * 1000000 + chapter * 1000 + verse;
}

// ---------------------------------------------------------------------------
// Formatting references
// ---------------------------------------------------------------------------

export function chapterTitle(bookId, chapter) {
  const entry = book(bookId);
  if (!entry) return '';
  if (bookId === 'PSA') return `Psalm ${chapter}`;
  return entry.chapters.length === 1 ? entry.name : `${entry.name} ${chapter}`;
}

/**
 * Format a span of verses, e.g. "John 3:16", "John 3:16–18", "Genesis 1–3".
 * A span is [firstChapter, firstVerse, lastChapter, lastVerse].
 */
export function formatSpan(bookId, [c1, v1, c2, v2], { short = false } = {}) {
  const entry = book(bookId);
  if (!entry) return bookId;
  let name = short ? entry.short : entry.name;
  if (bookId === 'PSA' && !short) name = 'Psalm';
  const single = entry.chapters.length === 1;
  const wholeChapters = v1 === 1 && v2 === entry.chapters[c2 - 1];
  if (wholeChapters) {
    if (single) return name;
    if (bookId === 'PSA' && !short && c1 !== c2) name = 'Psalms';
    return c1 === c2 ? `${name} ${c1}` : `${name} ${c1}–${c2}`;
  }
  if (c1 === c2) {
    const verses = v1 === v2 ? `${v1}` : `${v1}–${v2}`;
    return single ? `${name} ${verses}` : `${name} ${c1}:${verses}`;
  }
  return `${name} ${c1}:${v1}–${c2}:${v2}`;
}

export function formatVerseId(id, options) {
  const { book: bookId, chapter, verse } = parseVerseId(id);
  return formatSpan(bookId, [chapter, verse, chapter, verse], options);
}

/** Format a range given by two verse ids in the same book. */
export function formatRange(startId, endId, options) {
  const start = parseVerseId(startId);
  const end = parseVerseId(endId || startId);
  return formatSpan(start.book, [start.chapter, start.verse, end.chapter, end.verse], options);
}

// ---------------------------------------------------------------------------
// Fetching verses
// ---------------------------------------------------------------------------

/**
 * The verses covered by one or more spans of a book.
 * Returns [{ id, chapter, verse, text }], skipping verse numbers the
 * Douay-Rheims leaves empty.
 */
export async function versesFor(bookId, spans) {
  const chapters = await loadBook(bookId);
  const verses = [];
  for (const [c1, v1, c2, v2] of spans) {
    for (let chapter = c1; chapter <= c2; chapter += 1) {
      const row = chapters[chapter - 1];
      if (!row) continue;
      const first = chapter === c1 ? v1 : 1;
      const last = chapter === c2 ? v2 : row.length;
      for (let verse = first; verse <= Math.min(last, row.length); verse += 1) {
        const text = row[verse - 1];
        if (text) verses.push({ id: verseId(bookId, chapter, verse), chapter, verse, text });
      }
    }
  }
  return verses;
}

export async function verseText(id) {
  const { book: bookId, chapter, verse } = parseVerseId(id);
  const chapters = await loadBook(bookId);
  return (chapters[chapter - 1] || [])[verse - 1] || '';
}

// ---------------------------------------------------------------------------
// Parsing references typed by the reader
// ---------------------------------------------------------------------------

const EXTRA_NAMES = {
  psalm: 'PSA', ps: 'PSA', psa: 'PSA', pss: 'PSA',
  canticle: 'SNG', 'song of solomon': 'SNG', 'canticle of canticles': 'SNG', sg: 'SNG',
  ecclesiasticus: 'SIR', ecclus: 'SIR',
  apocalypse: 'REV', apoc: 'REV', rv: 'REV',
  mt: 'MAT', mk: 'MRK', mr: 'MRK', lk: 'LUK', jn: 'JHN', jhn: 'JHN',
  gn: 'GEN', dt: 'DEU', jas: 'JAS', phil: 'PHP', philemon: 'PHM',
  qoheleth: 'ECC', qoh: 'ECC', tobias: 'TOB',
};

let nameTable = null;

function names() {
  if (!nameTable) {
    nameTable = new Map(Object.entries(EXTRA_NAMES));
    for (const entry of books()) {
      nameTable.set(entry.name.toLowerCase(), entry.id);
      nameTable.set(entry.short.toLowerCase(), entry.id);
      nameTable.set(entry.id.toLowerCase(), entry.id);
      if (entry.drName) nameTable.set(`dr:${entry.drName.toLowerCase()}`, entry.id);
    }
  }
  return nameTable;
}

function findBook(text) {
  const wanted = text.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
  if (!wanted) return null;
  const table = names();
  if (table.has(wanted)) return table.get(wanted);
  // Otherwise the first book, in canonical order, whose name starts that way.
  const squashed = wanted.replace(/ /g, '');
  for (const entry of books()) {
    const candidates = [entry.name, entry.short];
    if (candidates.some((name) => name.toLowerCase().replace(/ /g, '').startsWith(squashed))) return entry.id;
  }
  return null;
}

/**
 * Parse a reference such as "John 3:16", "jn 3 16-18", "1 cor 13" or "Ps 23".
 * Returns { book, span } or null. A chapter alone gives the whole chapter.
 */
export function parseReference(input) {
  const match = input.trim().match(/^((?:[1-3]\s*)?[A-Za-z][A-Za-z .]*?)\s*(\d+)?(?:\s*[:.,\s]\s*(\d+))?(?:\s*[-–]\s*(?:(\d+)\s*:\s*)?(\d+))?\s*$/);
  if (!match) return null;
  const bookId = findBook(match[1]);
  if (!bookId) return null;
  const entry = book(bookId);
  const single = entry.chapters.length === 1;
  let chapter = match[2] ? Number(match[2]) : 1;
  let verse = match[3] ? Number(match[3]) : null;
  if (single && match[2] && !match[3]) {
    // "Jude 5" means verse 5 of the only chapter.
    verse = chapter;
    chapter = 1;
  }
  if (chapter < 1 || chapter > entry.chapters.length) return null;
  const lastOfChapter = entry.chapters[chapter - 1];
  if (verse === null) {
    return { book: bookId, span: [chapter, 1, chapter, lastOfChapter], wholeChapter: true };
  }
  if (verse < 1 || verse > lastOfChapter) return null;
  let endChapter = chapter;
  let endVerse = verse;
  if (match[5]) {
    endChapter = match[4] ? Number(match[4]) : chapter;
    endVerse = Number(match[5]);
    if (endChapter < chapter || endChapter > entry.chapters.length) return null;
    endVerse = Math.min(endVerse, entry.chapters[endChapter - 1]);
    if (endChapter === chapter && endVerse < verse) return null;
  }
  return { book: bookId, span: [chapter, verse, endChapter, endVerse], wholeChapter: false };
}
