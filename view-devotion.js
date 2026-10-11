// view-devotion.js
// Guided devotions prayed step by step: the Rosary, bead by bead, and the
// Stations of the Cross.

import { formatSpan, versesFor } from './bible.js';
import { dayFor, go, goBack, today } from './context.js';
import { saveSetting, settings } from './db.js';
import { ROMAN, rosarySet, rosarySetFor, rosarySets, rosarySteps, stations } from './devotions.js';
import { markByReference } from './practices.js';
import { findPrayer, renderPrayer } from './prayers.js';
import { add, choice, clear, el, icon, inTurn, openSheet, scrollToPosition, sheetIsOpen } from './ui.js';

const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth'];

/** Keep the screen awake while a devotion is open, where the browser allows it. */
export function keepAwake() {
  let lock = null;
  let released = false;
  const request = async () => {
    try {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      const granted = await navigator.wakeLock.request('screen');
      // The reader may have left while the request was pending.
      if (released) granted.release().catch(() => {});
      else lock = granted;
    } catch {
      lock = null;
    }
  };
  document.addEventListener('visibilitychange', request);
  request();
  return () => {
    released = true;
    document.removeEventListener('visibilitychange', request);
    if (lock) lock.release().catch(() => {});
  };
}

/**
 * A passage of Scripture for a mystery or a station. If the book cannot be
 * fetched (offline, and never opened before), the citation is shown alone
 * so that the devotion itself still goes on.
 */
async function scriptureBlock([bookId, ...span]) {
  let text = null;
  try {
    text = (await versesFor(bookId, [span])).map((verse) => verse.text).join(' ');
  } catch (error) {
    console.warn(error);
  }
  return el('div', { class: 'devotion-scripture' },
    el('p', { class: 'rubric', text: formatSpan(bookId, span) }),
    text
      ? el('p', { class: 'scripture-text', text })
      : el('p', { class: 'muted small', text: 'The passage is not saved on this device yet. It will appear once you are back online.' }));
}

/**
 * Put the Back and Next buttons in the bar fixed above the tabs. The bar is
 * rebuilt for every step; if the reader was on one of its buttons (praying
 * from a keyboard, say), the focus is put back on Next.
 */
export function showStepBar(bar, { onBack, onNext, nextLabel, canBack }) {
  const hadFocus = bar.contains(document.activeElement);
  const next = el('button', { class: 'button step-next', onclick: onNext }, nextLabel);
  clear(bar).append(el('div', { class: 'step-bar' },
    el('button', { class: 'icon-button', 'aria-label': 'Previous', disabled: !canBack, onclick: onBack }, icon('back', 24)),
    next));
  if (hadFocus) next.focus({ preventScroll: true });
  return next;
}

/** The part of a guided devotion that changes with each step; read out as it changes. */
export function devotionStage() {
  return el('div', { class: 'devotion-stage', 'aria-live': 'polite' });
}

function languageToggle(onChange) {
  return choice([['en', 'English'], ['la', 'Latin'], ['both', 'Both']], settings().prayerLanguage, async (mode) => {
    await saveSetting('prayerLanguage', mode);
    onChange();
  }, { label: 'Language' });
}

function finished(container, title, line) {
  clear(container).append(
    el('section', { class: 'card finished-card' },
      el('h2', { class: 'card-heading large', text: title }),
      el('p', { class: 'muted', text: line }),
      el('div', { class: 'button-row' },
        el('button', { class: 'button quiet', onclick: () => go('#/pray') }, 'Prayer'),
        el('button', { class: 'button', onclick: () => go('#/today') }, 'Back to today'))));
}

// ---------------------------------------------------------------------------
// The Rosary
// ---------------------------------------------------------------------------

