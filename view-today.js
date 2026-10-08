// view-today.js
// The Today screen: the liturgical day, the week at a glance, the reader's
// daily prayers, the Mass readings, and where they left off in the Bible and
// in any plans.

import { addDays, weekOf } from './calendar.js';
import { book, chapterTitle, formatSpan, verseText, verseId } from './bible.js';
import { dayFor, go, longDate, readingsOn, today, typeLabel } from './context.js';
import { db, settings } from './db.js';
import { allProgress, doneCount, loadPlans, nextDay } from './plans.js';
import { add, el, icon } from './ui.js';
import { dailyCard } from './view-daily.js';

const DAY_LETTERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function render(container, { date }) {
  const current = today();
  const iso = date || current;
  const { day, readings, masses, title, approximate } = readingsOn(iso);

  add(container,
    el('header', { class: 'app-header' },
      el('h1', { class: 'app-title', text: 'Biblica' }),
      el('button', { class: 'icon-button', 'aria-label': 'Settings', onclick: () => go('#/settings') }, icon('settings', 24))),
    hero(day, iso, current),
    weekStrip(iso, current),
    await dailyCard(iso),
    await readingsCard(iso, day, readings, masses, title, approximate),
    await continueCard(),
    await plansCard(),
  );
}

function hero(day, iso, current) {
  const rank = typeLabel(day.celebration.type);
  const counted = ['ordinary', 'advent', 'lent', 'easter'].includes(day.season) && day.week > 0;
  const seasonLine = counted ? `${day.seasonName}, week ${day.week}` : day.seasonName;
  const observances = [];
  if (day.holyDay) observances.push('Holy day of obligation');
  if (day.fast) observances.push('Day of fasting and abstinence');
  else if (day.abstinence) observances.push('Day of abstinence from meat');

  return el('section', { class: 'card hero', dataset: { lit: day.color } },
    el('span', { class: 'ribbon', 'aria-hidden': 'true' }),
    el('p', { class: 'hero-date', text: iso === current ? `Today, ${longDate(iso, day.weekdayName).split(', ')[1]}` : longDate(iso, day.weekdayName) }),
    el('h2', { class: 'hero-name', text: day.celebration.name }),
    el('p', { class: 'hero-meta' },
      rank ? el('span', { class: 'rank', text: rank }) : null,
      el('span', { text: seasonLine })),
    day.celebration.source === 'sanctoral' && day.temporal.type === 'weekday'
      ? el('p', { class: 'hero-sub', text: day.temporal.name })
      : null,
    day.commemorations.length
      ? el('p', { class: 'hero-sub', text: `Also today: ${day.commemorations.map((item) => item.name).join('; ')}` })
      : null,
    observances.length ? el('p', { class: 'hero-observance', text: observances.join('. ') }) : null,
  );
}

function weekStrip(iso, current) {
  const days = weekOf(iso);
  const strip = el('div', { class: 'week-strip', role: 'group', 'aria-label': 'Days of this week' });
  for (const dayIso of days) {
    const info = dayFor(dayIso);
    const dayNumber = Number(dayIso.slice(8));
    strip.append(el('button', {
      class: `week-day${dayIso === iso ? ' selected' : ''}${dayIso === current ? ' is-today' : ''}`,
      'aria-label': `${longDate(dayIso, info.weekdayName)}: ${info.celebration.name}`,
      'aria-pressed': dayIso === iso ? 'true' : 'false',
      onclick: () => go(dayIso === current ? '#/today' : `#/today/${dayIso}`),
    },
    el('span', { class: 'week-letter', text: DAY_LETTERS[info.weekday] }),
    el('span', { class: 'week-number', text: dayNumber }),
    el('span', { class: 'week-dot', dataset: { lit: info.color } })));
  }
  return el('section', { class: 'week' },
    el('button', { class: 'icon-button', 'aria-label': 'Previous week', onclick: () => go(`#/today/${addDays(iso, -7)}`) }, icon('back')),
    strip,
    el('button', { class: 'icon-button', 'aria-label': 'Next week', onclick: () => go(`#/today/${addDays(iso, 7)}`) }, icon('forward')),
    iso !== current ? el('button', { class: 'chip-button week-today', onclick: () => go('#/today') }, 'Back to today') : null,
  );
}

