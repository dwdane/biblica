// view-pray.js
// The Pray tab: a plain directory of everything to do with prayer, in the
// order of a life of prayer: one's own rule, the day, times of prayer, the
// Mass, prayer for particular needs and for hard and good times, the month
// and the year, and the library. What helps prayer without being prayer (the
// saints, the sacraments, the Church's year, sacramentals) is under Tools.

import { dayFor, go, readingsOn, today } from './context.js';
import { db } from './db.js';
import { rosarySetFor } from './devotions.js';
import { currentFocus } from './habits.js';
import { currentNovenas } from './novenas.js';
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
  const [practices, items, novenas, intentions] = await Promise.all([
    currentPractices(), itemsFor(now, day), currentNovenas(now), db.all('intentions'),
  ]);
  const activeIntentions = intentions.filter((item) => !item.answered).length;
  const gospel = readingsOn(now).readings.find((reading) => reading.slot === 'gospel');
  const angelus = angelusFor(day);
  const antiphon = marianAntiphonFor(day);
  const library = listedPrayers();
  const withLatin = library.filter((prayer) => prayer.la).length;
  const focus = currentFocus(now);
  const guide = (id) => guides().find((item) => item.id === id);
  const guideRow = (id) => (guide(id) ? row(guide(id).title, guide(id).sub, `#/pray/guide/${id}`) : null);

  let habitsSub = 'What you have chosen to do, and when. Nothing is here unless you put it here';
  if (practices.length && items.length) habitsSub = `${items.length} for today. Tap to change them`;
  else if (practices.length) habitsSub = 'Nothing falls on today. Tap to change them';

  add(container,
    el('header', { class: 'app-header' }, el('h1', { class: 'app-title', text: 'Prayer' })),
    section('Yours', [
      row('My habits', habitsSub, '#/pray/list'),
      row('Interior habits', focus ? `Your focus: ${focus.habit.title}` : 'Habits of the heart, and one to work at for a few weeks', '#/pray/habits'),
      row('Intentions', activeIntentions ? `${activeIntentions} you are praying for` : 'The people and needs you keep before God', '#/pray/intentions'),
      row('Novenas', novenas.length ? `${novenas.length} under way` : 'Nine days of prayer for one intention, and longer devotions', '#/pray/novenas'),
    ]),
    section('Through the day', [
      guideRow('morning'),
      row(builtInTitle(angelus), angelus === 'regina-caeli' ? 'In place of the Angelus during Easter' : 'Morning, noon and evening', `#/prayer/${angelus}`),
      guideRow('midday'),
      row('Short prayers', 'One at the turns of the day: the door, the desk, the kettle', '#/pray/aspirations'),
      row('Evening examen', 'Looking back over the day with God', '#/pray/examen'),
      guideRow('night-prayer'),
      row('Journal', 'A page for each day; the examen can write parts of it', '#/journal'),
    ]),
    section('Times of prayer', [
      guideRow('mental-prayer'),
      row('Lectio Divina', gospel ? `Today’s Gospel, ${gospel.citation}` : 'Praying with Scripture', '#/pray/lectio'),
      row('The Rosary', rosarySetFor(day).name, '#/pray/rosary'),
      row('The Chaplet of Divine Mercy', 'On the beads of the Rosary; traditionally at three in the afternoon', '#/pray/chaplet/divine-mercy'),
      row('Stations of the Cross', day.weekday === 5 && (day.season === 'lent' || day.season === 'holy-week') ? 'A Friday of Lent' : null, '#/pray/stations'),
      row(builtInTitle(antiphon), 'The antiphon of Our Lady for this season', `#/prayer/${antiphon}`),
      guideRow('visit'),
      guideRow('slowly'),
    ]),
    section('The Mass', [
      guideRow('mass-prep'),
      guideRow('thanksgiving'),
    ]),
    section('For a particular need', [
      guideRow('worry'),
      guideRow('temptation'),
      guideRow('forgive'),
      guideRow('suffering'),
      guideRow('decision'),
      row('Hard days and good ones', 'When prayer is dry, after a fall, in grief, in joy: counsel from the saints', '#/pray/help'),
    ]),
    section('The month and the year', [
      guideRow('recollection'),
      guideRow('year'),
    ]),
    section('Prayers', [
      row('All prayers', `${library.length} prayers, ${withLatin} with the Latin, and your own`, '#/pray/library'),
    ]),
  );
}
