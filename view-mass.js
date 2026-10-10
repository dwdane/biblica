// view-mass.js
// The Mass companion: an outline of the liturgy and a text to follow, for
// the ordinary form and for the traditional Latin Mass of 1962.
//
// One long page for each form. At the top is the Mass at a glance; each
// line of it jumps to that part below. Each part says what is happening,
// what posture is usual, and who says what. For the ordinary form the
// people's short responses are given and the longer prayers only by their
// first words (see tools/sources/mass/ordinary.json for why); for the older
// form the whole Order of Mass is given in Latin and English.

import { addDays } from './calendar.js';
import { dayFor, go, goBack, today } from './context.js';
import { saveSetting, settings } from './db.js';
import { creedSaid, gloriaSaid, loadMass } from './mass.js';
import { findPrayer, renderPrayer } from './prayers.js';
import { add, choice, clear, el, icon } from './ui.js';
import { outLink } from './view-about.js';

const POSTURE_NAMES = { stand: 'Stand', sit: 'Sit', kneel: 'Kneel', 'sit-or-kneel': 'Sit or kneel' };
const SPEAKERS = { priest: 'Priest', people: 'People', all: 'All', reader: 'Reader', server: 'Server', deacon: 'Deacon' };

/** Keep the screen from dimming while the page is open; returns a function that lets go. */
function keepAwake() {
  if (!('wakeLock' in navigator)) return () => {};
  let lock = null;
  let stopped = false;
  const hold = async () => {
    if (stopped || document.visibilityState !== 'visible') return;
    try {
      const granted = await navigator.wakeLock.request('screen');
      // The page may have been left while the request was being answered.
      if (stopped) granted.release().catch(() => {});
      else lock = granted;
    } catch {
      // Refused (low battery, say): the screen simply dims as usual.
    }
  };
  document.addEventListener('visibilitychange', hold);
  hold();
  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', hold);
    if (lock) lock.release().catch(() => {});
  };
}

function postureChip(posture) {
  if (!POSTURE_NAMES[posture]) return null;
  return el('span', { class: 'posture', dataset: { posture }, text: POSTURE_NAMES[posture] });
}

/** Something to open and read beneath a line: the Latin and an older translation, or a prayer. */
function more(summary, build) {
  const body = el('div', { class: 'mass-more-body' });
  const details = el('details', { class: 'mass-more' }, el('summary', { text: summary }), body);
  let built = false;
  details.addEventListener('toggle', async () => {
    if (!details.open || built) return;
    built = true;
    add(body, await build());
  });
  return details;
}

async function prayerBlock(id, note) {
  const prayer = await findPrayer(id);
  if (!prayer) return el('p', { class: 'muted small', text: 'This prayer is in the library.' });
  return [
    note || prayer.note ? el('p', { class: 'muted small', text: note || prayer.note }) : null,
    await renderPrayer(prayer, prayer.la ? 'both' : 'en'),
  ];
}

// ---------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------

function ordinaryLine(line, texts) {
  if (line.r) {
    return el('div', { class: 'mass-row' },
      el('p', { class: 'mass-rubric', text: line.r }),
      line.prayer ? more('Show the prayer', () => prayerBlock(line.prayer)) : null);
  }
  const ours = line.w !== 'priest' && line.w !== 'reader';
  const shared = line.ordo ? texts[line.ordo] : null;
  return el('div', { class: `mass-row mass-line${ours ? ' ours' : ''}${line.cue ? ' cue' : ''}` },
    el('span', { class: 'mass-who', text: SPEAKERS[line.w] }),
    el('span', { class: 'mass-words' },
      el('span', { class: 'mass-text', text: line.say || line.cue }),
      line.alt ? el('span', { class: 'mass-alt', lang: 'grc-Latn', text: line.alt }) : null,
      line.note ? el('span', { class: 'mass-note', text: line.note }) : null,
      line.prayer ? more('Latin and an older English translation', () => prayerBlock(line.prayer, line.prayerNote)) : null,
      shared ? more('Latin and an older English translation', () => [
        el('p', { class: 'mass-la', lang: 'la', text: shared.la }),
        el('p', { class: 'mass-en', text: shared.en }),
      ]) : null));
}

