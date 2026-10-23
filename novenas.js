// novenas.js
// Novenas, and the other devotions kept over a counted series of days: nine
// days of prayer for one intention, the nine First Fridays, the five First
// Saturdays, the thirty-three days before a consecration.
//
// Since release 0.6 a novena follows the calendar. It is begun on a date, and
// its days are the next days of its cadence (every day for a novena; the
// first Friday of each month for the First Fridays): day 4 is the fourth such
// day from the start, it is on the daily list on that date, and the whole
// series leaves the list when its last day has passed. A reader who misses a
// day can add one at the end; nothing is "behind". Marking a day as prayed is
// a record for looking back, kept only by those who want marks.
//
// A record is:
//   { id, templateId, title, intention, started, days, cadence, prayers,
//     perDay, done, created, model: 2 }
// `cadence` is null for every day, or a rule as schedule.js reads it
// ({ weekdays } or { repeat: { kind: 'monthly', nth, weekday } }); `prayers`
// are said every day; `perDay` holds what the reader chose for particular
// days: { "3": { prayers: [...], text: "..." } }.
//
// Records made before 0.6 counted the days prayed instead. They are brought
// over once, keeping the reader's place: see upgradeRecord.

import { addDays, fromIso, todayIso } from './calendar.js';
import { calendarOptions, db } from './db.js';
import { datesOfRule } from './helps.js';
import { occursOn } from './schedule.js';

const MODEL = 2;
// A series longer than this is not one the app offers; it bounds every scan.
const LONGEST = 400;

/** Whole days from one ISO date to another. */
function daysBetween(from, to) {
  return fromIso(to) - fromIso(from);
}

/**
 * A record from before 0.6, counted by days prayed, as a record of the
 * calendar. The place is kept: if days had been marked as prayed, the start
 * moves so that today is the day the reader had reached; if none had been,
 * the novena simply runs from its start date.
 */
export function upgradeRecord(item, today) {
  if (item.model === MODEL) return item;
  const done = item.done || {};
  const prayed = Object.keys(done).length;
  const next = { ...item, model: MODEL, cadence: null, perDay: item.perDay || {} };
  if (prayed >= item.days) {
    // Finished: let it end on the day its last prayer was marked.
    const last = item.finished || Object.keys(done).sort().pop();
    next.started = addDays(last, -(item.days - 1));
  } else if (prayed > 0 && item.started <= today) {
    const reached = done[today] ? prayed : prayed + 1;
    next.started = addDays(today, -(reached - 1));
  }
  delete next.finished;
  return next;
}

export async function allNovenas() {
  const rows = await db.all('novenas');
  // A record is upgraded once and saved, so its place is reckoned from the real today,
  // never from a day the reader happens to be looking at.
  const when = todayIso();
  const upgraded = [];
  for (const row of rows) {
    if (row.model === MODEL) {
      upgraded.push(row);
      continue;
    }
    const next = upgradeRecord(row, when);
    await db.put('novenas', next);
    upgraded.push(next);
  }
  return upgraded.sort((a, b) => (a.started < b.started ? 1 : -1));
}

export async function novena(id) {
  const key = Number(id);
  if (!Number.isInteger(key)) return null;
  const row = await db.get('novenas', key);
  if (!row) return null;
  if (row.model === MODEL) return row;
  const next = upgradeRecord(row, todayIso());
  await db.put('novenas', next);
  return next;
}

// ---------------------------------------------------------------------------
// The days of a series
// ---------------------------------------------------------------------------

const scheduleCache = new Map();

/**
 * Every date of a series, in order: `days` dates from the start, following
 * its cadence.
 */
export function scheduleOf(item) {
  const key = `${item.started}|${item.days}|${JSON.stringify(item.cadence || null)}`;
  if (scheduleCache.has(key)) return scheduleCache.get(key);
  const dates = [];
  if (!item.cadence) {
    for (let index = 0; index < item.days; index += 1) dates.push(addDays(item.started, index));
  } else {
    let date = item.started;
    for (let step = 0; dates.length < item.days && step < LONGEST * 31; step += 1, date = addDays(date, 1)) {
      if (occursOn(item.cadence, date)) dates.push(date);
    }
  }
  scheduleCache.set(key, dates);
  return dates;
}

