// view-guided.js
// Two guided prayers that proceed in a few unhurried steps: Lectio Divina
// with a passage of Scripture, and the evening examen.

import { book, formatSpan, verseId, verseOrder, versesFor } from './bible.js';
import { dayFor, go, goBack, readingsOn, refresh, today } from './context.js';
import { db, saveSetting, settings } from './db.js';
import { JOURNAL_FIELDS, hasContent, journalEntry, saveJournal } from './journal.js';
import { guide as findGuide, markByReference } from './practices.js';
import { findPrayer, prayerData, renderPrayer } from './prayers.js';
import { add, celebrate, choice, clear, el, icon, inTurn, keepSaved, toast } from './ui.js';
import { devotionStage, keepAwake, showStepBar } from './view-devotion.js';

// When the day has no Gospel in the app, Lectio falls back to the vine and the branches.
const FALLBACK_PASSAGE = { book: 'JHN', spans: [[15, 1, 15, 11]] };

function stepDots(index, total) {
  const row = el('div', { class: 'step-dots', role: 'img', 'aria-label': `Step ${index + 1} of ${total}` });
  for (let number = 0; number < total; number += 1) {
    row.append(el('span', { class: `step-dot${number < index ? ' done' : ''}${number === index ? ' current' : ''}` }));
  }
  return row;
}

/**
 * A place to write one part of today's journal entry during a guided prayer.
 * What is typed is saved as it is written, and again when the field is left.
 * Returns { node, flush }: call flush() before moving on.
 */
function journalField(entry, field, label, placeholder) {
  const area = el('textarea', { class: 'field note-field', rows: '4', placeholder, 'aria-label': label });
  area.value = entry[field] || '';
  const saver = keepSaved(async () => {
    const written = area.value.trim();
    if (written === (entry[field] || '')) return;
    await saveJournal(entry.id, { [field]: written });
    // Only once it is safely kept does the entry in hand count it as written.
    entry[field] = written;
  }, 600);
  area.addEventListener('input', () => saver.touch());
  area.addEventListener('blur', () => saver.flush());
  return {
    node: el('label', { class: 'field-label journal-field' }, label, area,
      el('span', { class: 'muted small', text: 'Kept in your journal for today.' })),
    // Called when the step is left: saves what is there and stops listening.
    flush: () => { saver.touch(); return saver.stop(); },
  };
}

/** A quiet timer for one step: a bar that fills, and a soft ring on the Next button at the end. */
function quietTimer(minutes, button) {
  if (!minutes) return { node: null, stop: () => {} };
  const fill = el('span', { class: 'timer-fill' });
  const started = Date.now();
  const total = minutes * 60000;
  const interval = setInterval(() => {
    const share = Math.min(1, (Date.now() - started) / total);
    fill.style.width = `${share * 100}%`;
    if (share >= 1) {
      clearInterval(interval);
      button.classList.add('ready');
      if (navigator.vibrate) navigator.vibrate(40);
    }
  }, 1000);
  return {
    node: el('div', { class: 'timer-track', role: 'img', 'aria-label': `A quiet timer of ${minutes} minutes` }, fill),
    stop: () => clearInterval(interval),
  };
}

function paceChoice() {
  return choice([[0, 'Untimed'], [3, '3 min'], [5, '5 min'], [10, '10 min']], settings().lectioMinutes,
    (minutes) => saveSetting('lectioMinutes', minutes), { label: 'Time for each step', className: 'segmented wrap' });
}

/** Today's Gospel as a passage, or the vine and the branches when the day has none in the app. */
function gospelOfTheDay() {
  const gospel = readingsOn(today()).readings.find((reading) => reading.slot === 'gospel');
  return gospel ? { book: gospel.book, spans: gospel.spans, gospel: true } : FALLBACK_PASSAGE;
}

// ---------------------------------------------------------------------------
// Lectio Divina
// ---------------------------------------------------------------------------

