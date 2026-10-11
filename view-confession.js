// view-confession.js
// Preparing for confession: an examination of conscience, a private list of
// what to confess, and a reminder of how the sacrament goes.
//
// What the reader marks or writes here is the most private data in the app.
// It is kept in its own store, left out of backups unless the reader turns
// that on in Settings, and cleared in one step after confession.

import { fromIso } from './calendar.js';
import { goBack, today } from './context.js';
import { db } from './db.js';
import { findPrayer, prayerData, renderPrayer } from './prayers.js';
import { add, clear, confirmSheet, el, icon, keepSaved, saveState, toast } from './ui.js';

const remembered = { tab: 'examine' };

async function loadState() {
  return { id: 'state', lastConfession: null, marked: {}, notes: '', counsel: '', ...((await db.get('conscience', 'state')) || {}) };
}

function since(iso) {
  const days = fromIso(today()) - fromIso(iso);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 70) return `${Math.round(days / 7)} weeks ago`;
  if (days < 731) return `${Math.round(days / 30.4)} months ago`;
  return `${Math.floor(days / 365.25)} years ago`;
}

export async function renderConfession(container) {
  const guide = prayerData();
  let state = await loadState();
  const body = el('div', {});
  const lastNode = el('p', { class: 'muted' });
  const tabs = el('div', { class: 'segmented', role: 'group', 'aria-label': 'Section' });

  const save = async () => { await db.put('conscience', state); };
  const drawLast = () => {
    lastNode.textContent = state.lastConfession ? `Your last confession was ${since(state.lastConfession)}.` : 'The date of your last confession is not recorded here yet.';
  };
  // A mark is kept under the words of its question, so that a later change
  // to the list of questions can never move it onto a different one.
  const questions = guide.examination.sections.flatMap((section) => section.questions);
  const markedCount = () => questions.filter((question) => state.marked[question]).length;

  function examine() {
    clear(body);
    for (const paragraph of guide.examination.intro) add(body, el('p', { class: 'devotion-guide', text: paragraph }));
    add(body, el('button', { class: 'text-button', onclick: () => { window.location.hash = '#/pray/help/scruples'; } }, 'When your conscience will not rest'));
    add(body, el('p', { class: 'muted small', text: 'Tap a question to add it to your list for confession.' }));
    for (const section of guide.examination.sections) {
      const block = el('details', { class: 'exam-section' }, el('summary', { text: section.title }));
      section.questions.forEach((question) => {
        const id = question;
        const button = el('button', {
          class: `exam-question${state.marked[id] ? ' marked' : ''}`, 'aria-pressed': state.marked[id] ? 'true' : 'false',
          onclick: async () => {
            if (state.marked[id]) delete state.marked[id];
            else state.marked[id] = true;
            button.classList.toggle('marked', Boolean(state.marked[id]));
            button.setAttribute('aria-pressed', state.marked[id] ? 'true' : 'false');
            await save();
            drawTabs();
          },
        }, question);
        block.append(button);
      });
      add(body, block);
    }
  }

  function bring() {
    clear(body);
    const marked = questions.filter((question) => state.marked[question]);
    const notes = el('textarea', { class: 'field note-field', rows: '5', placeholder: 'Anything else you want to remember to say', 'aria-label': 'Notes for confession' });
    notes.value = state.notes || '';
    let timer = null;
    let live = true; // false once the list has been erased: nothing typed before may be written back
    const keep = async () => {
      clearTimeout(timer);
      if (!live || !notes.isConnected) return;
      state.notes = notes.value;
      await save();
    };
    const erase = () => {
      live = false;
      clearTimeout(timer);
    };
    notes.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(keep, 400);
    });
    // Leaving the field saves at once, so nothing typed is lost by moving on quickly.
    notes.addEventListener('blur', keep);
    add(body,
      marked.length
        ? el('ul', { class: 'bring-list' }, marked.map((question) => el('li', { text: question })))
        : el('p', { class: 'empty', text: 'Nothing marked yet. Go through the examination and tap what you need to confess.' }),
      notes,
      el('p', { class: 'muted small', text: 'This list stays on this device. It is left out of backups unless you choose otherwise in Settings.' }),
      el('div', { class: 'button-row' },
        (marked.length || state.notes) ? el('button', {
          class: 'button quiet',
          onclick: () => confirmSheet('Clear your list?', 'Everything you marked and wrote on this list will be erased. What you kept from your confessor stays.', 'Clear', async () => { erase(); state.marked = {}; state.notes = ''; await save(); drawTabs(); bring(); }),
        }, 'Clear the list') : null,
        el('button', {
          class: 'button',
          onclick: () => confirmSheet('Record today’s confession?', 'Today will be saved as the date of your last confession, and everything you marked and wrote on this list will be erased. What you kept from your confessor stays.', 'I went to confession', async () => {
            erase();
            // What the confessor advised is kept from one confession to the next; the list is not.
            state = { id: 'state', lastConfession: today(), marked: {}, notes: '', counsel: state.counsel || '' };
            await save();
            toast('Thanks be to God');
            drawLast();
            drawTabs();
            bring();
          }),
        }, 'I went to confession today')));
  }

  /**
   * What the confessor said, kept from one confession to the next: advice, a
   * penance not yet done, something to ask next time. Private, like the list.
   */
  function counsel() {
    clear(body);
    const area = el('textarea', { class: 'field note-field', rows: '7', placeholder: 'Advice you were given, a penance still to do, something to ask next time', 'aria-label': 'From my confessor' });
    area.value = state.counsel || '';
    const status = saveState(state.counsel ? 'saved' : 'new');
    // Kept for the screen as a whole, so that changing tab or leaving saves what was typed last.
    const saver = keepSaved(async () => {
      state.counsel = area.value;
      await save();
    }, 800, { onState: status.show });
    counselSaver = saver;
    area.addEventListener('input', () => saver.touch());
    area.addEventListener('blur', () => saver.flush());
    add(body,
      el('p', { class: 'devotion-guide', text: 'A place to keep what your confessor tells you, so it is not forgotten by the next time. It is not erased when you record a confession.' }),
      area,
      status.node,
      el('p', { class: 'muted small', text: 'This stays on this device, apart from the rest, and is left out of backups unless you choose otherwise in Settings. Biblica is no substitute for a confessor or a spiritual director: take your questions to a priest.' }));
  }

  async function how() {
    clear(body);
    const list = el('ol', { class: 'confession-steps' });
    for (const step of guide.confession.steps) {
      const item = el('li', {}, el('h3', { class: 'step-title', text: step.title }), el('p', { class: 'devotion-guide', text: step.text }));
      if (step.prayer) {
        const prayer = await findPrayer(step.prayer);
        if (prayer) item.append(el('details', { class: 'prayer-include' }, el('summary', { text: prayer.title }), await renderPrayer(prayer)));
      }
      list.append(item);
    }
    add(body, list);
  }

  // The advice being written, if its tab is open: saved before anything replaces it.
  let counselSaver = null;
  async function keepCounsel() {
    const saver = counselSaver;
    counselSaver = null;
    if (saver) await saver.stop();
  }

  const sections = { examine, bring, counsel, how };
  function drawTabs() {
    // The middle tab carries a count, so the row is redrawn when it changes;
    // the focus is put back where it was.
    const focused = [...tabs.children].indexOf(document.activeElement);
    const count = markedCount();
    clear(tabs);
    for (const [id, label] of [['examine', 'Examine'], ['bring', count ? `My list ${count}` : 'My list'], ['counsel', 'Advice'], ['how', 'How to confess']]) {
      const on = remembered.tab === id;
      tabs.append(el('button', {
        class: `segment${on ? ' on' : ''}`, 'aria-pressed': on ? 'true' : 'false',
        onclick: async () => {
          await keepCounsel();
          remembered.tab = id;
          drawTabs();
          sections[id]();
        },
      }, label));
    }
    if (focused >= 0 && tabs.children[focused]) tabs.children[focused].focus({ preventScroll: true });
  }

  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/pray') }, icon('back'), el('span', { text: 'Back' }))),
    el('h1', { class: 'page-title', text: 'Confession' }),
    lastNode,
    tabs,
    body,
  );
  drawLast();
  drawTabs();
  await sections[remembered.tab]();
  return () => keepCounsel();
}
