// view-notes.js
// Everything the reader has written: reflections on a theme, notes and marks
// on particular verses, and the journal.

import { formatRange, formatVerseId, parseVerseId, verseOrder, verseText } from './bible.js';
import { dayFor, go, monthName, today } from './context.js';
import { db } from './db.js';
import { JOURNAL_FIELDS, journalEntries } from './journal.js';
import { allReflections, titleOf } from './reflections.js';
import { add, choice, clear, el, icon } from './ui.js';

const remembered = { section: null, kind: 'notes', filter: '', sort: 'date', reflectionFilter: '' };

function niceDate(iso) {
  if (!iso) return '';
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return `${monthName(month)} ${day}${String(year) === today().slice(0, 4) ? '' : `, ${year}`}`;
}

export async function render(container) {
  const body = el('div', {});

  async function reflections() {
    const all = await allReflections();
    const filter = el('input', { class: 'field', type: 'search', placeholder: 'Find in your reflections', 'aria-label': 'Find in your reflections' });
    filter.value = remembered.reflectionFilter;
    const listNode = el('div', {});
    const draw = () => {
      clear(listNode);
      const wanted = filter.value.trim().toLowerCase();
      remembered.reflectionFilter = filter.value;
      const rows = all
        .filter((record) => !wanted || `${record.title} ${record.text}`.toLowerCase().includes(wanted))
        .sort((a, b) => (remembered.sort === 'title'
          ? titleOf(a).localeCompare(titleOf(b))
          : (b.date || '').localeCompare(a.date || '') || (b.updated || '').localeCompare(a.updated || '')));
      if (!all.length) {
        add(listNode, el('p', { class: 'empty', text: 'A reflection is a note on a theme rather than on one verse: “On forgiveness”, “On being made in the image of God”. Each can gather as many passages as you like.' }));
      } else if (!rows.length) {
        add(listNode, el('p', { class: 'empty', text: 'No reflection contains that.' }));
      }
      for (const record of rows) {
        const passages = (record.refs || []).length;
        add(listNode, el('button', { class: 'list-row tall', onclick: () => go(`#/reflection/${record.id}`) },
          el('span', { class: 'row-text' },
            el('span', { class: 'row-title', text: titleOf(record) }),
            el('span', { class: 'row-sub', text: [niceDate(record.date), passages ? `${passages} ${passages === 1 ? 'passage' : 'passages'}` : null].filter(Boolean).join(' · ') }),
            record.text && record.title ? el('span', { class: 'row-sub journal-preview', text: record.text }) : null),
          icon('forward', 18)));
      }
    };
    filter.addEventListener('input', draw);
    filter.hidden = all.length < 4;
    add(body,
      el('div', { class: 'button-row spread notes-tools' },
        all.length > 1 ? choice([['date', 'By date'], ['title', 'By title']], remembered.sort, (value) => { remembered.sort = value; draw(); }, { label: 'Order' }) : el('span'),
        el('button', { class: 'button', onclick: () => go('#/reflection/new') }, 'New reflection')),
      filter,
      listNode);
    draw();
  }

  async function verses() {
    const [notes, highlights, links] = await Promise.all([db.all('notes'), db.all('highlights'), db.all('links')]);
    const counts = { notes: notes.length, highlights: highlights.length, links: links.length };
    const list = el('div', { class: 'mark-list' });
    const filter = el('input', { class: 'field', type: 'search', placeholder: 'Find in your notes', 'aria-label': 'Find in your notes' });
    filter.value = remembered.filter;
    const open = (id) => {
      const { book, chapter, verse } = parseVerseId(id);
      go(`#/read/${book}/${chapter}/${verse}`);
    };

    async function draw() {
      clear(list);
      filter.hidden = remembered.kind !== 'notes' || notes.length < 4;
      if (remembered.kind === 'notes') {
        const wanted = remembered.filter.trim().toLowerCase();
        const rows = notes
          .filter((note) => !wanted || note.text.toLowerCase().includes(wanted))
          .sort((a, b) => verseOrder(a.start) - verseOrder(b.start));
        if (!notes.length) {
          add(list, el('p', { class: 'empty', text: 'No notes yet. In the Bible, tap a verse and choose Note.' }));
        } else if (!rows.length) {
          add(list, el('p', { class: 'empty', text: 'No note contains that.' }));
        }
        for (const note of rows) {
          add(list, el('button', { class: 'mark-row', onclick: () => open(note.start) },
            el('span', { class: 'result-ref', text: formatRange(note.start, note.end) }),
            el('span', { class: 'mark-text', text: note.text })));
        }
      } else if (remembered.kind === 'highlights') {
        const rows = [...highlights].sort((a, b) => verseOrder(a.id) - verseOrder(b.id));
        if (!rows.length) add(list, el('p', { class: 'empty', text: 'No highlights yet. In the Bible, tap a verse and choose a colour.' }));
        const texts = await Promise.all(rows.map((row) => verseText(row.id).catch(() => '')));
        rows.forEach((row, index) => {
          add(list, el('button', { class: 'mark-row', onclick: () => open(row.id) },
            el('span', { class: 'result-ref', text: formatVerseId(row.id) }),
            el('span', { class: 'mark-text' }, el('span', { class: 'highlighted', dataset: { highlight: row.color }, text: texts[index] }))));
        });
      } else {
        const rows = [...links].sort((a, b) => verseOrder(a.from) - verseOrder(b.from));
        if (!rows.length) add(list, el('p', { class: 'empty', text: 'No links yet. In the Bible, tap a verse and choose Link to connect it to another passage.' }));
        for (const link of rows) {
          add(list, el('button', { class: 'mark-row', onclick: () => open(link.from) },
            el('span', { class: 'result-ref', text: `${formatRange(link.from, link.fromEnd, { short: true })} and ${formatRange(link.to, link.toEnd, { short: true })}` }),
            link.note ? el('span', { class: 'mark-text', text: link.note }) : null));
        }
      }
    }

    const kinds = choice(
      [['notes', `Notes ${counts.notes || ''}`.trim()], ['highlights', `Highlights ${counts.highlights || ''}`.trim()], ['links', `Links ${counts.links || ''}`.trim()]],
      remembered.kind, (kind) => { remembered.kind = kind; draw(); }, { label: 'What to show', className: 'segmented sub' });
    filter.addEventListener('input', () => { remembered.filter = filter.value; draw(); });
    add(body, kinds, filter, list);
    await draw();
  }

  async function journal() {
    const entries = await journalEntries();
    add(body, el('div', { class: 'button-row spread notes-tools' }, el('span'),
      el('button', { class: 'button', onclick: () => go(`#/journal/${today()}`) }, 'Write today')));
    if (!entries.length) {
      add(body, el('p', { class: 'empty', text: 'Nothing written yet. The evening examen offers to keep what you are thankful for and where you saw God at work, or you can write here at any time.' }));
    }
    let heading = '';
    for (const entry of entries) {
      const month = `${monthName(Number(entry.id.slice(5, 7)))} ${entry.id.slice(0, 4)}`;
      if (month !== heading) {
        heading = month;
        add(body, el('h3', { class: 'list-heading', text: month }));
      }
      const preview = JOURNAL_FIELDS.map(([field]) => entry[field]).filter(Boolean).join(' · ');
      add(body, el('button', { class: 'list-row tall', onclick: () => go(`#/journal/${entry.id}`) },
        el('span', { class: 'row-text' },
          el('span', { class: 'row-title', text: `${dayFor(entry.id).weekdayName} ${Number(entry.id.slice(8))}` }),
          el('span', { class: 'row-sub journal-preview', text: preview })),
        icon('forward', 18)));
    }
  }

  const sections = { reflections, verses, journal };
  const show = async (section) => {
    clear(body);
    await sections[section]();
  };

  let section = remembered.section;
  if (!section) {
    // Until the reader chooses, open on what they already have: someone with
    // verse notes and no reflections yet sees their notes, as before.
    const [mine, notes, highlights, links] = await Promise.all([allReflections(), db.all('notes'), db.all('highlights'), db.all('links')]);
    section = !mine.length && (notes.length || highlights.length || links.length) ? 'verses' : 'reflections';
  }
  add(container,
    el('header', { class: 'app-header' }, el('h1', { class: 'app-title', text: 'Your notes' })),
    choice([['reflections', 'Reflections'], ['verses', 'On verses'], ['journal', 'Journal']], section,
      (chosen) => { remembered.section = chosen; show(chosen); }, { label: 'Section' }),
    body,
  );
  await show(section);
}
