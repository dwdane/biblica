// penance.js
// What a day asks by way of penance, as short notes for Today.
//
// Some of it is the Church's law (Ash Wednesday and Good Friday, the Fridays
// of Lent, the Friday penance, the fast before Communion); the rest is
// counsel and old custom that a reader may choose to be reminded of
// (Wednesdays, Saturdays, the Ember days, the eves of great feasts). The notes
// say which is which, plainly, and never make a counsel sound like a duty or
// speak of sin. The law's own days are always noted; the rest as the reader
// chooses, in Tools, Fasting and penance. Sources: canons 919 and 1249 to
// 1253; the US bishops' Pastoral Statement on Penance and Abstinence (1966);
// Sacrosanctum Concilium 110; the Didache 8.1 (see docs/SOURCES.md).

import { addDays, movableFeasts } from './calendar.js';

/**
 * The reminders a reader can turn on or off. `on` is the default. Ash
 * Wednesday, Good Friday and the Fridays of Lent are not here: they are
 * always noted.
 */
export const PENANCE_NOTES = [
  { id: 'friday', label: 'Fridays', about: 'Every Friday is a day of penance, in memory of the Passion.', on: true },
  { id: 'eucharistic', label: 'The fast before Communion', about: 'On Sundays and holy days of obligation, and on days your habits include Mass.', on: true },
  { id: 'eves', label: 'The day before a fast day', about: 'A word the day before Ash Wednesday and Good Friday.', on: true },
  { id: 'holySaturday', label: 'Holy Saturday', about: 'The Church recommends keeping the Good Friday fast until the Easter Vigil. Not required.', on: true },
  { id: 'lentWeekdays', label: 'Weekdays of Lent', about: 'The US bishops recommend a small fast of your own choosing. Not required.', on: false },
  { id: 'wednesday', label: 'Wednesdays', about: 'The first Christians fasted on Wednesday as well as Friday (the Didache). A custom, not a law.', on: false },
  { id: 'saturday', label: 'Saturdays, for Our Lady', about: 'A small offering in her honour. A custom.', on: false },
  { id: 'ember', label: 'Ember days', about: 'The old fasts and prayers at the start of each season. Kept now by choice.', on: false },
  { id: 'vigils', label: 'The eves of great feasts', about: 'A day of self-denial before Christmas, Pentecost, the Assumption, All Saints and the Immaculate Conception, once required, now freely.', on: false },
];

/** Whether the reader wants a note: their choice, or its default. */
function wants(chosen, id) {
  const note = PENANCE_NOTES.find((item) => item.id === id);
  return (chosen && typeof chosen[id] === 'boolean') ? chosen[id] : Boolean(note && note.on);
}

/** The first given weekday (0 Sunday to 6 Saturday) strictly after a date. */
function weekdayAfter(iso, weekday) {
  for (let offset = 1; offset <= 7; offset += 1) {
    const date = addDays(iso, offset);
    if (new Date(`${date}T12:00:00Z`).getUTCDay() === weekday) return date;
  }
  return null;
}

/**
 * The Ember days of a year, as the 1962 books keep them: the Wednesday, Friday
 * and Saturday after the first Sunday of Lent, after Pentecost, after the third
 * Sunday of September and after Saint Lucy (13 December, which comes to the
 * same week as the third Sunday of Advent). Before 1960 the September days
 * followed Holy Cross day (14 September) instead.
 */
export function emberDays(year, options) {
  const feasts = movableFeasts(year, options);
  const firstSundayOfSeptember = weekdayAfter(`${year}-08-31`, 0);
  const starts = [feasts.lent1, feasts.pentecost, addDays(firstSundayOfSeptember, 14), `${year}-12-13`];
  return starts.flatMap((start) => {
    const wednesday = weekdayAfter(start, 3);
    return [wednesday, addDays(wednesday, 2), addDays(wednesday, 3)];
  });
}

/** The eves once kept with a fast: of Christmas, Pentecost, the Assumption, All Saints and the Immaculate Conception. */
export function vigilsOf(year, options) {
  const feasts = movableFeasts(year, options);
  const vigils = [
    { date: `${year}-12-24`, name: 'Christmas' },
    { date: addDays(feasts.pentecost, -1), name: 'Pentecost' },
    { date: `${year}-08-14`, name: 'the Assumption' },
    { date: `${year}-10-31`, name: 'All Saints' },
  ];
  // When 8 December is a Sunday of Advent the solemnity moves to the Monday, and its eve is a Sunday.
  if (new Date(`${year}-12-08T12:00:00Z`).getUTCDay() !== 0) vigils.push({ date: `${year}-12-07`, name: 'the Immaculate Conception' });
  return vigils;
}

/** Whether a day ranks as a solemnity for the law of penance: the Easter octave counts; All Souls does not. */
function isSolemnity(day) {
  return (day.celebration.type === 'solemnity' && day.celebration.key !== 'AllSouls') || /OctaveEaster$/.test(day.temporal.key || '');
}

/** The octaves of Christmas and Easter, when no custom of fasting is kept. */
function inOctave(iso, movable) {
  const year = iso.slice(0, 4);
  const christmasOctave = iso >= `${year}-12-25` || iso <= `${year}-01-01`;
  const easterOctave = iso >= movable.easter && iso <= addDays(movable.easter, 7);
  return christmasOctave || easterOctave;
}

