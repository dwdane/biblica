// view-novenas.js
// Novenas: the list of those under way and finished, starting a new one, and
// the page a novena is prayed from each day.

import { fromIso, parts } from './calendar.js';
import { dayFor, go, goBack, monthName, refresh, today } from './context.js';
import {
  allNovenas, currentDay, daysPrayed, deleteNovena, isFinished, novena as loadNovena, saveNovena, setNovenaPrayed,
  startNovena, traditionalDates,
} from './novenas.js';
import { DEVOTION_NAMES } from './practices.js';
import { findPrayer, listedPrayers, ownPrayers, prayerData, renderPrayer } from './prayers.js';
import { add, celebrate, choice, clear, confirmSheet, el, icon, once, openSheet, toast } from './ui.js';

function niceDate(iso) {
  const { year, month, day, weekday } = parts(fromIso(iso));
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const sameYear = String(year) === today().slice(0, 4);
  return `${names[weekday]}, ${monthName(month)} ${day}${sameYear ? '' : `, ${year}`}`;
}

function dayDots(item) {
  const prayed = daysPrayed(item);
  const row = el('div', { class: `novena-dots${item.days > 12 ? ' many' : ''}`, role: 'img', 'aria-label': `${prayed} of ${item.days} days prayed` });
  for (let number = 1; number <= item.days; number += 1) {
    row.append(el('span', { class: `novena-dot${number <= prayed ? ' done' : ''}` }));
  }
  return row;
}

async function referenceTitle(reference) {
  const [kind, name] = reference.split(':');
  if (kind === 'devotion') return DEVOTION_NAMES[name] || name;
  const prayer = await findPrayer(name);
  return prayer ? prayer.title : null;
}

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------

export async function renderNovenas(container) {
  const now = today();
  const all = await allNovenas();
  const active = all.filter((item) => !isFinished(item));
  const done = all.filter((item) => isFinished(item));

  const activeNode = el('div', {});
  for (const item of active) {
    const upcoming = item.started > now;
    activeNode.append(el('button', { class: 'card card-button', onclick: () => go(`#/pray/novena/${item.id}`) },
      el('span', { class: 'card-heading', text: item.title }),
      item.intention ? el('span', { class: 'novena-intention', text: item.intention }) : null,
      el('span', { class: 'muted small', text: upcoming ? `Begins ${niceDate(item.started)}` : (item.done[now] ? `Day ${daysPrayed(item)} of ${item.days}, prayed today` : `Day ${currentDay(item)} of ${item.days}`) }),
      dayDots(item)));
  }

  const templates = el('div', { class: 'template-list' });
  for (const template of prayerData().novenas) {
    const dates = traditionalDates(template, now);
    templates.append(el('button', { class: 'list-row tall', onclick: () => startSheet(template) },
      el('span', { class: 'row-text' },
        el('span', { class: 'row-title', text: template.name }),
        el('span', { class: 'row-sub', text: template.about }),
        dates ? el('span', { class: 'row-sub', text: dates.underWay ? `Traditionally prayed now, from ${niceDate(dates.start)}` : `Traditionally begun on ${niceDate(dates.start)}` }) : null),
      icon('forward', 18)));
  }

  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => go('#/pray') }, icon('back'), el('span', { text: 'Prayer' }))),
    el('h1', { class: 'page-title', text: 'Novenas' }),
    el('p', { class: 'muted page-intro', text: 'Nine days of prayer for one intention. A novena you start appears on your daily list until it is finished. If you miss a day, simply carry on: the count follows the days you prayed.' }),
    active.length ? [el('h3', { class: 'list-heading', text: 'Under way' }), activeNode] : null,
    el('h3', { class: 'list-heading', text: 'Start a novena' }),
    templates,
    done.length ? [
      el('h3', { class: 'list-heading', text: 'Finished' }),
      done.map((item) => el('button', { class: 'list-row tall', onclick: () => go(`#/pray/novena/${item.id}`) },
        el('span', { class: 'row-text' },
          el('span', { class: 'row-title', text: item.title }),
          item.intention ? el('span', { class: 'row-sub', text: item.intention }) : null,
          el('span', { class: 'row-sub', text: `Finished ${niceDate(item.finished)}` })),
        icon('forward', 18))),
    ] : null,
  );
}

