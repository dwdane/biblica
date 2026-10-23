// view-tools.js
// The Tools tab: what helps a life of prayer without being prayer itself.
// The saints, the sacraments, the days of penance and the indulgences of the
// Church's year, short guides to sacramentals and practices so that they are
// done well, and the library.
//
// Every guide says what a practice is for inwardly as well as how it is
// done, and what it is not: a sacramental is a help to grace, never a charm.

import { formatSpan, versesFor } from './bible.js';
import { dayFor, go, goBack, longDate, today } from './context.js';
import { calendarOptions, saveSetting, settings } from './db.js';
import { isOwnOccasion, loadHelps, nextDateOf } from './helps.js';
import { allPatrons } from './patrons.js';
import { builtInTitle, findPrayer, renderPrayer } from './prayers.js';
import { PENANCE_NOTES } from './penance.js';
import { add, el, icon } from './ui.js';
import { calendarFileSheet } from './view-calendarfile.js';

function row(title, sub, path, iconName = 'forward') {
  return el('button', { class: 'list-row', onclick: () => go(path) },
    el('span', { class: 'row-text' },
      el('span', { class: 'row-title', text: title }),
      sub ? el('span', { class: 'row-sub', text: sub }) : null),
    icon(iconName, 18));
}

function section(title, rows) {
  return el('section', { class: 'card list-card' }, el('h3', { class: 'card-heading', text: title }), rows);
}

function backBar(fallback = '#/tools') {
  return el('header', { class: 'reader-bar' },
    el('button', { class: 'back-button', onclick: () => goBack(fallback) }, icon('back'), el('span', { text: 'Back' })));
}

function unavailable(container) {
  add(container, backBar(), el('p', { class: 'empty', text: navigator.onLine
    ? 'This page could not be loaded.'
    : 'You are offline, and this part of the app has not been saved to the device yet.' }));
}

/** The passages a page cites, in the Bible's words, each opening the Bible. */
async function passagesBlock(spans, heading = 'From Scripture') {
  if (!spans || !spans.length) return null;
  const passages = await Promise.all(spans.map(async ([bookId, c1, v1, c2, v2]) => {
    const span = [c1, v1, c2, v2];
    const verses = await versesFor(bookId, [span], { translation: 'drb' }).catch(() => []);
    return { bookId, span, verses };
  }));
  return [
    el('h3', { class: 'passage-heading', text: heading }),
    passages.map(({ bookId, span, verses }) => el('button', {
      class: 'help-passage',
      onclick: () => go(`#/read/${bookId}/${span[0]}/${span[1]}${span[2] === span[0] && span[3] > span[1] ? `-${span[3]}` : ''}`),
    },
    el('span', { class: 'result-ref', text: formatSpan(bookId, span) }),
    el('span', { class: 'help-verses', text: verses.length ? verses.map((verse) => verse.text).join(' ') : 'Open in the Bible.' }))),
  ];
}

/** Prayers named by id, each folded so the page stays short. */
async function prayersBlock(ids) {
  const prayers = (await Promise.all((ids || []).map((id) => findPrayer(id)))).filter(Boolean);
  if (!prayers.length) return null;
  return [
    el('h3', { class: 'passage-heading', text: prayers.length > 1 ? 'Prayers' : 'A prayer' }),
    await Promise.all(prayers.map(async (prayer) => el('details', { class: 'prayer-include' },
      el('summary', { text: prayer.title }), await renderPrayer(prayer)))),
  ];
}

function sourcesBlock(lines, note) {
  if (!lines || !lines.length) return null;
  return [
    el('h3', { class: 'passage-heading', text: 'Where this comes from' }),
    el('ul', { class: 'help-from muted small' }, lines.map((line) => el('li', { text: line }))),
    note ? el('p', { class: 'muted small', text: note }) : null,
  ];
}

// ---------------------------------------------------------------------------
// The tab itself
// ---------------------------------------------------------------------------

