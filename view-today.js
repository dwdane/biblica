// view-today.js
// The Today screen: the liturgical day and the week at a glance, then the
// cards the reader has chosen, in the order they have chosen. The
// arrangement lives in settings; see dashboard.js.

import { addDays, weekOf } from './calendar.js';
import { book, chapterTitle, formatSpan, verseText, verseId } from './bible.js';
import { dayFor, go, longDate, readingsOn, refresh, today, typeLabel } from './context.js';
import { cardInfo, moveCard, setCardOn, todayLayout } from './dashboard.js';
import { eventsOn, kindName, obligationFor } from './days.js';
import { db, saveSetting, settings } from './db.js';
import { hasContent, JOURNAL_FIELDS, journalEntry } from './journal.js';
import { patronsOn, roleLabel } from './patrons.js';
import { allProgress, doneCount, loadPlans, nextDay } from './plans.js';
import { aspirationFor } from './prayers.js';
import { add, clear, el, icon, openSheet } from './ui.js';
import { dailyCard } from './view-daily.js';
import { intentionsSheet } from './view-intentions.js';

const DAY_LETTERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The reader's arrangement of Today, or the usual one. */
function layout() {
  return todayLayout(settings().todayCards, { showOnThisDay: settings().showOnThisDay });
}

export async function render(container, { date }) {
  const current = today();
  const iso = date || current;
  const { day, readings, masses, title, approximate } = readingsOn(iso);

  // Each card by id; a card with nothing to say today gives null and is left out.
  const builders = {
    rule: () => dailyCard(iso),
    sunday: () => sundayCard(day, iso),
    readings: () => readingsCard(iso, day, readings, masses, title, approximate),
    saints: () => patronCard(day),
    aspiration: () => aspirationCard(iso),
    intentions: () => intentionsCard(),
    journal: () => journalCard(iso, current),
    help: () => helpCard(),
    history: () => historyCard(iso),
    continue: () => continueCard(),
    plans: () => plansCard(),
  };
  const shown = layout().filter((item) => item.on && builders[item.id]);
  const cards = await Promise.all(shown.map((item) => builders[item.id]()));

  add(container,
    el('header', { class: 'app-header' },
      el('h1', { class: 'app-title', text: 'Biblica' }),
      el('button', { class: 'icon-button', 'aria-label': 'Settings', onclick: () => go('#/settings') }, icon('settings', 24))),
    welcomeCard(),
    hero(day, iso, current),
    weekStrip(iso, current),
    cards,
    el('div', { class: 'today-foot' },
      el('button', { class: 'text-button', onclick: () => arrangeSheet() }, 'Arrange this page')),
  );
}

/**
 * Show, hide and order the cards on Today. Changes are kept at once and the
 * page is drawn again behind the sheet.
 */