function traditionalLine(line, language) {
  if (line.r) return el('p', { class: 'mass-rubric', text: line.r });
  const pair = (item) => [
    language !== 'en' ? el('span', { class: 'mass-la', lang: 'la', text: item.la }) : null,
    language !== 'la' ? el('span', { class: 'mass-en' }, withRubrics(item.en)) : null,
  ];
  if (line.proper) {
    return el('div', { class: 'mass-proper' },
      el('p', { text: line.x }),
      (line.prefaces || []).map((preface) => more(`${preface.title} (${preface.when.charAt(0).toLowerCase()}${preface.when.slice(1)})`, () => el('div', { class: 'mass-words' }, pair(preface)))));
  }
  const ours = line.w === 'server' || line.w === 'all';
  return el('div', { class: `mass-row mass-line${ours ? ' ours' : ''}${line.strong ? ' strong' : ''}` },
    el('span', { class: 'mass-who', text: SPEAKERS[line.w] || '' }),
    el('span', { class: 'mass-words' }, pair(line)));
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

/**
 * Whether the Gloria or the Creed is said, where the calendar can tell: at
 * the Mass of the day, and at an evening Mass that belongs to tomorrow (a
 * Saturday evening, or the eve of a solemnity).
 */
function todayHint(sectionId) {
  const said = sectionId === 'gloria' ? gloriaSaid : (sectionId === 'creed' ? creedSaid : null);
  if (!said) return null;
  const day = dayFor(today());
  const now = said(day);
  if (now === null) return null;
  const tomorrow = dayFor(addDays(today(), 1));
  const eve = tomorrow.weekday === 0 || tomorrow.celebration.type === 'solemnity';
  const later = eve ? said(tomorrow) : null;
  return el('p', { class: `mass-today${now ? ' said' : ''}` },
    now ? `At today’s Mass (${day.celebration.name}) it is said.` : 'At the Mass of the day it is not said.',
    later !== null && later !== now
      ? ` An evening Mass today may be tomorrow’s (${tomorrow.celebration.name}), at which it ${later ? 'is' : 'is not'} said.`
      : null);
}

/** English with its inline rubrics ("(He kisses the altar)") set apart from the words of the prayer. */
function withRubrics(text) {
  return text.split(/(\([^()]*\))/).filter(Boolean).map((piece) => (
    piece.startsWith('(') ? el('span', { class: 'mass-aside', text: piece.slice(1, -1) }) : piece
  ));
}

export async function render(container, { form }) {
  const data = await loadMass();
  const current = settings();
  const chosen = form === 'ordinary' || form === 'traditional' ? form : (current.massForm === 'traditional' ? 'traditional' : 'ordinary');
  if (chosen !== current.massForm) await saveSetting('massForm', chosen);
  const mass = data[chosen];
  const traditional = chosen === 'traditional';
  let kind = current.massKind === 'sung' ? 'sung' : 'low';
  let language = ['la', 'en', 'both'].includes(current.massLanguage) ? current.massLanguage : 'both';

  const body = el('div', { class: 'mass-body' });
  // A part kept only at one kind of Mass (the Asperges, the prayers after Low Mass) has no posture for the other.
  const sectionsOf = (part) => part.sections.filter((section) => !traditional || section.posture[kind] !== null);
  const postureOf = (section) => (traditional ? section.posture[kind] : section.posture);

  function draw() {
    clear(body);
    // --- at a glance
    const outline = el('section', { class: 'card mass-outline', id: 'mass-outline' },
      el('h2', { class: 'card-heading', text: 'The Mass at a glance' }),
      el('p', { class: 'muted small', text: 'Tap any line to go to it.' }));
    for (const part of mass.parts) {
      add(outline, el('h3', { class: 'mass-outline-part', text: part.title }), el('p', { class: 'muted small', text: part.about }));
      const list = el('ol', { class: 'mass-outline-list' });
      for (const section of sectionsOf(part)) {
        list.append(el('li', {}, el('button', {
          class: 'mass-outline-row',
          onclick: () => { const target = document.getElementById(`mass-${section.id}`); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
        }, el('span', { class: 'mass-outline-title', text: section.title }), postureChip(postureOf(section)))));
      }
      add(outline, list);
    }
    add(body, outline);

    // --- good to know
    add(body, el('section', { class: 'card mass-notes' },
      el('h2', { class: 'card-heading', text: 'Before you begin' }),
      mass.notes.map((note) => el('p', { text: note })),
      mass.link ? el('p', {}, outLink(mass.link.address, mass.link.label)) : null));

    // --- the Mass itself
    for (const part of mass.parts) {
      add(body, el('div', { class: 'mass-part' },
        el('h2', { class: 'mass-part-title', text: part.title }),
        el('p', { class: 'muted', text: part.about })));
      for (const section of sectionsOf(part)) {
        const lines = el('div', { class: 'mass-lines' });
        for (const line of section.lines) lines.append(traditional ? traditionalLine(line, language) : ordinaryLine(line, data.texts));
        add(body, el('section', { class: 'card mass-section', id: `mass-${section.id}` },
          el('div', { class: 'mass-head' },
            el('h3', { class: 'mass-title' }, section.title, section.latin && section.latin !== section.title ? el('span', { class: 'mass-latin-name', lang: 'la', text: section.latin }) : null),
            postureChip(postureOf(section))),
          section.when ? el('p', { class: 'mass-when', text: section.when }) : null,
          traditional ? null : todayHint(section.id),
          el('p', { class: 'mass-about', text: section.about }),
          section.note ? el('p', { class: 'muted small', text: section.note }) : null,
          section.readings ? el('button', { class: 'text-button', onclick: () => go(`#/reading/${today()}/0`) }, 'Today’s readings') : null,
          section.lines.length ? lines : null));
      }
    }
    add(body,
      el('p', { class: 'muted small mass-credit', text: mass.credit }),
      el('button', { class: 'text-button', onclick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) }, 'Back to the top'));
  }

  const controls = traditional
    ? el('div', { class: 'mass-controls' },
      choice([['low', 'Low Mass'], ['sung', 'Sung Mass']], kind, async (value) => { kind = value; await saveSetting('massKind', value); draw(); }, { label: 'Kind of Mass', className: 'segmented' }),
      choice([['both', 'Latin and English'], ['la', 'Latin'], ['en', 'English']], language, async (value) => { language = value; await saveSetting('massLanguage', value); draw(); }, { label: 'Language', className: 'segmented' }))
    : null;

  let release = () => {};
  const wakeRow = 'wakeLock' in navigator ? (() => {
    const input = el('input', { type: 'checkbox', id: 'mass-wake' });
    input.checked = current.massWake !== false;
    input.addEventListener('change', async () => {
      await saveSetting('massWake', input.checked);
      release();
      release = input.checked ? keepAwake() : () => {};
    });
    if (input.checked) release = keepAwake();
    return el('label', { class: 'setting-row check-row mass-wake', for: 'mass-wake' },
      el('span', { class: 'setting-text' }, el('span', { text: 'Keep the screen on' }), el('span', { class: 'muted small', text: 'While this page is open.' })),
      input);
  })() : null;

  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/pray') }, icon('back'), el('span', { text: 'Back' }))),
    el('h1', { class: 'page-title', text: 'The Mass' }),
    choice([['ordinary', 'Ordinary form'], ['traditional', 'Traditional Latin']], chosen, (value) => go(`#/mass/${value}`), { label: 'Form of the Mass', className: 'segmented' }),
    el('p', { class: 'muted page-intro mass-intro', text: mass.intro }),
    !traditional ? el('p', { class: 'muted small mass-credit', text: mass.credit }) : null,
    controls,
    wakeRow,
    body);
  draw();
  return () => release();
}