/** The day of the series (1-based) that falls on a date, or null if none does. */
export function dayOn(item, date) {
  const index = scheduleOf(item).indexOf(date);
  return index >= 0 ? index + 1 : null;
}

/** The first date of the series. */
export function firstDate(item) {
  return scheduleOf(item)[0] || item.started;
}

/** The last date of the series. */
export function lastDate(item) {
  const dates = scheduleOf(item);
  return dates[dates.length - 1] || item.started;
}

/** Whether every day of the series has passed by a date. */
export function isFinished(item, today) {
  return lastDate(item) < today;
}

/** Whether a series has not yet reached its first day. */
export function isUpcoming(item, today) {
  return firstDate(item) > today;
}

/**
 * The day that is next to be prayed on or after a date: { day, date }, or null
 * once the series is over.
 */
export function nextDayOf(item, today) {
  const dates = scheduleOf(item);
  const index = dates.findIndex((date) => date >= today);
  return index >= 0 ? { day: index + 1, date: dates[index] } : null;
}

/** Series under way that have a day on a date: those belong on the daily list then. */
export async function activeNovenas(date) {
  return (await allNovenas()).filter((item) => dayOn(item, date) !== null);
}

/** Series begun and not yet over on a date, whether or not a day falls on it. */
export async function currentNovenas(today) {
  return (await allNovenas()).filter((item) => !isFinished(item, today));
}

/**
 * How a day of a series is named: "Day 4 of 9", or for a series kept on
 * certain days, "First Friday 3 of 9".
 */
export function stepLabel(item, day) {
  if (!day) return null;
  return `${item.stepName || 'Day'} ${day} of ${item.days}`;
}

/** How many days have been marked as prayed. */
export function daysPrayed(item) {
  return Object.keys(item.done || {}).length;
}

// ---------------------------------------------------------------------------
// Changing a series
// ---------------------------------------------------------------------------

export async function startNovena({ templateId, title, intention, prayers, days, started, cadence = null, perDay = {}, stepName = null }) {
  const record = {
    model: MODEL,
    stepName,
    templateId: templateId || 'own',
    title: title.trim(),
    intention: (intention || '').trim(),
    prayers,
    days,
    started,
    cadence,
    perDay,
    done: {},
    created: new Date().toISOString(),
  };
  const id = await db.put('novenas', record);
  return { ...record, id };
}

/** Record that a day was, or was not, prayed. Only for those who keep marks; nothing depends on it. */
export async function setNovenaPrayed(id, date, prayed) {
  const key = Number(id);
  if (!Number.isInteger(key)) return null;
  let result = null;
  await db.change('novenas', key, (stored) => {
    if (!stored) return undefined;
    const item = stored.model === MODEL ? stored : upgradeRecord(stored, todayIso());
    item.done = item.done || {};
    if (prayed) item.done[date] = new Date().toISOString();
    else delete item.done[date];
    result = item;
    return item;
  });
  return result;
}

/** One more day at the end, for a day that was missed. */
export async function addDay(id) {
  let result = null;
  await db.change('novenas', Number(id), (item) => {
    if (!item) return undefined;
    item.days = Math.min(item.days + 1, LONGEST);
    result = item;
    return item;
  });
  return result;
}

export async function saveNovena(item) {
  await db.put('novenas', { ...item, model: MODEL });
}

/** Take a prayer that no longer exists out of every series that used it. */
export async function dropPrayerFromNovenas(reference) {
  for (const item of await allNovenas()) {
    const perDay = Object.fromEntries(Object.entries(item.perDay || {})
      .map(([day, entry]) => [day, { ...entry, prayers: (entry.prayers || []).filter((other) => other !== reference) }]));
    if (item.prayers.includes(reference) || JSON.stringify(perDay) !== JSON.stringify(item.perDay || {})) {
      await db.put('novenas', { ...item, prayers: item.prayers.filter((other) => other !== reference), perDay });
    }
  }
}

export async function deleteNovena(id) {
  await db.remove('novenas', Number(id));
}

// ---------------------------------------------------------------------------
// What is prayed on a day
// ---------------------------------------------------------------------------

/**
 * Everything to pray on one day of a series: the template's own words for
 * that day (a title, an intention, a short text, prayers), what the reader
 * chose for that day, and what is said every day.
 *
 * @returns {{ title: string|null, intention: string|null, text: string|null, ownText: string, prayers: string[] }}
 */
