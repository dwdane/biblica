// view-daily.js
// The reader's rule of life: the card on Today, the screen for arranging
// it, a way to start from a rule suited to one's state of life, and the
// month view for looking back.
//
// The card is a quick way into what the reader tries to do today: every
// day, and on the days some things fall (a first Friday, a feast). It has no
// boxes to tick, because a prayer is not a task. A quiet word beside what
// has been prayed is there only for those who turn it on in Settings.

import { dayFor, go, monthName, refresh, today } from './context.js';
import { saveSetting, settings } from './db.js';
import { setNovenaPrayed } from './novenas.js';
import { loadPlans, allProgress } from './plans.js';
import {
  DEVOTION_NAMES, TIMES, currentPractices, endPractice, guides, itemsFor, monthHistory, savePractice, setDone, titleFor,
} from './practices.js';
import { listedPrayers, ownPrayers, startingRules } from './prayers.js';
import {
  MONTH_NAMES, ORDINALS, SEASON_CHOICES, WEEKDAY_NAMES, nextOccurrence, occasionLabel, ordinal, ruleProblem, scheduleLabel,
} from './schedule.js';
import { add, choice, clear, el, icon, once, openSheet, toast } from './ui.js';
import { intentionsSheet } from './view-intentions.js';

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Whether the reader wants a quiet mark beside what has been prayed. */
const marksOn = () => settings().dailyMarks === true;

/** A small picture for what an entry is, so the card reads as a set of ways in, not a list of tasks. */
function kindIcon(item) {
  if (item.novena) return 'star';
  const [kind, name] = (item.practice && item.practice.ref ? item.practice.ref : '').split(':');
  if (kind === 'devotion') return { rosary: 'star', stations: 'cross', lectio: 'bible', examen: 'hours' }[name] || 'cross';
  if (kind === 'guide') return 'hours';
  if (kind === 'journal') return 'edit';
  if (kind === 'readings') return 'bible';
  if (kind === 'plan') return 'plans';
  if (kind === 'prayer') return 'cross';
  return /mass/i.test(item.title) ? 'mass' : 'today';
}

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
  journal: 'evening',
  'guide:mental-prayer': 'morning',
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
  const redraw = () => drawCard(card, iso);
  clear(card);

  const head = (editLabel = 'Edit') => el('div', { class: 'card-head' },
    el('h3', { class: 'card-heading', text: iso === today() ? 'For today' : 'For this day' }),
    el('button', { class: 'text-button small', onclick: () => go('#/pray/list') }, editLabel));

  if (!items.length) {
    const haveList = (await currentPractices()).length > 0;
    if (haveList) {
      add(card, head(), el('p', { class: 'muted', text: 'Nothing from your rule of life falls on this day.' }), footer([]));
      return true;
    }
    if (settings().hideDailySetup) return false;
    add(card,
      el('h3', { class: 'card-heading', text: 'Your rule of life' }),
      el('p', { text: 'What do you try to do each day? Saint Francis de Sales advises a few practices that fit your state of life, chosen once and kept: an offering in the morning, a time of prayer, a look back at night. Choose yours, and they will be here each day, a tap away.' }),
      el('div', { class: 'button-row' },
        el('button', { class: 'button quiet', onclick: () => go('#/pray/list') }, 'Choose myself'),
        el('button', { class: 'button', onclick: () => ruleSetupSheet(refresh) }, 'Help me choose')),
      el('div', { class: 'daily-footer' },
        el('button', { class: 'text-button', onclick: async () => { await saveSetting('hideDailySetup', true); card.remove(); } }, 'Not now')));
    return true;
  }

  add(card, head());
  const groups = TIMES.map(([id, label]) => [label, items.filter((item) => item.time === id)]).filter(([, list]) => list.length);
  for (const [label, list] of groups) {
    if (groups.length > 1) add(card, el('p', { class: 'daily-time', text: label }));
    const node = el('ul', { class: 'rule-list' });
    for (const item of list) node.append(row(item));
    add(card, node);
  }
  add(card, footer(items));
  return true;

  function row(item) {
    const prayed = marksOn() && item.done;
    // Why this is here today, for what does not come every day: "First Friday", "Once a year".
    const occasion = item.practice ? occasionLabel(item.practice) : null;
    // An entry with a page of its own opens it. One without (something the reader
    // named, such as "Mass") is a reminder, and opens nothing unless marks are on.
    const open = () => {
      if (item.path) go(item.path);
      else if (marksOn() && !future) prayedSheet(iso, redraw);
    };
    const plain = !item.path && (!marksOn() || future);
    return el('li', { class: `rule-item${prayed ? ' prayed' : ''}${plain ? ' plain' : ''}`, dataset: { key: item.key } },
      el(plain ? 'div' : 'button', { class: 'rule-body', onclick: plain ? null : open },
        el('span', { class: 'rule-icon', 'aria-hidden': 'true' }, icon(kindIcon(item), 20)),
        el('span', { class: 'rule-text' },
          el('span', { class: 'daily-title', text: item.title }),
          item.sub ? el('span', { class: 'daily-sub', text: item.sub }) : null),
        occasion ? el('span', { class: 'rule-occasion', text: occasion }) : null,
        prayed ? el('span', { class: 'daily-mark', text: 'Prayed' }) : null));
  }

  function footer(shown = []) {
    return el('div', { class: 'daily-footer' },
      el('button', { class: 'text-button', onclick: () => intentionsSheet(redraw) }, 'Intentions'),
      marksOn() && shown.length && !future
        ? el('button', { class: 'text-button', onclick: () => prayedSheet(iso, redraw) }, 'What I have prayed')
        : null);
  }
}