function passageFrom({ bookId, chapter, verses }) {
  if (bookId && book(bookId) && chapter) {
    const entry = book(bookId);
    const chapterNumber = Number(chapter);
    if (chapterNumber >= 1 && chapterNumber <= entry.chapters.length) {
      const [first, last] = (verses || '').split('-').map(Number);
      const end = entry.chapters[chapterNumber - 1];
      const from = first >= 1 && first <= end ? first : 1;
      const to = last >= from && last <= end ? last : (first ? from : end);
      return { book: bookId, spans: [[chapterNumber, from, chapterNumber, to]], chosen: true };
    }
  }
  return gospelOfTheDay();
}

export async function renderLectio(container, params) {
  const guide = prayerData().lectio;
  const passage = passageFrom(params);
  const verses = await versesFor(passage.book, passage.spans);
  const label = passage.spans.map((span) => formatSpan(passage.book, span)).join('; ');
  const steps = guide.steps;
  let index = -1; // -1 is the opening page
  let timer = null;
  let responseSaved = false;
  const note = el('textarea', { class: 'field note-field', rows: '5', placeholder: 'A line or two, if you wish. It is saved with your notes on this passage.', 'aria-label': 'Your response' });
  const stage = devotionStage();
  const bar = el('div', {});
  const release = keepAwake();

  function passageNode() {
    return el('div', { class: 'chapter-text lectio-passage', style: { fontSize: `${settings().textSize}px` } },
      verses.map((verse) => el('span', { class: 'verse static' }, el('sup', { class: 'verse-number', text: verse.verse }), el('span', { class: 'verse-body', text: verse.text }))));
  }

  /** Start the quiet timer for a step, if the reader wants one; returns its track or null. */
  function startTimer(button) {
    clearInterval(timer);
    const minutes = settings().lectioMinutes;
    if (!minutes) return null;
    const fill = el('span', { class: 'timer-fill' });
    const started = Date.now();
    const total = minutes * 60000;
    timer = setInterval(() => {
      const share = Math.min(1, (Date.now() - started) / total);
      fill.style.width = `${share * 100}%`;
      if (share >= 1) {
        clearInterval(timer);
        button.classList.add('ready');
        if (navigator.vibrate) navigator.vibrate(40);
      }
    }, 1000);
    return el('div', { class: 'timer-track', role: 'img', 'aria-label': `A quiet timer of ${minutes} minutes` }, fill);
  }

  function draw() {
    clear(stage);
    clearInterval(timer);
    if (index === -1) {
      const pace = paceChoice();
      add(stage,
        el('p', { class: 'rubric', text: passage.gospel ? 'With the Gospel of the day' : 'Praying with Scripture' }),
        el('h2', { class: 'chapter-title', text: 'Lectio Divina' }),
        el('p', { class: 'chapter-sub', text: label }),
        el('p', { class: 'devotion-guide', text: guide.about }),
        el('p', { class: 'devotion-guide', text: 'There are four steps. Take each for as long as it gives you something; a quiet timer can mark the time if you would like one.' }),
        el('div', { class: 'field-label' }, 'Each step', pace),
        renderOpening());
      showStepBar(bar, { canBack: false, onBack: () => {}, onNext: () => move(1), nextLabel: 'Begin' });
      window.scrollTo(0, 0);
      return;
    }
    const step = steps[index];
    const last = index === steps.length - 1;
    const next = showStepBar(bar, {
      canBack: true,
      onBack: () => move(-1),
      onNext: () => (last ? finish() : move(1)),
      nextLabel: last ? 'Amen' : steps[index + 1].title,
    });
    add(stage,
      stepDots(index, steps.length),
      el('p', { class: 'rubric', text: step.latin }),
      el('h2', { class: 'chapter-title', text: step.title }),
      el('p', { class: 'devotion-guide', text: step.text }),
      startTimer(next),
      step.passage ? passageNode() : null,
      step.note ? note : null);
    window.scrollTo(0, 0);
  }

  function renderOpening() {
    const holder = el('div', {});
    findPrayer('come-holy-spirit').then(async (prayer) => {
      if (prayer) holder.append(el('details', { class: 'prayer-include' }, el('summary', { text: 'Begin with: Come, Holy Spirit' }), await renderPrayer(prayer)));
    });
    return holder;
  }

  function move(delta) {
    index = Math.max(-1, Math.min(steps.length - 1, index + delta));
    draw();
  }

  /** Keep what the reader wrote in response, as a note on the passage. */
  async function saveResponse() {
    const text = note.value.trim();
    if (!text || responseSaved) return;
    responseSaved = true;
    const [c1, v1] = passage.spans[0];
    const [, , c2, v2] = passage.spans[passage.spans.length - 1];
    const start = verseId(passage.book, c1, v1);
    const now = new Date().toISOString();
    await db.put('notes', { start, end: verseId(passage.book, c2, v2), text, order: verseOrder(start), created: now, updated: now });
    toast('Your response was saved with your notes');
  }

  async function finish() {
    clearInterval(timer);
    await saveResponse();
    await markByReference('devotion:lectio', today());
    celebrate({ season: dayFor(today()).season, count: 10 });
    clear(bar);
    clear(stage).append(el('section', { class: 'card finished-card' },
      el('h2', { class: 'card-heading large', text: 'Thanks be to God' }),
      el('p', { class: 'muted', text: `Carry one word of ${label} with you through the day.` }),
      el('div', { class: 'button-row' },
        el('button', { class: 'button quiet', onclick: () => go(`#/read/${passage.book}/${passage.spans[0][0]}/${passage.spans[0][1]}`) }, 'Open in the Bible'),
        el('button', { class: 'button', onclick: () => go('#/today') }, 'Back to today'))));
  }

  document.body.classList.add('has-step-bar');
  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/pray') }, icon('back'), el('span', { text: 'Back' }))),
    stage,
    bar,
  );
  draw();
  return () => {
    clearInterval(timer);
    release();
    document.body.classList.remove('has-step-bar');
    // Leaving before the end does not throw away what was written.
    saveResponse();
  };
}