export function arrangeSheet(onChange = refresh) {
  let current = layout();
  const listNode = el('div', { class: 'arrange-list' });
  const save = async (next, focusId, which) => {
    current = next;
    await saveSetting('todayCards', current);
    draw();
    // The button pressed is drawn anew; keep the reader's place on it, or, if the card
    // has reached the top or the bottom, on the button that moves it back.
    const row = focusId ? listNode.querySelector(`[data-card="${focusId}"]`) : null;
    if (row) {
      const other = { up: 'down', down: 'up' }[which];
      const target = [which, other].map((act) => act && row.querySelector(`[data-act="${act}"]`)).find((node) => node && !node.disabled);
      if (target) target.focus({ preventScroll: true });
    }
  };
  function draw() {
    clear(listNode);
    current.forEach((item, index) => {
      const info = cardInfo(item.id);
      const toggle = el('input', { type: 'checkbox', id: `card-${item.id}`, dataset: { act: 'toggle' } });
      toggle.checked = item.on;
      toggle.addEventListener('change', () => save(setCardOn(current, item.id, toggle.checked), item.id, 'toggle'));
      add(listNode, el('div', { class: `arrange-row${item.on ? '' : ' off'}`, dataset: { card: item.id } },
        el('label', { class: 'arrange-text', for: `card-${item.id}` },
          el('span', { class: 'row-title', text: info.label }),
          el('span', { class: 'row-sub', text: info.about })),
        el('div', { class: 'arrange-tools' },
          el('button', { class: 'icon-button small', 'aria-label': `Move ${info.label} up`, disabled: index === 0, dataset: { act: 'up' }, onclick: () => save(moveCard(current, item.id, -1), item.id, 'up') }, icon('up', 18)),
          el('button', { class: 'icon-button small', 'aria-label': `Move ${info.label} down`, disabled: index === current.length - 1, dataset: { act: 'down' }, onclick: () => save(moveCard(current, item.id, 1), item.id, 'down') }, icon('down', 18)),
          el('span', { class: 'switch' }, toggle, el('span', { class: 'switch-track', 'aria-hidden': 'true' })))));
    });
  }
  draw();
  openSheet('Arrange Today', (close) => [
    el('p', { class: 'muted small', text: 'The day itself is always at the top. Below it, show what helps you and leave out what does not. Cards with nothing to say on a given day stay out of the way by themselves.' }),
    listNode,
    el('div', { class: 'button-row spread' },
      el('button', { class: 'button quiet', onclick: async () => { await saveSetting('todayCards', null); current = layout(); draw(); } }, 'The usual arrangement'),
      el('button', { class: 'button', onclick: close }, 'Done')),
  ], { tall: true, onClose: onChange });
}

/**
 * Shown once, the first time the app is opened: what happens to what the
 * reader writes. Said at the start, not left for Settings.
 */
function welcomeCard() {
  if (settings().welcomed) return null;
  const card = el('section', { class: 'card welcome-card' });
  const seen = async () => {
    await saveSetting('welcomed', true);
    card.remove();
  };
  return add(card,
    el('h3', { class: 'card-heading', text: 'Yours alone' }),
    el('p', { text: 'Everything you write in Biblica stays on this device. There is no account, and nothing is sent anywhere: nobody else can read it.' }),
    el('p', { class: 'muted', text: 'That also means nobody else can recover it, so make a backup now and then in Settings.' }),
    el('div', { class: 'button-row' },
      el('button', { class: 'button quiet', onclick: async () => { await seen(); go('#/about/privacy'); } }, 'How privacy works'),
      el('button', { class: 'button', onclick: seen }, 'Understood')));
}

function hero(day, iso, current) {
  const rank = typeLabel(day.celebration.type);
  const counted = ['ordinary', 'advent', 'lent', 'easter'].includes(day.season) && day.week > 0;
  const seasonLine = counted ? `${day.seasonName}, week ${day.week}` : day.seasonName;
  const obligation = obligationFor(day);
  const observances = [];
  if (obligation.short) observances.push(obligation.short);
  if (day.fast) observances.push('Day of fasting and abstinence');
  else if (day.abstinence) observances.push('Day of abstinence from meat');

  // The whole banner opens the page about the day.
  return el('a', { class: `card hero${obligation.obliged ? ' obliged' : ''}`, dataset: { lit: day.color }, href: `#/day/${iso}` },
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
    el('span', { class: 'hero-more', 'aria-hidden': 'true' }, 'About this day', icon('forward', 16)),
  );
}

/** A note when the day is the feast of one of the reader's own saints. */
async function patronCard(day) {
  const mine = await patronsOn(day, dayFor);
  if (!mine.length) return null;
  return el('section', { class: 'card patron-card' },
    mine.map((item) => el('button', { class: 'row-button', onclick: () => go(`#/pray/saint/${item.id}`) },
      el('span', { class: 'row-text' },
        el('span', { class: 'row-title', text: `The feast of ${item.name}` }),
        el('span', { class: 'row-sub', text: roleLabel(item.role) || 'One of your saints' })),
      icon('forward', 18))));
}

