// view-daily.js
// The daily prayer list: the card on Today, the screen for arranging the
// list, and the month view for looking back.

import { dayFor, go, monthName, today } from './context.js';
import { saveSetting, settings } from './db.js';
import { setNovenaPrayed } from './novenas.js';
import { loadPlans, allProgress } from './plans.js';
import {
  DEVOTION_NAMES, TIMES, currentPractices, endPractice, itemsFor, monthHistory, savePractice, scheduleLabel, setDone, titleFor,
} from './practices.js';
import { listedPrayers, ownPrayers } from './prayers.js';
import { add, celebrate, choice, clear, el, icon, once, openSheet, toast } from './ui.js';

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Where on the list a newly added entry most naturally sits.
const DEFAULT_TIME = {
  'prayer:morning-offering': 'morning',
  'prayer:benedictus': 'morning',
  'prayer:psalm-95': 'morning',
  'prayer:psalm-63': 'morning',
  'prayer:angelus': 'day',
  'prayer:magnificat': 'evening',
  'prayer:night-prayer': 'evening',
  'prayer:nunc-dimittis': 'evening',
  'prayer:psalm-91': 'evening',
  'prayer:act-of-contrition': 'evening',
  'devotion:examen': 'evening',
};

// ---------------------------------------------------------------------------
// The card on Today
// ---------------------------------------------------------------------------

/**
 * The daily list for one date, as a card. Returns null when the reader has
 * no list and has dismissed the invitation to make one.
 */
export async function dailyCard(iso) {
  const card = el('section', { class: 'card daily-card' });
  const shown = await drawCard(card, iso);
  return shown ? card : null;
}

async function drawCard(card, iso) {
  const day = dayFor(iso);
  const items = await itemsFor(iso, day);
  const future = iso > today();
  clear(card);

  if (!items.length) {
    const haveList = (await currentPractices()).length > 0;
    if (haveList) {
      add(card,
        el('h3', { class: 'card-heading', text: 'Daily prayers' }),
        el('p', { class: 'muted', text: 'Nothing on your list falls on this day.' }),
        footer());
      return true;
    }
    if (settings().hideDailySetup) return false;
    add(card,
      el('h3', { class: 'card-heading', text: 'Daily prayers' }),
      el('p', { class: 'muted', text: 'Choose the prayers you want to keep each day, and they will be here when you open the app.' }),
      el('div', { class: 'button-row' },
        el('button', { class: 'button quiet', onclick: async () => { await saveSetting('hideDailySetup', true); card.remove(); } }, 'Not now'),
        el('button', { class: 'button', onclick: () => go('#/pray/list') }, 'Choose prayers')));
    return true;
  }

  add(card, el('h3', { class: 'card-heading', text: 'Daily prayers' }));
  const groups = TIMES.map(([id, label]) => [label, items.filter((item) => item.time === id)]).filter(([, list]) => list.length);
  for (const [label, list] of groups) {
    if (groups.length > 1) add(card, el('p', { class: 'daily-time', text: label }));
    const node = el('ul', { class: 'daily-list' });
    for (const item of list) node.append(row(item));
    add(card, node);
  }
  add(card, footer());
  return true;

  function row(item) {
    const toggle = once(async () => {
      const done = !item.done;
      if (item.novena) await setNovenaPrayed(item.novena.id, iso, done);
      else await setDone(iso, item.key, done);
      await drawCard(card, iso);
      // The card was drawn afresh: put the focus back on the same tick.
      const again = card.querySelector(`[data-key="${item.key}"] .daily-check`);
      if (again) again.focus({ preventScroll: true });
      if (done && iso === today()) {
        const remaining = (await itemsFor(iso, day)).filter((other) => !other.done).length;
        if (remaining === 0) celebrate({ season: day.season, count: 14 });
      }
    });
    return el('li', { class: `daily-row${item.done ? ' done' : ''}`, dataset: { key: item.key } },
      el('button', {
        class: 'daily-check', role: 'checkbox', 'aria-checked': item.done ? 'true' : 'false',
        'aria-label': item.title,
        disabled: future, onclick: toggle,
      }, el('span', { class: 'check-ring' }, item.done ? icon('check', 18) : null)),
      el('button', { class: 'daily-body', onclick: () => (item.path ? go(item.path) : (future ? null : toggle())) },
        el('span', { class: 'daily-title', text: item.title }),
        item.sub ? el('span', { class: 'daily-sub', text: item.sub }) : null),
      item.path ? el('span', { class: 'daily-go', 'aria-hidden': 'true' }, icon('forward', 18)) : null);
  }

  function footer() {
    return el('div', { class: 'daily-footer' },
      el('button', { class: 'text-button', onclick: () => go('#/pray/list') }, 'Edit list'),
      el('button', { class: 'text-button', onclick: () => go('#/pray/history') }, 'Looking back'));
  }
}

