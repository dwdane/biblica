// view-journal.js
// The journal: one entry to a day, written at the examen or directly.

import { dayFor, go, goBack, longDate, monthName, today } from './context.js';
import { JOURNAL_FIELDS, hasContent, journalEntries, journalEntry, saveJournal } from './journal.js';
import { markByReference } from './practices.js';
import { add, confirmSheet, el, icon, keepSaved, toast } from './ui.js';

/** One day's entry, for reading and writing. */
export async function renderEntry(container, { date }) {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(date || '') && date <= today() ? date : today();
  const entry = await journalEntry(iso);
  const day = dayFor(iso);
  const areas = new Map();
  let deleted = false;

  // Saved a moment after each pause in the writing, and whenever the app is put away.
  const saver = keepSaved(async () => {
    if (deleted) return;
    const changes = {};
    for (const [field, area] of areas) changes[field] = area.value;
    const saved = await saveJournal(iso, changes);
    if (saved && iso === today()) await markByReference('journal', iso);
  });

  const fields = JOURNAL_FIELDS.map(([field, label, placeholder]) => {
    const area = el('textarea', { class: 'field note-field', rows: field === 'note' ? '5' : '3', placeholder, 'aria-label': label });
    area.value = entry[field] || '';
    area.addEventListener('input', () => saver.touch());
    area.addEventListener('blur', () => saver.flush());
    areas.set(field, area);
    return el('label', { class: 'field-label journal-field' }, label, area);
  });

  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/journal') }, icon('back'), el('span', { text: 'Back' })),
      el('button', { class: 'chip-button', onclick: () => go('#/journal') }, 'All entries')),
    el('article', { class: 'chapter journal-page' },
      el('p', { class: 'rubric', text: iso === today() ? 'Journal, today' : 'Journal' }),
      el('h2', { class: 'chapter-title', text: longDate(iso, day.weekdayName) }),
      el('p', { class: 'chapter-sub', text: day.celebration.name }),
      fields,
      el('div', { class: 'button-row spread' },
        hasContent(entry) ? el('button', {
          class: 'button danger quiet',
          onclick: () => confirmSheet('Delete this entry?', 'What you wrote for this day will be removed.', 'Delete entry', async () => {
            deleted = true;
            await saver.stop();
            await saveJournal(iso, Object.fromEntries(JOURNAL_FIELDS.map(([field]) => [field, ''])));
            toast('Entry deleted');
            go('#/journal');
          }),
        }, 'Delete') : el('span'),
        el('button', { class: 'button', onclick: async () => { saver.touch(); if (await saver.flush()) toast('Saved'); } }, 'Save')),
      el('p', { class: 'muted small', text: 'Your journal stays on this device and is included in backups.' })),
  );
  // Leaving the screen keeps what was typed.
  return () => saver.stop();
}

/** Every day with something written, newest first, month by month. */
export async function renderJournal(container) {
  const entries = await journalEntries();
  const now = today();
  const listNode = el('div', {});
  if (!entries.length) {
    add(listNode, el('p', { class: 'empty', text: 'Nothing written yet. The evening examen offers to keep what you are thankful for, or you can write here at any time.' }));
  }
  let heading = '';
  for (const entry of entries) {
    const month = `${monthName(Number(entry.id.slice(5, 7)))} ${entry.id.slice(0, 4)}`;
    if (month !== heading) {
      heading = month;
      add(listNode, el('h3', { class: 'list-heading', text: month }));
    }
    const preview = JOURNAL_FIELDS.map(([field]) => entry[field]).filter(Boolean).join(' · ');
    const day = dayFor(entry.id);
    add(listNode, el('button', { class: 'list-row tall', onclick: () => go(`#/journal/${entry.id}`) },
      el('span', { class: 'row-text' },
        el('span', { class: 'row-title', text: `${day.weekdayName} ${Number(entry.id.slice(8))}` }),
        el('span', { class: 'row-sub journal-preview', text: preview })),
      icon('forward', 18)));
  }
  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/notes') }, icon('back'), el('span', { text: 'Back' })),
      el('button', { class: 'chip-button', onclick: () => go(`#/journal/${now}`) }, 'Write today')),
    el('h1', { class: 'page-title', text: 'Journal' }),
    listNode,
  );
}