export async function render(container) {
  const patrons = await allPatrons();
  let helps = null;
  try {
    helps = await loadHelps();
  } catch {
    // The rest of the tab works without the guides.
  }
  const guide = (id) => (helps ? helps.guides.find((item) => item.id === id) : null);
  const guideRow = (id) => (guide(id) ? row(guide(id).title, guide(id).sub, `#/tools/guide/${id}`) : null);

  add(container,
    el('header', { class: 'app-header' },
      el('h1', { class: 'app-title', text: 'Tools' }),
      el('button', { class: 'icon-button', 'aria-label': 'Settings', onclick: () => go('#/settings') }, icon('settings', 24))),
    section('The saints', [
      row('My saints', patrons.length ? patrons.map((item) => item.name).slice(0, 3).join(', ') : 'Your confirmation saint, your name saint, your patrons', '#/tools/saints'),
      row('All the saints', 'Who they were, their feasts and their prayers', '#/tools/directory'),
    ]),
    section('The sacraments', [
      row('The Mass', 'Follow along: the ordinary form and the traditional Latin Mass', '#/mass'),
      row('Confession', 'Examination of conscience, and how to confess', '#/tools/confession'),
      guideRow('holy-communion'),
      guideRow('anointing'),
      guideRow('mass-intentions'),
    ]),
    section('The Church’s year', [
      row('Fasting and penance', 'What the Church asks, what is counsel, and notes on Today', '#/tools/fasting'),
      row('Indulgences', 'What they are, the conditions, and the days they are granted', '#/tools/indulgences'),
      row('The Divine Office', 'The prayer of the hours: what it is and where to pray it', '#/tools/office'),
    ]),
    helps ? (helps.groups || []).map((group) => section(group.title, group.guides.map(guideRow))) : null,
    section('Library', [
      row('Reading plans', 'The Bible in a year, the Gospels in ninety days', '#/plans'),
      row('Early Christian writings', 'The Didache, Ignatius, Polycarp and others: not Scripture, but the first Christians’ own words', '#/early'),
    ]),
    helps ? null : el('p', { class: 'muted small', text: 'The guides to sacramentals and practices could not be loaded. They will appear here when the app can fetch them.' }),
  );
}

// ---------------------------------------------------------------------------
// One guide
// ---------------------------------------------------------------------------

export async function renderGuide(container, { id }) {
  let helps;
  try {
    helps = await loadHelps();
  } catch {
    unavailable(container);
    return;
  }
  const page = helps.guides.find((item) => item.id === id);
  if (!page) {
    add(container, backBar(), el('p', { class: 'empty', text: 'That guide is not in the app.' }));
    return;
  }
  const group = (helps.groups || []).find((item) => item.guides.includes(id));
  add(container,
    backBar(),
    el('article', { class: 'chapter help-page guide-page' },
      group ? el('p', { class: 'rubric', text: group.title }) : null,
      el('h2', { class: 'chapter-title', text: page.title }),
      page.sub ? el('p', { class: 'chapter-sub', text: page.sub }) : null,
      (page.what || []).map((paragraph) => el('p', { class: 'devotion-guide', text: paragraph })),
      page.how && page.how.length ? [
        el('h3', { class: 'passage-heading', text: 'How' }),
        el('ul', { class: 'help-do' }, page.how.map((line) => el('li', { text: line }))),
      ] : null,
      page.not && page.not.length ? [
        el('h3', { class: 'passage-heading', text: 'What it is not' }),
        el('ul', { class: 'help-do quiet' }, page.not.map((line) => el('li', { text: line }))),
      ] : null,
      await passagesBlock(page.scripture),
      await prayersBlock(page.prayers),
      page.links && page.links.length
        ? el('div', { class: 'help-links' }, page.links.map((link) => el('button', { class: 'chip-button', onclick: () => go(link.path) }, link.label)))
        : null,
      sourcesBlock(page.from, 'Written for this app from the sources named; the Church’s documents are summarised, not quoted, except where marked.')),
  );
}

// ---------------------------------------------------------------------------
// Indulgences
// ---------------------------------------------------------------------------

/** "Sunday, November 1" for the next day a grant can be gained, or its rule in words. */
function whenLabel(grant, now) {
  const next = nextDateOf(grant, now, calendarOptions());
  if (!next) return null;
  if (next === now) return 'Today';
  return longDate(next, dayFor(next).weekdayName);
}

