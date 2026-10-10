// view-day.js
// About a day: what the Church celebrates, whether Mass is of obligation,
// what the season is, and what happened on this date in her history.

import { accountsFor, eventsOn, kindName, obligationFor, penanceFor, seasonAccount } from './days.js';
import { calendarEntries, dayFor, go, goBack, longDate, readingsOn, today, typeLabel } from './context.js';
import { hasContent, journalEntry } from './journal.js';
import { allPatrons, isPerson, patronsOn, roleLabel, shortName } from './patrons.js';
import { add, el, icon } from './ui.js';
import { patronSheet } from './view-saints.js';

const COLOUR_NAMES = { green: 'Green', violet: 'Violet', white: 'White', red: 'Red', rose: 'Rose', black: 'Black' };

export async function render(container, { date }) {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : today();
  const day = dayFor(iso);
  const obligation = obligationFor(day);
  const penance = penanceFor(day);
  const accounts = accountsFor(day);
  const events = eventsOn(iso);
  const [mine, patrons, entry] = await Promise.all([patronsOn(day, dayFor), allPatrons(), journalEntry(iso)]);
  const season = seasonAccount(day.season);
  const rank = typeLabel(day.celebration.type);
  const { readings } = readingsOn(iso);
  const known = new Set(patrons.map((item) => item.key).filter(Boolean));

  const account = (item, index) => el('section', { class: 'day-account' },
    index > 0 ? el('h3', { class: 'passage-heading', text: item.name }) : null,
    item.dates ? el('p', { class: 'chapter-sub', text: item.dates.replace(/ to /g, '–').replace(/about /g, 'c. ') }) : null,
    el('p', { class: 'devotion-guide', text: item.about }),
    item.patron ? el('p', { class: 'muted', text: item.patron }) : null,
    // Only a person can be someone's patron; feasts of the Lord, of events and of churches are left out.
    isPerson(item.name) && !known.has(item.key)
      ? el('button', { class: 'text-button', onclick: () => patronSheet({ name: shortName(item.name), key: item.key, feast: usualDate(item.key) || iso.slice(5) }, () => go('#/pray/saints')) }, 'Add to my saints')
      : null);

  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack(iso === today() ? '#/today' : `#/today/${iso}`) }, icon('back'), el('span', { text: 'Back' }))),
    el('article', { class: 'chapter day-page', dataset: { lit: day.color } },
      el('p', { class: 'rubric', text: longDate(iso, day.weekdayName) }),
      el('h2', { class: 'chapter-title', text: day.celebration.name }),
      el('p', { class: 'hero-meta' },
        rank ? el('span', { class: 'rank', text: rank }) : null,
        el('span', { text: day.seasonName }),
        el('span', { class: 'colour-chip' }, el('span', { class: 'week-dot', dataset: { lit: day.color } }), ` ${COLOUR_NAMES[day.color] || day.color}`)),

      mine.length ? el('div', { class: 'intention-block' },
        mine.map((item) => el('button', { class: 'text-button', onclick: () => go(`#/pray/saint/${item.id}`) },
          [`The feast of ${item.name}`, roleLabel(item.role)].filter(Boolean).join(' · ')))) : null,

      el('div', { class: `obligation${obligation.obliged ? ' obliged' : ''}` },
        el('p', { class: 'obligation-text', text: obligation.text }),
        penance ? el('p', { class: 'obligation-text', text: penance }) : null),

      accounts.map(account),
      accounts.length === 0 && season ? el('p', { class: 'devotion-guide', text: season.about }) : null,

      el('div', { class: 'button-row spread day-actions' },
        readings.length ? el('button', { class: 'button quiet', onclick: () => go(`#/reading/${iso}/0`) }, 'Mass readings') : null,
        iso <= today()
          ? el('button', { class: 'button quiet', onclick: () => go(`#/journal/${iso}`) }, hasContent(entry) ? 'Your journal for this day' : 'Write in your journal')
          : null),

      events.length ? el('section', { class: 'on-this-day' },
        el('h3', { class: 'passage-heading', text: 'On this day' }),
        events.map((event) => el('div', { class: 'event' },
          el('p', { class: 'event-head' }, el('span', { class: 'event-year', text: event.y }), el('span', { class: 'event-kind', text: kindName(event.k) })),
          el('p', { class: 'event-title', text: event.t }),
          el('p', { class: 'event-text', text: event.x }))),
        el('p', { class: 'muted small', text: 'These notes were written for the app from memory and not all have been checked against a source. If a date looks wrong, it may be.' })) : null,

      accounts.length > 0 && season ? el('details', { class: 'exam-section season-note' },
        el('summary', { text: `About ${day.seasonName}` }),
        el('p', { class: 'devotion-guide', text: season.about })) : null),
  );
}

/** A celebration's own date as "MM-DD", which is not today's when it has been moved this year. */
function usualDate(key) {
  const entry = calendarEntries().find((item) => item.k === key);
  return entry ? `${String(entry.m).padStart(2, '0')}-${String(entry.d).padStart(2, '0')}` : null;
}