/** Choose the prayers of a novena. Calls onChange with the new list of references. */
async function prayerPicker(chosen, onChange) {
  const own = await ownPrayers();
  openSheet('Prayers for this novena', (close) => {
    const selected = new Set(chosen);
    const filter = el('input', { class: 'field', type: 'search', placeholder: 'Find a prayer', 'aria-label': 'Find a prayer' });
    const listNode = el('div', { class: 'picker-list' });
    const options = [
      ['devotion:rosary', 'The Rosary'],
      ['devotion:stations', 'Stations of the Cross'],
      ...own.map((prayer) => [`prayer:${prayer.id}`, prayer.title]),
      ...listedPrayers().map((prayer) => [`prayer:${prayer.id}`, prayer.title]),
    ];
    function draw() {
      clear(listNode);
      const wanted = filter.value.trim().toLowerCase();
      for (const [reference, title] of options) {
        if (wanted && !title.toLowerCase().includes(wanted)) continue;
        const input = el('input', { type: 'checkbox' });
        input.checked = selected.has(reference);
        input.addEventListener('change', () => (input.checked ? selected.add(reference) : selected.delete(reference)));
        add(listNode, el('label', { class: 'picker-check' }, input, el('span', { text: title })));
      }
    }
    filter.addEventListener('input', draw);
    draw();
    return el('div', { class: 'picker' },
      filter, listNode,
      el('div', { class: 'button-row' },
        el('button', {
          class: 'button',
          onclick: () => {
            close();
            // Keep the order the novena already had, and put new choices after it.
            const kept = chosen.filter((reference) => selected.has(reference));
            const added = options.map(([reference]) => reference).filter((reference) => selected.has(reference) && !kept.includes(reference));
            onChange([...kept, ...added]);
          },
        }, 'Use these prayers')));
  }, { tall: true });
}

export function startSheet(template) {
  const now = today();
  const draft = { prayers: [...template.prayers], started: now };
  openSheet(template.name, (close) => {
    const title = el('input', { class: 'field', type: 'text', 'aria-label': 'Name of the novena' });
    // A novena of the reader's own making is named by the reader, unless whoever opened the sheet suggests a name.
    title.value = template.title ?? (template.id === 'own' ? '' : template.name);
    title.placeholder = 'Name, such as “Novena to Saint Thérèse”';
    const intention = el('textarea', { class: 'field note-field', rows: '3', placeholder: 'What, or whom, are you praying for?', 'aria-label': 'Intention' });
    const days = el('input', { class: 'field short', type: 'number', min: '2', max: '60', inputmode: 'numeric', 'aria-label': 'Number of days' });
    days.value = String(template.days);
    const prayersNode = el('div', { class: 'chosen-prayers' });

    async function drawPrayers() {
      clear(prayersNode);
      const titles = (await Promise.all(draft.prayers.map(referenceTitle))).filter(Boolean);
      prayersNode.append(
        el('p', { class: titles.length ? '' : 'muted', text: titles.length ? titles.join(', ') : 'No prayers chosen yet.' }),
        el('button', { class: 'chip-button', onclick: () => prayerPicker(draft.prayers, (list) => { draft.prayers = list; drawPrayers(); }) }, 'Choose prayers'));
    }
    drawPrayers();

    // When to begin: today, or on the day that ends the novena on the eve of
    // its feast. That day depends on how many days the reader has chosen.
    const startNode = el('div', {});
    const drawStart = () => {
      clear(startNode);
      const count = Math.round(Number(days.value));
      const traditional = count >= 2 && count <= 60 ? traditionalDates(template, now, count) : null;
      if (!traditional || traditional.underWay || traditional.start === now) {
        draft.started = now;
        if (traditional && traditional.underWay) {
          add(startNode, el('p', { class: 'muted small', text: `Traditionally this novena began on ${niceDate(traditional.start)}. Begun today, it simply ends later.` }));
        }
        return;
      }
      if (draft.started !== now) draft.started = traditional.start;
      add(startNode, el('div', { class: 'field-label' }, 'Begin',
        choice([[now, 'Today'], [traditional.start, niceDate(traditional.start)]], draft.started, (date) => { draft.started = date; }, { label: 'When to begin', className: 'segmented wrap' }),
        el('p', { class: 'muted small', text: `Begun on ${niceDate(traditional.start)}, it ends on the eve of the feast.` })));
    };
    days.addEventListener('input', drawStart);
    drawStart();

    const begin = once(async () => {
      if (!title.value.trim()) { title.focus(); return; }
      const count = Math.round(Number(days.value));
      if (!(count >= 2 && count <= 60)) { days.focus(); return; }
      if (!draft.prayers.length) { toast('Choose at least one prayer'); return; }
      const created = await startNovena({ templateId: template.id, title: title.value, intention: intention.value, prayers: draft.prayers, days: count, started: draft.started });
      close();
      toast(draft.started === now ? 'Novena begun' : `Novena set to begin ${niceDate(draft.started)}`);
      go(`#/pray/novena/${created.id}`);
    });

    return [
      el('p', { class: 'muted small', text: template.about }),
      el('label', { class: 'field-label' }, 'Name', title),
      el('label', { class: 'field-label' }, 'Intention', intention),
      el('div', { class: 'field-label' }, 'Prayers', prayersNode),
      el('label', { class: 'field-label inline' }, 'Days', days),
      startNode,
      el('div', { class: 'button-row' },
        el('button', { class: 'button quiet', onclick: close }, 'Cancel'),
        el('button', { class: 'button', onclick: begin }, 'Begin novena')),
    ];
  }, { tall: true });
}

// ---------------------------------------------------------------------------
// One novena
// ---------------------------------------------------------------------------

