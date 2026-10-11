// view-passage.js
// Reads a set passage straight through: one of the day's Mass readings, or a
// day's portion of a reading plan. The reader finishes by marking it read.

import { formatSpan, versesFor } from './bible.js';
import { go, longDate, readingsOn, today } from './context.js';
import { db, settings } from './db.js';
import { nextDay, plan as loadPlan, progress as loadProgress, setDayDone } from './plans.js';
import { markByReference } from './practices.js';
import { el, icon, toast } from './ui.js';

/** Render verses as tappable text; tapping one opens it in the Bible. */
async function passageBlock(bookId, spans) {
  const verses = await versesFor(bookId, spans);
  const block = el('div', { class: `chapter-text${settings().verseLayout === 'flow' ? ' flow' : ''}`, style: { fontSize: `${settings().textSize}px` } });
  let lastChapter = null;
  for (const verse of verses) {
    if (lastChapter !== null && verse.chapter !== lastChapter) {
      block.append(el('span', { class: 'chapter-break', text: `Chapter ${verse.chapter}` }));
    }
    lastChapter = verse.chapter;
    block.append(
      el('span', {
        class: 'verse', role: 'link', tabindex: '0',
        'aria-label': `Open verse ${verse.verse} in the Bible`,
        onclick: () => go(`#/read/${bookId}/${verse.chapter}/${verse.verse}`),
        onkeydown: (event) => { if (event.key === 'Enter') go(`#/read/${bookId}/${verse.chapter}/${verse.verse}`); },
      },
      el('sup', { class: 'verse-number', text: verse.verse }),
      el('span', { class: 'verse-body', text: verse.text })),
      ' ');
  }
  return block;
}

function backBar(label, path) {
  return el('header', { class: 'reader-bar' },
    el('button', { class: 'back-button', onclick: () => go(path) }, icon('back'), el('span', { text: label })));
}

// ---------------------------------------------------------------------------
// A Mass reading
// ---------------------------------------------------------------------------

export async function renderReading(container, { date, index, mass }) {
  const iso = date || today();
  const position = Number(index) || 0;
  const massIndex = mass === undefined ? null : Number(mass);
  const found = readingsOn(iso);
  const usingMass = massIndex !== null && found.masses[massIndex];
  const readings = usingMass ? found.masses[massIndex].readings : found.readings;
  const reading = readings[position];
  const home = iso === today() ? '#/today' : `#/today/${iso}`;
  if (!reading) {
    container.append(backBar('Today', home), el('p', { class: 'empty', text: 'That reading is not available.' }));
    return;
  }
  const record = (await db.get('readings', iso)) || { id: iso, done: {} };
  const path = (i, m = massIndex) => `#/reading/${iso}/${i}${m === null ? '' : `/${m}`}`;

  const massPicker = found.masses.length
    ? el('div', { class: 'segmented wrap', role: 'group', 'aria-label': 'Which Mass' },
      found.masses.map((item, i) => el('button', {
        class: `segment${(usingMass ? massIndex : found.masses.length - 1) === i ? ' on' : ''}`,
        onclick: () => go(path(0, i)),
      }, item.label.replace(/^Mass (during the|at) /, '').replace(/ Mass$/, ''))))
    : null;

  const finish = el('button', { class: 'button wide' });
  const isLast = position === readings.length - 1;
  const drawFinish = () => {
    const done = Boolean(record.done[position]) && !usingMass;
    finish.textContent = done ? (isLast ? 'Read. Back to today' : 'Read. Next reading') : 'Mark as read';
    finish.classList.toggle('quiet', done);
  };
  finish.addEventListener('click', async () => {
    if (!usingMass && !record.done[position]) {
      record.done[position] = new Date().toISOString();
      await db.put('readings', record);
      const allDone = readings.every((_, i) => record.done[i]);
      if (allDone) await markByReference('readings', iso);
      drawFinish();
      return;
    }
    go(isLast ? home : path(position + 1));
  });
  drawFinish();

  container.append(
    backBar(iso === today() ? 'Today' : longDate(iso, found.day.weekdayName), home),
    el('article', { class: 'chapter' },
      el('p', { class: 'rubric', text: `${reading.label}${found.title ? `, ${found.title}` : ''}` }),
      el('h2', { class: 'chapter-title', text: reading.citation }),
      el('p', { class: 'chapter-sub', text: found.day.celebration.name }),
      massPicker,
      await passageBlock(reading.book, reading.spans),
      found.approximate || usingMass
        ? el('p', { class: 'muted small', text: 'This citation comes from the Latin lectionary, so a verse or two at either end may differ from your missal.' })
        : null),
    el('nav', { class: 'chapter-nav stacked' },
      finish,
      el('div', { class: 'button-row spread' },
        position > 0 ? el('button', { class: 'button quiet', onclick: () => go(path(position - 1)) }, readings[position - 1].label) : el('span'),
        !isLast ? el('button', { class: 'button quiet', onclick: () => go(path(position + 1)) }, readings[position + 1].label) : el('span'))),
  );
}

// ---------------------------------------------------------------------------
// A day of a reading plan
// ---------------------------------------------------------------------------

export async function renderPlanDay(container, { planId, dayNumber }) {
  const definition = await loadPlan(planId);
  const index = Number(dayNumber) - 1;
  if (!definition || !definition.days[index]) {
    container.append(backBar('Plans', '#/plans'), el('p', { class: 'empty', text: 'That day is not part of this plan.' }));
    return;
  }
  let record = await loadProgress(planId);
  const passages = definition.days[index];
  const blocks = [];
  for (const [bookId, ...span] of passages) {
    blocks.push(
      el('h3', { class: 'passage-heading', text: formatSpan(bookId, span) }),
      await passageBlock(bookId, [span]));
  }

  const finish = el('button', { class: 'button wide' });
  const drawFinish = () => {
    const done = Boolean(record && record.done[index]);
    finish.textContent = done ? 'Done. Go to the next day' : 'Mark day complete';
    finish.classList.toggle('quiet', done);
  };
  finish.addEventListener('click', async () => {
    if (!record || !record.done[index]) {
      record = await setDayDone(planId, index, true);
      await markByReference(`plan:${planId}`, today());
      const upcoming = nextDay(definition, record);
      if (upcoming === -1) toast(`You have read the whole of ${definition.name}. Thanks be to God.`);
      drawFinish();
      return;
    }
    const upcoming = nextDay(definition, record);
    go(upcoming === -1 ? `#/plans/${planId}` : `#/plan/${planId}/${upcoming + 1}`);
  });
  drawFinish();

  container.append(
    backBar(definition.name, `#/plans/${planId}`),
    el('article', { class: 'chapter' },
      el('p', { class: 'rubric', text: definition.name }),
      el('h2', { class: 'chapter-title', text: `Day ${index + 1}` }),
      el('p', { class: 'chapter-sub', text: passages.map(([bookId, ...span]) => formatSpan(bookId, span)).join(', ') }),
      blocks),
    el('nav', { class: 'chapter-nav stacked' },
      finish,
      el('div', { class: 'button-row spread' },
        index > 0 ? el('button', { class: 'button quiet', onclick: () => go(`#/plan/${planId}/${index}`) }, `Day ${index}`) : el('span'),
        index + 1 < definition.days.length ? el('button', { class: 'button quiet', onclick: () => go(`#/plan/${planId}/${index + 2}`) }, `Day ${index + 2}`) : el('span'))),
  );
}

