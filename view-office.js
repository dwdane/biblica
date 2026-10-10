// view-office.js
// A page about the Divine Office: what it is, what of it the app already
// carries, and where the whole of it can be prayed. The current English
// Liturgy of the Hours is under copyright, so the app points to it rather
// than carrying it.

import { dayFor, go, goBack, today } from './context.js';
import { builtInTitle, marianAntiphonFor } from './prayers.js';
import { add, el, icon } from './ui.js';
import { outLink } from './view-about.js';

const HOURS = [
  ['Office of Readings', 'Matins', 'At any hour: psalms, a long reading from Scripture and one from the Fathers or the saints.'],
  ['Morning Prayer', 'Lauds', 'At daybreak. Praise for the new day and the Resurrection, with the Benedictus.'],
  ['Daytime Prayer', 'Terce, Sext and None', 'A short pause at mid-morning, midday or mid-afternoon.'],
  ['Evening Prayer', 'Vespers', 'As the day ends. Thanksgiving, with the Magnificat.'],
  ['Night Prayer', 'Compline', 'Before sleep. An examination of conscience, a psalm of trust and the Nunc dimittis.'],
];

function prayerRow(id, title, sub) {
  return el('button', { class: 'list-row', onclick: () => go(`#/prayer/${id}`) },
    el('span', { class: 'row-text' },
      el('span', { class: 'row-title', text: title || builtInTitle(id) }),
      sub ? el('span', { class: 'row-sub', text: sub }) : null),
    icon('forward', 18));
}

export async function render(container) {
  const antiphon = marianAntiphonFor(dayFor(today()));
  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/pray') }, icon('back'), el('span', { text: 'Back' }))),
    el('h1', { class: 'page-title', text: 'The Divine Office' }),

    el('article', { class: 'card about-page' },
      el('p', { text: 'The Divine Office, also called the Liturgy of the Hours or the breviary, is the daily prayer of the Church: psalms, hymns, readings and prayers set at fixed hours, so that the whole day is given to God. With the Mass it is the Church’s public prayer. Priests and religious are bound to it, and the Second Vatican Council encouraged lay people to pray it too, together or alone.' }),
      el('h2', { class: 'about-heading', text: 'The hours' }),
      el('ul', {}, HOURS.map(([name, old, about]) => el('li', {}, el('strong', { text: name }), ` (${old}). ${about}`))),
      el('p', { text: 'Morning and Evening Prayer are the two hinges of the day, and the best place to begin. Each takes about ten minutes.' })),

    el('section', { class: 'card list-card' },
      el('h3', { class: 'card-heading', text: 'What is here already' }),
      el('p', { class: 'muted', text: 'The heart of Morning, Evening and Night Prayer is a canticle from the Gospel, and the psalms of every hour come from the same Psalter you have in the Bible. A simple morning, evening and night prayer can be made from these, and each can be added to your daily list from its page.' }),
      el('h3', { class: 'list-heading', text: 'Morning' }),
      prayerRow('psalm-95', null, 'The call to prayer that opens the day'),
      prayerRow('psalm-63', null, 'The morning psalm of feasts, and of Sunday in the first week'),
      prayerRow('benedictus', null, 'The canticle of Zechariah'),
      el('h3', { class: 'list-heading', text: 'Evening' }),
      prayerRow('magnificat', null, 'The canticle of Mary'),
      prayerRow('psalm-130', null, 'Out of the depths'),
      el('h3', { class: 'list-heading', text: 'Night' }),
      prayerRow('psalm-91', null, 'The psalm of Sunday’s Night Prayer'),
      prayerRow('nunc-dimittis', null, 'The canticle of Simeon'),
      prayerRow('night-prayer', null, 'The closing prayer of Compline'),
      prayerRow(antiphon, null, 'The antiphon of Our Lady that closes the day in this season'),
      el('button', { class: 'list-row', onclick: () => go('#/pray/examen') },
        el('span', { class: 'row-text' },
          el('span', { class: 'row-title', text: 'Evening examen' }),
          el('span', { class: 'row-sub', text: 'Night Prayer begins with an examination of conscience' })),
        icon('forward', 18))),

    el('article', { class: 'card about-page' },
      el('h2', { class: 'about-heading', text: 'The whole Office' }),
      el('p', { text: 'Biblica does not carry the full Liturgy of the Hours. Its English text (the psalms as well as the prayers) is under copyright, and it changes every day of the year. These offer the Office free to read online:' }),
      el('ul', {},
        el('li', {}, outLink('https://universalis.com/', 'Universalis'), ': every hour for today, each on its own page, in its own translation of the psalms.'),
        el('li', {}, outLink('https://www.ibreviary.com/', 'iBreviary'), ': the breviary and the missal, in several languages.'),
        el('li', {}, outLink('https://divineoffice.org/', 'Divine Office'), ': the hours with recordings to pray along with (for use in the United States).'),
        el('li', {}, outLink('https://www.divinumofficium.com/', 'Divinum Officium'), ': not the current Office but the older Roman Breviary, in Latin and English.')),
      el('p', { class: 'muted small', text: 'These links leave the app and open in your browser. Each site has its own terms and privacy practices.' })),
  );
}