// ---------------------------------------------------------------------------
// Arranging the list
// ---------------------------------------------------------------------------

export async function renderList(container) {
  const listNode = el('div', {});

  async function draw() {
    const practices = await currentPractices();
    clear(listNode);
    if (!practices.length) {
      add(listNode, el('p', { class: 'empty', text: 'Your list is empty. Add a prayer or two to begin.' }));
      return;
    }
    for (const [timeId, label] of TIMES) {
      const group = practices.filter((item) => (item.time || 'any') === timeId);
      if (!group.length) continue;
      add(listNode, el('h3', { class: 'list-heading', text: label }));
      for (const practice of group) {
        add(listNode, el('button', { class: 'list-row', onclick: () => entrySheet(practice, draw) },
          el('span', { class: 'row-text' },
            el('span', { class: 'row-title', text: practice.title }),
            el('span', { class: 'row-sub', text: scheduleLabel(practice) })),
          icon('forward', 18)));
      }
    }
  }

  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => go('#/pray') }, icon('back'), el('span', { text: 'Prayer' }))),
    el('h1', { class: 'page-title', text: 'Daily prayers' }),
    el('p', { class: 'muted page-intro', text: 'What is on this list appears on Today, on the days you choose. Novenas you start are added by themselves while they last.' }),
    listNode,
    el('div', { class: 'button-row spread' },
      el('button', { class: 'button quiet', onclick: () => go('#/pray/history') }, 'Looking back'),
      el('button', { class: 'button', onclick: () => addSheet(draw) }, 'Add to my list')),
  );
  await draw();
}

/** Choose something to add to the list. */
export async function addSheet(onDone) {
  const [plans, progress, own, existing] = await Promise.all([loadPlans(), allProgress(), ownPrayers(), currentPractices()]);
  const taken = new Set(existing.map((item) => item.ref));
  openSheet('Add to my list', (close) => {
    const filter = el('input', { class: 'field', type: 'search', placeholder: 'Find a prayer', 'aria-label': 'Find a prayer' });
    const listNode = el('div', { class: 'picker-list' });
    const custom = el('input', { class: 'field', type: 'text', placeholder: 'Something else, such as “Mass” or “Spiritual reading”', 'aria-label': 'Something else' });
    const customButton = el('button', { class: 'button quiet', disabled: true }, 'Add');
    custom.addEventListener('input', () => { customButton.disabled = !custom.value.trim(); });

    const choose = async (reference, title) => {
      close();
      entrySheet({ ref: reference, title: title || await titleFor(reference), time: DEFAULT_TIME[reference] || 'any', weekdays: null }, onDone);
    };
    customButton.addEventListener('click', () => choose('custom', custom.value.trim()));

    const groups = [
      ['Devotions', [
        ...Object.entries(DEVOTION_NAMES).map(([id, name]) => [`devotion:${id}`, name]),
        ['readings', 'Mass readings'],
      ]],
      ['Reading plans', plans.filter((plan) => progress.has(plan.id)).map((plan) => [`plan:${plan.id}`, plan.name])],
      ['Your own prayers', own.map((prayer) => [`prayer:${prayer.id}`, prayer.title])],
      ['Prayers', listedPrayers().map((prayer) => [`prayer:${prayer.id}`, prayer.title])],
    ];

    function draw() {
      clear(listNode);
      const wanted = filter.value.trim().toLowerCase();
      let any = false;
      for (const [heading, options] of groups) {
        const matching = options.filter(([, title]) => !wanted || title.toLowerCase().includes(wanted));
        if (!matching.length) continue;
        any = true;
        add(listNode, el('h3', { class: 'picker-group', text: heading }));
        for (const [reference, title] of matching) {
          const already = taken.has(reference);
          add(listNode, el('button', { class: 'picker-book', disabled: already, onclick: () => choose(reference, title) },
            el('span', { text: title }),
            already ? el('span', { class: 'picker-alt', text: 'On your list' }) : null));
        }
      }
      if (!any) add(listNode, el('p', { class: 'muted', text: 'No prayer has that name. You can add your own in the library.' }));
    }
    filter.addEventListener('input', draw);
    draw();
    return el('div', { class: 'picker' },
      filter,
      listNode,
      el('div', { class: 'inline-form' }, custom, customButton));
  }, { tall: true });
}

/** Add something directly, from a prayer or devotion page. */
export async function addReference(reference, onDone) {
  entrySheet({ ref: reference, title: await titleFor(reference), time: DEFAULT_TIME[reference] || 'any', weekdays: null }, onDone);
}