export async function renderRosary(container, { set }) {
  const day = dayFor(today());
  const group = rosarySet(set) || rosarySetFor(day);
  const suggested = rosarySetFor(day);
  let steps = rosarySteps(group);
  const progressKey = `rosary:${group.id}`;
  const saved = settings().devotionProgress;
  let index = saved && saved.key === progressKey && saved.date === today() && saved.step < steps.length ? saved.step : 0;

  const stage = devotionStage();
  const bar = el('div', {});
  const release = keepAwake();
  let finishedNow = false;

  const draw = inTurn(async () => {
    const step = steps[index];
    clear(stage);
    add(stage, decadeMarkers(step.decade));
    add(stage, el('p', { class: 'rubric', text: step.section }));
    if (step.mystery) {
      add(stage,
        el('h2', { class: 'chapter-title', text: step.mystery.title }),
        el('p', { class: 'chapter-sub', text: `Fruit of the mystery: ${step.mystery.fruit.charAt(0).toLowerCase()}${step.mystery.fruit.slice(1)}` }));
      if (settings().rosaryScripture) add(stage, await scriptureBlock(step.mystery.scripture));
    } else {
      const prayer = await findPrayer(step.prayer);
      if (step.mysteryTitle) add(stage, el('p', { class: 'devotion-context', text: step.mysteryTitle }));
      add(stage, el('h2', { class: 'devotion-prayer-title', text: settings().prayerLanguage === 'la' && prayer.latin ? prayer.latin : prayer.title }));
      if (step.of) add(stage, beads(step.bead, step.of, step.hint));
      add(stage, await renderPrayer(prayer));
    }
    const last = index === steps.length - 1;
    showStepBar(bar, {
      canBack: index > 0,
      onBack: () => move(-1),
      onNext: () => (last ? finish() : move(1)),
      nextLabel: last ? 'Amen' : nextLabel(steps[index + 1]),
    });
    scrollToPosition(0);
  });

  function nextLabel(next) {
    if (next.mystery) return 'Next mystery';
    if (next.of) return next.of === 10 ? `Hail Mary ${next.bead} of 10` : `Hail Mary ${next.bead} of 3`;
    return 'Next';
  }

  async function move(delta) {
    if (finishedNow) return;
    const before = steps[index];
    index = Math.max(0, Math.min(steps.length - 1, index + delta));
    // A short buzz marks the end of a decade for those praying with eyes closed.
    if (delta > 0 && before.of === 10 && before.bead === 10 && navigator.vibrate) navigator.vibrate(40);
    await saveSetting('devotionProgress', { key: progressKey, date: today(), step: index });
    await draw();
  }

  async function finish() {
    if (finishedNow) return;
    finishedNow = true;
    await saveSetting('devotionProgress', null);
    await markByReference('devotion:rosary', today());
    clear(bar);
    finished(stage, group.name, 'Pray for us, O holy Mother of God, that we may be made worthy of the promises of Christ.');
  }

  function options() {
    openSheet('The Rosary', (close) => {
      const toggle = (key, label, after) => {
        const input = el('input', { type: 'checkbox', id: `rosary-${key}` });
        input.checked = Boolean(settings()[key]);
        input.addEventListener('change', async () => { await saveSetting(key, input.checked); after(); });
        return el('label', { class: 'setting-row check-row', for: `rosary-${key}` }, el('span', { text: label }), input);
      };
      // Adding or removing the Fatima prayer changes the number of steps:
      // find the same bead again rather than keeping the same step number.
      const rebuild = () => {
        const here = steps[index];
        steps = rosarySteps(group);
        const same = steps.findIndex((step) => step.decade === here.decade && step.prayer === here.prayer && step.bead === here.bead && Boolean(step.mystery) === Boolean(here.mystery));
        const decadeStart = steps.findIndex((step) => step.decade === here.decade);
        index = same >= 0 ? same : Math.max(0, decadeStart);
        draw();
      };
      return [
        el('p', { class: 'muted small', text: `Today’s mysteries are the ${suggested.adjective}. You can pray any of them.` }),
        el('div', { class: 'choice-list' }, rosarySets().map((item) => el('button', {
          class: `picker-book${item.id === group.id ? ' current' : ''}`,
          onclick: () => { close(); go(`#/pray/rosary/${item.id}`); },
        }, el('span', { text: item.name }), item.id === suggested.id ? el('span', { class: 'picker-alt', text: 'Today' }) : null))),
        el('div', { class: 'setting-row' }, el('span', { text: 'Language' }), languageToggle(draw)),
        toggle('rosaryScripture', 'Scripture with each mystery', draw),
        toggle('fatimaPrayer', 'Fatima prayer after each decade', rebuild),
        toggle('luminous', 'Luminous Mysteries on Thursdays', () => {}),
      ];
    });
  }

  // Arrow keys and the space bar move through the beads, for a reader at a
  // keyboard. A key pressed on a button or in a field keeps its usual meaning.
  const onKey = (event) => {
    if (finishedNow || sheetIsOpen() || event.altKey || event.ctrlKey || event.metaKey) return;
    const within = (selector) => Boolean(event.target.closest && event.target.closest(selector));
    if (within('input, textarea, select')) return;
    // Space already presses whatever button has the focus; the arrows mean nothing to a button.
    const forward = event.key === 'ArrowRight' || (event.key === ' ' && !within('button, a, summary'));
    if (forward) { event.preventDefault(); if (index < steps.length - 1) move(1); }
    if (event.key === 'ArrowLeft') move(-1);
  };
  document.body.classList.add('has-step-bar');

  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/pray') }, icon('back'), el('span', { text: 'Back' })),
      el('button', { class: 'place-button', onclick: options }, el('span', { text: group.name.replace(/^The /, '') }), el('span', { class: 'caret', 'aria-hidden': 'true' }))),
    stage,
    bar,
  );
  try {
    await draw();
  } catch (error) {
    release();
    throw error;
  }
  document.addEventListener('keydown', onKey);

  return () => {
    release();
    document.removeEventListener('keydown', onKey);
    document.body.classList.remove('has-step-bar');
  };
}

