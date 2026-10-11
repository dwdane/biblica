// schedule.js
// When an entry on the daily list falls due.
//
// An entry repeats in one of three ways, with an optional limit on top:
//
//   weekly   on chosen days of the week (all seven means every day). This is
//            what every entry was before release 0.4, and what an entry with
//            no `repeat` field still is: `weekdays` is a list of seven
//            booleans from Sunday, or null for every day.
//   monthly  repeat: { kind: 'monthly', day: 13 }        the 13th of each month
//            repeat: { kind: 'monthly', day: 'last' }    the last day
//            repeat: { kind: 'monthly', nth: 1, weekday: 5 }   the first Friday
//            repeat: { kind: 'monthly', nth: 'last', weekday: 0 }  the last Sunday
//   yearly   repeat: { kind: 'yearly', month: 10, day: 7 }
//
//   during   { months: [5, 10] }            only in May and October
//            { seasons: ['lent'] }          only in Lent
//
// A date that a month lacks is kept on its last day: "the 31st" falls on 30
// April, and 29 February on the 28th in other years, so nothing is skipped.
//
// Nothing here touches storage or the calendar tables; the liturgical season
// is asked for only when a rule needs it, through a function the caller gives.

import { fromIso, parts, toIso } from './calendar.js';

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const ORDINALS = [[1, 'First'], [2, 'Second'], [3, 'Third'], [4, 'Fourth'], ['last', 'Last']];
// The seasons a reader can choose, and the calendar's own seasons each takes in.
export const SEASON_CHOICES = [
  ['advent', 'Advent', ['advent']],
  ['christmas', 'Christmas', ['christmas']],
  ['lent', 'Lent', ['lent', 'holy-week', 'triduum']],
  ['easter', 'Easter', ['easter']],
  ['ordinary', 'Ordinary Time', ['ordinary']],
];

/** How many days a month has. */
export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** "1st", "2nd", "13th", "23rd". */
export function ordinal(number) {
  const tens = number % 100;
  if (tens >= 11 && tens <= 13) return `${number}th`;
  return `${number}${['th', 'st', 'nd', 'rd'][number % 10] || 'th'}`;
}

function monthlyDue(repeat, { year, month, day, weekday }) {
  const length = daysInMonth(year, month);
  if (repeat.weekday !== undefined && repeat.nth !== undefined) {
    if (weekday !== repeat.weekday) return false;
    if (repeat.nth === 'last') return day + 7 > length;
    return Math.ceil(day / 7) === repeat.nth;
  }
  if (repeat.day === 'last') return day === length;
  return day === Math.min(Number(repeat.day) || 1, length);
}

function yearlyDue(repeat, { year, month, day }) {
  if (month !== repeat.month) return false;
  return day === Math.min(Number(repeat.day) || 1, daysInMonth(year, month));
}

/**
 * Whether an entry's rule falls on a date. The entry's first and last days
 * (created, ended) are not considered here; see isScheduled in practices.js.
 *
 * @param {object} entry - { weekdays, repeat, during } as stored.
 * @param {string} iso - The date.
 * @param {function(string): string} [seasonOf] - Gives the liturgical season of a date; needed only for season limits.
 */
export function occursOn(entry, iso, seasonOf) {
  const date = parts(fromIso(iso));
  const repeat = entry.repeat;
  let due;
  if (repeat && repeat.kind === 'monthly') due = monthlyDue(repeat, date);
  else if (repeat && repeat.kind === 'yearly') due = yearlyDue(repeat, date);
  else due = !entry.weekdays || Boolean(entry.weekdays[date.weekday]);
  if (!due) return false;

  const during = entry.during;
  if (!during || (repeat && repeat.kind === 'yearly')) return true;
  if (Array.isArray(during.months) && during.months.length) return during.months.includes(date.month);
  if (Array.isArray(during.seasons) && during.seasons.length) {
    if (!seasonOf) return true;
    const season = seasonOf(iso);
    return SEASON_CHOICES.some(([id, , covers]) => during.seasons.includes(id) && covers.includes(season));
  }
  return true;
}

