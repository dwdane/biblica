// patrons.js
// The reader's own saints: a confirmation saint, a name saint, patrons of
// their work or their family, or simply saints they love.
//
// A patron is { id, name, role, key, feast, note, created }: `key` is the
// calendar key when the saint was chosen from the calendar, and `feast` is
// "MM-DD" when a feast day is known.

import { addDays } from './calendar.js';
import { db } from './db.js';

// How a saint is theirs, offered when adding one. Any other wording may be typed.
export const ROLES = ['Confirmation saint', 'Name saint', 'Patron', 'A saint I love'];

export async function allPatrons() {
  return (await db.all('patrons')).sort((a, b) => a.name.localeCompare(b.name));
}

export async function patron(id) {
  const key = Number(id);
  if (!Number.isInteger(key)) return null;
  return (await db.get('patrons', key)) || null;
}

export async function savePatron(record) {
  const next = {
    ...record,
    name: record.name.trim(),
    role: (record.role || '').trim(),
    note: (record.note || '').trim(),
    key: record.key || null,
    feast: record.feast || null,
    created: record.created || new Date().toISOString(),
  };
  if (!next.id) delete next.id;
  const id = await db.put('patrons', next);
  return { ...next, id };
}

export async function deletePatron(id) {
  await db.remove('patrons', Number(id));
}

const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** The date in a year of a feast kept on "MM-DD". A feast of 29 February is kept on the 28th in other years. */
export function feastIn(feast, year) {
  return feast === '02-29' && !isLeap(year) ? `${year}-02-28` : `${year}-${feast}`;
}

/** Whether a day keeps a celebration, as the day's own or alongside it. */
function keeps(day, key) {
  return day.celebration.key === key || day.temporal.key === key || day.commemorations.some((item) => item.key === key);
}

// How far the calendar may move a saint's day: Saint Joseph and the
// Annunciation go as far as the Monday after the Easter octave.
const MOVED_WITHIN = 16;

/**
 * The date on which a saint of the reader's is kept in the year of a given
 * date. A saint from the calendar follows it: if the day has been moved that
 * year (Saint Joseph out of Holy Week), the feast is where the calendar puts
 * it; if a Sunday has simply taken its place, it stays on its own date.
 *
 * @param {object} item - A patron.
 * @param {number} year
 * @param {(iso: string) => object} dayFor - The liturgical day for a date.
 * @returns {string|null} ISO date, or null when no feast day is known.
 */
export function feastOf(item, year, dayFor) {
  if (!item.feast) return null;
  const usual = feastIn(item.feast, year);
  if (!item.key || keeps(dayFor(usual), item.key)) return usual;
  for (let offset = 1; offset <= MOVED_WITHIN; offset += 1) {
    for (const date of [addDays(usual, offset), addDays(usual, -offset)]) {
      if (keeps(dayFor(date), item.key)) return date;
    }
  }
  return usual;
}

/** The reader's saints whose feast is kept on a day. */
export async function patronsOn(day, dayFor) {
  const year = Number(day.date.slice(0, 4));
  return (await allPatrons()).filter((item) => (item.key && keeps(day, item.key)) || feastOf(item, year, dayFor) === day.date);
}

/** The next date on or after `today` on which a feast kept on "MM-DD" falls, by the date alone. */
export function nextFeast(feast, today) {
  if (!feast) return null;
  const year = Number(today.slice(0, 4));
  const thisYear = feastIn(feast, year);
  return thisYear >= today ? thisYear : feastIn(feast, year + 1);
}

/** The next date on or after `today` on which a saint of the reader's is kept, following the calendar. */
export function nextFeastOf(item, today, dayFor) {
  if (!item.feast) return null;
  const year = Number(today.slice(0, 4));
  const thisYear = feastOf(item, year, dayFor);
  return thisYear >= today ? thisYear : feastOf(item, year + 1, dayFor);
}

// Words that say what a saint was, not who: they are left off a name.
const DESCRIPTORS = new Set([
  'and', 'of', 'the', 'pope', 'bishop', 'bishops', 'priest', 'priests', 'deacon', 'monk', 'abbot', 'abbess', 'virgin',
  'virgins', 'martyr', 'martyrs', 'apostle', 'apostles', 'evangelist', 'archangels', 'religious', 'hermit', 'doctor',
  'doctors', 'church', 'companions', 'parents', 'spouse', 'blessed', 'mary', 'king', 'queen', 'founder', 'founders',
  'missionary', 'widow', 'holy', 'man', 'woman',
]);

/**
 * A celebration's name without what follows the saint's own name:
 * "Saint Teresa of Jesus, Virgin and Doctor of the Church" becomes "Saint
 * Teresa of Jesus", and "Saints Cornelius, Pope, and Cyprian, Bishop,
 * Martyrs" becomes "Saints Cornelius and Cyprian".
 */
export function shortName(name) {
  const [first, ...rest] = (name || '').split(',').map((part) => part.trim());
  const kept = rest.filter((part) => !part.toLowerCase().split(/\s+/).every((word) => DESCRIPTORS.has(word)));
  return kept.reduce((whole, part) => (part.startsWith('and ') ? `${whole} ${part}` : `${whole}, ${part}`), first);
}

/**
 * How a saint is the reader's, as a phrase: "Your confirmation saint",
 * "A saint you love". Wording of the reader's own is given as they wrote it.
 */
export function roleLabel(role) {
  const known = {
    'confirmation saint': 'Your confirmation saint',
    'name saint': 'Your name saint',
    patron: 'Your patron',
    'a saint i love': 'A saint you love',
  };
  const typed = (role || '').trim();
  return known[typed.toLowerCase()] || typed;
}

/** "19 March" style label for a feast kept on "MM-DD". */
export function feastLabel(feast, monthName) {
  if (!feast) return '';
  const [month, day] = feast.split('-').map(Number);
  return `${monthName(month)} ${day}`;
}

/**
 * Whether a celebration is of someone who can be a patron: a saint, a
 * blessed, or Our Lady under one of her titles. Feasts of the Lord, of
 * events ("The Conversion of Saint Paul") and of churches are not.
 */
export function isPerson(name) {
  return /^(Saints?|Blessed|Our Lady)\b/.test(name || '');
}
