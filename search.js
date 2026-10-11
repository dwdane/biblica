// search.js
// Word and phrase search across the whole Bible.
//
// The text is small enough (under 5 MB) to scan directly, so there is no
// index to build or keep in step with the text: a search is one pass over
// every verse with a regular expression.

import { books, currentTranslation, loadAllBooks, loadBook, verseId } from './bible.js';

let verses = null; // [{ id, book, chapter, verse, text }]
let preparedFor = null; // the translation the verses are in

/** Load every book of the chosen translation and flatten it for scanning. Safe to call repeatedly. */
export async function prepare(onProgress) {
  const translationId = currentTranslation().id;
  if (verses && preparedFor === translationId) return;
  await loadAllBooks(onProgress, translationId);
  const flat = [];
  for (const entry of books()) {
    const chapters = await loadBook(entry.id, translationId);
    chapters.forEach((row, chapterIndex) => {
      row.forEach((text, verseIndex) => {
        if (text) {
          flat.push({ id: verseId(entry.id, chapterIndex + 1, verseIndex + 1), book: entry.id, chapter: chapterIndex + 1, verse: verseIndex + 1, text });
        }
      });
    });
  }
  // Recorded only once every book has arrived: a translation that failed to load
  // (offline) is tried again next time, and never stands in for another.
  verses = flat;
  preparedFor = translationId;
}

const SUFFIXES = ['’s', "'s", 'eth', 'est', 'ing', 'ed', 'es', 's'];
const FORMS = "(?:s|es|’s|'s|ed|d|eth|est|ing)?";

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Reduce a word to the part its common forms share: "oaks" to "oak". */
function stem(word) {
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) return word.slice(0, -suffix.length);
  }
  return word;
}

/**
 * Turn what the reader typed into word patterns.
 * Words in double quotes are matched as an exact phrase; other words may
 * appear anywhere in the verse, in any of their common forms.
 * Each returned term is a regular expression source without word boundaries.
 */
export function parseQuery(query, { exact = false } = {}) {
  const terms = [];
  const phrasePattern = /["“”]([^"“”]+)["“”]/g;
  let rest = query;
  let match;
  while ((match = phrasePattern.exec(query)) !== null) {
    const phrase = match[1].trim().replace(/\s+/g, ' ');
    if (phrase) terms.push(escapeRegExp(phrase).replace(/ /g, '\\s+').replace(/['’]/g, "['’]"));
    rest = rest.replace(match[0], ' ');
  }
  for (const word of rest.split(/[^\p{L}\p{N}'’]+/u).filter(Boolean)) {
    const lower = word.toLowerCase();
    terms.push(exact ? escapeRegExp(lower) : `${escapeRegExp(stem(lower))}${FORMS}`);
  }
  return terms;
}

// Word boundaries that understand accented letters. Lookbehind is avoided
// because older iPhones do not support it; the character before a match is
// captured instead and skipped when highlighting.
const BEFORE = '(^|[^\\p{L}])';
const AFTER = '(?![\\p{L}])';

/**
 * Search the Bible.
 *
 * @param {string} query
 * @param {{scope?: string, exact?: boolean}} options - scope is 'all', 'OT',
 *   'NT' or a book id.
 * @returns {{results: Array, byBook: Map, highlight: (RegExp|null)}}
 */
export function search(query, { scope = 'all', exact = false } = {}) {
  const terms = parseQuery(query, { exact });
  if (!terms.length || !verses) return { results: [], byBook: new Map(), highlight: null };
  const tests = terms.map((term) => new RegExp(`${BEFORE}(?:${term})${AFTER}`, 'iu'));
  const testaments = new Map(books().map((entry) => [entry.id, entry.testament]));
  const results = [];
  const byBook = new Map();
  for (const verse of verses) {
    if (scope === 'OT' || scope === 'NT') {
      if (testaments.get(verse.book) !== scope) continue;
    } else if (scope !== 'all' && verse.book !== scope) {
      continue;
    }
    if (tests.every((test) => test.test(verse.text))) {
      results.push(verse);
      byBook.set(verse.book, (byBook.get(verse.book) || 0) + 1);
    }
  }
  const highlight = new RegExp(`${BEFORE}(${terms.join('|')})${AFTER}`, 'giu');
  return { results, byBook, highlight };
}

/** Split text into matched and unmatched pieces for highlighting. */
export function splitMatches(text, pattern) {
  if (!pattern) return [{ text, hit: false }];
  const pieces = [];
  let last = 0;
  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const start = match.index + match[1].length;
    const end = match.index + match[0].length;
    if (end === start) { pattern.lastIndex += 1; continue; }
    if (start > last) pieces.push({ text: text.slice(last, start), hit: false });
    pieces.push({ text: text.slice(start, end), hit: true });
    last = end;
  }
  if (last < text.length) pieces.push({ text: text.slice(last), hit: false });
  return pieces;
}
