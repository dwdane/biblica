// reflections.js
// Reflections: the reader's own notes on a theme ("On forgiveness", "On being
// made in the image of God"), each of which may cite any number of passages.
//
// A reflection is { id, title, text, date, refs: [{ start, end }], created, updated },
// where start and end are verse ids such as "GEN.1.26" and `date` is the ISO
// date the reader files it under (the day it was written, unless changed).

import { parseVerseId, verseOrder } from './bible.js';
import { todayIso } from './calendar.js';
import { db } from './db.js';

export async function allReflections() {
  return db.all('reflections');
}

export async function reflection(id) {
  const key = Number(id);
  if (!Number.isInteger(key)) return null;
  return (await db.get('reflections', key)) || null;
}

/** Save a reflection; returns it with its id. */
export async function saveReflection(record) {
  const now = new Date().toISOString();
  const next = {
    ...record,
    title: (record.title || '').trim(),
    text: (record.text || '').trim(),
    refs: sortRefs(record.refs || []),
    date: record.date || todayIso(),
    created: record.created || now,
    updated: now,
  };
  if (!next.id) delete next.id;
  const id = await db.put('reflections', next);
  return { ...next, id };
}

export async function deleteReflection(id) {
  await db.remove('reflections', Number(id));
}

/** Passages in the order of the Bible, without repeats. */
export function sortRefs(refs) {
  const seen = new Set();
  return refs
    .filter((ref) => {
      const key = `${ref.start}|${ref.end || ref.start}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((ref) => ({ start: ref.start, end: ref.end || ref.start }))
    .sort((a, b) => verseOrder(a.start) - verseOrder(b.start));
}

/**
 * Add a passage to a reflection, creating nothing new if it is already
 * there. Any words given are added to the end of the reflection as a new
 * paragraph.
 */
export async function addPassage(id, start, end, words = '') {
  const record = await reflection(id);
  if (!record) return null;
  const more = words.trim();
  const text = more ? [record.text, more].filter(Boolean).join('\n\n') : record.text;
  return saveReflection({ ...record, text, refs: [...record.refs, { start, end: end || start }] });
}

// Words on their way from the Bible to a new reflection: what the reader had
// begun to type as a verse note before choosing a reflection instead.
let handedText = '';

/** Leave words for the next new reflection to begin with. */
export function handText(words) {
  handedText = (words || '').trim();
}

/** Take the words left by handText(), once. */
export function takeHandedText() {
  const words = handedText;
  handedText = '';
  return words;
}

/**
 * Reflections that cite a chapter: [{ reflection, verse }], where `verse` is
 * the last verse of the passage cited, the place its marker is shown.
 */
export async function reflectionsCiting(bookId, chapter) {
  const prefix = `${bookId}.${chapter}.`;
  const found = [];
  for (const record of await allReflections()) {
    for (const ref of record.refs || []) {
      const end = ref.end || ref.start;
      if (end.startsWith(prefix)) found.push({ reflection: record, verse: parseVerseId(end).verse });
    }
  }
  return found;
}

/** Reflections that cite any verse of a span within one chapter. */
export async function reflectionsOn(bookId, chapter, first, last) {
  const found = new Map();
  for (const record of await allReflections()) {
    for (const ref of record.refs || []) {
      const start = parseVerseId(ref.start);
      const end = parseVerseId(ref.end || ref.start);
      if (start.book !== bookId) continue;
      const from = start.chapter * 1000 + start.verse;
      const to = end.chapter * 1000 + end.verse;
      if (to >= chapter * 1000 + first && from <= chapter * 1000 + last) found.set(record.id, record);
    }
  }
  return [...found.values()];
}

/** A title to show for a reflection that has none yet. */
export function titleOf(record) {
  const title = (record.title || '').trim();
  if (title) return title;
  const firstLine = (record.text || '').split('\n')[0].trim();
  return firstLine ? (firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine) : 'Untitled reflection';
}