export async function renderIndulgences(container, { id } = {}) {
  let helps;
  try {
    helps = await loadHelps();
  } catch {
    unavailable(container);
    return;
  }
  const data = helps.indulgences;
  const now = today();
  const dated = data.grants.filter((grant) => grant.days && grant.days.length && !isOwnOccasion(grant))
    .map((grant) => ({ grant, next: nextDateOf(grant, now, calendarOptions()) }))
    .filter((item) => item.next)
    .sort((a, b) => (a.next < b.next ? -1 : 1));
  const own = data.grants.filter(isOwnOccasion);
  const anyDay = data.grants.filter((grant) => !grant.days || !grant.days.length);
  const special = (data.special || []).filter((item) => (!item.to || item.to >= now));

  const grantNode = (grant, when) => el('details', { class: 'grant', id: `grant-${grant.id}` },
    el('summary', {},
      el('span', { class: 'grant-title', text: grant.title }),
      el('span', { class: `grant-kind ${grant.kind}`, text: { plenary: 'Plenary', partial: 'Partial', both: 'Plenary or partial' }[grant.kind] || '' }),
      when ? el('span', { class: 'row-sub', text: when }) : null),
    el('p', { text: grant.work }),
    grant.plenaryWhen ? el('p', {}, el('strong', { text: 'Plenary: ' }), grant.plenaryWhen) : null,
    grant.partialWhen ? el('p', {}, el('strong', { text: 'Partial: ' }), grant.partialWhen) : null,
    (grant.prayers && grant.prayers.length) || (grant.links && grant.links.length)
      ? el('div', { class: 'help-links' },
        (grant.prayers || []).map((prayerId) => el('button', { class: 'chip-button', onclick: () => go(`#/prayer/${prayerId}`) }, builtInTitle(prayerId) || prayerId)),
        (grant.links || []).map((link) => el('button', { class: 'chip-button', onclick: () => go(link.path) }, link.label)))
      : null,
    el('p', { class: 'muted small', text: grant.source }));

  add(container,
    backBar(),
    el('article', { class: 'chapter help-page indulgence-page' },
      el('p', { class: 'rubric', text: 'The Church’s treasury' }),
      el('h2', { class: 'chapter-title', text: 'Indulgences' }),
      data.about.map((paragraph) => el('p', { class: 'devotion-guide', text: paragraph })),
      special.length ? [
        el('h3', { class: 'passage-heading', text: 'At present' }),
        special.map((item) => el('div', { class: 'help-urgent quiet' }, el('p', {}, el('strong', { text: item.title })), el('p', { text: item.text }), el('p', { class: 'muted small', text: item.source }))),
      ] : null,
      el('h3', { class: 'passage-heading', text: 'Who, and how often' }),
      el('ul', { class: 'help-do' }, data.norms.map((line) => el('li', { text: line }))),
      el('h3', { class: 'passage-heading', text: 'For a plenary indulgence' }),
      el('ol', { class: 'conditions' }, data.plenaryConditions.map((item) => el('li', {}, el('strong', { text: item.title }), ` ${item.text}`))),
      el('p', { class: 'devotion-guide', text: data.partialNote }),
      el('h3', { class: 'passage-heading', text: 'In the course of every day' }),
      el('p', { class: 'muted', text: 'These four are granted for the inner life of an ordinary day. They ask nothing but a turning of the heart.' }),
      el('ol', { class: 'conditions' }, data.generalGrants.map((item) => el('li', {}, el('strong', { text: item.title }), ` ${item.text}`))),
      el('h3', { class: 'passage-heading', text: 'On certain days' }),
      dated.map(({ grant, next }) => grantNode(grant, next === now ? 'Today' : whenLabel(grant, now))),
      own.length ? [
        el('h3', { class: 'passage-heading', text: 'On days of your own' }),
        el('p', { class: 'muted', text: 'The feast of your parish church, the anniversary of your baptism: days the app cannot know.' }),
        own.map((grant) => grantNode(grant, null)),
      ] : null,
      el('h3', { class: 'passage-heading', text: 'At any time' }),
      anyDay.map((grant) => grantNode(grant, null)),
      data.misunderstandings && data.misunderstandings.length ? [
        el('h3', { class: 'passage-heading', text: 'What an indulgence is not' }),
        data.misunderstandings.map((item) => el('div', { class: 'misunderstanding' }, el('p', {}, el('strong', { text: item.title })), el('p', { class: 'muted', text: item.text }))),
      ] : null,
      sourcesBlock(data.sources, 'Summarised in the app’s own words from the Church’s documents. For anything that matters to you, ask a priest.')),
  );
  // Arriving from a note on Today or a prayer's page: open that grant and bring it into view.
  const wanted = id ? container.querySelector(`#grant-${CSS.escape(id)}`) : null;
  if (wanted) {
    wanted.open = true;
    setTimeout(() => wanted.scrollIntoView({ block: 'start' }), 0);
  }
}

