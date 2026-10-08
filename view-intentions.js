// view-intentions.js
// The reader's prayer intentions: the people and needs they are praying for,
// and a record of prayers answered.

import { fromIso, parts } from './calendar.js';
import { go, monthName, today } from './context.js';
import { db } from './db.js';
import { add, clear, confirmSheet, el, icon, openSheet, toast } from './ui.js';

function shortDate(iso) {
  const { year, month, day } = parts(fromIso(iso));
  return `${monthName(month)} ${day}${String(year) === today().slice(0, 4) ? '' : `, ${year}`}`;
}

export async function renderIntentions(container) {
  const listNode = el('div', {});
  const input = el('input', { class: 'field', type: 'text', placeholder: 'A person, a need, a thanksgiving', 'aria-label': 'New intention', enterkeyhint: 'done' });
  const addButton = el('button', { class: 'button', disabled: true }, 'Add');
  input.addEventListener('input', () => { addButton.disabled = !input.value.trim(); });

  async function addIntention() {
    const text = input.value.trim();
    if (!text) return;
    // Empty the field before saving, so a second press of Enter adds nothing twice.
    input.value = '';
    addButton.disabled = true;
    await db.put('intentions', { text, created: today(), answered: null, answerNote: '' });
    await draw();
  }
  addButton.addEventListener('click', addIntention);
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter') addIntention(); });

  function edit(item) {
    openSheet('Intention', (close) => {
      const text = el('textarea', { class: 'field note-field', rows: '3', 'aria-label': 'Intention' });
      text.value = item.text;
      const note = el('textarea', { class: 'field note-field', rows: '3', placeholder: 'How was it answered? (optional)', 'aria-label': 'How it was answered' });
      note.value = item.answerNote || '';
      const save = async (changes) => {
        if (!text.value.trim()) { text.focus(); return false; }
        await db.put('intentions', { ...item, text: text.value.trim(), answerNote: note.value.trim(), ...changes });
        close();
        await draw();
        return true;
      };
      return [
        text,
        el('p', { class: 'muted small', text: `Praying since ${shortDate(item.created)}${item.answered ? `. Answered ${shortDate(item.answered)}.` : '.'}` }),
        note,
        el('div', { class: 'button-row' },
          el('button', {
            class: 'button danger quiet',
            onclick: () => { close(); confirmSheet('Delete this intention?', 'It will be removed from your list.', 'Delete', async () => { await db.remove('intentions', item.id); await draw(); }); },
          }, 'Delete'),
          item.answered
            ? el('button', { class: 'button quiet', onclick: () => save({ answered: null }) }, 'Still praying for this')
            : el('button', { class: 'button quiet', onclick: async () => { if (await save({ answered: today() })) toast('Thanks be to God'); } }, 'Answered'),
          el('button', { class: 'button', onclick: () => save({}) }, 'Save')),
      ];
    });
  }

  async function draw() {
    const all = await db.all('intentions');
    const active = all.filter((item) => !item.answered).sort((a, b) => (a.created < b.created ? 1 : -1));
    const answered = all.filter((item) => item.answered).sort((a, b) => (a.answered < b.answered ? 1 : -1));
    clear(listNode);
    if (!all.length) {
      add(listNode, el('p', { class: 'empty', text: 'No intentions yet. Add the people and needs you want to keep before God.' }));
      return;
    }
    const row = (item) => el('button', { class: 'list-row tall', onclick: () => edit(item) },
      el('span', { class: 'row-text' },
        el('span', { class: 'intention-text', text: item.text }),
        el('span', { class: 'row-sub', text: item.answered ? `Answered ${shortDate(item.answered)}${item.answerNote ? `: ${item.answerNote}` : ''}` : `Since ${shortDate(item.created)}` })),
      icon('forward', 18));
    if (active.length) add(listNode, el('h3', { class: 'list-heading', text: 'Praying for' }), ...active.map(row));
    if (answered.length) add(listNode, el('h3', { class: 'list-heading', text: 'Answered' }), ...answered.map(row));
  }

  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => go('#/pray') }, icon('back'), el('span', { text: 'Prayer' }))),
    el('h1', { class: 'page-title', text: 'Intentions' }),
    el('div', { class: 'inline-form' }, input, addButton),
    listNode,
  );
  await draw();
}