const FAST_TEXT = 'Fasting and abstinence from meat. One full meal; two small ones if needed, together less than a full meal; nothing between. Abstinence binds from the 14th birthday; fasting from the 18th birthday until the 59th. The sick, the pregnant and nursing, and anyone whose health would suffer are excused.';

/**
 * The notes for one day.
 *
 * @param {object} day - The liturgical day (from dayFor).
 * @param {object} context
 * @param {object} [context.chosen] - The reader's choices, by note id.
 * @param {boolean} [context.massToday] - Whether the reader's habits include Mass today.
 * @param {boolean} [context.obliged] - Whether Mass is of obligation today.
 * @param {string} [context.region] - 'us' or 'general'.
 * @param {object} [context.options] - Calendar options.
 * @returns {Array<{id: string, title: string, text: string, binding: boolean}>}
 */
export function penanceNotes(day, { chosen = {}, massToday = false, obliged = false, region = 'us', options } = {}) {
  const notes = [];
  const iso = day.date;
  const year = Number(iso.slice(0, 4));
  const us = region === 'us';
  const movable = movableFeasts(year, options);
  const lent = day.season === 'lent' || day.season === 'holy-week';
  const solemnity = isSolemnity(day);
  const add = (id, title, text, binding) => notes.push({ id, title, text, binding });

  // The law: the two fast days, and the Fridays.
  if (iso === movable.ashWednesday) {
    add('fast', 'Ash Wednesday: fasting and abstinence', FAST_TEXT, true);
  } else if (iso === movable.goodFriday) {
    add('fast', 'Good Friday: fasting and abstinence', FAST_TEXT, true);
  } else if (day.weekday === 5 && solemnity) {
    if (lent || wants(chosen, 'friday')) {
      add('friday-lifted', 'No Friday penance today', 'A solemnity falls on this Friday, so the Friday penance and abstinence are lifted today.', false);
    }
  } else if (day.weekday === 5 && lent) {
    add('abstinence', 'A Friday of Lent: abstinence', us
      ? 'Abstinence from meat, for everyone from the 14th birthday. Fish, eggs and milk are allowed.'
      : 'Abstinence from meat, unless your bishops’ conference allows another penance in its place.', true);
  } else if (day.weekday === 5 && wants(chosen, 'friday')) {
    add('friday', 'Friday penance', us
      ? 'A day of penance, in memory of the Passion. Abstaining from meat comes first among the penances the bishops suggest; another may take its place: a work of charity, time given to prayer, or going without something you enjoy.'
      : 'A day of penance, in memory of the Passion. Abstain from meat, or keep the penance your bishops’ conference allows in its place.', true);
  }

  // The day before each fast day.
  if (wants(chosen, 'eves')) {
    if (iso === addDays(movable.ashWednesday, -1)) add('eve', 'Tomorrow is Ash Wednesday', 'A day of fasting and abstinence from meat.', false);
    if (iso === movable.holyThursday) add('eve', 'Tomorrow is Good Friday', 'A day of fasting and abstinence from meat.', false);
  }
  if (iso === movable.holySaturday && wants(chosen, 'holySaturday')) {
    add('paschal', 'The Paschal fast', 'If you can, keep the Good Friday fast until the Easter Vigil, to come to Easter with a clear mind. It is recommended, not required.', false);
  }

  // Before Communion.
  if (wants(chosen, 'eucharistic') && (obliged || massToday)) {
    add('eucharistic', 'The fast before Communion', 'One hour without food or drink before Communion, except water and medicine. The elderly, the sick and those who care for them are excused.', true);
  }

  // Counsel and custom, as chosen; never on a solemnity, a Sunday or in the octaves.
  const quiet = solemnity || day.weekday === 0 || inOctave(iso, movable);
  if (!quiet && lent && wants(chosen, 'lentWeekdays') && day.weekday !== 5 && iso > movable.ashWednesday && iso < movable.holyThursday) {
    add('lent-weekday', 'A weekday of Lent', 'A small fast of your own choosing is a good practice if your health allows. It is not required.', false);
  }
  if (!quiet && day.weekday === 3 && iso !== movable.ashWednesday && wants(chosen, 'wednesday')) {
    add('wednesday', 'Wednesday, by choice', 'The first Christians fasted on Wednesdays and Fridays. A small fast today is a free offering, not a law.', false);
  }
  if (!quiet && day.weekday === 6 && iso !== movable.holySaturday && wants(chosen, 'saturday')) {
    add('saturday', 'Saturday, for Our Lady', 'Many keep Saturday in honour of Our Lady: a small self-denial offered through her, if you wish.', false);
  }
  if (wants(chosen, 'ember') && !solemnity && emberDays(year, options).includes(iso) && iso !== movable.ashWednesday) {
    add('ember', 'An Ember day', 'Once a day of fasting, now kept freely, with prayer for the needs of all and thanks for the fruits of the earth.', false);
  }
  if (wants(chosen, 'vigils') && !solemnity && day.weekday !== 0) {
    const vigil = vigilsOf(year, options).find((item) => item.date === iso);
    if (vigil) add('vigil', `The eve of ${vigil.name}`, 'Some prepare for a great feast with a day of self-denial. It is freely chosen.', false);
  }
  return notes;
}
