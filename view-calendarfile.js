// view-calendarfile.js
// "Add to my phone's calendar": a sheet that makes a calendar file of a
// novena's days, or of the days of penance and obligation in the year ahead,
// and hands it to the phone. The phone's calendar can then sound an alert on
// each day, which the app itself cannot do without a server.

import { addDays } from './calendar.js';
import { dayFor, today } from './context.js';
import { calendarOptions, saveSetting, settings } from './db.js';
import { obligationFor } from './days.js';
import { calendarFile } from './icalendar.js';
import { scheduleOf, stepLabel } from './novenas.js';
import { penanceNotes } from './penance.js';
import { add, el, once, openSheet, toast } from './ui.js';
import { holdRestarts } from './updates.js';

/**
 * The events of a novena: one on each of its days still to come, at the hour
 * chosen. The intention goes into the calendar only when the reader asks: a
 * phone's calendar is often copied to an account elsewhere.
 */
export function novenaEvents(item, time, now, withIntention = false) {
  return scheduleOf(item)
    .map((date, index) => ({ date, day: index + 1 }))
    .filter(({ date }) => date >= now)
    .map(({ date, day }) => ({
      uid: `biblica-novena-${item.id}-${day}-${item.started}@biblica.app`,
      date,
      time,
      minutes: 15,
      title: `${item.title}: ${stepLabel(item, day).toLowerCase()}`,
      description: withIntention && item.intention ? `For this intention: ${item.intention}` : 'Open Biblica to pray it.',
      alert: time,
    }));
}

/**
 * The days of the coming year that the reader is reminded of on Today: the
 * Church's days of fasting and abstinence, the holy days of obligation, and
 * whichever customs the reader has turned on.
 */
export function penanceEvents(from, days, alertTime, chosen) {
  const events = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = addDays(from, offset);
    const day = dayFor(date);
    const obligation = obligationFor(day);
    if (day.weekday !== 0 && obligation.obliged) {
      events.push({ uid: `biblica-obligation-${date}@biblica.app`, date, title: `Holy day of obligation: ${day.celebration.name}`, description: obligation.text, alert: alertTime });
    }
    // The fast before Communion belongs to the morning of Mass, not to a calendar of days.
    const notes = penanceNotes(day, { chosen: { ...chosen, eucharistic: false }, region: settings().region, options: calendarOptions() });
    for (const note of notes) {
      events.push({ uid: `biblica-${note.id}-${date}@biblica.app`, date, title: note.title, description: note.text, alert: alertTime });
    }
  }
  return events;
}

/** Hand a calendar file to the phone: the share sheet where there is one, otherwise a download. */
async function deliver(text, name) {
  holdRestarts();
  const blob = new Blob([text], { type: 'text/calendar' });
  const file = new File([blob], name, { type: 'text/calendar' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return 'shared';
    } catch (error) {
      if (error && error.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const anchor = el('a', { href: url, download: name });
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'saved';
}

/**
 * The sheet. `what` is { novena } for one novena's days, or { penance: true }
 * for the days of penance and obligation in the year ahead.
 */
export function calendarFileSheet(what) {
  const now = today();
  const timeInput = el('input', { class: 'field short', type: 'time', 'aria-label': 'Time of the alert' });
  timeInput.value = settings().calendarAlertTime || (what.novena ? '08:00' : '07:30');
  const title = what.novena ? 'Add to my phone’s calendar' : 'Days of penance in my calendar';
  const withIntention = el('input', { type: 'checkbox', id: 'calendar-intention' });
  openSheet(title, (close) => {
    const make = once(async () => {
      const time = /^\d{2}:\d{2}$/.test(timeInput.value) ? timeInput.value : '08:00';
      await saveSetting('calendarAlertTime', time);
      let events;
      let name;
      if (what.novena) {
        events = novenaEvents(what.novena, time, now, withIntention.checked);
        name = `${what.novena.title}.ics`.replace(/[\\/:*?"<>|]+/g, '');
      } else {
        events = penanceEvents(now, 366, time, settings().penanceNotes || {});
        name = 'Biblica days of penance.ics';
      }
      if (!events.length) {
        toast('There are no days still to come');
        return;
      }
      const result = await deliver(calendarFile(what.novena ? what.novena.title : 'Biblica: days of penance', events), name);
      close();
      if (result === 'saved') toast('Saved. Open the file to add it to your calendar.');
    });
    return [
      el('p', { class: 'muted small', text: what.novena
        ? 'This makes a small calendar file with each day of the novena still to come. Open it with your phone’s Calendar and each day will be added, with an alert at the time you choose.'
        : 'This makes a small calendar file of the year ahead: the days of fasting and abstinence, the holy days of obligation, and the days you chose under “Notes on Today”. Open it with your phone’s Calendar to add them, each with an alert.' }),
      el('p', { class: 'muted small', text: 'Nothing is sent anywhere: the file is made on this device and handed to your phone, as a backup is. If you add it twice, the days appear twice.' }),
      el('label', { class: 'field-label inline' }, 'Alert at', timeInput),
      what.novena && what.novena.intention
        ? el('label', { class: 'picker-check', for: 'calendar-intention' }, withIntention,
          el('span', { class: 'row-text' },
            el('span', { class: 'row-title', text: 'Put my intention in the calendar' }),
            el('span', { class: 'row-sub', text: 'Left out unless you tick this: your calendar may be copied to an account elsewhere.' })))
        : null,
      add(el('div', { class: 'button-row' }),
        el('button', { class: 'button quiet', onclick: close }, 'Cancel'),
        el('button', { class: 'button', onclick: make }, 'Make the calendar file')),
    ];
  });
}
