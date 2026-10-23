// helps.js
// The material behind the Tools tab that is read, not prayed: short guides
// to sacramentals and everyday practices, the Church's indulgences, and
// fasting and penance. It is one file, fetched when first wanted and kept
// with the app for offline use.
//
// The Today screen also asks this module what a given day holds by way of
// penance and indulgences; those answers are worked out here so that they
// can be tested without a page.

import { addDays, movableFeasts } from './calendar.js';

let helps = null;

/**
 * Everything in data-helps.json:
 * { groups: [{ id, title, guides: [id] }], guides: [{ id, title, sub, what, how, not, prayers, scripture, from }],
 *   indulgences: { about, norms, plenaryConditions, partialNote, generalGrants, grants, misunderstandings, special },
 *   fasting: { about, law, us, eucharistic, voluntary, health, countries, reminders } }
 */
export async function loadHelps() {
  if (!helps) {
    const response = await fetch('data-helps.json');
    if (!response.ok) throw new Error('This part of the app could not be loaded.');
    helps = await response.json();
  }
  return helps;
}

/** The helps already loaded, or null: for screens that may draw before the file arrives. */
export function loadedHelps() {
  return helps;
}

/** One guide by id, or null. */
export async function guideById(id) {
  return (await loadHelps()).guides.find((item) => item.id === id) || null;
}

// ---------------------------------------------------------------------------
// Days of the year named by rule
// ---------------------------------------------------------------------------

/**
 * The dates in a year that a day rule names: "MM-DD", "MM-DD..MM-DD" (a run of
 * days), or one of the movable days of the liturgical year.
 *
 * @param {string} rule
 * @param {number} year
 * @param {object} options - Calendar options (region and transfers), as calendarOptions() gives.
 * @returns {string[]} ISO dates, possibly none.
 */
export function datesOfRule(rule, year, options) {
  const fixed = /^(\d{2})-(\d{2})$/.exec(rule);
  if (fixed) return [`${year}-${rule}`];
  const run = /^(\d{2}-\d{2})\.\.(\d{2}-\d{2})$/.exec(rule);
  if (run) {
    const dates = [];
    for (let date = `${year}-${run[1]}`; date <= `${year}-${run[2]}`; date = addDays(date, 1)) dates.push(date);
    return dates;
  }
  const feasts = movableFeasts(year, options);
  if (rule === 'lent-fridays') {
    // The Fridays from Ash Wednesday until Holy Thursday, when Lent ends.
    const fridays = [];
    for (let date = addDays(feasts.ashWednesday, 2); date < feasts.holyThursday; date = addDays(date, 7)) fridays.push(date);
    return fridays;
  }
  const movable = {
    'ash-wednesday': feasts.ashWednesday,
    'holy-thursday': feasts.holyThursday,
    'good-friday': feasts.goodFriday,
    'easter-vigil': feasts.holySaturday,
    easter: feasts.easter,
    'divine-mercy-sunday': feasts.divineMercy,
    pentecost: feasts.pentecost,
    'corpus-christi': feasts.corpusChristi,
    'sacred-heart': feasts.sacredHeart,
    'immaculate-heart': feasts.immaculateHeart,
    'christ-the-king': feasts.christTheKing,
    'dec-31': `${year}-12-31`,
    'jan-1': `${year}-01-01`,
  };
  return movable[rule] ? [movable[rule]] : [];
}

/**
 * Days that belong to the reader's own circumstances, which the app cannot
 * place: the feast of one's parish church, the anniversary of one's baptism,
 * the day a church was dedicated.
 */
export const OWN_DAYS = new Set(['titular-feast', 'baptism-anniversary', 'dedication']);

/** Whether a grant is tied only to days of the reader's own. */
export function isOwnOccasion(grant) {
  return Boolean(grant.days && grant.days.length) && grant.days.every((rule) => OWN_DAYS.has(rule));
}

/** Whether a day rule falls on an ISO date. */
export function ruleFallsOn(rule, iso, options) {
  return datesOfRule(rule, Number(iso.slice(0, 4)), options).includes(iso);
}

/**
 * The particular grants of indulgence whose days include a date. Grants tied to
 * the reader's own circumstances (a parish's titular feast, an anniversary of
 * baptism) have no fixed day and are never returned.
 */
export function indulgencesOn(iso, grants, options) {
  return (grants || []).filter((grant) => (grant.days || []).some((rule) => ruleFallsOn(rule, iso, options)));
}

/** The next date on or after `from` that any of a grant's day rules names, or null. */
export function nextDateOf(grant, from, options) {
  const year = Number(from.slice(0, 4));
  const dates = [year, year + 1]
    .flatMap((candidate) => (grant.days || []).flatMap((rule) => datesOfRule(rule, candidate, options)))
    .filter((date) => date >= from)
    .sort();
  return dates[0] || null;
}