export function partsForDay(item, day, template) {
  const fromTemplate = template && Array.isArray(template.perDay)
    ? template.perDay.find((entry) => entry.day === day) || null
    : null;
  const own = (item.perDay || {})[String(day)] || {};
  const prayers = [];
  for (const reference of [...((fromTemplate && fromTemplate.prayers) || []), ...(own.prayers || []), ...item.prayers]) {
    if (!prayers.includes(reference)) prayers.push(reference);
  }
  // Scripture given for every day of the template, then the passages of this day.
  const scripture = [...((template && template.scripture) || []), ...((fromTemplate && fromTemplate.scripture) || [])];
  return {
    title: fromTemplate ? fromTemplate.title || null : null,
    intention: fromTemplate ? fromTemplate.intention || null : null,
    text: fromTemplate ? fromTemplate.text || null : null,
    ownText: own.text || '',
    prayers,
    scripture,
  };
}

// ---------------------------------------------------------------------------
// When a novena is traditionally prayed
// ---------------------------------------------------------------------------

/** The date of the feast a template leads to, in a year, or null. */
export function feastDate(rule, year) {
  return datesOfRule(rule, year, calendarOptions())[0] || null;
}

/**
 * The traditional days of a template: when to begin so that it ends on the eve
 * of its feast (or on the feast, for those that end on it).
 *
 * @param {object} template - A template; one without `ends` can be prayed at any time.
 * @param {string} today - ISO date.
 * @param {number} [days] - Its length, when the reader has changed it.
 * @returns {{start: string, feast: string, underWay: boolean}|null} The next
 *   start date; or, when the traditional days have begun and the feast has not
 *   yet come, those dates with `underWay` set.
 */
export function traditionalDates(template, today, days = template.days) {
  if (!template.ends) return null;
  const rule = template.ends.before || template.ends.on;
  const onFeast = Boolean(template.ends.on);
  const year = Number(today.slice(0, 4));
  for (const candidate of [year - 1, year, year + 1, year + 2]) {
    const feast = feastDate(rule, candidate);
    if (!feast) continue;
    const start = template.cadence
      ? cadenceStart(template.cadence, feast, days, onFeast)
      : addDays(feast, -(days - (onFeast ? 1 : 0)));
    if (!start) continue;
    if (start >= today) return { start, feast, underWay: false };
    if (feast > today || (onFeast && feast === today)) return { start, feast, underWay: true };
  }
  return null;
}

/** For a series with a cadence: the day `days` occurrences before a feast. */
function cadenceStart(cadence, feast, days, onFeast) {
  let count = 0;
  let date = onFeast ? feast : addDays(feast, -1);
  for (let step = 0; step < LONGEST * 31; step += 1, date = addDays(date, -1)) {
    if (occursOn(cadence, date)) {
      count += 1;
      if (count === days) return date;
    }
  }
  return null;
}

/**
 * Novenas worth suggesting around a date: those whose traditional days begin
 * within the next few days, or began a day or two ago and can still be joined.
 *
 * @param {Array<object>} templates - Candidate templates, each with an id, a name, days and ends.
 * @param {string} today
 * @param {object} context
 * @param {Array<object>} context.current - Series under way or upcoming, to leave out what is already begun.
 * @param {object} context.dismissed - { [template id]: feast date } already set aside by the reader.
 * @returns {Array<{template: object, start: string, feast: string, underWay: boolean}>}
 */
export function suggestionsFor(templates, today, { current = [], dismissed = {} } = {}) {
  const found = [];
  for (const template of templates) {
    const dates = traditionalDates(template, today);
    if (!dates) continue;
    const lead = daysBetween(today, dates.start);
    // From three days before it begins until two days after: later than that it is better left for next year.
    if (lead > 3 || lead < -2) continue;
    if (dismissed[template.id] === dates.feast) continue;
    // Already begun for this feast: one from the same template, begun within two weeks before its days and not after the feast.
    const begun = current.some((item) => item.templateId === template.id && (template.id !== 'own' || item.title === template.title)
      && firstDate(item) >= addDays(dates.start, -14) && firstDate(item) <= dates.feast);
    if (begun) continue;
    found.push({ template, ...dates });
  }
  return found.sort((a, b) => (a.start < b.start ? -1 : 1));
}
