// view-saints.js
// The reader's own saints: the list, one saint's page, and the sheet for
// adding or changing one.

import { calendarEntries, dayFor, go, goBack, longDate, monthName, refresh, today } from './context.js';
import { celebrationAccount, celebrationNames } from './days.js';
import { traditionalDates } from './novenas.js';
import { ROLES, allPatrons, deletePatron, feastLabel, nextFeastOf, patron, savePatron, shortName } from './patrons.js';
import { add, clear, confirmSheet, el, icon, keepSaved, once, openSheet, saveState, toast } from './ui.js';
import { startSheet } from './view-novenas.js';

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Add a saint, or change one. `onSaved(record)` runs afterwards. */
export function patronSheet(record, onSaved) {
  const isNew = !record.id;
  const draft = { role: ROLES[0], note: '', key: null, feast: null, ...record };
  const calendar = celebrationNames(calendarEntries());
  openSheet(isNew ? 'Add a saint' : 'Edit', (close) => {
    const name = el('input', { class: 'field', type: 'text', placeholder: 'Saint’s name', autocomplete: 'off', autocapitalize: 'words', 'aria-label': 'Name' });
    name.value = draft.name || '';
    const matches = el('div', { class: 'choice-list' });
    const role = el('input', { class: 'field', type: 'text', placeholder: 'What this saint is to you', 'aria-label': 'What this saint is to you', list: 'patron-roles' });
    role.value = draft.role || '';
    const roles = el('datalist', { id: 'patron-roles' }, ROLES.map((item) => el('option', { value: item })));
    const month = el('select', { class: 'field select', 'aria-label': 'Month of the feast' },
      el('option', { value: '', text: 'Month' }),
      Array.from({ length: 12 }, (_, index) => el('option', { value: String(index + 1), text: monthName(index + 1) })));
    const dayInput = el('input', { class: 'field short', type: 'number', min: '1', max: '31', inputmode: 'numeric', placeholder: 'Day', 'aria-label': 'Day of the feast' });
    const note = el('textarea', { class: 'field note-field', rows: '3', placeholder: 'Why this saint, a favourite saying, a grace you ask for (optional)', 'aria-label': 'Notes' });
    note.value = draft.note || '';

    const showFeast = () => {
      if (draft.feast) {
        const [m, d] = draft.feast.split('-').map(Number);
        month.value = String(m);
        dayInput.value = String(d);
      }
    };
    showFeast();

    const suggest = () => {
      clear(matches);
      const wanted = name.value.trim().toLowerCase();
      if (wanted.length < 3 || draft.key) return;
      const found = calendar.filter((item) => item.name.toLowerCase().includes(wanted)).slice(0, 5);
      for (const item of found) {
        matches.append(el('button', {
          class: 'picker-book',
          onclick: () => {
            draft.key = item.key;
            draft.feast = `${String(item.month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
            name.value = shortName(item.name);
            showFeast();
            clear(matches);
          },
        }, el('span', { text: item.name }), el('span', { class: 'picker-alt', text: `${monthName(item.month)} ${item.day}` })));
      }
    };
    name.addEventListener('input', () => {
      // Typing a different name cuts the tie to the calendar entry chosen before.
      draft.key = null;
      suggest();
    });

    const save = once(async () => {
      if (!name.value.trim()) { name.focus(); return; }
      const m = Number(month.value);
      const d = Number(dayInput.value);
      let feast = null;
      if (m || dayInput.value) {
        if (!(m >= 1 && m <= 12 && d >= 1 && d <= DAYS_IN_MONTH[m - 1])) { dayInput.focus(); toast('That is not a day of the year'); return; }
        feast = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      const saved = await savePatron({ ...draft, name: name.value, role: role.value, note: note.value, feast });
      close();
      toast(isNew ? `${saved.name} added to your saints` : 'Saved');
      if (onSaved) onSaved(saved);
    });

    return [
      el('label', { class: 'field-label' }, 'Name', name),
      matches,
      el('label', { class: 'field-label' }, 'Yours as', role, roles),
      el('div', { class: 'field-label' }, 'Feast day', el('div', { class: 'inline-form' }, month, dayInput),
        el('span', { class: 'muted small', text: 'Leave empty if you do not know it. Saints chosen from the calendar follow it if their day moves.' })),
      el('label', { class: 'field-label' }, 'Notes', note),
      el('div', { class: 'button-row' },
        el('button', { class: 'button quiet', onclick: close }, 'Cancel'),
        el('button', { class: 'button', onclick: save }, isNew ? 'Add' : 'Save')),
    ];
  }, { tall: true });
}

export async function renderSaints(container) {
  const patrons = await allPatrons();
  const now = today();
  const listNode = el('div', {});
  if (!patrons.length) {
    add(listNode, el('p', { class: 'empty', text: 'No saints yet. Add your confirmation saint, your name saint, or any saint you turn to.' }));
  }
  for (const item of patrons) {
    const next = nextFeastOf(item, now, dayFor);
    add(listNode, el('button', { class: 'list-row tall', onclick: () => go(`#/pray/saint/${item.id}`) },
      el('span', { class: 'row-text' },
        el('span', { class: 'row-title', text: item.name }),
        el('span', { class: 'row-sub', text: [item.role, item.feast ? `Feast ${feastLabel(item.feast, monthName)}` : null].filter(Boolean).join(' · ') }),
        next === now ? el('span', { class: 'row-sub feast-today', text: 'Today is the feast' }) : null),
      icon('forward', 18)));
  }
  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => go('#/pray') }, icon('back'), el('span', { text: 'Prayer' })),
      el('button', { class: 'chip-button', onclick: () => patronSheet({}, (saved) => go(`#/pray/saint/${saved.id}`)) }, 'Add a saint')),
    el('h1', { class: 'page-title', text: 'My saints' }),
    el('p', { class: 'muted page-intro', text: 'The saints who are yours: by confirmation, by name, or by friendship. Their feasts are pointed out on Today when they come.' }),
    listNode,
  );
}

export async function renderSaint(container, { id }) {
  const item = await patron(id);
  const back = el('header', { class: 'reader-bar' },
    el('button', { class: 'back-button', onclick: () => goBack('#/pray/saints') }, icon('back'), el('span', { text: 'Back' })));
  if (!item) {
    add(container, back, el('p', { class: 'empty', text: 'That saint is no longer in your list.' }));
    return;
  }
  const now = today();
  const account = item.key ? celebrationAccount(item.key) : null;
  const next = nextFeastOf(item, now, dayFor);
  const template = item.feast ? {
    id: 'own',
    name: `Novena to ${item.name}`,
    title: `Novena to ${item.name}`,
    about: 'Nine days of prayer through the intercession of your saint, ending on the eve of the feast.',
    days: 9,
    prayers: ['prayer:our-father', 'prayer:hail-mary', 'prayer:glory-be'],
    // The next feast's own day: a feast of 29 February falls on the 28th in most years.
    ends: { before: next.slice(5) },
  } : null;
  const dates = template ? traditionalDates(template, now) : null;

  const note = el('textarea', { class: 'field note-field', rows: '5', placeholder: 'Why this saint, a favourite saying, graces asked and received.', 'aria-label': 'Notes' });
  note.value = item.note || '';
  // Saved a moment after each pause in the writing, and whenever the app is put away.
  let removed = false;
  const status = saveState(item.note ? 'saved' : 'new');
  const saver = keepSaved(async () => {
    const written = note.value.trim();
    if (removed || written === (item.note || '')) return;
    await savePatron({ ...item, note: written });
    // Only once it is safely kept does the record in hand count it as written.
    item.note = written;
  }, 1200, { onState: status.show });
  note.addEventListener('input', () => saver.touch());
  note.addEventListener('blur', () => saver.flush());

  // The sheet starts from what is on the page now, so notes just typed are saved first.
  add(back, el('button', { class: 'icon-button', 'aria-label': 'Edit', onclick: async () => { saver.touch(); await saver.flush(); patronSheet(item, refresh); } }, icon('edit', 22)));
  add(container,
    back,
    el('article', { class: 'chapter prayer-page' },
      item.role ? el('p', { class: 'rubric', text: item.role }) : null,
      el('h2', { class: 'chapter-title', text: item.name }),
      account && account.dates ? el('p', { class: 'chapter-sub', text: account.dates.replace(/ to /g, '–').replace(/about /g, 'c. ') }) : null,
      next ? el('p', { class: 'chapter-sub', text: next === now ? 'Today is the feast.' : `Feast: ${longDate(next, dayFor(next).weekdayName)}${next.slice(0, 4) === now.slice(0, 4) ? '' : `, ${next.slice(0, 4)}`}` }) : null,
      account ? el('p', { class: 'devotion-guide', text: account.about }) : null,
      account && account.patron ? el('p', { class: 'muted', text: account.patron }) : null,
      el('label', { class: 'field-label saint-notes' }, 'Your notes', note, status.node),
      el('p', { class: 'prayer-line saint-invocation', text: `${item.name}, pray for us.` })),
    el('div', { class: 'prayer-actions' },
      template ? el('button', { class: 'button quiet wide', onclick: () => startSheet(template) }, 'Begin a novena') : null,
      dates && !dates.underWay ? el('p', { class: 'muted small centre', text: `To end on the eve of the feast, a novena begins on ${longDate(dates.start, dayFor(dates.start).weekdayName)}.` }) : null,
      el('button', {
        class: 'text-button',
        onclick: () => confirmSheet('Remove this saint?', 'The saint and your notes will be removed from your list.', 'Remove', async () => {
          removed = true;
          await saver.stop();
          await deletePatron(item.id);
          toast(`${item.name} removed`);
          go('#/pray/saints');
        }),
      }, 'Remove from my saints')),
  );
  // What was typed is kept even if the reader leaves without tapping elsewhere first.
  return () => saver.stop();
}