// ---------------------------------------------------------------------------
// Fasting and penance
// ---------------------------------------------------------------------------

export async function renderFasting(container) {
  let helps;
  try {
    helps = await loadHelps();
  } catch {
    unavailable(container);
    return;
  }
  const data = helps.fasting;
  const chosen = { ...settings().penanceNotes };
  const toggles = el('div', { class: 'setting-list' }, PENANCE_NOTES.map((note) => {
    const input = el('input', { type: 'checkbox', id: `penance-${note.id}` });
    input.checked = chosen[note.id] ?? note.on;
    input.addEventListener('change', async () => {
      chosen[note.id] = input.checked;
      await saveSetting('penanceNotes', { ...settings().penanceNotes, [note.id]: input.checked });
    });
    return el('label', { class: 'setting-row check-row', for: `penance-${note.id}` },
      el('span', { class: 'setting-text' }, el('span', { text: note.label }), el('span', { class: 'muted small', text: note.about })),
      input);
  }));

  add(container,
    backBar(),
    el('article', { class: 'chapter help-page fasting-page' },
      el('p', { class: 'rubric', text: 'Penance' }),
      el('h2', { class: 'chapter-title', text: 'Fasting and penance' }),
      data.about.map((paragraph) => el('p', { class: 'devotion-guide', text: paragraph })),
      el('h3', { class: 'passage-heading', text: 'What the Church asks of everyone' }),
      data.law.map((item) => el('div', { class: 'law-item' }, el('p', {}, el('strong', { text: item.title })), el('p', { text: item.text }), item.who ? el('p', { class: 'muted small', text: item.who }) : null)),
      data.us && data.us.length ? [
        el('h3', { class: 'passage-heading', text: 'In the United States' }),
        data.us.map((item) => el('div', { class: 'law-item' }, el('p', {}, el('strong', { text: item.title })), el('p', { text: item.text }))),
      ] : null,
      data.eucharistic ? [
        el('h3', { class: 'passage-heading', text: data.eucharistic.title }),
        el('p', { class: 'devotion-guide', text: data.eucharistic.text }),
        el('p', { class: 'muted', text: data.eucharistic.excused }),
      ] : null,
      el('h3', { class: 'passage-heading', text: 'Counsel and custom' }),
      el('p', { class: 'muted', text: 'None of these binds. They are offered for those who want them, as the saints kept them.' }),
      data.voluntary.map((item) => el('div', { class: 'law-item' }, el('p', {}, el('strong', { text: item.title }), el('span', { class: 'muted small', text: ` · ${item.standing}` })), el('p', { text: item.text }))),
      el('h3', { class: 'passage-heading', text: 'Health comes first' }),
      el('ul', { class: 'help-do' }, data.health.map((line) => el('li', { text: line }))),
      data.countries && data.countries.length ? [
        el('h3', { class: 'passage-heading', text: 'Elsewhere' }),
        el('ul', { class: 'help-do quiet' }, data.countries.map((item) => el('li', {}, el('strong', { text: `${item.country}. ` }), item.text))),
      ] : null),
    el('section', { class: 'card' },
      el('h3', { class: 'card-heading', text: 'Notes on Today' }),
      el('p', { class: 'muted small', text: 'Choose which days Today should mention. The Church’s own days of fasting and abstinence are always noted.' }),
      toggles,
      el('div', { class: 'daily-footer' },
        el('button', { class: 'text-button', onclick: () => calendarFileSheet({ penance: true }) }, 'Add these days to my phone’s calendar'))),
    el('article', { class: 'chapter help-page' }, sourcesBlock(data.sources)),
  );
}
