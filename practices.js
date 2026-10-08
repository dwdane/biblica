// practices.js
// The daily prayer list: the prayers and devotions the reader has chosen to
// keep, which days each belongs to, and a record of what was prayed.
//
// The record exists to be looked back on, not to nag. Nothing here computes
// a streak, a percentage or a "missed" count, and that is deliberate.
//
// An entry points at what it is by a reference string:
//   "prayer:our-father"   a prayer from the library ("prayer:own-3" for one of the reader's own)
//   "devotion:rosary"     a guided devotion: rosary, stations, lectio or examen
//   "readings"            the Mass readings of the day
//   "plan:bible-year"     a reading plan
//   "custom"              something with no text in the app, such as "Mass"

import { fromIso, parts, todayIso } from './calendar.js';
import { formatSpan } from './bible.js';
import { db } from './db.js';
import { rosarySetFor } from './devotions.js';
import { activeNovenas, currentDay, daysPrayed, allNovenas } from './novenas.js';
import { loadPlans, allProgress, nextDay } from './plans.js';
import { builtInTitle, findPrayer, seasonalPrayerId } from './prayers.js';

export const TIMES = [
  ['morning', 'Morning'],
  ['day', 'During the day'],
  ['evening', 'Evening'],
  ['any', 'Any time'],
];

export const DEVOTION_NAMES = {
  rosary: 'The Rosary',
  stations: 'Stations of the Cross',
  lectio: 'Lectio Divina',
  examen: 'Evening examen',
};

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function allPractices() {
  const rows = await db.all('practices');
  return rows.sort((a, b) => (a.order || 0) - (b.order || 0) || a.id - b.id);
}

/** Entries on the list now (not removed). */
export async function currentPractices() {
  return (await allPractices()).filter((item) => !item.ended);
}

export async function savePractice(practice) {
  const record = { ...practice };
  if (!record.id) {
    delete record.id;
    // The reader's own date, not the UTC date: late in the evening they differ.
    record.created = record.created || todayIso();
    record.order = Date.now();
  }
  const id = await db.put('practices', record);
  return { ...record, id };
}

/** Take an entry off the list from today on, keeping what was already recorded. */
export async function endPractice(id, date) {
  const record = await db.get('practices', id);
  if (!record) return;
  record.ended = date;
  await db.put('practices', record);
}

/** Whether an entry belongs to a given date. */
export function isScheduled(practice, date) {
  if (practice.created && date < practice.created) return false;
  if (practice.ended && date >= practice.ended) return false;
  if (!practice.weekdays) return true;
  return Boolean(practice.weekdays[parts(fromIso(date)).weekday]);
}

/** "Every day", "Fridays", "Mon, Wed, Fri". */
export function scheduleLabel(practice) {
  const days = practice.weekdays;
  if (!days || days.every(Boolean)) return 'Every day';
  const chosen = days.map((on, index) => (on ? index : -1)).filter((index) => index >= 0);
  if (chosen.length === 1) return `${['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][chosen[0]]}`;
  if (chosen.join() === '1,2,3,4,5') return 'Weekdays';
  return chosen.map((index) => WEEKDAY_SHORT[index]).join(', ');
}

export async function logFor(date) {
  return (await db.get('practiceLog', date)) || { id: date, done: {} };
}

/** Record that an entry was, or was not, prayed on a date. */
export async function setDone(date, key, done) {
  return db.change('practiceLog', date, (stored) => {
    const record = stored || { id: date, done: {} };
    if (done) record.done[key] = new Date().toISOString();
    else delete record.done[key];
    return record;
  });
}

const asList = (references) => (Array.isArray(references) ? references : [references]);

async function entriesFor(references, date) {
  const wanted = asList(references);
  return (await currentPractices()).filter((item) => wanted.includes(item.ref) && isScheduled(item, date));
}

/**
 * Mark as prayed, for a date, every entry on the list that points at
 * `references` (one reference or several). Used when a devotion is finished
 * or a prayer is prayed from its own page. Returns how many were newly marked.
 */
export async function markByReference(references, date) {
  const practices = await entriesFor(references, date);
  if (!practices.length) return 0;
  let marked = 0;
  await db.change('practiceLog', date, (stored) => {
    const record = stored || { id: date, done: {} };
    for (const practice of practices) {
      if (!record.done[`p${practice.id}`]) {
        record.done[`p${practice.id}`] = new Date().toISOString();
        marked += 1;
      }
    }
    return marked ? record : undefined;
  });
  return marked;
}

/** The first entry for `references` that is on the list for a date and not yet marked, or null. */
export async function openEntryFor(references, date) {
  const practices = await entriesFor(references, date);
  if (!practices.length) return null;
  const record = await logFor(date);
  return practices.find((practice) => !record.done[`p${practice.id}`]) || null;
}

/** Whether the list has any entry for `references`, on whatever days. */
export async function isOnList(references) {
  const wanted = asList(references);
  return (await currentPractices()).some((item) => wanted.includes(item.ref));
}

/**
 * Take off the list every entry pointing at a reference that no longer
 * exists, such as a prayer of the reader's own that has been deleted. What
 * was already recorded for those entries is kept.
 */
export async function endByReference(reference, date) {
  for (const practice of await currentPractices()) {
    if (practice.ref === reference) await endPractice(practice.id, date);
  }
}

