// view-journal.js
// The journal: one entry to a day, a page of free writing. Parts written
// during the examen or another guided prayer appear on the page under their
// own headings; anything else is written freely below them.

import { dayFor, go, goBack, longDate, monthName, today } from './context.js';
import { JOURNAL_FIELDS, JOURNAL_SECTIONS, hasContent, journalEntries, journalEntry, saveJournal } from './journal.js';
import { markByReference } from './practices.js';
import { add, confirmSheet, el, icon, keepSaved, saveState, toast } from './ui.js';

/** A text area that grows with what is written, so the page reads as one page and not as boxes. */
function growingArea(attributes) {
  const area = el('textarea', { rows: '1', ...attributes });
  const fit = () => {
    area.style.height = 'auto';
    area.style.height = `${area.scrollHeight + 2}px`;
  };
  area.addEventListener('input', fit);
  requestAnimationFrame(fit);
  return area;
}

/** One day's entry, for reading and writing. */
export async function renderEntry(container, { date }) {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(date || '') && date <= today() ? date : today();
  const entry = await journalEntry(iso);
  const day = dayFor(iso);
  const areas = new Map();
  let deleted = false;

  // Saved a moment after each pause in the writing, and whenever the app is put away.
  const status = saveState(hasContent(entry) ? 'saved' : 'new');
  const saver = keepSaved(async () => {
    if (deleted) return;
    const changes = {};
    for (const [field, area] of areas) changes[field] = area.value;
    const saved = await saveJournal(iso, changes);
    if (saved && iso === today()) await markByReference('journal', iso);
  }, 900, { onState: status.show });

  const sections = el('div', { class: 'journal-sections' });
  const adders = el('div', { class: 'journal-adders' });

  /** A headed part of the page, for what a guided prayer wrote or the reader chose to add. */
  function section(field, label, placeholder) {
    const area = growingArea({ class: 'journal-text', placeholder, 'aria-label': label });
    area.value = entry[field] || '';
    area.addEventListener('input', () => saver.touch());
    area.addEventListener('blur', () => saver.flush());
    areas.set(field, area);
    return el('section', { class: 'journal-section', dataset: { field } },
      el('h3', { class: 'journal-heading', text: label }), area);
  }

  // The parts already written, in their usual order.
  for (const [field, label, placeholder] of JOURNAL_SECTIONS) {
    if ((entry[field] || '').trim()) add(sections, section(field, label, placeholder));
  }

  // Headings that can be added by hand, for those who like to write that way.
  function drawAdders() {
    adders.replaceChildren();
    const missing = JOURNAL_SECTIONS.filter(([field]) => !areas.has(field) && !['today', 'review'].includes(field));
    if (!missing.length) return;
    add(adders, el('span', { class: 'muted small', text: 'Add a heading:' }),
      missing.map(([field, label, placeholder]) => el('button', {
        class: 'chip-button',
        onclick: () => {
          const node = section(field, label, placeholder);
          add(sections, node);
          drawAdders();
          // At once, while the tap still counts: a phone raises the keyboard only then.
          node.querySelector('textarea').focus();
        },
      }, label)));
  }
  drawAdders();

  // The free writing, always there, with no heading of its own.
  const [, , freePrompt] = JOURNAL_FIELDS.find(([field]) => field === 'note');
  const free = growingArea({ class: 'journal-text journal-free', placeholder: freePrompt, 'aria-label': 'Journal' });
  free.value = entry.note || '';
  free.addEventListener('input', () => saver.touch());
  free.addEventListener('blur', () => saver.flush());
  areas.set('note', free);

  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/journal') }, icon('back'), el('span', { text: 'Back' })),
      status.node,
      el('button', { class: 'chip-button', onclick: () => go('#/journal') }, 'All entries')),
    el('article', { class: 'chapter journal-page' },
      el('p', { class: 'rubric', text: iso === today() ? 'Journal, today' : 'Journal' }),
      el('h2', { class: 'chapter-title', text: longDate(iso, day.weekdayName) }),
      el('p', { class: 'chapter-sub', text: day.celebration.name }),
      // The free writing comes first: below a heading it would read as part of that heading.
      free,
      sections,
      adders,
      el('p', { class: 'muted small journal-foot', text: 'Saved as you write. Your journal stays on this device and is included in backups. The evening examen can write parts of it for you.' }),
      hasContent(entry) ? el('div', { class: 'prayer-actions' }, el('button', {
        class: 'text-button',
        onclick: () => confirmSheet('Delete this entry?', 'What you wrote for this day will be removed.', 'Delete entry', async () => {
          deleted = true;
          await saver.stop();
          await saveJournal(iso, Object.fromEntries(JOURNAL_FIELDS.map(([field]) => [field, ''])));
          toast('Entry deleted');
          go('#/journal');
        }),
      }, 'Delete this entry')) : null),
  );
  if (!hasContent(entry)) setTimeout(() => free.focus(), 250);
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
