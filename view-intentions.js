// view-intentions.js
// The reader's prayer intentions: the people and needs they are praying for,
// and a record of prayers answered. The full page lives under Prayer; a
// sheet with the same list can be opened from Today, so that adding a name
// or marking a prayer answered takes a moment wherever the reader is.

import { fromIso, parts } from './calendar.js';
import { goBack, monthName, today } from './context.js';
import { db } from './db.js';
import { add, clear, confirmSheet, el, icon, openSheet, toast } from './ui.js';

function shortDate(iso) {
  const { year, month, day } = parts(fromIso(iso));
  return `${monthName(month)} ${day}${String(year) === today().slice(0, 4) ? '' : `, ${year}`}`;
}

/** Every intention: those still prayed for (newest first) and those answered (latest first). */
async function intentionLists() {
  const all = await db.all('intentions');
  return {
    all,
    active: all.filter((item) => !item.answered).sort((a, b) => (a.created < b.created ? 1 : -1)),
    answered: all.filter((item) => item.answered).sort((a, b) => (a.answered < b.answered ? 1 : -1)),
  };
}

/**
 * A text field and button for adding an intention. `onAdded` runs after each
 * one is kept. Returns the form's node and the field, for focusing.
 */
function addForm(onAdded) {
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
    await onAdded();
  }
  addButton.addEventListener('click', addIntention);
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter') addIntention(); });
  return { node: el('div', { class: 'inline-form' }, input, addButton), input };
}

/** Change one intention, mark it answered, or delete it. `onDone` runs after any change. */
function editSheet(item, onDone) {
  openSheet('Intention', (close) => {
    const text = el('textarea', { class: 'field note-field', rows: '3', 'aria-label': 'Intention' });
    text.value = item.text;
    const note = el('textarea', { class: 'field note-field', rows: '3', placeholder: 'How was it answered? (optional)', 'aria-label': 'How it was answered' });
    note.value = item.answerNote || '';
    const save = async (changes) => {
      if (!text.value.trim()) { text.focus(); return false; }
      await db.put('intentions', { ...item, text: text.value.trim(), answerNote: note.value.trim(), ...changes });
      close();
      await onDone();
      return true;
    };
    return [
      text,
      el('p', { class: 'muted small', text: `Praying since ${shortDate(item.created)}${item.answered ? `. Answered ${shortDate(item.answered)}.` : '.'}` }),
      note,
      el('div', { class: 'button-row' },
        el('button', {
          class: 'button danger quiet',
          onclick: () => { close(); confirmSheet('Delete this intention?', 'It will be removed from your list.', 'Delete', async () => { await db.remove('intentions', item.id); await onDone(); }); },
        }, 'Delete'),
        item.answered
          ? el('button', { class: 'button quiet', onclick: () => save({ answered: null }) }, 'Still praying for this')
          : el('button', { class: 'button quiet', onclick: async () => { if (await save({ answered: today() })) toast('Thanks be to God'); } }, 'Answered'),
        el('button', { class: 'button', onclick: () => save({}) }, 'Save')),
    ];
  });
}

/** One intention as a row that opens it. */
function intentionRow(item, onDone) {
  return el('button', { class: 'list-row tall', onclick: () => editSheet(item, onDone) },
    el('span', { class: 'row-text' },
      el('span', { class: 'intention-text', text: item.text }),
      el('span', { class: 'row-sub', text: item.answered ? `Answered ${shortDate(item.answered)}${item.answerNote ? `: ${item.answerNote}` : ''}` : `Since ${shortDate(item.created)}` })),
    icon('forward', 18));
}

export async function renderIntentions(container) {
  const listNode = el('div', {});

  async function draw() {
    const { all, active, answered } = await intentionLists();
    clear(listNode);
    if (!all.length) {
      add(listNode, el('p', { class: 'empty', text: 'No intentions yet. Add the people and needs you want to keep before God.' }));
      return;
    }
    if (active.length) add(listNode, el('h3', { class: 'list-heading', text: 'Praying for' }), ...active.map((item) => intentionRow(item, draw)));
    if (answered.length) add(listNode, el('h3', { class: 'list-heading', text: 'Answered' }), ...answered.map((item) => intentionRow(item, draw)));
  }

  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/pray') }, icon('back'), el('span', { text: 'Back' }))),
    el('h1', { class: 'page-title', text: 'Intentions' }),
    addForm(draw).node,
    listNode,
  );
  await draw();
}

/**
 * The intentions still prayed for, in a sheet: add one, change one, or mark
 * one answered without leaving the screen. `onClose` runs when it closes,
 * so the screen beneath can show what changed.
 */
export async function intentionsSheet(onClose = () => {}) {
  const listNode = el('div', { class: 'sheet-list' });
  const form = addForm(() => draw());
  async function draw() {
    const { active, answered } = await intentionLists();
    clear(listNode);
    if (!active.length) add(listNode, el('p', { class: 'muted small', text: 'Nothing here yet. Add the people and needs you want to keep before God.' }));
    else add(listNode, active.map((item) => intentionRow(item, draw)));
    if (answered.length) add(listNode, el('p', { class: 'muted small', text: `${answered.length} answered. Thanks be to God.` }));
  }
  await draw();
  openSheet('Intentions', (close) => [
    form.node,
    listNode,
    el('div', { class: 'button-row spread' },
      el('button', { class: 'button quiet', onclick: () => { close(); window.location.hash = '#/pray/intentions'; } }, 'All intentions'),
      el('button', { class: 'button', onclick: close }, 'Done')),
  ], { tall: true, onClose });
}