function list(words) {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

function weeklyLabel(days) {
  if (!days || days.every(Boolean)) return 'Every day';
  const chosen = days.map((on, index) => (on ? index : -1)).filter((index) => index >= 0);
  if (chosen.length === 1) return `${WEEKDAY_NAMES[chosen[0]]}s`;
  if (chosen.join() === '1,2,3,4,5') return 'Weekdays';
  return chosen.map((index) => WEEKDAY_SHORT[index]).join(', ');
}

function duringLabel(during) {
  if (!during) return '';
  if (Array.isArray(during.months) && during.months.length) {
    return `in ${list([...during.months].sort((a, b) => a - b).map((month) => MONTH_NAMES[month - 1]))}`;
  }
  if (Array.isArray(during.seasons) && during.seasons.length) {
    const names = SEASON_CHOICES.filter(([id]) => during.seasons.includes(id)).map(([, name]) => name);
    return `in ${list(names)}`;
  }
  return '';
}

/** "Every day", "Fridays in Lent", "First Friday of each month", "Every year on October 7". */
export function scheduleLabel(entry) {
  const repeat = entry.repeat;
  if (repeat && repeat.kind === 'yearly') return `Every year on ${MONTH_NAMES[repeat.month - 1]} ${repeat.day}`;
  let label;
  if (repeat && repeat.kind === 'monthly') {
    if (repeat.weekday !== undefined && repeat.nth !== undefined) {
      const which = (ORDINALS.find(([value]) => value === repeat.nth) || ORDINALS[0])[1];
      label = `${which} ${WEEKDAY_NAMES[repeat.weekday]} of each month`;
    } else {
      label = repeat.day === 'last' ? 'Last day of each month' : `The ${ordinal(Number(repeat.day))} of each month`;
    }
  } else {
    label = weeklyLabel(entry.weekdays);
  }
  const limit = duringLabel(entry.during);
  if (!limit) return label;
  // "Fridays in Lent" reads well; "The 1st of each month in May" needs a comma.
  return repeat && repeat.kind === 'monthly' ? `${label}, ${limit}` : `${label} ${limit}`;
}

/**
 * A short word for why an entry is on the list today, for one that does not
 * come every day: "First Friday", "Fridays", "Yearly", "In Lent". Null for an
 * entry that comes every day of the year.
 */
export function occasionLabel(entry) {
  const repeat = entry.repeat;
  const limit = duringLabel(entry.during);
  if (repeat && repeat.kind === 'yearly') return 'Once a year';
  let label = null;
  if (repeat && repeat.kind === 'monthly') {
    if (repeat.weekday !== undefined && repeat.nth !== undefined) {
      const which = (ORDINALS.find(([value]) => value === repeat.nth) || ORDINALS[0])[1];
      label = `${which} ${WEEKDAY_NAMES[repeat.weekday]}`;
    } else {
      label = 'Once a month';
    }
  } else if (entry.weekdays && !entry.weekdays.every(Boolean)) {
    const days = entry.weekdays.map((on, index) => (on ? index : -1)).filter((index) => index >= 0);
    label = days.length === 1 ? `${WEEKDAY_NAMES[days[0]]}s` : 'Some days';
  }
  if (!limit) return label;
  const during = limit.charAt(0).toUpperCase() + limit.slice(1);
  return label ? `${label}, ${limit}` : during;
}

/**
 * The next date on or after `from` on which an entry falls, or null if none
 * is found within two years.
 */
export function nextOccurrence(entry, from, seasonOf) {
  let dn = fromIso(from);
  for (let step = 0; step < 732; step += 1, dn += 1) {
    const iso = toIso(dn);
    if (occursOn(entry, iso, seasonOf)) return iso;
  }
  return null;
}

/** Whether a rule is one that can never fall due (no weekday chosen, an impossible date). */
export function ruleProblem(entry) {
  const repeat = entry.repeat;
  if (!repeat || repeat.kind === 'weekly') {
    return entry.weekdays && !entry.weekdays.some(Boolean) ? 'Choose at least one day.' : null;
  }
  if (repeat.kind === 'yearly') {
    const longest = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][repeat.month - 1];
    return repeat.day > longest ? `${MONTH_NAMES[repeat.month - 1]} has ${longest} days.` : null;
  }
  return null;
}