// ---------------------------------------------------------------------------
// The evening examen
// ---------------------------------------------------------------------------

export async function renderExamen(container) {
  const guide = prayerData().examen;
  const steps = guide.steps;
  let index = -1;
  const stage = devotionStage();
  const bar = el('div', {});
  const writing = Boolean(settings().examenJournal);
  // The day the examen was begun is the day it belongs to, even if midnight passes during it.
  const date = today();
  const entry = await journalEntry(date);
  let field = null; // the journal field on the step now shown
  const journalToggle = el('input', { type: 'checkbox' });
  journalToggle.checked = writing;
  journalToggle.addEventListener('change', async () => {
    await saveSetting('examenJournal', journalToggle.checked);
    refresh();
  });

  const leaveStep = async () => {
    if (field) await field.flush();
    field = null;
  };

  const draw = inTurn(async () => {
    await leaveStep();
    clear(stage);
    if (index === -1) {
      add(stage,
        el('p', { class: 'rubric', text: 'At the end of the day' }),
        el('h2', { class: 'chapter-title', text: 'The examen' }),
        el('p', { class: 'devotion-guide', text: guide.about }),
        el('p', { class: 'devotion-guide', text: writing
          ? 'If you wish, write down what you are thankful for and where you saw God at work; it is kept in your journal. What you ask forgiveness for is never written down.'
          : 'Nothing you bring to mind here is written down or kept by the app.' }),
        el('label', { class: 'picker-check' },
          journalToggle,
          el('span', { text: 'Offer to write in my journal' })));
      showStepBar(bar, { canBack: false, onBack: () => {}, onNext: () => move(1), nextLabel: 'Begin' });
      window.scrollTo(0, 0);
      return;
    }
    const step = steps[index];
    const last = index === steps.length - 1;
    add(stage,
      stepDots(index, steps.length),
      el('p', { class: 'rubric', text: `${index + 1} of ${steps.length}` }),
      el('h2', { class: 'chapter-title', text: step.title }),
      el('p', { class: 'devotion-guide', text: step.text }));
    if (step.prayer) {
      const prayer = await findPrayer(step.prayer);
      if (prayer) add(stage, el('details', { class: 'prayer-include', open: true }, el('summary', { text: prayer.title }), await renderPrayer(prayer)));
    }
    if (writing && step.journal) {
      const [, label, placeholder] = JOURNAL_FIELDS.find(([name]) => name === step.journal);
      field = journalField(entry, step.journal, label, placeholder);
      add(stage, field.node);
    }
    showStepBar(bar, {
      canBack: true,
      onBack: () => move(-1),
      onNext: () => (last ? finish() : move(1)),
      nextLabel: last ? 'Amen' : steps[index + 1].title,
    });
    window.scrollTo(0, 0);
  });

  function move(delta) {
    index = Math.max(-1, Math.min(steps.length - 1, index + delta));
    draw();
  }

  async function finish() {
    await leaveStep();
    const kept = hasContent(entry);
    // The journal is only ticked on the daily list if something was written in it.
    await markByReference(kept ? ['devotion:examen', 'journal'] : 'devotion:examen', date);
    celebrate({ season: dayFor(date).season, count: 10 });
    clear(bar);
    clear(stage).append(el('section', { class: 'card finished-card' },
      el('h2', { class: 'card-heading large', text: 'Into thy hands, O Lord' }),
      el('p', { class: 'muted', text: 'May the Lord grant you a quiet night and a perfect end.' }),
      el('div', { class: 'button-row' },
        kept ? el('button', { class: 'button quiet', onclick: () => go(`#/journal/${date}`) }, 'Today’s journal')
          : el('button', { class: 'button quiet', onclick: () => go('#/prayer/night-prayer') }, 'A night prayer'),
        el('button', { class: 'button', onclick: () => go('#/today') }, 'Back to today'))));
  }

  document.body.classList.add('has-step-bar');
  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/pray') }, icon('back'), el('span', { text: 'Back' }))),
    stage,
    bar,
  );
  await draw();
  return () => {
    document.body.classList.remove('has-step-bar');
    // Leaving midway keeps whatever was written.
    leaveStep();
  };
}

