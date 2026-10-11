// view-pray.js
// The Pray tab: a plain directory of everything to do with prayer, in the
// order of a life of prayer: one's own rule, the day, times of prayer, the
// sacraments, help for hard and good times, the month and the year.

import { dayFor, go, readingsOn, today } from './context.js';
import { db } from './db.js';
import { rosarySetFor } from './devotions.js';
import { allNovenas, isFinished } from './novenas.js';
import { allPatrons } from './patrons.js';
import { currentPractices, guides, itemsFor } from './practices.js';
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
  const [practices, items, novenas, intentions, patrons] = await Promise.all([
    currentPractices(), itemsFor(now, day), allNovenas(), db.all('intentions'), allPatrons(),
  ]);
  const activeNovenas = novenas.filter((item) => !isFinished(item)).length;
  const activeIntentions = intentions.filter((item) => !item.answered).length;
  const gospel = readingsOn(now).readings.find((reading) => reading.slot === 'gospel');
  const angelus = angelusFor(day);
  const antiphon = marianAntiphonFor(day);
  const library = listedPrayers();
  const withLatin = library.filter((prayer) => prayer.la).length;
  const guide = (id) => guides().find((item) => item.id === id);
  const guideRow = (id) => (guide(id) ? row(guide(id).title, guide(id).sub, `#/pray/guide/${id}`) : null);

  let ruleSub = 'What you try to do each day, chosen once';
  if (practices.length && items.length) ruleSub = `${items.length} for today`;
  else if (practices.length) ruleSub = 'Nothing falls on today';

  add(container,
    el('header', { class: 'app-header' }, el('h1', { class: 'app-title', text: 'Prayer' })),
    section('Your rule', [
      row('My rule of life', ruleSub, '#/pray/list'),
      row('Intentions', activeIntentions ? `${activeIntentions} you are praying for` : 'The people and needs you keep before God', '#/pray/intentions'),
      row('My saints', patrons.length ? patrons.map((item) => item.name).slice(0, 3).join(', ') : 'Your confirmation saint, your name saint, your patrons', '#/pray/saints'),
      row('Novenas', activeNovenas ? `${activeNovenas} under way` : 'Nine days of prayer for one intention', '#/pray/novenas'),
    ]),
    section('Through the day', [
      guideRow('morning'),
      row(builtInTitle(angelus), angelus === 'regina-caeli' ? 'In place of the Angelus during Easter' : 'Morning, noon and evening', `#/prayer/${angelus}`),
      row('Short prayers', 'One at the turns of the day: the door, the desk, the kettle', '#/pray/aspirations'),
      row('Evening examen', 'Looking back over the day with God', '#/pray/examen'),
      row('Journal', 'A page for each day; the examen can write parts of it', '#/journal'),
    ]),
    section('Times of prayer', [
      guideRow('mental-prayer'),
      row('Lectio Divina', gospel ? `Today’s Gospel, ${gospel.citation}` : 'Praying with Scripture', '#/pray/lectio'),
      row('The Rosary', rosarySetFor(day).name, '#/pray/rosary'),
      row('Stations of the Cross', day.weekday === 5 && (day.season === 'lent' || day.season === 'holy-week') ? 'A Friday of Lent' : null, '#/pray/stations'),
      row(builtInTitle(antiphon), 'The antiphon of Our Lady for this season', `#/prayer/${antiphon}`),
      guideRow('visit'),
    ]),
    section('The sacraments and the liturgy', [
      row('The Mass', 'Follow along: the ordinary form and the traditional Latin Mass', '#/mass'),
      guideRow('thanksgiving'),
      row('Confession', 'Examination of conscience, and how to confess', '#/pray/confession'),
      row('The Divine Office', 'The prayer of the hours: what it is and where to pray it', '#/pray/office'),
    ]),
    section('For times like these', [
      row('Hard days and good ones', 'When prayer is dry, after a fall, in grief, in joy: counsel from the saints', '#/pray/help'),
    ]),
    section('The month and the year', [
      guideRow('recollection'),
      guideRow('year'),
    ]),
    section('Library', [
      row('Prayers', `${library.length} prayers, ${withLatin} with the Latin`, '#/pray/library'),
      row('Reading plans', 'The Bible in a year, the Gospels in ninety days', '#/plans'),
      row('Early Christian writings', 'The Didache, Ignatius, Polycarp and others: not Scripture, but the first Christians’ own words', '#/early'),
    ]),
  );
}
