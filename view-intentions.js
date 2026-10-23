// view-intentions.js
// The reader's prayer intentions: the people and needs they are praying for,
// and a record of prayers answered. The full page lives under Prayer; a
// sheet with the same list can be opened from Today, so that adding a name
// or marking a prayer answered takes a moment wherever the reader is.

import { fromIso, parts } from './calendar.js';
import { goBack, monthName, today } from './context.js';
import { db } from './db.js';
import { fallsOn, whenLabel } from './intentions.js';
import { add, choice, clear, confirmSheet, el, icon, openSheet, toast } from './ui.js';

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

/**
 * The "when" of an intention, as a small form: every day, on a day, every day
 * until a day, each year on a day, or on chosen days of the week. Returns
 * { node, value() } where value() gives the `when` to store, or undefined if
 * a date is still needed.
 */
function whenForm(current) {
  const now = today();
  const draft = {
    kind: current ? current.kind : 'always',
    date: current && current.date ? current.date : now,
    // 29 February is shown in a leap year, the only kind of year that has it.
    yearly: current && current.kind === 'yearly' ? `${current.month === 2 && current.day === 29 ? '2028' : now.slice(0, 4)}-${String(current.month).padStart(2, '0')}-${String(current.day).padStart(2, '0')}` : now,
    weekdays: current && current.kind === 'weekly' ? [...current.weekdays] : [false, true, false, false, false, false, false],
  };
  const detail = el('div', { class: 'repeat-detail' });
  const dateInput = el('input', { class: 'field', type: 'date', 'aria-label': 'Date' });
  const drawDetail = () => {
    clear(detail);
    if (draft.kind === 'date' || draft.kind === 'until') {
      dateInput.value = draft.date;
      dateInput.oninput = () => { draft.date = dateInput.value; };
      add(detail, dateInput, el('p', { class: 'muted small', text: draft.kind === 'date' ? 'Shown first on that day: a surgery, an exam, a wedding.' : 'Shown first every day until then: the run-up to an event.' }));
    } else if (draft.kind === 'yearly') {
      dateInput.value = draft.yearly;
      dateInput.oninput = () => { draft.yearly = dateInput.value; };
      add(detail, dateInput, el('p', { class: 'muted small', text: 'Shown on that day each year, and not on others: an anniversary, a birthday.' }));
    } else if (draft.kind === 'weekly') {
      const row = el('div', { class: 'day-toggles', role: 'group', 'aria-label': 'Days of the week' });
      const draw = () => {
        clear(row);
        DAY_INITIALS.forEach((letter, index) => row.append(el('button', {
          class: `day-toggle${draft.weekdays[index] ? ' on' : ''}`, 'aria-pressed': draft.weekdays[index] ? 'true' : 'false', 'aria-label': DAY_NAMES[index],
          onclick: () => { draft.weekdays[index] = !draft.weekdays[index]; draw(); row.children[index].focus({ preventScroll: true }); },
        }, letter)));
      };
      draw();
      add(detail, row, el('p', { class: 'muted small', text: 'Shown on those days only.' }));
    }
  };
  drawDetail();
  const node = el('div', { class: 'field-label' }, 'When',
    choice([['always', 'Every day'], ['date', 'On a day'], ['until', 'Until a day'], ['yearly', 'Each year'], ['weekly', 'Some weekdays']], draft.kind,
      (value) => { draft.kind = value; drawDetail(); }, { label: 'When', className: 'segmented wrap' }),
    detail);
  const value = () => {
    if (draft.kind === 'always') return null;
    if (draft.kind === 'date' || draft.kind === 'until') return /^\d{4}-\d{2}-\d{2}$/.test(draft.date || '') ? { kind: draft.kind, date: draft.date } : undefined;
    if (draft.kind === 'yearly') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.yearly || '')) return undefined;
      return { kind: 'yearly', month: Number(draft.yearly.slice(5, 7)), day: Number(draft.yearly.slice(8, 10)) };
    }
    return draft.weekdays.some(Boolean) ? { kind: 'weekly', weekdays: [...draft.weekdays] } : undefined;
  };
  return { node, value };
}

/** Change one intention, mark it answered, or delete it. `onDone` runs after any change. */
function editSheet(item, onDone) {
  openSheet('Intention', (close) => {
    const text = el('textarea', { class: 'field note-field', rows: '3', 'aria-label': 'Intention' });
    text.value = item.text;
    const note = el('textarea', { class: 'field note-field', rows: '3', placeholder: 'How was it answered? (optional)', 'aria-label': 'How it was answered' });
    note.value = item.answerNote || '';
    const when = whenForm(item.when || null);
    const save = async (changes) => {
      if (!text.value.trim()) { text.focus(); return false; }
      const chosen = when.value();
      if (chosen === undefined) { toast('Choose the day'); return false; }
      await db.put('intentions', { ...item, text: text.value.trim(), answerNote: note.value.trim(), when: chosen, ...changes });
      close();
      await onDone();
      return true;
    };
    return [
      text,
      when.node,
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
  const when = item.answered ? null : whenLabel(item.when, today());
  return el('button', { class: 'list-row tall', onclick: () => editSheet(item, onDone) },
    el('span', { class: 'row-text' },
      el('span', { class: 'intention-text', text: item.text }),
      el('span', { class: 'row-sub', text: item.answered ? `Answered ${shortDate(item.answered)}${item.answerNote ? `: ${item.answerNote}` : ''}` : [when, `since ${shortDate(item.created)}`].filter(Boolean).join(' · ') })),
    icon('edit', 18));
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
    const now = today();
    const forToday = active.filter((item) => fallsOn(item.when, now));
    const certainDays = active.filter((item) => !fallsOn(item.when, now) && item.when && ['yearly', 'weekly', 'date'].includes(item.when.kind) && !(item.when.kind === 'date' && item.when.date < now));
    const rest = active.filter((item) => !forToday.includes(item) && !certainDays.includes(item));
    if (forToday.length) add(listNode, el('h3', { class: 'list-heading', text: 'Today' }), ...forToday.map((item) => intentionRow(item, draw)));
    if (rest.length) add(listNode, el('h3', { class: 'list-heading', text: 'Praying for' }), ...rest.map((item) => intentionRow(item, draw)));
    if (certainDays.length) add(listNode, el('h3', { class: 'list-heading', text: 'On certain days' }), ...certainDays.map((item) => intentionRow(item, draw)));
    if (answered.length) add(listNode, el('h3', { class: 'list-heading', text: 'Answered' }), ...answered.map((item) => intentionRow(item, draw)));
  }

  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/pray') }, icon('back'), el('span', { text: 'Back' }))),
    el('h1', { class: 'page-title', text: 'Intentions' }),
    addForm(draw).node,
    el('p', { class: 'muted small', text: 'Tap an intention to change it, to tie it to a day or an event (an exam, a surgery, an anniversary), or to mark it answered.' }),
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