/**
 * Say what was prayed on a date: for prayers prayed away from the phone, and
 * for putting a mark right. Reached from the card; never shown unasked.
 */
async function prayedSheet(iso, onDone) {
  const day = dayFor(iso);
  const listNode = el('div', { class: 'prayed-list' });
  const draw = async () => {
    const items = await itemsFor(iso, day);
    clear(listNode);
    for (const item of items) {
      const toggle = once(async () => {
        if (item.novena) await setNovenaPrayed(item.novena.id, iso, !item.done);
        else await setDone(iso, item.key, !item.done);
        await draw();
        const again = listNode.querySelector(`[data-key="${item.key}"]`);
        if (again) again.focus({ preventScroll: true });
      });
      add(listNode, el('button', { class: `prayed-row${item.done ? ' on' : ''}`, 'aria-pressed': item.done ? 'true' : 'false', dataset: { key: item.key }, onclick: toggle },
        el('span', { class: 'daily-title', text: item.title }),
        el('span', { class: 'prayed-state', text: item.done ? 'Prayed' : 'Tap if you prayed this' })));
    }
  };
  await draw();
  openSheet(iso === today() ? 'What I have prayed today' : 'What I prayed that day', (close) => [
    el('p', { class: 'muted small', text: 'The app notes a prayer by itself when you finish it here. For anything prayed away from the phone, say so below. This is only a record for you to look back on.' }),
    listNode,
    el('div', { class: 'button-row spread' },
      el('button', { class: 'button quiet', onclick: () => { close(); go('#/pray/history'); } }, 'Looking back'),
      el('button', { class: 'button', onclick: close }, 'Done')),
  ], { onClose: onDone });
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
    el('h1', { class: 'page-title', text: 'My rule of life' }),
    el('p', { class: 'muted page-intro', text: 'What you try to do, every day and on certain days: a first Friday, a feast, the Fridays of Lent. It all appears under “For today” on Today, a tap away. Keep it small enough to keep; Saint Francis de Sales advises devotion that fits your state of life, looked over once a year. Novenas you start are added by themselves while they last.' }),
    listNode,
    el('div', { class: 'button-row spread' },
      el('button', { class: 'button quiet', onclick: () => ruleSetupSheet(draw) }, 'Help me choose'),
      el('button', { class: 'button', onclick: () => addSheet(draw) }, 'Add')),
    marksOn() ? el('div', { class: 'prayer-actions' }, el('button', { class: 'text-button', onclick: () => go('#/pray/history') }, 'Looking back')) : null,
  );
  await draw();
}

/**
 * Start from a rule suited to one's state of life: choose the state, see
 * what it suggests, untick what does not fit, and add the rest. Nothing is
 * added until the reader says so, and nothing already on the list twice.
 */