async function readingsCard(iso, day, readings, masses, title, approximate) {
  const card = el('section', { class: 'card' }, el('h3', { class: 'card-heading', text: title || 'Mass readings' }));
  if (!readings.length) {
    add(card, el('p', { class: 'muted', text: 'The readings for this day are not in the app yet. They will arrive with a data update.' }));
    return card;
  }
  const record = (await db.get('readings', iso)) || { id: iso, done: {} };
  const list = el('ul', { class: 'reading-list' });
  const previews = await Promise.all(readings.map((reading) => preview(reading)));
  readings.forEach((reading, index) => {
    const done = Boolean(record.done[index]);
    list.append(el('li', {},
      el('button', { class: `reading-row${done ? ' done' : ''}`, onclick: () => go(`#/reading/${iso}/${index}`) },
        el('span', { class: 'reading-text' },
          el('span', { class: 'reading-label', text: reading.label }),
          el('span', { class: 'reading-cite', text: reading.citation }),
          el('span', { class: 'reading-preview', text: previews[index] })),
        el('span', { class: 'reading-check', 'aria-label': done ? 'Read' : 'Not yet read' }, done ? icon('check', 20) : null))));
  });
  add(card, list);
  if (masses.length) {
    add(card, el('p', { class: 'muted small', text: `These are the readings of the ${masses[masses.length - 1].label}. This day has ${masses.length} Masses; open a reading to choose another.` }));
  }
  if (approximate) {
    add(card, el('p', { class: 'muted small', text: 'These citations come from the Latin lectionary, so a verse or two at either end may differ from your missal.' }));
  }
  return card;
}

async function preview(reading) {
  const [chapter, verse] = reading.spans[0];
  try {
    const text = await verseText(verseId(reading.book, chapter, verse));
    return text.length > 90 ? `${text.slice(0, 88).replace(/\s+\S*$/, '')}…` : text;
  } catch {
    return '';
  }
}

async function continueCard() {
  const place = settings().lastPlace;
  if (!place || !book(place.book)) {
    return el('section', { class: 'card' },
      el('h3', { class: 'card-heading', text: 'The Bible' }),
      el('p', { class: 'muted', text: 'Seventy-three books in the Douay-Rheims translation.' }),
      el('button', { class: 'button', onclick: () => go('#/read/GEN/1') }, 'Start at Genesis'));
  }
  return el('section', { class: 'card' },
    el('h3', { class: 'card-heading', text: 'Continue reading' }),
    el('button', { class: 'row-button', onclick: () => go(`#/read/${place.book}/${place.chapter}`) },
      el('span', { class: 'row-title', text: chapterTitle(place.book, place.chapter) }),
      icon('forward', 20)));
}

async function plansCard() {
  const [plans, progress] = await Promise.all([loadPlans(), allProgress()]);
  const active = plans.filter((item) => progress.has(item.id));
  const card = el('section', { class: 'card' }, el('h3', { class: 'card-heading', text: 'Reading plans' }));
  if (!active.length) {
    add(card,
      el('p', { class: 'muted', text: 'Read the whole Bible in a year, or the Gospels in ninety days.' }),
      el('button', { class: 'button quiet', onclick: () => go('#/plans') }, 'Choose a plan'));
    return card;
  }
  for (const item of active) {
    const record = progress.get(item.id);
    const next = nextDay(item, record);
    const done = doneCount(record);
    const portion = next >= 0 ? item.days[next].map(([bookId, ...span]) => formatSpan(bookId, span, { short: true })).join(', ') : 'Finished';
    add(card, el('button', { class: 'row-button plan-row', onclick: () => go(next >= 0 ? `#/plan/${item.id}/${next + 1}` : `#/plans/${item.id}`) },
      el('span', { class: 'row-text' },
        el('span', { class: 'row-title', text: item.name }),
        el('span', { class: 'row-sub', text: next >= 0 ? `Day ${next + 1} of ${item.days.length}: ${portion}` : 'Finished' }),
        el('span', { class: 'progress-track' }, el('span', { class: 'progress-fill', style: { width: `${(100 * done) / item.days.length}%` } }))),
      icon('forward', 20)));
  }
  return card;
}