/** Set the name, time of day and days of an entry; remove it. */
function entrySheet(practice, onDone) {
  const isNew = !practice.id;
  const draft = { ...practice, weekdays: practice.weekdays ? [...practice.weekdays] : [true, true, true, true, true, true, true] };
  openSheet(isNew ? 'Add to my list' : 'Edit entry', (close) => {
    const name = el('input', { class: 'field', type: 'text', 'aria-label': 'Name' });
    name.value = draft.title;

    const timeRow = choice(TIMES, draft.time, (id) => { draft.time = id; }, { label: 'Time of day', className: 'segmented time-grid' });

    const dayRow = el('div', { class: 'day-toggles', role: 'group', 'aria-label': 'Days of the week' });
    const summary = el('p', { class: 'muted small' });
    const drawDays = () => {
      clear(dayRow);
      draft.weekdays.forEach((on, index) => {
        dayRow.append(el('button', {
          class: `day-toggle${on ? ' on' : ''}`, 'aria-pressed': on ? 'true' : 'false', 'aria-label': DAY_NAMES[index],
          onclick: () => { draft.weekdays[index] = !draft.weekdays[index]; drawDays(); },
        }, DAY_INITIALS[index]));
      });
      summary.textContent = draft.weekdays.some(Boolean) ? scheduleLabel(draft) : 'Choose at least one day.';
    };
    drawDays();

    const save = once(async () => {
      const title = name.value.trim();
      if (!title) { name.focus(); return; }
      if (!draft.weekdays.some(Boolean)) return;
      const everyDay = draft.weekdays.every(Boolean);
      await savePractice({ ...draft, title, weekdays: everyDay ? null : draft.weekdays });
      close();
      toast(isNew ? `${title} added to your list` : 'Saved');
      if (onDone) await onDone();
    });

    return [
      el('label', { class: 'field-label' }, 'Name', name),
      el('div', { class: 'field-label' }, 'When', timeRow),
      el('div', { class: 'field-label' }, 'Which days', dayRow, summary),
      el('div', { class: 'button-row' },
        isNew ? el('button', { class: 'button quiet', onclick: close }, 'Cancel')
          : el('button', {
            class: 'button danger quiet',
            onclick: async () => {
              await endPractice(practice.id, today());
              close();
              toast(`${practice.title} removed from your list`);
              if (onDone) await onDone();
            },
          }, 'Remove from list'),
        el('button', { class: 'button', onclick: save }, isNew ? 'Add' : 'Save')),
      isNew ? null : el('p', { class: 'muted small', text: 'Removing an entry keeps the days already recorded, so they still show when you look back.' }),
    ];
  });
}

// ---------------------------------------------------------------------------
// Looking back
// ---------------------------------------------------------------------------

export async function renderHistory(container, { month }) {
  const now = today();
  const [year, monthNumber] = (/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '') ? month : now.slice(0, 7)).split('-').map(Number);
  const shift = (delta) => {
    const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  };
  const isCurrent = `${year}-${String(monthNumber).padStart(2, '0')}` === now.slice(0, 7);
  const { days, rows } = await monthHistory(year, monthNumber, now);

  const body = el('div', { class: 'history' });
  if (!rows.length) {
    add(body, el('p', { class: 'empty', text: 'Nothing was on your list this month.' }));
  }
  for (const item of rows) {
    const said = item.count ? `${item.title}: prayed on ${item.count} ${item.count === 1 ? 'day' : 'days'}` : item.title;
    const dots = el('div', { class: 'history-dots', style: { gridTemplateColumns: `repeat(${days}, 1fr)` }, role: 'img', 'aria-label': said });
    item.states.forEach((state, index) => {
      const isToday = isCurrent && index + 1 === Number(now.slice(8));
      // Only days prayed are marked. A day without a mark is not shown as a
      // failure: it looks the same whether or not the prayer was on the list.
      const look = state === 'done' ? 'done' : (state === 'ahead' ? 'ahead' : 'rest');
      dots.append(el('span', { class: `history-dot ${look}${isToday ? ' today' : ''}` }));
    });
    add(body, el('div', { class: 'history-row' },
      el('div', { class: 'history-head' },
        el('span', { class: 'row-title', text: item.title }),
        item.count ? el('span', { class: 'muted small', text: `${item.count} ${item.count === 1 ? 'day' : 'days'}` }) : null),
      el('p', { class: 'muted small', text: item.sub }),
      dots));
  }

  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => go('#/pray/list') }, icon('back'), el('span', { text: 'Daily prayers' }))),
    el('h1', { class: 'page-title', text: 'Looking back' }),
    el('div', { class: 'month-nav' },
      el('button', { class: 'icon-button', 'aria-label': 'Previous month', onclick: () => go(`#/pray/history/${shift(-1)}`) }, icon('back')),
      el('span', { class: 'month-name', text: `${monthName(monthNumber)} ${year}` }),
      el('button', { class: 'icon-button', 'aria-label': 'Next month', disabled: isCurrent, onclick: () => go(`#/pray/history/${shift(1)}`) }, icon('forward'))),
    body,
    rows.length ? el('p', { class: 'muted small history-key', text: 'A filled dot is a day you prayed. To change a past day, open that day on Today and tick or untick it there.' }) : null,
  );
}