export function ruleSetupSheet(onDone) {
  const rules = startingRules();
  openSheet('Help me choose', (close) => {
    const body = el('div', {});
    function chooseState() {
      clear(body);
      add(body,
        el('p', { class: 'muted small', text: 'Saint Francis de Sales advises a devotion that fits your state of life: a parent’s is not a monk’s. Pick what is closest to yours; you can change anything afterwards.' }),
        el('div', { class: 'choice-list' }, rules.map((rule) => el('button', { class: 'picker-book', onclick: () => showRule(rule) },
          el('span', { class: 'row-text' },
            el('span', { class: 'row-title', text: rule.title }),
            el('span', { class: 'row-sub', text: rule.sub }))))));
    }
    async function showRule(rule) {
      const existing = await currentPractices();
      const titles = await Promise.all(rule.entries.map((entry) => (entry.title ? entry.title : titleFor(entry.ref))));
      const boxes = [];
      clear(body);
      const listNode = el('div', { class: 'rule-choices' });
      rule.entries.forEach((entry, index) => {
        const title = titles[index];
        const already = existing.some((item) => item.ref === entry.ref && (entry.ref !== 'custom' || item.title === title));
        const box = el('input', { type: 'checkbox', id: `rule-${index}` });
        box.checked = !already;
        box.disabled = already;
        boxes.push(box);
        const when = scheduleLabel({ weekdays: entry.weekdays || null, repeat: entry.repeat || null });
        add(listNode, el('label', { class: 'picker-check rule-choice', for: `rule-${index}` }, box,
          el('span', { class: 'row-text' },
            el('span', { class: 'row-title', text: title }),
            el('span', { class: 'row-sub', text: already ? 'Already in your rule' : `${(TIMES.find(([id]) => id === (entry.time || 'any')) || TIMES[3])[1]} · ${when}` }))));
      });
      const addButton = el('button', { class: 'button' }, 'Add these');
      addButton.addEventListener('click', once(async () => {
        let added = 0;
        for (const [index, entry] of rule.entries.entries()) {
          if (!boxes[index].checked || boxes[index].disabled) continue;
          await savePractice({ ref: entry.ref, title: titles[index], time: entry.time || 'any', weekdays: entry.weekdays || null, repeat: entry.repeat || null, during: null });
          added += 1;
        }
        close();
        toast(added ? `${added} added to your rule of life` : 'Nothing was added');
        if (onDone) await onDone();
      }));
      add(body,
        el('h3', { class: 'list-heading', text: rule.title }),
        el('p', { class: 'muted small', text: 'Untick anything that does not fit. Each can be changed or removed later, and you can add more once these are habits.' }),
        listNode,
        el('div', { class: 'button-row spread' },
          el('button', { class: 'button quiet', onclick: chooseState }, 'Back'),
          addButton));
    }
    chooseState();
    return body;
  }, { tall: true });
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
        ...guides().map((item) => [`guide:${item.id}`, item.title]),
        ['journal', 'Journal'],
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

/** A drop-down of [value, label] choices. Values come back as they were given, numbers included. */
function select(options, current, onChoose, label) {
  const node = el('select', { class: 'field select', 'aria-label': label });
  options.forEach(([value, text], index) => {
    const option = el('option', { value: String(index), text });
    if (value === current) option.selected = true;
    node.append(option);
  });
  node.addEventListener('change', () => onChoose(options[Number(node.value)][0]));
  return node;
}

/** A row of small on/off buttons, such as the days of the week. `isOn(index)` and `flip(index)` work on the draft. */
function toggles(letters, names, isOn, flip, label, className = 'day-toggles') {
  const row = el('div', { class: className, role: 'group', 'aria-label': label });
  const draw = () => {
    clear(row);
    letters.forEach((letter, index) => {
      const on = isOn(index);
      row.append(el('button', {
        class: `day-toggle${on ? ' on' : ''}`, 'aria-pressed': on ? 'true' : 'false', 'aria-label': names[index],
        // The row is drawn again, so the focus is put back on the button just pressed.
        onclick: () => { flip(index); draw(); row.children[index].focus({ preventScroll: true }); },
      }, letter));
    });
  };
  draw();
  return row;
}

/** Set the name, time of day and repetition of an entry; remove it. */
function entrySheet(practice, onDone) {
  const isNew = !practice.id;
  const now = today();
  const [, thisMonth, thisDay] = now.split('-').map(Number);
  const stored = practice.repeat || {};
  // Every way of repeating keeps its own choices while the sheet is open, so
  // that trying "Monthly" and coming back to "Weekly" loses nothing.
  const draft = {
    kind: stored.kind || 'weekly',
    weekdays: practice.weekdays ? [...practice.weekdays] : [true, true, true, true, true, true, true],
    monthlyBy: stored.kind === 'monthly' && stored.weekday !== undefined ? 'weekday' : 'date',
    monthDay: stored.kind === 'monthly' && stored.day !== undefined ? stored.day : thisDay,
    nth: stored.kind === 'monthly' && stored.nth !== undefined ? stored.nth : 1,
    weekday: stored.kind === 'monthly' && stored.weekday !== undefined ? stored.weekday : 5,
    yearMonth: stored.kind === 'yearly' ? stored.month : thisMonth,
    yearDay: stored.kind === 'yearly' ? stored.day : thisDay,
    limit: practice.during && practice.during.months ? 'months' : (practice.during && practice.during.seasons ? 'seasons' : 'none'),
    months: new Set(practice.during && practice.during.months ? practice.during.months : []),
    seasons: new Set(practice.during && practice.during.seasons ? practice.during.seasons : []),
    time: practice.time || 'any',
  };

  /** The fields to store for the choices as they stand. */
  const rule = () => {
    let repeat = null;
    let weekdays = null;
    if (draft.kind === 'monthly') {
      repeat = draft.monthlyBy === 'weekday'
        ? { kind: 'monthly', nth: draft.nth, weekday: draft.weekday }
        : { kind: 'monthly', day: draft.monthDay };
    } else if (draft.kind === 'yearly') {
      repeat = { kind: 'yearly', month: draft.yearMonth, day: draft.yearDay };
    } else {
      weekdays = draft.weekdays.every(Boolean) ? null : [...draft.weekdays];
    }
    let during = null;
    if (draft.kind !== 'yearly') {
      if (draft.limit === 'months' && draft.months.size) during = { months: [...draft.months].sort((a, b) => a - b) };
      if (draft.limit === 'seasons' && draft.seasons.size) during = { seasons: SEASON_CHOICES.map(([id]) => id).filter((id) => draft.seasons.has(id)) };
    }
    return { weekdays, repeat, during };
  };

  openSheet(isNew ? 'Add to my list' : 'Edit entry', (close) => {
    const name = el('input', { class: 'field', type: 'text', 'aria-label': 'Name' });
    name.value = practice.title;

    const timeRow = choice(TIMES, draft.time, (id) => { draft.time = id; }, { label: 'Time of day', className: 'segmented time-grid' });
    const detail = el('div', { class: 'repeat-detail' });
    const limitDetail = el('div', { class: 'repeat-detail' });
    const limitBlock = el('div', { class: 'field-label' });
    const summary = el('p', { class: 'repeat-summary', role: 'status' });

    const drawSummary = () => {
      const fields = rule();
      const problem = ruleProblem(fields)
        // Once a year is one day: the limit to months or seasons is not offered and does not apply.
        || (draft.kind !== 'yearly' && draft.limit === 'months' && !draft.months.size ? 'Choose at least one month.' : null)
        || (draft.kind !== 'yearly' && draft.limit === 'seasons' && !draft.seasons.size ? 'Choose at least one season.' : null);
      if (problem) {
        summary.textContent = problem;
        return false;
      }
      const next = nextOccurrence(fields, now, (date) => dayFor(date).season);
      let when = '';
      if (next && next !== now) {
        const [year, month, day] = next.split('-').map(Number);
        when = ` Next: ${dayFor(next).weekdayName}, ${MONTH_NAMES[month - 1]} ${day}${year !== Number(now.slice(0, 4)) ? `, ${year}` : ''}.`;
      } else if (next === now) {
        when = ' That includes today.';
      }
      summary.textContent = `${scheduleLabel(fields)}.${when}`;
      return true;
    };

    // Shown while a date is chosen that some months do not have.
    const shorter = el('p', { class: 'muted small', text: 'In a shorter month it falls on the last day.' });
    const dayOptions = (longest) => Array.from({ length: longest }, (_, index) => [index + 1, ordinal(index + 1)]);

    const drawDetail = () => {
      clear(detail);
      if (draft.kind === 'weekly') {
        add(detail, toggles(DAY_INITIALS, WEEKDAY_NAMES, (index) => draft.weekdays[index], (index) => { draft.weekdays[index] = !draft.weekdays[index]; drawSummary(); }, 'Days of the week'));
      } else if (draft.kind === 'monthly') {
        add(detail,
          choice([['date', 'On a date'], ['weekday', 'On a weekday']], draft.monthlyBy, (value) => { draft.monthlyBy = value; drawDetail(); drawSummary(); }, { label: 'Monthly on', className: 'segmented sub' }),
          draft.monthlyBy === 'date'
            ? el('div', { class: 'select-row' },
              el('span', { text: 'The' }),
              select([...dayOptions(31), ['last', 'last day']], draft.monthDay, (value) => { draft.monthDay = value; shorter.hidden = !(Number(value) > 28); drawSummary(); }, 'Day of the month'),
              el('span', { text: 'of each month' }))
            : el('div', { class: 'select-row' },
              el('span', { text: 'The' }),
              select(ORDINALS.map(([value, text]) => [value, text.toLowerCase()]), draft.nth, (value) => { draft.nth = value; drawSummary(); }, 'Which one in the month'),
              select(WEEKDAY_NAMES.map((text, index) => [index, text]), draft.weekday, (value) => { draft.weekday = value; drawSummary(); }, 'Day of the week')),
          draft.monthlyBy === 'date' ? shorter : null);
        shorter.hidden = !(Number(draft.monthDay) > 28);
      } else {
        add(detail, el('div', { class: 'select-row' },
          select(MONTH_NAMES.map((text, index) => [index + 1, text]), draft.yearMonth, (value) => { draft.yearMonth = value; drawSummary(); }, 'Month'),
          select(dayOptions(31), draft.yearDay, (value) => { draft.yearDay = value; drawSummary(); }, 'Day')));
      }
      // Once a year is already a single day; limiting it further means nothing.
      limitBlock.hidden = draft.kind === 'yearly';
    };

    const drawLimit = () => {
      clear(limitDetail);
      if (draft.limit === 'months') {
        add(limitDetail, toggles(MONTH_SHORT, MONTH_NAMES, (index) => draft.months.has(index + 1), (index) => {
          if (!draft.months.delete(index + 1)) draft.months.add(index + 1);
          drawSummary();
        }, 'Months', 'day-toggles months'));
      } else if (draft.limit === 'seasons') {
        const row = el('div', { class: 'chip-row', role: 'group', 'aria-label': 'Seasons' });
        const draw = () => {
          clear(row);
          SEASON_CHOICES.forEach(([id, label], index) => {
            const on = draft.seasons.has(id);
            row.append(el('button', {
              class: `chip-button${on ? ' on' : ''}`, 'aria-pressed': on ? 'true' : 'false',
              onclick: () => {
                if (!draft.seasons.delete(id)) draft.seasons.add(id);
                draw();
                drawSummary();
                row.children[index].focus({ preventScroll: true });
              },
            }, label));
          });
        };
        draw();
        add(limitDetail, row);
      }
    };

    add(limitBlock, 'Only during',
      choice([['none', 'All year'], ['months', 'Certain months'], ['seasons', 'A season']], draft.limit, (value) => { draft.limit = value; drawLimit(); drawSummary(); }, { label: 'Only during', className: 'segmented' }),
      limitDetail);

    drawDetail();
    drawLimit();
    drawSummary();

    const save = once(async () => {
      const title = name.value.trim();
      if (!title) { name.focus(); return; }
      if (!drawSummary()) return;
      const { id, ref, created, ended, order } = practice;
      await savePractice({ id, ref, created, ended, order, title, time: draft.time, ...rule() });
      close();
      toast(isNew ? `${title} added to your list` : 'Saved');
      if (onDone) await onDone();
    });

    return [
      el('label', { class: 'field-label' }, 'Name', name),
      el('div', { class: 'field-label' }, 'Time of day', timeRow),
      el('div', { class: 'field-label' }, 'Repeats',
        choice([['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly']], draft.kind, (value) => { draft.kind = value; drawDetail(); drawSummary(); }, { label: 'Repeats', className: 'segmented' }),
        detail),
      limitBlock,
      summary,
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
      isNew || !marksOn() ? null : el('p', { class: 'muted small', text: 'Removing an entry keeps the days already recorded, so they still show when you look back.' }),
    ];
  }, { tall: true });
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
    rows.length ? el('p', { class: 'muted small history-key', text: 'A filled dot is a day you prayed. To change a day, open it on Today and choose What I have prayed.' }) : null,
  );
}