/** One or two things that happened on this date, with the rest on the day's page. */
function historyCard(iso) {
  const events = eventsOn(iso);
  if (!events.length) return null;
  // Lead with the event most worth knowing: an apparition, council or miracle before a death date.
  const weight = { apparition: 0, miracle: 0, council: 1, scripture: 1, document: 2, mission: 2, church: 2, martyr: 3, pope: 3, saint: 3 };
  const lead = [...events].sort((a, b) => (weight[a.k] ?? 3) - (weight[b.k] ?? 3) || a.y - b.y)[0];
  return el('button', { class: 'card card-button history-card', onclick: () => go(`#/day/${iso}`) },
    el('span', { class: 'card-heading plain', text: 'On this day' }),
    el('span', { class: 'event-head' }, el('span', { class: 'event-year', text: lead.y }), el('span', { class: 'event-kind', text: kindName(lead.k) })),
    el('span', { class: 'event-title', text: lead.t }),
    el('span', { class: 'event-text', text: lead.x }),
    events.length > 1 ? el('span', { class: 'muted small', text: `and ${events.length - 1} more` }) : null);
}

function weekStrip(iso, current) {
  const days = weekOf(iso);
  const strip = el('div', { class: 'week-strip', role: 'group', 'aria-label': 'Days of this week' });
  for (const dayIso of days) {
    const info = dayFor(dayIso);
    const dayNumber = Number(dayIso.slice(8));
    const obliged = obligationFor(info).obliged;
    strip.append(el('button', {
      class: `week-day${dayIso === iso ? ' selected' : ''}${dayIso === current ? ' is-today' : ''}${obliged ? ' obliged' : ''}`,
      'aria-label': `${longDate(dayIso, info.weekdayName)}: ${info.celebration.name}${obliged ? '. Mass is of obligation' : ''}`,
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
        // No empty ring waiting to be filled: a quiet tick once the reading has been read.
        done ? el('span', { class: 'reading-check', role: 'img', 'aria-label': 'Read' }, icon('check', 20)) : null)));
  });
  add(card, list);
  if (masses.length) {
    add(card, el('p', { class: 'muted small', text: `These are the readings of the ${masses[masses.length - 1].label}. This day has ${masses.length} Masses; open a reading to choose another.` }));
  }
  if (approximate) {
    add(card, el('p', { class: 'muted small', text: 'These citations come from the Latin lectionary, so a verse or two at either end may differ from your missal.' }));
  }
  add(card, el('div', { class: 'daily-footer' },
    el('button', { class: 'text-button', onclick: () => go('#/mass') }, 'Follow the Mass')));
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
  // Reading plans have a card of their own only while one is followed; until then, a quiet way in.
  const following = (await allProgress()).size > 0;
  const plansLink = following ? null : el('div', { class: 'daily-footer' },
    el('button', { class: 'text-button', onclick: () => go('#/plans') }, 'Reading plans'));
  if (!place || !book(place.book)) {
    return el('section', { class: 'card' },
      el('h3', { class: 'card-heading', text: 'The Bible' }),
      el('p', { class: 'muted', text: 'All seventy-three books of the Catholic Bible.' }),
      el('button', { class: 'button', onclick: () => go('#/read/GEN/1') }, 'Start at Genesis'),
      plansLink);
  }
  return el('section', { class: 'card continue-card' },
    el('h3', { class: 'card-heading', text: 'Continue reading' }),
    el('button', { class: 'row-button', onclick: () => go(`#/read/${place.book}/${place.chapter}`) },
      el('span', { class: 'row-title', text: chapterTitle(place.book, place.chapter) }),
      icon('forward', 20)),
    plansLink);
}

