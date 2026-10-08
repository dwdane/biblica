// view-notes.js
// Everything the reader has written or marked: notes, highlights and links.

import { formatRange, formatVerseId, parseVerseId, verseOrder, verseText } from './bible.js';
import { go } from './context.js';
import { db } from './db.js';
import { clear, el } from './ui.js';

const remembered = { kind: 'notes', filter: '' };

export async function render(container) {
  const [notes, highlights, links] = await Promise.all([db.all('notes'), db.all('highlights'), db.all('links')]);
  const counts = { notes: notes.length, highlights: highlights.length, links: links.length };
  const list = el('div', { class: 'mark-list' });
  const filter = el('input', { class: 'field', type: 'search', placeholder: 'Find in your notes', 'aria-label': 'Find in your notes' });
  filter.value = remembered.filter;
  const tabs = el('div', { class: 'segmented', role: 'group', 'aria-label': 'What to show' });

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
        list.append(el('p', { class: 'empty', text: 'No notes yet. In the Bible, tap a verse and choose Note.' }));
      } else if (!rows.length) {
        list.append(el('p', { class: 'empty', text: 'No note contains that.' }));
      }
      for (const note of rows) {
        list.append(el('button', { class: 'mark-row', onclick: () => open(note.start) },
          el('span', { class: 'result-ref', text: formatRange(note.start, note.end) }),
          el('span', { class: 'mark-text', text: note.text })));
      }
    } else if (remembered.kind === 'highlights') {
      const rows = [...highlights].sort((a, b) => verseOrder(a.id) - verseOrder(b.id));
      if (!rows.length) list.append(el('p', { class: 'empty', text: 'No highlights yet. In the Bible, tap a verse and choose a colour.' }));
      const texts = await Promise.all(rows.map((row) => verseText(row.id).catch(() => '')));
      rows.forEach((row, index) => {
        list.append(el('button', { class: 'mark-row', onclick: () => open(row.id) },
          el('span', { class: 'result-ref', text: formatVerseId(row.id) }),
          el('span', { class: 'mark-text' }, el('span', { class: 'highlighted', dataset: { highlight: row.color }, text: texts[index] }))));
      });
    } else {
      const rows = [...links].sort((a, b) => verseOrder(a.from) - verseOrder(b.from));
      if (!rows.length) list.append(el('p', { class: 'empty', text: 'No links yet. In the Bible, tap a verse and choose Link to connect it to another passage.' }));
      for (const link of rows) {
        list.append(el('button', { class: 'mark-row', onclick: () => open(link.from) },
          el('span', { class: 'result-ref', text: `${formatRange(link.from, link.fromEnd, { short: true })} and ${formatRange(link.to, link.toEnd, { short: true })}` }),
          link.note ? el('span', { class: 'mark-text', text: link.note }) : null));
      }
    }
  }

  for (const [kind, label] of [['notes', 'Notes'], ['highlights', 'Highlights'], ['links', 'Links']]) {
    tabs.append(el('button', {
      class: `segment${remembered.kind === kind ? ' on' : ''}`,
      onclick: (event) => {
        remembered.kind = kind;
        for (const node of tabs.children) node.classList.toggle('on', node === event.currentTarget);
        draw();
      },
    }, `${label} ${counts[kind] || ''}`.trim()));
  }
  filter.addEventListener('input', () => { remembered.filter = filter.value; draw(); });

  container.append(
    el('header', { class: 'app-header' }, el('h1', { class: 'app-title', text: 'Your notes' })),
    tabs, filter, list,
  );
  await draw();
}
