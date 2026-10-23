// devotions.js
// The guided devotions: which mysteries of the Rosary belong to a day, and
// the Rosary laid out bead by bead.

import { settings } from './db.js';
import { prayerData } from './prayers.js';

const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];

export function rosarySets() {
  return prayerData().rosary.sets;
}

export function rosarySet(id) {
  return rosarySets().find((group) => group.id === id) || null;
}

/**
 * The mysteries traditionally prayed on a day. With the Luminous Mysteries
 * turned off, the older scheme is used, in which Sunday follows the season:
 * Joyful from Advent until Lent, Sorrowful in Lent, and Glorious from Easter
 * until Advent.
 */
export function rosarySetFor(day) {
  const rosary = prayerData().rosary;
  if (settings().luminous) return rosarySet(rosary.byWeekday[day.weekday]);
  if (day.weekday === 0) {
    // Ordinary Time before Lent never runs past 10 March; after Pentecost it resumes in May at the earliest.
    const beforeLent = day.season === 'ordinary' && day.date.slice(5) < '03-11';
    if (day.season === 'advent' || day.season === 'christmas' || beforeLent) return rosarySet('joyful');
    if (day.season === 'lent' || day.season === 'holy-week') return rosarySet('sorrowful');
  }
  return rosarySet(rosary.byWeekdayTraditional[day.weekday]);
}

/**
 * The Rosary as a list of steps, one per bead or prayer.
 * Each step is { prayer, section, decade, bead, of, mystery }: `decade` is 0
 * for the opening and closing prayers and 1 to 5 within the decades; `bead`
 * and `of` count the Hail Marys of a group.
 */
export function rosarySteps(group, { fatima = settings().fatimaPrayer } = {}) {
  const steps = [];
  const add = (prayer, extra = {}) => steps.push({ prayer, decade: 0, section: 'Opening prayers', ...extra });
  add('sign-of-the-cross');
  add('apostles-creed');
  add('our-father');
  for (let bead = 1; bead <= 3; bead += 1) add('hail-mary', { bead, of: 3, hint: ['For faith', 'For hope', 'For charity'][bead - 1] });
  add('glory-be');
  group.mysteries.forEach((mystery, index) => {
    const section = `The ${ORDINALS[index]} ${group.adjective} Mystery`;
    const decade = index + 1;
    steps.push({ mystery, decade, section });
    steps.push({ prayer: 'our-father', decade, section, mysteryTitle: mystery.title });
    for (let bead = 1; bead <= 10; bead += 1) {
      steps.push({ prayer: 'hail-mary', decade, section, bead, of: 10, mysteryTitle: mystery.title });
    }
    steps.push({ prayer: 'glory-be', decade, section, mysteryTitle: mystery.title });
    if (fatima) steps.push({ prayer: 'fatima-prayer', decade, section, mysteryTitle: mystery.title });
  });
  const closing = { decade: 6, section: 'Closing prayers' };
  steps.push({ prayer: 'hail-holy-queen', ...closing });
  steps.push({ prayer: 'rosary-prayer', ...closing });
  steps.push({ prayer: 'sign-of-the-cross', ...closing });
  return steps;
}

export function stations() {
  return prayerData().stations;
}

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'];

// ---------------------------------------------------------------------------
// Chaplets
// ---------------------------------------------------------------------------

/** The chaplets: [{ id, name, sub, about, steps, end, note }]. */
export function chaplets() {
  const data = prayerData();
  return data && Array.isArray(data.chaplets) ? data.chaplets : [];
}

export function chaplet(id) {
  return chaplets().find((item) => item.id === id) || null;
}

/**
 * A chaplet as a list of steps, one per bead or prayer, in the same shape as
 * the Rosary's: { prayer, section, decade, bead, of, hint }.
 *
 * The chaplet's own description is a list of parts: a prayer said once
 * ({ section, prayer }), a prayer said on several beads ({ section, prayer,
 * count }), or a group said again and again ({ repeat: 5, section: 'Decade',
 * steps: [...] }), whose `decade` counts the repetitions.
 */
export function chapletSteps(item) {
  const steps = [];
  const walk = (parts, decade, section) => {
    for (const part of parts) {
      if (part.repeat) {
        for (let round = 1; round <= part.repeat; round += 1) {
          walk(part.steps, round, `${part.section || 'Decade'} ${round} of ${part.repeat}`);
        }
        continue;
      }
      const where = part.section || section || '';
      if (part.count && part.count > 1) {
        for (let bead = 1; bead <= part.count; bead += 1) steps.push({ prayer: part.prayer, section: where, decade, bead, of: part.count, hint: part.hint || null });
      } else {
        steps.push({ prayer: part.prayer, section: where, decade, hint: part.hint || null });
      }
    }
  };
  walk(item.steps, 0, '');
  return steps;
}

/** How many groups a chaplet's beads are counted in (five decades), for the markers at the top. */
export function chapletRounds(item) {
  const round = item.steps.find((part) => part.repeat);
  return round ? round.repeat : 0;
}
