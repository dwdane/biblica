// novenas.js
// Novenas: nine days (or another number) of prayer for one intention.
//
// A novena's day is counted by the days actually prayed, not by the
// calendar. Day 5 is the fifth day you prayed it, whenever that falls, so a
// missed day delays the novena by a day instead of breaking it.

import { addDays, fromIso, movableFeasts } from './calendar.js';
import { calendarOptions, db } from './db.js';

export async function allNovenas() {
  const rows = await db.all('novenas');
  return rows.sort((a, b) => (a.started < b.started ? 1 : -1));
}

export async function novena(id) {
  const key = Number(id);
  if (!Number.isInteger(key)) return null;
  return (await db.get('novenas', key)) || null;
}

/**
 * Novenas that belong on the list for a date: begun on or before it and
 * still under way, or, once finished, only on the days they were prayed.
 */
export async function activeNovenas(date) {
  return (await allNovenas()).filter((item) => item.started <= date && (!item.finished || Boolean(item.done[date])));
}

export function daysPrayed(item) {
  return Object.keys(item.done || {}).length;
}

/** The day about to be prayed (1-based), never past the last day. */
export function currentDay(item) {
  return Math.min(daysPrayed(item) + 1, item.days);
}

export function isFinished(item) {
  return daysPrayed(item) >= item.days;
}

export async function startNovena({ templateId, title, intention, prayers, days, started }) {
  const record = {
    templateId: templateId || 'own',
    title: title.trim(),
    intention: (intention || '').trim(),
    prayers,
    days,
    started,
    done: {},
    finished: null,
    created: new Date().toISOString(),
  };
  const id = await db.put('novenas', record);
  return { ...record, id };
}

/**
 * Record that the novena was (or was not) prayed on a date. Returns the
 * updated novena. A finished novena takes no further days.
 */
export async function setNovenaPrayed(id, date, prayed) {
  const key = Number(id);
  if (!Number.isInteger(key)) return null;
  let result = null;
  await db.change('novenas', key, (item) => {
    if (!item) return undefined;
    result = item;
    if (prayed && !item.done[date] && isFinished(item)) return undefined;
    if (prayed) item.done[date] = new Date().toISOString();
    else delete item.done[date];
    item.finished = isFinished(item) ? Object.keys(item.done).sort().pop() : null;
    return item;
  });
  return result;
}

export async function saveNovena(item) {
  await db.put('novenas', item);
}

/** Take a prayer that no longer exists out of every novena that used it. */
export async function dropPrayerFromNovenas(reference) {
  for (const item of await allNovenas()) {
    if (item.prayers.includes(reference)) {
      await db.put('novenas', { ...item, prayers: item.prayers.filter((entry) => entry !== reference) });
    }
  }
}

export async function deleteNovena(id) {
  await db.remove('novenas', Number(id));
}

function feastDate(rule, year) {
  if (rule === 'pentecost') return movableFeasts(year, calendarOptions()).pentecost;
  if (rule === 'sacred-heart') return movableFeasts(year, calendarOptions()).sacredHeart;
  return `${year}-${rule}`;
}

/**
 * For a novena tied to a feast, when to begin so that it ends on the eve.
 *
 * @param {object} template - A novena template; one without `ends` can be prayed at any time.
 * @param {string} today - ISO date.
 * @param {number} [days] - Length of the novena, when the reader has changed it.
 * @returns {{start: string, feast: string, underWay: boolean}|null} The next
 *   start date; or, when the traditional days have already begun and the
 *   feast has not yet come, those dates with `underWay` set.
 */
export function traditionalDates(template, today, days = template.days) {
  if (!template.ends) return null;
  const year = Number(today.slice(0, 4));
  for (const candidate of [year, year + 1, year + 2]) {
    const feast = feastDate(template.ends.before, candidate);
    const start = addDays(feast, -days);
    if (fromIso(start) >= fromIso(today)) return { start, feast, underWay: false };
    if (fromIso(feast) > fromIso(today)) return { start, feast, underWay: true };
  }
  return null;
}
