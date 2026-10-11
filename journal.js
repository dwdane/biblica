// journal.js
// The journal: what the reader writes down about a day, one entry to a date.
// It is a page of free writing. The guided prayers (the examen above all)
// offer to write parts of it as they go, and each such part keeps its own
// heading on the page, so that what was written where can be found again.
//
// An entry is { id: ISO date, today, resolve, thanks, graces, tomorrow,
// review, note, updated }; `note` is the free writing, the rest are the
// headed parts. Nothing about sin is kept here: the examen's step on
// forgiveness is never written down, and what is noted for confession lives
// in its own private store.

import { db } from './db.js';

// The parts of an entry, in the order they are shown: [field, heading, prompt].
// `note` is the free writing, which comes last and has no heading.
export const JOURNAL_FIELDS = [
  ['today', 'What today holds', 'What is coming today, and how you mean to meet it.'],
  ['resolve', 'Resolution', 'One thing from your prayer, small enough to keep today.'],
  ['thanks', 'Thanks', 'What are you thankful for today?'],
  ['graces', 'Where God was at work', 'Where did you notice him today: a person, a word, a moment of help?'],
  ['tomorrow', 'For tomorrow', 'What do you ask for tomorrow, or mean to do?'],
  ['review', 'Looking back', 'What you saw, looking back over the month or the year, and what you resolve.'],
  ['note', 'Anything else', 'Write whatever you want to keep from today.'],
];

/** The headed parts of an entry: every field but the free writing. */
export const JOURNAL_SECTIONS = JOURNAL_FIELDS.filter(([field]) => field !== 'note');

/** A day's entry with nothing written in it. */
function blank(date) {
  return { id: date, ...Object.fromEntries(JOURNAL_FIELDS.map(([field]) => [field, ''])) };
}

export async function journalEntry(date) {
  return { ...blank(date), ...((await db.get('journal', date)) || {}) };
}

export function hasContent(entry) {
  return Boolean(entry) && JOURNAL_FIELDS.some(([field]) => (entry[field] || '').trim());
}

/**
 * Save part of a day's entry. An entry left with nothing in it is removed,
 * so that a day is only in the journal if something was written.
 */
export async function saveJournal(date, changes) {
  let result = null;
  await db.change('journal', date, (stored) => {
    const entry = { ...blank(date), ...(stored || {}) };
    for (const [field] of JOURNAL_FIELDS) {
      if (changes[field] !== undefined) entry[field] = String(changes[field]).trim();
    }
    entry.updated = new Date().toISOString();
    result = entry;
    return entry;
  });
  if (result && !hasContent(result)) {
    await db.remove('journal', date);
    return null;
  }
  return result;
}

/** Every day with something written, newest first. */
export async function journalEntries() {
  return (await db.all('journal')).filter(hasContent).sort((a, b) => (a.id < b.id ? 1 : -1));
}