function decadeMarkers(decade) {
  const row = el('div', { class: 'decade-markers', role: 'img', 'aria-label': decade >= 1 && decade <= 5 ? `Decade ${decade} of 5` : 'Rosary progress' });
  for (let number = 1; number <= 5; number += 1) {
    row.append(el('span', { class: `decade-marker${number < decade ? ' done' : ''}${number === decade ? ' current' : ''}` }));
  }
  return row;
}

function beads(current, total, hint) {
  const row = el('div', { class: 'beads', role: 'img', 'aria-label': `Hail Mary ${current} of ${total}` });
  for (let number = 1; number <= total; number += 1) {
    row.append(el('span', { class: `bead${number < current ? ' done' : ''}${number === current ? ' current' : ''}` }));
  }
  return el('div', { class: 'beads-wrap' }, row, hint ? el('p', { class: 'muted small', text: hint }) : null);
}

// ---------------------------------------------------------------------------
// The Stations of the Cross
// ---------------------------------------------------------------------------

export async function renderStations(container) {
  const list = stations();
  // Page 0 opens the devotion, pages 1 to 14 are the stations, the last closes it.
  const pages = list.length + 2;
  const saved = settings().devotionProgress;
  let index = saved && saved.key === 'stations' && saved.date === today() && saved.step < pages ? saved.step : 0;
  const stage = devotionStage();
  const bar = el('div', {});
  const release = keepAwake();
  const sayTogether = { id: 'station-prayers', title: '', en: [['> our-father', '> hail-mary', '> glory-be']], la: [['> our-father', '> hail-mary', '> glory-be']] };

  const draw = inTurn(async () => {
    clear(stage);
    const ticks = el('div', { class: 'station-ticks', role: 'img', 'aria-label': index >= 1 && index <= list.length ? `Station ${index} of 14` : 'Stations of the Cross' });
    list.forEach((_, number) => ticks.append(el('span', { class: `station-tick${number + 1 < index ? ' done' : ''}${number + 1 === index ? ' current' : ''}` })));
    add(stage, ticks);

    if (index === 0) {
      add(stage,
        el('p', { class: 'rubric', text: 'Before the first station' }),
        el('h2', { class: 'chapter-title', text: 'The Way of the Cross' }),
        el('p', { class: 'devotion-guide', text: 'Walk with Christ from Pilate’s court to the tomb. At each station, pause; read; stay as long as you wish before going on.' }),
        await renderPrayer(await findPrayer('sign-of-the-cross')),
        await renderPrayer(await findPrayer('act-of-contrition')));
    } else if (index <= list.length) {
      const station = list[index - 1];
      add(stage,
        el('p', { class: 'rubric', text: `The ${ORDINALS[index - 1]} Station` }),
        el('div', { class: 'station-head' },
          el('span', { class: 'station-numeral', 'aria-hidden': 'true', text: ROMAN[index - 1] }),
          el('h2', { class: 'chapter-title', text: station.title })),
        await renderPrayer(await findPrayer('adoramus-te')),
        await scriptureBlock(station.scripture),
        await renderPrayer(sayTogether));
    } else {
      add(stage,
        el('p', { class: 'rubric', text: 'After the last station' }),
        el('h2', { class: 'chapter-title', text: 'Closing prayers' }),
        el('p', { class: 'devotion-guide', text: 'It is customary to end with an Our Father, a Hail Mary and a Glory Be for the intentions of the Holy Father.' }),
        await renderPrayer(sayTogether),
        await renderPrayer(await findPrayer('anima-christi')));
    }
    const last = index === pages - 1;
    showStepBar(bar, {
      canBack: index > 0,
      onBack: () => move(-1),
      onNext: () => (last ? finish() : move(1)),
      nextLabel: last ? 'Amen' : (index === 0 ? 'First station' : (index === list.length ? 'Closing prayers' : `${ORDINALS[index]} station`)),
    });
    scrollToPosition(0);
  });

  async function move(delta) {
    index = Math.max(0, Math.min(pages - 1, index + delta));
    await saveSetting('devotionProgress', { key: 'stations', date: today(), step: index });
    await draw();
  }

  async function finish() {
    await saveSetting('devotionProgress', null);
    await markByReference('devotion:stations', today());
    clear(bar);
    finished(stage, 'The Way of the Cross', 'Because by thy holy Cross thou hast redeemed the world.');
  }

  document.body.classList.add('has-step-bar');
  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/pray') }, icon('back'), el('span', { text: 'Back' })),
      languageToggle(draw)),
    stage,
    bar,
  );
  try {
    await draw();
  } catch (error) {
    release();
    throw error;
  }
  return () => {
    release();
    document.body.classList.remove('has-step-bar');
  };
}
