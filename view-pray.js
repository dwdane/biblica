// view-pray.js
// The Pray tab: a plain directory of everything to do with prayer.

import { dayFor, go, readingsOn, today } from './context.js';
import { db } from './db.js';
import { rosarySetFor } from './devotions.js';
import { allNovenas, isFinished } from './novenas.js';
import { currentPractices, itemsFor } from './practices.js';
import { angelusFor, builtInTitle, listedPrayers, marianAntiphonFor } from './prayers.js';
import { add, el, icon } from './ui.js';

function row(title, sub, path) {
  return el('button', { class: 'list-row', onclick: () => go(path) },
    el('span', { class: 'row-text' },
      el('span', { class: 'row-title', text: title }),
      sub ? el('span', { class: 'row-sub', text: sub }) : null),
    icon('forward', 18));
}

function section(title, rows) {
  return el('section', { class: 'card list-card' }, el('h3', { class: 'card-heading', text: title }), rows);
}

export async function render(container) {
  const now = today();
  const day = dayFor(now);
  const [practices, items, novenas, intentions] = await Promise.all([
    currentPractices(), itemsFor(now, day), allNovenas(), db.all('intentions'),
  ]);
  const activeNovenas = novenas.filter((item) => !isFinished(item)).length;
  const activeIntentions = intentions.filter((item) => !item.answered).length;
  const gospel = readingsOn(now).readings.find((reading) => reading.slot === 'gospel');
  const angelus = angelusFor(day);
  const antiphon = marianAntiphonFor(day);
  const library = listedPrayers();
  const withLatin = library.filter((prayer) => prayer.la).length;

  let dailySub = 'Choose the prayers you want to keep each day';
  if (practices.length && items.length) dailySub = `${items.length} on your list today`;
  else if (practices.length) dailySub = 'Nothing falls on today';

  add(container,
    el('header', { class: 'app-header' }, el('h1', { class: 'app-title', text: 'Prayer' })),
    section('Each day', [
      row('Daily prayers', dailySub, '#/pray/list'),
      row('Novenas', activeNovenas ? `${activeNovenas} under way` : 'Nine days of prayer for one intention', '#/pray/novenas'),
      row('Intentions', activeIntentions ? `${activeIntentions} you are praying for` : 'The people and needs you keep before God', '#/pray/intentions'),
    ]),
    section('Devotions', [
      row('The Rosary', rosarySetFor(day).name, '#/pray/rosary'),
      row(builtInTitle(angelus), angelus === 'regina-caeli' ? 'In place of the Angelus during Easter' : 'Morning, noon and evening', `#/prayer/${angelus}`),
      row('Lectio Divina', gospel ? `Today’s Gospel, ${gospel.citation}` : 'Praying with Scripture', '#/pray/lectio'),
      row('Stations of the Cross', day.weekday === 5 && (day.season === 'lent' || day.season === 'holy-week') ? 'A Friday of Lent' : null, '#/pray/stations'),
      row(builtInTitle(antiphon), 'The antiphon of Our Lady for this season', `#/prayer/${antiphon}`),
    ]),
    section('Library', [
      row('Prayers', `${library.length} prayers, ${withLatin} with the Latin`, '#/pray/library'),
      row('Reading plans', 'The Bible in a year, the Gospels in ninety days', '#/plans'),
    ]),
    section('Conscience', [
      row('Evening examen', 'Looking back over the day with God', '#/pray/examen'),
      row('Confession', 'Examination of conscience, and how to confess', '#/pray/confession'),
    ]),
  );
}