// ---------------------------------------------------------------------------
// Other guided prayers, described in data-prayers.json
// ---------------------------------------------------------------------------

/**
 * A guided prayer in steps. Each step has a title and a few words, and may
 * add a prayer from the library, the Gospel of the day, the reader's
 * intentions, a quiet timer, or a place to write in the journal.
 */
export async function renderGuide(container, { id }) {
  const guide = findGuide(id);
  if (!guide) {
    add(container,
      el('header', { class: 'reader-bar' },
        el('button', { class: 'back-button', onclick: () => go('#/pray') }, icon('back'), el('span', { text: 'Prayer' }))),
      el('p', { class: 'empty', text: 'That guided prayer is not in the app.' }));
    return undefined;
  }
  const steps = guide.steps;
  const needsPassage = steps.some((step) => step.passage);
  const passage = needsPassage ? gospelOfTheDay() : null;
  let verses = [];
  if (passage) {
    // Without the passage the prayer still goes on; the step says where to find it.
    verses = await versesFor(passage.book, passage.spans).catch(() => []);
  }
  const label = passage ? passage.spans.map((span) => formatSpan(passage.book, span)).join('; ') : '';
  const intentions = steps.some((step) => step.intentions)
    ? (await db.all('intentions')).filter((item) => !item.answered)
    : [];
  // The day the prayer was begun is the day it belongs to.
  const date = today();
  const entry = await journalEntry(date);
  let index = -1;
  let field = null;
  let timer = { stop: () => {} };
  const stage = devotionStage();
  const bar = el('div', {});
  const release = keepAwake();

  const leaveStep = async () => {
    timer.stop();
    if (field) await field.flush();
    field = null;
  };

  const draw = inTurn(async () => {
    await leaveStep();
    clear(stage);
    if (index === -1) {
      add(stage,
        el('p', { class: 'rubric', text: guide.sub }),
        el('h2', { class: 'chapter-title', text: guide.title }),
        el('p', { class: 'devotion-guide', text: guide.about }),
        guide.timer ? el('div', { class: 'field-label' }, 'A quiet timer for the silent steps', paceChoice()) : null);
      showStepBar(bar, { canBack: false, onBack: () => {}, onNext: () => move(1), nextLabel: 'Begin' });
      window.scrollTo(0, 0);
      return;
    }
    const step = steps[index];
    const last = index === steps.length - 1;
    const next = showStepBar(bar, {
      canBack: true,
      onBack: () => move(-1),
      onNext: () => (last ? finish() : move(1)),
      nextLabel: last ? 'Amen' : steps[index + 1].title,
    });
    add(stage,
      stepDots(index, steps.length),
      el('p', { class: 'rubric', text: `${index + 1} of ${steps.length}` }),
      el('h2', { class: 'chapter-title', text: step.title }),
      el('p', { class: 'devotion-guide', text: step.text }));
    if (step.timer) {
      timer = quietTimer(settings().lectioMinutes, next);
      add(stage, timer.node);
    }
    if (step.passage) {
      add(stage, verses.length
        ? [
          el('p', { class: 'chapter-sub', text: passage.gospel ? `The Gospel of the day, ${label}` : label }),
          el('div', { class: 'chapter-text lectio-passage', style: { fontSize: `${settings().textSize}px` } },
            verses.map((verse) => el('span', { class: 'verse static' }, el('sup', { class: 'verse-number', text: verse.verse }), el('span', { class: 'verse-body', text: verse.text })))),
        ]
        : el('p', { class: 'muted', text: `Read ${label} in your Bible; the passage is not saved on this device yet.` }));
    }
    if (step.intentions) {
      add(stage, intentions.length
        ? el('ul', { class: 'bring-list' }, intentions.map((item) => el('li', { text: item.text })))
        : el('p', { class: 'muted small', text: 'The intentions you keep in the app will be listed here.' }));
    }
    if (step.prayer) {
      const prayer = await findPrayer(step.prayer);
      if (prayer) add(stage, el('details', { class: 'prayer-include', open: true }, el('summary', { text: prayer.title }), await renderPrayer(prayer)));
    }
    if (step.journal) {
      const [, , placeholder] = JOURNAL_FIELDS.find(([name]) => name === step.journal);
      field = journalField(entry, step.journal, step.journalLabel || 'For today', placeholder);
      add(stage, field.node);
    }
    window.scrollTo(0, 0);
  });

  function move(delta) {
    index = Math.max(-1, Math.min(steps.length - 1, index + delta));
    draw();
  }

  async function finish() {
    await leaveStep();
    const wrote = steps.some((step) => step.journal) && hasContent(entry);
    await markByReference(wrote ? [`guide:${guide.id}`, 'journal'] : `guide:${guide.id}`, date);
    celebrate({ season: dayFor(date).season, count: 10 });
    clear(bar);
    clear(stage).append(el('section', { class: 'card finished-card' },
      el('h2', { class: 'card-heading large', text: 'Thanks be to God' }),
      el('p', { class: 'muted', text: 'Go in peace.' }),
      el('div', { class: 'button-row' },
        el('button', { class: 'button quiet', onclick: () => go('#/pray') }, 'Prayer'),
        el('button', { class: 'button', onclick: () => go('#/today') }, 'Back to today'))));
  }

  document.body.classList.add('has-step-bar');
  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/pray') }, icon('back'), el('span', { text: 'Back' }))),
    stage,
    bar,
  );
  await draw();
  return () => {
    release();
    document.body.classList.remove('has-step-bar');
    leaveStep();
  };
}