async function plansCard() {
  const [plans, progress] = await Promise.all([loadPlans(), allProgress()]);
  const active = plans.filter((item) => progress.has(item.id));
  // Without a plan under way the card stays away: choosing one is in the Bible and under Prayer.
  if (!active.length) return null;
  const card = el('section', { class: 'card' }, el('h3', { class: 'card-heading', text: 'Reading plans' }));
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

/**
 * On Sundays and holy days of obligation, a word on keeping the day. It asks
 * nothing to be ticked off: it says what the day is for.
 */
function sundayCard(day, iso) {
  const obliged = obligationFor(day).obliged;
  if (day.weekday !== 0 && !obliged) return null;
  const sunday = day.weekday === 0;
  return el('section', { class: 'card sunday-card' },
    el('h3', { class: 'card-heading', text: sunday ? 'The Lord’s day' : 'A holy day' }),
    el('p', { text: sunday
      ? 'Sunday is the day of the Resurrection, given for worship and for rest. Go to Mass (if illness or the care of others keeps you home, you are excused); leave aside the work that can wait; give time to God, to your family and friends, and to someone in need.'
      : 'A day to keep as a Sunday: go to Mass, and keep the day for God and for rest as far as your duties allow.' }),
    el('div', { class: 'daily-footer' },
      el('button', { class: 'text-button', onclick: () => go('#/mass') }, 'Follow the Mass'),
      el('button', { class: 'text-button', onclick: () => go(`#/day/${iso}`) }, 'About this day')));
}

/** One short prayer to carry through the day, the same all day long. */
function aspirationCard(iso) {
  const prayer = aspirationFor(iso);
  if (!prayer) return null;
  return el('button', { class: 'card card-button aspiration-card', onclick: () => go('#/pray/aspirations') },
    el('span', { class: 'card-heading plain', text: 'A short prayer for today' }),
    el('span', { class: 'aspiration-text', text: prayer.text }),
    prayer.by ? el('span', { class: 'muted small', text: prayer.by }) : null);
}

/** The intentions being prayed for, with a quick way to add and change them. */
async function intentionsCard() {
  const active = (await db.all('intentions')).filter((item) => !item.answered).sort((a, b) => (a.created < b.created ? 1 : -1));
  const card = el('section', { class: 'card' }, el('h3', { class: 'card-heading', text: 'Intentions' }));
  if (active.length) {
    add(card, el('ul', { class: 'bring-list' }, active.slice(0, 5).map((item) => el('li', { text: item.text }))));
    if (active.length > 5) add(card, el('p', { class: 'muted small', text: `and ${active.length - 5} more` }));
  } else {
    add(card, el('p', { class: 'muted', text: 'Keep here the people and needs you are praying for.' }));
  }
  add(card, el('div', { class: 'daily-footer' },
    el('button', { class: 'text-button', onclick: () => intentionsSheet(refresh) }, active.length ? 'Change' : 'Add an intention')));
  return card;
}

/** Today's page of the journal: its first words if something is written, or a way in. */
async function journalCard(iso, current) {
  if (iso > current) return null;
  const entry = await journalEntry(iso);
  const written = hasContent(entry);
  const first = written ? JOURNAL_FIELDS.map(([field]) => entry[field]).find((text) => (text || '').trim()) : '';
  return el('button', { class: 'card card-button journal-card', onclick: () => go(`#/journal/${iso}`) },
    el('span', { class: 'card-heading plain', text: iso === current ? 'Journal, today' : 'Journal' }),
    el('span', { class: written ? 'journal-preview' : 'muted', text: written ? first : 'Nothing written yet. Write whatever you want to keep.' }));
}

/** The way to the counsel for hard days and good ones. */
function helpCard() {
  return el('button', { class: 'card card-button help-card', onclick: () => go('#/pray/help') },
    el('span', { class: 'card-heading plain', text: 'For times like these' }),
    el('span', { class: 'muted', text: 'When prayer is dry, after a fall, in grief or in joy: counsel from the saints.' }));
}
