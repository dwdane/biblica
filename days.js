// days.js
// What the app can say about a day: an account of what is celebrated, the
// season it falls in, whether Mass is of obligation, and what happened on
// that date in the Church's history.

import { fromIso, parts } from './calendar.js';

let days = null;
let history = null;

export async function loadDays() {
  if (!days || !history) {
    const [daysResponse, historyResponse] = await Promise.all([fetch('data-days.json'), fetch('data-onthisday.json')]);
    if (!daysResponse.ok || !historyResponse.ok) throw new Error('The notes on the calendar could not be loaded.');
    days = await daysResponse.json();
    history = await historyResponse.json();
  }
}

/** The account of one celebration by its calendar key, or null. */
export function celebrationAccount(key) {
  if (!days || !key) return null;
  return days.celebrations[key] || days.special[key] || null;
}

/** The account of a liturgical season. */
export function seasonAccount(season) {
  return days ? days.seasons[season] || null : null;
}

// Days that have something of their own to say beyond their season,
// recognised from the key the calendar gives them.
function specialKey(day) {
  const key = day.temporal.key;
  if (key === 'Advent3') return 'GaudeteSunday';
  if (key === 'Lent4') return 'LaetareSunday';
  if (key === 'Easter2') return 'DivineMercySunday';
  if (/OctaveEaster$/.test(key)) return 'EasterOctave';
  if (/^ChristmasWeekdayDec/.test(key)) return 'ChristmasOctave';
  if (/^(Mon|Tue|Wed)HolyWeek$/.test(key)) return 'HolyWeekWeekday';
  if (/^AdventWeekdayDec/.test(key)) return 'OAntiphons';
  return null;
}

/**
 * Everything to be said about a day, in the order it should be read.
 *
 * @param {object} day - From dayFor().
 * @returns {Array<{key, name, rank, about, dates, patron}>} The celebration
 *   kept, then anything else that falls on the day (a weekday of a special
 *   time, optional memorials). Entries with nothing written are left out.
 */
export function accountsFor(day) {
  const found = [];
  const seen = new Set();
  const add = (key, name, type) => {
    const account = celebrationAccount(key);
    if (!account || seen.has(key)) return;
    seen.add(key);
    found.push({ key, name, type, ...account });
  };
  add(day.celebration.key, day.celebration.name, day.celebration.type);
  const special = specialKey(day);
  if (special) add(special, day.temporal.name, day.temporal.type);
  // A saint's day displaced by a Sunday or a greater feast is still worth knowing about.
  if (day.temporal.key !== day.celebration.key) add(day.temporal.key, day.temporal.name, day.temporal.type);
  for (const item of day.commemorations) add(item.key, item.name, item.type);
  return found;
}

/**
 * Whether Mass is of obligation, in words.
 *
 * @returns {{obliged: boolean, short: string|null, text: string}} `short` is
 *   a label for the day's banner, given only when it settles a real doubt.
 */
export function obligationFor(day) {
  if (day.weekday === 0) {
    return {
      obliged: true,
      short: 'Sunday: Mass is of obligation',
      text: 'Sunday is a day of obligation. Catholics are bound to take part in Mass, on the day itself or on the evening before.',
    };
  }
  if (day.holyDay) {
    return {
      obliged: true,
      short: 'Holy day of obligation',
      text: 'This is a holy day of obligation in the United States. Catholics are bound to take part in Mass, today or on the evening before.',
    };
  }
  if (!day.obligationKnown) {
    return {
      obliged: false,
      short: null,
      text: 'Holy days of obligation differ from country to country, and the app knows only those of the United States. Sundays are of obligation everywhere; for other days, ask in your parish.',
    };
  }
  if (day.obligationLifted) {
    const why = day.weekday === 6 ? 'a Saturday' : 'a Monday';
    return {
      obliged: false,
      short: 'Not a day of obligation this year',
      text: `Not a day of obligation this year. In the United States the obligation is lifted when this solemnity falls on ${why}.`,
    };
  }
  // Days people often take to be of obligation, and solemnities that are not.
  const mistaken = ['AshWednesday', 'HolyThurs', 'GoodFri', 'EasterVigil', 'AllSouls'].includes(day.celebration.key);
  const solemnity = day.celebration.type === 'solemnity';
  return {
    obliged: false,
    short: mistaken || solemnity ? 'Not a day of obligation' : null,
    text: mistaken
      ? 'Not a day of obligation, though many go to church today and it is good to do so.'
      : 'Not a day of obligation.',
  };
}

/** What the Church asks by way of penance on a day, or null. */
export function penanceFor(day) {
  if (day.fast) return 'A day of fasting and abstinence: one full meal, two smaller ones, and no meat. Fasting binds those aged 18 to 59; abstinence, those 14 and over.';
  if (day.abstinence) return 'A day of abstinence from meat for those aged 14 and over.';
  if (day.weekday !== 5) return null;
  // A solemnity lifts the Friday penance, and so do the days of the Easter octave, which
  // are kept as solemnities. All Souls ranks with the solemnities in the calendar but is not one.
  const solemnity = (day.celebration.type === 'solemnity' && day.celebration.key !== 'AllSouls') || /OctaveEaster$/.test(day.temporal.key);
  if (solemnity) {
    return day.season === 'lent' ? 'No abstinence today: a solemnity that falls on a Friday lifts it.' : null;
  }
  return 'Friday is a day of penance. Outside Lent, in the United States, another penance may take the place of abstaining from meat.';
}

/**
 * Events on a date in the Church's history, oldest first. In a year without a
 * 29 February, that day's events are shown on the 28th.
 */
export function eventsOn(iso) {
  if (!history) return [];
  const { year, month, day } = parts(fromIso(iso));
  const key = iso.slice(5);
  const events = [...(history.days[key] || [])];
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  if (month === 2 && day === 28 && !leap) events.push(...(history.days['02-29'] || []));
  return events.sort((a, b) => a.y - b.y);
}

const KIND_NAMES = {
  apparition: 'Apparition', miracle: 'Miracle', council: 'Council', pope: 'Papacy', saint: 'Saint',
  martyr: 'Martyrs', church: 'The Church', mission: 'Mission', scripture: 'Scripture', document: 'Teaching',
};

export function kindName(kind) {
  return KIND_NAMES[kind] || '';
}

/** Every celebration with an account, for choosing a patron saint: [{key, name, month, day}]. */
export function celebrationNames(calendarEntries) {
  if (!days) return [];
  return calendarEntries
    .filter((entry) => days.celebrations[entry.k])
    .map((entry) => ({ key: entry.k, name: entry.n, month: entry.m, day: entry.d }));
}
