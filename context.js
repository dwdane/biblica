// context.js
// Data every screen shares: the calendar table, the lectionary, and today's
// date. Screens import from here rather than from app.js, which keeps the
// module graph free of cycles.

import { liturgicalDay, todayIso } from './calendar.js';
import { calendarOptions } from './db.js';
import { readingsFor } from './lectionary.js';

const data = { calendar: null, lectionary: null };

export async function loadLiturgy() {
  if (data.calendar && data.lectionary) return;
  const [calendar, lectionary] = await Promise.all([
    fetch('data-calendar.json').then((response) => response.json()),
    fetch('data-lectionary.json').then((response) => response.json()),
  ]);
  data.calendar = calendar;
  data.lectionary = lectionary;
}

/** The fixed celebrations of the calendar in use: [{ k, m, d, g, n, c }]. */
export function calendarEntries() {
  const options = calendarOptions();
  return data.calendar ? data.calendar[options.region === 'us' ? 'us' : 'general'] : [];
}

/** Today in the device's time zone. Read fresh each time: the app may stay open past midnight. */
export function today() {
  return todayIso();
}

/** The liturgical day for a date, under the reader's calendar settings. */
export function dayFor(iso) {
  const options = calendarOptions();
  const table = data.calendar ? data.calendar[options.region === 'us' ? 'us' : 'general'] : [];
  return liturgicalDay(iso, table, options);
}

/** The Mass readings for a date. */
export function readingsOn(iso) {
  const day = dayFor(iso);
  const found = data.lectionary
    ? readingsFor(day, data.lectionary)
    : { readings: [], masses: [], title: null, approximate: false };
  return { day, ...found };
}

/** Go to another screen. */
export function go(path) {
  window.location.hash = path;
}

/** Draw the current screen again, after something it shows has changed. */
export function refresh() {
  window.dispatchEvent(new Event('hashchange'));
}

let screensShown = 0;

/** Called by the router each time a screen is shown. */
export function noteScreenShown() {
  screensShown += 1;
}

/**
 * Go back to wherever the reader came from. When the app was opened directly
 * on this screen there is nowhere to go back to, so `fallback` is used.
 */
export function goBack(fallback) {
  if (screensShown > 1) window.history.back();
  else go(fallback);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Wednesday, 7 October" style date for headings. */
export function longDate(iso, weekdayName) {
  const [, month, day] = iso.split('-').map(Number);
  return `${weekdayName}, ${MONTHS[month - 1]} ${day}`;
}

export function monthName(month) {
  return MONTHS[month - 1];
}

// How each rank of celebration is named on screen.
const TYPE_LABELS = {
  solemnity: 'Solemnity',
  feast: 'Feast',
  memorial: 'Memorial',
  'optional memorial': 'Optional memorial',
  sunday: 'Sunday',
  triduum: 'Paschal Triduum',
  weekday: null,
};

export function typeLabel(type) {
  return TYPE_LABELS[type] || null;
}