export async function renderNovena(container, { id }) {
  const item = await loadNovena(id);
  const back = el('header', { class: 'reader-bar' },
    el('button', { class: 'back-button', onclick: () => goBack('#/pray/novenas') }, icon('back'), el('span', { text: 'Back' })));
  if (!item) {
    add(container, back, el('p', { class: 'empty', text: 'That novena is no longer here.' }));
    return;
  }
  const now = today();
  const day = dayFor(now);
  const finishedAlready = isFinished(item);
  const upcoming = item.started > now;
  const prayedToday = Boolean(item.done[now]);

  let status;
  if (finishedAlready) status = `Finished ${niceDate(item.finished)}`;
  else if (upcoming) status = `Begins ${niceDate(item.started)}`;
  else status = `Day ${prayedToday ? daysPrayed(item) : currentDay(item)} of ${item.days}`;

  const body = el('div', { class: 'novena-prayers' });
  for (const reference of item.prayers) {
    const [kind, name] = reference.split(':');
    if (kind === 'devotion') {
      add(body, el('button', { class: 'list-row', onclick: () => go(`#/pray/${name}`) },
        el('span', { class: 'row-text' }, el('span', { class: 'row-title', text: DEVOTION_NAMES[name] || name }), el('span', { class: 'row-sub', text: 'Opens the guided prayer; come back here when you have finished.' })),
        icon('forward', 18)));
      continue;
    }
    const prayer = await findPrayer(name);
    if (!prayer) continue;
    add(body, el('h3', { class: 'passage-heading', text: prayer.title }), await renderPrayer(prayer));
  }

  const actions = el('div', { class: 'prayer-actions' });
  if (!finishedAlready && !upcoming) {
    if (prayedToday) {
      add(actions,
        el('p', { class: 'muted centre', text: `Prayed today. ${item.days - daysPrayed(item)} ${item.days - daysPrayed(item) === 1 ? 'day' : 'days'} to go.` }),
        el('button', { class: 'text-button', onclick: async () => { await setNovenaPrayed(item.id, now, false); refresh(); } }, 'Undo'));
    } else {
      add(actions, el('button', {
        class: 'button wide',
        onclick: once(async () => {
          const updated = await setNovenaPrayed(item.id, now, true);
          if (isFinished(updated)) {
            celebrate({ symbols: ['🕊️', '✨', '🌿'], title: 'Novena complete', sub: updated.title, count: 30 });
          } else {
            celebrate({ season: day.season, title: `Day ${daysPrayed(updated)} of ${updated.days}`, sub: updated.title, count: 14 });
          }
          refresh();
        }),
      }, `Prayed day ${currentDay(item)}`));
    }
  }

  function edit() {
    openSheet('Edit novena', (close) => {
      const title = el('input', { class: 'field', type: 'text', 'aria-label': 'Name' });
      title.value = item.title;
      const intention = el('textarea', { class: 'field note-field', rows: '3', 'aria-label': 'Intention' });
      intention.value = item.intention || '';
      let prayers = [...item.prayers];
      const summary = el('p', { class: 'muted small' });
      const drawSummary = async () => { summary.textContent = (await Promise.all(prayers.map(referenceTitle))).filter(Boolean).join(', ') || 'No prayers chosen.'; };
      drawSummary();
      return [
        el('label', { class: 'field-label' }, 'Name', title),
        el('label', { class: 'field-label' }, 'Intention', intention),
        el('div', { class: 'field-label' }, 'Prayers', summary,
          el('button', { class: 'chip-button', onclick: () => prayerPicker(prayers, (list) => { prayers = list; drawSummary(); }) }, 'Choose prayers')),
        el('div', { class: 'button-row' },
          el('button', {
            class: 'button danger quiet',
            onclick: () => {
              close();
              confirmSheet('Delete this novena?', 'The novena and the days recorded for it will be removed.', 'Delete novena', async () => { await deleteNovena(item.id); toast('Novena deleted'); go('#/pray/novenas'); });
            },
          }, 'Delete'),
          el('button', {
            class: 'button',
            onclick: async () => {
              if (!title.value.trim() || !prayers.length) return;
              await saveNovena({ ...item, title: title.value.trim(), intention: intention.value.trim(), prayers });
              close();
              refresh();
            },
          }, 'Save')),
      ];
    }, { tall: true });
  }

  back.append(el('button', { class: 'icon-button', 'aria-label': 'Edit this novena', onclick: edit }, icon('edit', 22)));
  add(container,
    back,
    el('article', { class: 'chapter prayer-page' },
      el('p', { class: 'rubric', text: status }),
      el('h2', { class: 'chapter-title', text: item.title }),
      dayDots(item),
      item.intention ? el('div', { class: 'intention-block' }, el('p', { class: 'muted small', text: 'For this intention' }), el('p', { text: item.intention })) : null,
      upcoming ? el('p', { class: 'devotion-guide', text: `This novena is set to begin on ${niceDate(item.started)} and will appear on your daily list from then. The prayers are below if you would like to read them now.` }) : null,
      body),
    actions,
  );
}
