// view-guided.js
// Two guided prayers that proceed in a few unhurried steps: Lectio Divina
// with a passage of Scripture, and the evening examen.

import { book, formatSpan, verseId, verseOrder, versesFor } from './bible.js';
import { dayFor, go, goBack, readingsOn, today } from './context.js';
import { db, saveSetting, settings } from './db.js';
import { markByReference } from './practices.js';
import { findPrayer, prayerData, renderPrayer } from './prayers.js';
import { add, celebrate, choice, clear, el, icon, inTurn, toast } from './ui.js';
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
  const gospel = readingsOn(today()).readings.find((reading) => reading.slot === 'gospel');
  return gospel ? { book: gospel.book, spans: gospel.spans, gospel: true } : FALLBACK_PASSAGE;
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
      const pace = choice([[0, 'Untimed'], [3, '3 min'], [5, '5 min'], [10, '10 min']], settings().lectioMinutes,
        (minutes) => saveSetting('lectioMinutes', minutes), { label: 'Time for each step', className: 'segmented wrap' });
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

  const draw = inTurn(async () => {
    clear(stage);
    if (index === -1) {
      add(stage,
        el('p', { class: 'rubric', text: 'At the end of the day' }),
        el('h2', { class: 'chapter-title', text: 'The examen' }),
        el('p', { class: 'devotion-guide', text: guide.about }),
        el('p', { class: 'devotion-guide', text: 'Nothing you bring to mind here is written down or kept by the app.' }));
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
    await markByReference('devotion:examen', today());
    celebrate({ season: dayFor(today()).season, count: 10 });
    clear(bar);
    clear(stage).append(el('section', { class: 'card finished-card' },
      el('h2', { class: 'card-heading large', text: 'Into thy hands, O Lord' }),
      el('p', { class: 'muted', text: 'May the Lord grant you a quiet night and a perfect end.' }),
      el('div', { class: 'button-row' },
        el('button', { class: 'button quiet', onclick: () => go('#/prayer/night-prayer') }, 'A night prayer'),
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
  return () => document.body.classList.remove('has-step-bar');
}
