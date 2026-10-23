// intentions.js
// The reader's intentions, and which of them belong to a particular day.
//
// An intention is { id, text, created, answered, answerNote, when }. Most are
// prayed for every day until answered, and have no `when`. Some belong to a
// day or an event:
//   { kind: 'date', date }          on one day: a surgery, an exam, a wedding
//   { kind: 'until', date }         every day until a day: the run-up to an event
//   { kind: 'yearly', month, day }  each year on a day: an anniversary of a death
//   { kind: 'weekly', weekdays }    on chosen days of the week
// Those are shown first on their days, with a word saying why.

import { fromIso, parts } from './calendar.js';
import { db } from './db.js';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function shortDate(iso, today) {
  const { year, month, day, weekday } = parts(fromIso(iso));
  const sameYear = String(year) === String(today).slice(0, 4);
  return `${WEEKDAY_NAMES[weekday].slice(0, 3)} ${MONTHS[month - 1]} ${day}${sameYear ? '' : `, ${year}`}`;
}

const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** Whether an intention's `when` puts it on a date. */
export function fallsOn(when, iso) {
  if (!when) return false;
  if (when.kind === 'date') return when.date === iso;
  if (when.kind === 'until') return iso <= when.date;
  const { year, month, day, weekday } = parts(fromIso(iso));
  if (when.kind === 'yearly') {
    // An anniversary on 29 February is kept on the 28th in other years.
    if (when.month === 2 && when.day === 29 && !isLeap(year)) return month === 2 && day === 28;
    return when.month === month && when.day === day;
  }
  if (when.kind === 'weekly') return Array.isArray(when.weekdays) && Boolean(when.weekdays[weekday]);
  return false;
}

/** A few words for when an intention is prayed: "Today", "Until Tue November 3", "Every year on May 2", "Mondays". */
export function whenLabel(when, iso) {
  if (!when) return null;
  if (when.kind === 'date') return when.date === iso ? 'Today' : (when.date > iso ? `On ${shortDate(when.date, iso)}` : `Was on ${shortDate(when.date, iso)}`);
  if (when.kind === 'until') return when.date >= iso ? (when.date === iso ? 'Until today' : `Until ${shortDate(when.date, iso)}`) : `Until ${shortDate(when.date, iso)}, now past`;
  if (when.kind === 'yearly') return `Every year on ${MONTHS[when.month - 1]} ${when.day}`;
  if (when.kind === 'weekly') {
    const days = (when.weekdays || []).map((on, index) => (on ? index : -1)).filter((index) => index >= 0);
    return days.length === 1 ? `${WEEKDAY_NAMES[days[0]]}s` : days.map((index) => WEEKDAY_NAMES[index].slice(0, 3)).join(', ');
  }
  return null;
}

/**
 * The intentions still prayed for, as they stand on a date: those that
 * belong to that day first (with a word saying why), then the rest, newest
 * first. One kept on certain days only (an anniversary, the Mondays) is
 * left out on the other days.
 */
export async function intentionsFor(iso) {
  const active = (await db.all('intentions')).filter((item) => !item.answered).sort((a, b) => (a.created < b.created ? 1 : -1));
  const forDay = [];
  const ongoing = [];
  for (const item of active) {
    if (fallsOn(item.when, iso)) forDay.push({ ...item, whenLabel: whenLabel(item.when, iso) });
    // Something kept on certain days only (an anniversary, Mondays) waits for its day.
    else if (!item.when || !['yearly', 'weekly'].includes(item.when.kind)) ongoing.push({ ...item, whenLabel: whenLabel(item.when, iso) });
  }
  return { forDay, ongoing };
}