/** A default title for a reference, used when the reader adds it to the list. */
export async function titleFor(reference) {
  const [kind, name] = reference.split(':');
  if (kind === 'prayer') {
    const prayer = await findPrayer(name);
    return prayer ? prayer.title : 'Prayer';
  }
  if (kind === 'devotion') return DEVOTION_NAMES[name] || 'Devotion';
  if (kind === 'readings') return 'Mass readings';
  if (kind === 'plan') {
    const plan = (await loadPlans()).find((item) => item.id === name);
    return plan ? plan.name : 'Reading plan';
  }
  return '';
}

/**
 * Everything on the list for one date, in the order it is shown.
 *
 * @param {string} date - ISO date.
 * @param {object} day - The liturgical day, from dayFor().
 * @returns {Promise<Array>} Items with { key, title, sub, time, path, done, practice, novena }.
 *   `path` is where tapping the title goes; entries with nothing to open have none.
 */
export async function itemsFor(date, day) {
  const [practices, record, novenas, plans, progress] = await Promise.all([
    allPractices(), logFor(date), activeNovenas(date), loadPlans(), allProgress(),
  ]);
  const items = [];
  for (const practice of practices) {
    if (!isScheduled(practice, date)) continue;
    const [kind, name] = practice.ref.split(':');
    const item = {
      key: `p${practice.id}`,
      title: practice.title,
      sub: null,
      time: practice.time || 'any',
      path: null,
      done: Boolean(record.done[`p${practice.id}`]),
      practice,
    };
    if (kind === 'prayer') {
      const id = seasonalPrayerId(name, day);
      item.path = `#/prayer/${id}`;
      if (id !== name) {
        item.title = builtInTitle(id) || item.title;
        item.sub = 'In place of the Angelus during Easter';
      }
    } else if (kind === 'devotion') {
      item.path = `#/pray/${name}`;
      if (name === 'rosary') item.sub = rosarySetFor(day).name;
      if (name === 'lectio') item.sub = 'With the Gospel of the day';
    } else if (kind === 'readings') {
      item.path = `#/reading/${date}/0`;
      item.sub = day.celebration.name;
    } else if (kind === 'plan') {
      const plan = plans.find((candidate) => candidate.id === name);
      if (plan && !progress.has(name)) {
        // The plan was stopped. Opening it offers to begin again; nothing restarts by itself.
        item.path = `#/plans/${name}`;
        item.sub = 'Not started';
      } else if (plan) {
        const upcoming = nextDay(plan, progress.get(name));
        item.path = upcoming >= 0 ? `#/plan/${name}/${upcoming + 1}` : `#/plans/${name}`;
        item.sub = upcoming >= 0
          ? `Day ${upcoming + 1}: ${plan.days[upcoming].map(([bookId, ...span]) => formatSpan(bookId, span, { short: true })).join(', ')}`
          : 'Finished';
      }
    }
    items.push(item);
  }
  for (const novena of novenas) {
    const prayedToday = Boolean(novena.done[date]);
    const dayNumber = prayedToday ? Object.keys(novena.done).sort().indexOf(date) + 1 : currentDay(novena);
    items.push({
      key: `n${novena.id}`,
      title: novena.title,
      sub: `Day ${dayNumber} of ${novena.days}`,
      time: 'any',
      path: `#/pray/novena/${novena.id}`,
      done: prayedToday,
      novena,
    });
  }
  const order = TIMES.map(([id]) => id);
  return items.sort((a, b) => order.indexOf(a.time) - order.indexOf(b.time));
}

/**
 * What was prayed in one month, for looking back.
 *
 * @returns {Promise<{days: number, rows: Array}>} Each row has a title, the
 *   count of days prayed, and a state for each day of the month: 'done',
 *   'open' (on the list that day, nothing recorded), 'off' (not on the list)
 *   or 'ahead' (still to come). The screen draws 'open' and 'off' alike: it
 *   shows what was prayed, not what was not.
 */
export async function monthHistory(year, month, today) {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const iso = (day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const [practices, novenas, logs] = await Promise.all([allPractices(), allNovenas(), db.all('practiceLog')]);
  const logByDate = new Map(logs.map((record) => [record.id, record.done]));
  const rows = [];
  for (const practice of practices) {
    const states = [];
    for (let day = 1; day <= days; day += 1) {
      const date = iso(day);
      if ((logByDate.get(date) || {})[`p${practice.id}`]) states.push('done');
      else if (date > today) states.push('ahead');
      else if (!isScheduled(practice, date)) states.push('off');
      else states.push('open');
    }
    if (states.some((state) => state === 'done' || state === 'open')) {
      rows.push({ key: `p${practice.id}`, title: practice.title, sub: scheduleLabel(practice), states, count: states.filter((state) => state === 'done').length });
    }
  }
  for (const novena of novenas) {
    const first = iso(1);
    const last = iso(days);
    const end = novena.finished || today;
    if (novena.started > last || novena.started > today || end < first) continue;
    const states = [];
    for (let day = 1; day <= days; day += 1) {
      const date = iso(day);
      if (novena.done[date]) states.push('done');
      else if (date > today) states.push('ahead');
      else if (date < novena.started || (novena.finished && date > novena.finished)) states.push('off');
      else states.push('open');
    }
    rows.push({ key: `n${novena.id}`, title: novena.title, sub: `Novena, ${daysPrayed(novena)} of ${novena.days} days`, states, count: states.filter((state) => state === 'done').length });
  }
  return { days, rows };
}
