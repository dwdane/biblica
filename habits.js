// habits.js
// Interior habits, and the reader's focus.
//
// An interior habit is a disposition kept through the day rather than a
// prayer said at an hour: thinking well of others, no complaining, the duty of
// the moment done well for God. A reader can put any of them in their rule of
// life beside their prayers (as `habit:<id>`), and can choose one as their
// focus for a few weeks: Saint Ignatius's particular examen, kept gently.
// The focus is shown on Today, and the evening examen and the midday pause ask
// about it. Nothing counts how often it was kept: the research behind the app
// found counting to be the surest way to turn this into scruples.

import { addDays } from './calendar.js';
import { saveSetting, settings } from './db.js';
import { prayerData } from './prayers.js';

/** Every interior habit: [{ id, title, sub, what, saints, how, start, examine, scripture, caution, from }]. */
export function habits() {
  const data = prayerData();
  return data && Array.isArray(data.habits) ? data.habits : [];
}

export function habitById(id) {
  return habits().find((item) => item.id === id) || null;
}

/** What the app says about the focus itself: { about: [...], cautions: [...] }. */
export function focusGuide() {
  const data = prayerData();
  return (data && data.focus) || { about: [], cautions: [] };
}

// How long a focus may be chosen for, in weeks.
export const FOCUS_WEEKS = [2, 4, 6];

/**
 * The reader's focus, if one is chosen: { habit, since, until, over }. `over`
 * is true once its weeks have passed; it stays until the reader keeps it for
 * longer, chooses another or sets it down, so that nothing simply vanishes.
 */
export function currentFocus(today) {
  const stored = settings().focus;
  if (!stored || !stored.habit) return null;
  const habit = habitById(stored.habit);
  if (!habit) return null;
  return { habit, since: stored.since, until: stored.until, over: Boolean(stored.until) && stored.until < today };
}

/** Choose a habit as the focus, from today for a number of weeks. */
export async function setFocus(id, weeks, today) {
  await saveSetting('focus', { habit: id, since: today, until: addDays(today, weeks * 7 - 1) });
}

/** Keep the present focus for more weeks, from today. */
export async function extendFocus(weeks, today) {
  const stored = settings().focus;
  if (!stored) return;
  await saveSetting('focus', { ...stored, until: addDays(today, weeks * 7 - 1) });
}

/** Set the focus down. */
export async function clearFocus() {
  await saveSetting('focus', null);
}
