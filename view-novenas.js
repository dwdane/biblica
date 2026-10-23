// view-novenas.js
// Novenas and other counted devotions: those under way, starting a new one,
// the page each day is prayed from, and arranging a novena's prayers day by
// day.

import { formatSpan, keepBooksOffline, versesFor } from './bible.js';
import { addDays, fromIso, parts } from './calendar.js';
import { go, goBack, monthName, refresh, today } from './context.js';
import { saveSetting, settings } from './db.js';
import {
  addDay, allNovenas, dayOn, deleteNovena, firstDate, isFinished, isUpcoming, lastDate, nextDayOf, novena as loadNovena,
  partsForDay, saveNovena, scheduleOf, setNovenaPrayed, startNovena, stepLabel, traditionalDates,
} from './novenas.js';
import { DEVOTION_NAMES, TIMES } from './practices.js';
import { findPrayer, listedPrayers, ownPrayers, prayerData, renderPrayer } from './prayers.js';
import { add, choice, clear, confirmSheet, el, icon, once, openSheet, toast } from './ui.js';
import { calendarFileSheet } from './view-calendarfile.js';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function niceDate(iso) {
  const { year, month, day, weekday } = parts(fromIso(iso));
  const sameYear = String(year) === today().slice(0, 4);
  return `${WEEKDAYS[weekday]}, ${monthName(month)} ${day}${sameYear ? '' : `, ${year}`}`;
}

/** The template a series was begun from, or null for one of the reader's own. */
export function templateOf(item) {
  const data = prayerData();
  return (data && data.novenas ? data.novenas : []).find((template) => template.id === item.templateId) || null;
}

/** A row of dots, one for each day, the days already past filled. */
function dayDots(item, now) {
  const dates = item.days <= 60 ? Array.from({ length: item.days }, (_, index) => index) : [];
  const reached = dayOn(item, now) || (isFinished(item, now) ? item.days + 1 : (nextDayOf(item, now) || { day: 1 }).day);
  const row = el('div', { class: `novena-dots${item.days > 12 ? ' many' : ''}`, role: 'img', 'aria-label': isFinished(item, now) ? `All ${item.days} days are past` : `Day ${reached} of ${item.days}` });
  for (const index of dates) {
    const number = index + 1;
    row.append(el('span', { class: `novena-dot${number < reached ? ' done' : ''}${number === reached && dayOn(item, now) ? ' current' : ''}` }));
  }
  return row;
}

const TIMES_IN_WORDS = { 2: 'twice', 3: 'three times', 5: 'five times', 7: 'seven times', 9: 'nine times', 24: 'twenty-four times' };

/** A reference and the number of times it is said: "prayer:glory-be x7" is said seven times. */
function splitTimes(reference) {
  const [base, times] = reference.split(' x');
  const count = Number(times) || 1;
  return { base, count, words: count > 1 ? TIMES_IN_WORDS[count] || `${count} times` : '' };
}

async function referenceTitle(reference) {
  const { base, words } = splitTimes(reference);
  const [kind, name] = base.split(':');
  if (kind === 'devotion') return DEVOTION_NAMES[name] || name;
  const prayer = await findPrayer(name);
  if (!prayer) return null;
  return words ? `${prayer.title} (${words})` : prayer.title;
}

/** Where a series stands on a date, in words. */
export function statusLine(item, now) {
  if (isUpcoming(item, now)) return `Begins ${niceDate(firstDate(item))}`;
  if (isFinished(item, now)) return `Ended ${niceDate(lastDate(item))}`;
  const day = dayOn(item, now);
  if (day) return `${stepLabel(item, day)}, today`;
  const next = nextDayOf(item, now);
  return next ? `${stepLabel(item, next.day)}: ${niceDate(next.date)}` : '';
}

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------

/** The templates, sorted into what is coming up, the rest, the longer series and the reader's own. */
function templateGroups(now) {
  const templates = prayerData().novenas;
  const dated = templates.map((template) => ({ template, dates: traditionalDates(template, now) }));
  const soon = dated
    .filter(({ dates }) => dates && (dates.underWay || (fromIso(dates.start) - fromIso(now)) <= 40))
    .sort((a, b) => (a.dates.start < b.dates.start ? -1 : 1));
  const soonIds = new Set(soon.map(({ template }) => template.id));
  const byName = (a, b) => a.template.name.localeCompare(b.template.name);
  const own = (template) => template.group === 'own' || template.id === 'own';
  const longer = (template) => Boolean(template.cadence) || template.days > 12;
  return [
    ['Coming up', soon],
    ['Novenas', dated.filter(({ template }) => !soonIds.has(template.id) && !own(template) && !longer(template)).sort(byName)],
    ['Longer devotions', dated.filter(({ template }) => !soonIds.has(template.id) && !own(template) && longer(template)).sort(byName)],
    ['Your own', dated.filter(({ template }) => own(template))],
  ].filter(([, items]) => items.length);
}

function templateRow({ template, dates }) {
  let when = template.when || null;
  if (dates) when = dates.underWay ? `Traditionally prayed now, until ${niceDate(dates.feast)}` : `Traditionally begun ${niceDate(dates.start)}`;
  return el('button', { class: 'list-row tall', onclick: () => startSheet(template) },
    el('span', { class: 'row-text' },
      el('span', { class: 'row-title', text: template.name }),
      el('span', { class: 'row-sub', text: template.about }),
      when ? el('span', { class: 'row-sub when', text: when }) : null),
    icon('forward', 18));
}

export async function renderNovenas(container) {
  const now = today();
  const all = await allNovenas();
  const current = all.filter((item) => !isFinished(item, now)).sort((a, b) => (firstDate(a) < firstDate(b) ? -1 : 1));
  const ended = all.filter((item) => isFinished(item, now));

  const currentNode = el('div', {});
  for (const item of current) {
    currentNode.append(el('button', { class: 'card card-button', onclick: () => go(`#/pray/novena/${item.id}`) },
      el('span', { class: 'card-heading', text: item.title }),
      item.intention ? el('span', { class: 'novena-intention', text: item.intention }) : null,
      el('span', { class: 'muted small', text: statusLine(item, now) }),
      dayDots(item, now)));
  }

  const filter = el('input', { class: 'field', type: 'search', placeholder: 'Find a novena', 'aria-label': 'Find a novena' });
  const templatesNode = el('div', { class: 'template-list' });
  const drawTemplates = () => {
    clear(templatesNode);
    const wanted = filter.value.trim().toLowerCase();
    let any = false;
    for (const [heading, items] of templateGroups(now)) {
      const shown = items.filter(({ template }) => !wanted || `${template.name} ${template.about}`.toLowerCase().includes(wanted));
      if (!shown.length) continue;
      any = true;
      add(templatesNode, el('h3', { class: 'list-heading', text: heading }), shown.map(templateRow));
    }
    if (!any) add(templatesNode, el('p', { class: 'muted', text: 'No novena by that name. Begin one of your own below, with your own prayers.' }), templateRow({ template: prayerData().novenas.find((item) => item.id === 'own'), dates: null }));
  };
  filter.addEventListener('input', drawTemplates);
  drawTemplates();

  const suggest = el('div', { class: 'setting-row' },
    el('span', { class: 'setting-text' },
      el('span', { text: 'Suggest novenas on Today' }),
      el('span', { class: 'muted small', text: 'A few days before they traditionally begin.' })),
    choice([['all', 'Great feasts and my saints'], ['mine', 'My saints only'], ['off', 'Never']], settings().novenaSuggestions || 'all',
      (value) => saveSetting('novenaSuggestions', value), { label: 'Suggest novenas', className: 'segmented wrap' }));

  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/pray') }, icon('back'), el('span', { text: 'Back' }))),
    el('h1', { class: 'page-title', text: 'Novenas' }),
    el('p', { class: 'muted page-intro', text: 'Nine days of prayer for one intention, as the apostles prayed with Our Lady between the Ascension and Pentecost; and devotions kept over longer, such as the First Fridays. Each day appears under “For today” on its date and leaves when the novena ends. If you miss a day, simply carry on, or add a day at the end.' }),
    current.length ? [el('h3', { class: 'list-heading', text: 'Under way' }), currentNode] : null,
    el('h3', { class: 'list-heading', text: 'Begin a novena' }),
    filter,
    templatesNode,
    el('section', { class: 'card' }, suggest),
    ended.length ? el('details', { class: 'finished-list' },
      el('summary', { text: `Ended (${ended.length})` }),
      ended.map((item) => el('button', { class: 'list-row tall', onclick: () => go(`#/pray/novena/${item.id}`) },
        el('span', { class: 'row-text' },
          el('span', { class: 'row-title', text: item.title }),
          item.intention ? el('span', { class: 'row-sub', text: item.intention }) : null,
          el('span', { class: 'row-sub', text: `Ended ${niceDate(lastDate(item))}` })),
        icon('forward', 18)))) : null,
  );
}

// ---------------------------------------------------------------------------
// Choosing prayers
// ---------------------------------------------------------------------------

/** Choose prayers from the library. Calls onChange with the new list of references. */
async function prayerPicker(chosen, onChange, title = 'Prayers for every day') {
  const own = await ownPrayers();
  openSheet(title, (close) => {
    // A prayer said a number of times keeps its number while it stays chosen.
    const base = (reference) => splitTimes(reference).base;
    const selected = new Set(chosen.map(base));
    const filter = el('input', { class: 'field', type: 'search', placeholder: 'Find a prayer', 'aria-label': 'Find a prayer' });
    const listNode = el('div', { class: 'picker-list' });
    const options = [
      ['devotion:rosary', 'The Rosary'],
      ['devotion:divine-mercy', 'The Chaplet of Divine Mercy'],
      ['devotion:stations', 'Stations of the Cross'],
      ...own.map((prayer) => [`prayer:${prayer.id}`, prayer.title]),
      ...listedPrayers().map((prayer) => [`prayer:${prayer.id}`, prayer.title]),
    ];
    function draw() {
      clear(listNode);
      const wanted = filter.value.trim().toLowerCase();
      for (const [reference, label] of options) {
        if (wanted && !label.toLowerCase().includes(wanted)) continue;
        const input = el('input', { type: 'checkbox' });
        input.checked = selected.has(reference);
        input.addEventListener('change', () => (input.checked ? selected.add(reference) : selected.delete(reference)));
        add(listNode, el('label', { class: 'picker-check' }, input, el('span', { text: label })));
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
            // Keep the order already chosen, and put new choices after it.
            const kept = chosen.filter((reference) => selected.has(base(reference)));
            const added = options.map(([reference]) => reference).filter((reference) => selected.has(reference) && !kept.some((item) => base(item) === reference));
            onChange([...kept, ...added]);
          },
        }, 'Use these prayers')));
  }, { tall: true });
}

// ---------------------------------------------------------------------------
// Beginning a novena
// ---------------------------------------------------------------------------

/**
 * Begin a novena from a template. `template.title` may suggest a name (a
 * saint's own novena); `template.intention` an intention already in mind.
 */
export function startSheet(template) {
  const now = today();
  const draft = { prayers: [...(template.prayers || [])], started: now, time: 'any' };
  const fixedLength = Array.isArray(template.perDay) && template.perDay.length > 0;
  openSheet(template.name, (close) => {
    const title = el('input', { class: 'field', type: 'text', 'aria-label': 'Name of the novena' });
    // One of the reader's own making is named by the reader, unless whoever opened the sheet suggests a name.
    title.value = template.title ?? (template.id === 'own' ? '' : template.name);
    title.placeholder = 'Name, such as “Novena to Saint Thérèse”';
    const intention = el('textarea', { class: 'field note-field', rows: '3', placeholder: 'What, or whom, are you praying for?', 'aria-label': 'Intention' });
    intention.value = template.intention || '';
    const days = el('input', { class: 'field short', type: 'number', min: '2', max: '60', inputmode: 'numeric', 'aria-label': template.stepName ? 'How many' : 'Number of days' });
    days.value = String(template.days);
    days.disabled = fixedLength;
    const prayersNode = el('div', { class: 'chosen-prayers' });
    const dateInput = el('input', { class: 'field', type: 'date', 'aria-label': 'Begin on' });

    async function drawPrayers() {
      clear(prayersNode);
      const titles = (await Promise.all(draft.prayers.map(referenceTitle))).filter(Boolean);
      add(prayersNode,
        el('p', { class: titles.length ? '' : 'muted', text: titles.length ? titles.join(', ') : 'No prayers chosen yet.' }),
        fixedLength ? el('p', { class: 'muted small', text: 'Each day also has its own prayer, shown on that day.' }) : null,
        el('button', { class: 'chip-button', onclick: () => prayerPicker(draft.prayers, (list) => { draft.prayers = list; drawPrayers(); }) }, 'Choose prayers'));
    }
    drawPrayers();

    // When to begin: today, on the traditional day, or on a day the reader picks.
    const startNode = el('div', {});
    const drawStart = () => {
      clear(startNode);
      const count = Math.round(Number(days.value));
      const traditional = count >= 2 && count <= 60 ? traditionalDates(template, now, count) : null;
      const options = [[now, 'Today']];
      if (traditional && !traditional.underWay && traditional.start !== now) options.push([traditional.start, niceDate(traditional.start)]);
      options.push(['pick', 'Another day']);
      if (!options.some(([value]) => value === draft.started) && draft.started !== 'pick') draft.started = traditional && !traditional.underWay ? traditional.start : now;
      dateInput.value = draft.started === 'pick' ? (dateInput.value || now) : draft.started;
      dateInput.hidden = draft.started !== 'pick';
      add(startNode, el('div', { class: 'field-label' }, 'Begin',
        choice(options, draft.started, (value) => { draft.started = value; drawStart(); }, { label: 'When to begin', className: 'segmented wrap' }),
        dateInput,
        traditional && traditional.underWay
          ? el('p', { class: 'muted small', text: `Traditionally this began on ${niceDate(traditional.start)}, to end before the feast on ${niceDate(traditional.feast)}. Begun today, it simply ends a little later.` })
          : null,
        traditional && !traditional.underWay
          ? el('p', { class: 'muted small', text: `Begun on ${niceDate(traditional.start)}, it ends ${template.ends && template.ends.on ? 'on' : 'on the eve of'} the feast, ${niceDate(traditional.feast)}.` })
          : null));
    };
    days.addEventListener('input', drawStart);
    drawStart();

    const begin = once(async () => {
      if (!title.value.trim()) { title.focus(); return; }
      const count = Math.round(Number(days.value));
      if (!(count >= 2 && count <= 60)) { days.focus(); return; }
      if (!draft.prayers.length && !fixedLength) { toast('Choose at least one prayer'); return; }
      const started = draft.started === 'pick' ? dateInput.value : draft.started;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(started || '')) { dateInput.focus(); return; }
      const created = await startNovena({
        templateId: template.id, title: title.value, intention: intention.value, prayers: draft.prayers, days: count,
        started, cadence: template.cadence || null, stepName: template.stepName || null,
      });
      if (draft.time !== 'any') await saveNovena({ ...created, time: draft.time });
      // The passages the novena quotes are kept on the device now, while there is a connection,
      // so that its days can be prayed offline.
      const spans = [...(template.scripture || []), ...(template.perDay || []).flatMap((entry) => entry.scripture || [])];
      keepBooksOffline([...new Set(spans.map(([bookId]) => bookId))]).catch(() => {});
      close();
      // A series kept on certain days (First Fridays) begins on the first of them, which may not be today.
      toast(firstDate(created) === now ? 'Begun. It is on your list for today.' : `It will be on your list from ${niceDate(firstDate(created))}`);
      go(`#/pray/novena/${created.id}`);
    });

    return [
      el('p', { class: 'muted small', text: template.about }),
      template.conditions && template.conditions.length
        ? el('details', { class: 'prayer-include' }, el('summary', { text: 'What is asked' }), el('ul', { class: 'help-do' }, template.conditions.map((line) => el('li', { text: line }))))
        : null,
      el('label', { class: 'field-label' }, 'For this intention', intention),
      el('label', { class: 'field-label' }, 'Name', title),
      el('div', { class: 'field-label' }, 'Prayers each day', prayersNode),
      el('label', { class: 'field-label inline' }, template.stepName ? `How many ${template.stepName.toLowerCase()}s` : 'Days', days),
      startNode,
      el('div', { class: 'field-label' }, 'On your list',
        choice(TIMES, draft.time, (value) => { draft.time = value; }, { label: 'Time of day', className: 'segmented time-grid' })),
      el('div', { class: 'button-row' },
        el('button', { class: 'button quiet', onclick: close }, 'Cancel'),
        el('button', { class: 'button', onclick: begin }, 'Begin')),
    ];
  }, { tall: true });
}

// ---------------------------------------------------------------------------
// One novena
// ---------------------------------------------------------------------------

/** The passages of Scripture for a day, in the Bible's words, each opening the Bible at its place. */
async function scriptureNodes(spans) {
  const nodes = [];
  for (const [bookId, c1, v1, c2, v2] of spans || []) {
    const span = [c1, v1, c2, v2];
    const verses = await versesFor(bookId, [span], { translation: 'drb' }).catch(() => []);
    nodes.push(
      el('h3', { class: 'passage-heading' },
        el('button', { class: 'text-button inline', 'aria-label': `Open ${formatSpan(bookId, span)} in the Bible`, onclick: () => go(`#/read/${bookId}/${c1}/${v1}`) }, formatSpan(bookId, span))),
      verses.length
        ? el('div', { class: 'chapter-text lectio-passage', style: { fontSize: `${settings().textSize}px` } },
          verses.map((verse) => el('span', { class: 'verse static' }, el('sup', { class: 'verse-number', text: verse.verse }), el('span', { class: 'verse-body', text: verse.text }))))
        : el('p', { class: 'muted small', text: 'The passage is not saved on this device yet; it will appear once you are back online.' }));
  }
  return nodes;
}

async function prayerNodes(references) {
  const nodes = [];
  for (const whole of references) {
    const { base: reference, words } = splitTimes(whole);
    const [kind, name] = reference.split(':');
    if (kind === 'devotion') {
      const path = name === 'divine-mercy' ? '#/pray/chaplet/divine-mercy' : `#/pray/${name}`;
      nodes.push(el('button', { class: 'list-row', onclick: () => go(path) },
        el('span', { class: 'row-text' },
          el('span', { class: 'row-title', text: name === 'divine-mercy' ? 'The Chaplet of Divine Mercy' : DEVOTION_NAMES[name] || name }),
          el('span', { class: 'row-sub', text: 'Opens the guided prayer; come back here when you have finished.' })),
        icon('forward', 18)));
      continue;
    }
    const prayer = await findPrayer(name);
    if (!prayer) continue;
    nodes.push(el('h3', { class: 'passage-heading', text: prayer.title }),
      words ? el('p', { class: 'rubric', text: `Said ${words}.` }) : null,
      await renderPrayer(prayer));
  }
  return nodes;
}

export async function renderNovena(container, { id, day: shownDay }) {
  const item = await loadNovena(id);
  const back = el('header', { class: 'reader-bar' },
    el('button', { class: 'back-button', onclick: () => goBack('#/pray/novenas') }, icon('back'), el('span', { text: 'Back' })));
  if (!item) {
    add(container, back, el('p', { class: 'empty', text: 'That novena is no longer here.' }));
    return;
  }
  const now = today();
  const template = templateOf(item);
  const todayNumber = dayOn(item, now);
  const upcoming = isUpcoming(item, now);
  const ended = isFinished(item, now);
  const fallback = todayNumber || (upcoming ? 1 : (ended ? item.days : (nextDayOf(item, now) || { day: 1 }).day));
  const number = Math.min(Math.max(Number(shownDay) || fallback, 1), item.days);
  const date = scheduleOf(item)[number - 1];
  const content = partsForDay(item, number, template);

  // The days, to look at another: one missed, or one still to come.
  const dayChips = el('div', { class: 'chip-row novena-days', role: 'group', 'aria-label': 'Days' },
    Array.from({ length: item.days }, (_, index) => index + 1).map((value) => el('button', {
      class: `chip-button small${value === number ? ' on' : ''}${value === todayNumber ? ' is-today' : ''}`,
      'aria-pressed': value === number ? 'true' : 'false',
      'aria-label': `${stepLabel(item, value)}${value === todayNumber ? ', today' : ''}`,
      onclick: () => go(`#/pray/novena/${item.id}/${value}`),
    }, String(value))));

  const actions = el('div', { class: 'prayer-actions' });
  if (!ended && !upcoming) {
    if (settings().dailyMarks && todayNumber === number) {
      const prayed = Boolean(item.done && item.done[now]);
      add(actions, el('button', {
        class: prayed ? 'text-button' : 'button wide',
        onclick: once(async () => { await setNovenaPrayed(item.id, now, !prayed); refresh(); }),
      }, prayed ? 'Prayed today. Undo' : `Mark ${stepLabel(item, number).toLowerCase()} as prayed`));
    }
    add(actions,
      el('p', { class: 'muted small centre', text: `${stepLabel(item, number)} is ${date === now ? 'today' : niceDate(date)}. The last is ${niceDate(lastDate(item))}.` }),
      item.cadence ? null : el('button', {
        class: 'text-button',
        onclick: () => confirmSheet('Add a day at the end?', `If you missed a day, the novena can run one day longer, to ${niceDate(addDays(lastDate(item), 1))}.`, 'Add a day', async () => { await addDay(item.id); toast('A day was added at the end'); refresh(); }),
      }, 'Missed a day? Add one at the end'));
  }
  add(actions, el('button', { class: 'text-button', onclick: () => calendarFileSheet({ novena: item }) }, 'Add its days to my phone’s calendar'));

  back.append(el('button', { class: 'icon-button', 'aria-label': 'Edit this novena', onclick: () => editSheet(item) }, icon('edit', 22)));
  add(container,
    back,
    el('article', { class: 'chapter prayer-page novena-page' },
      el('p', { class: 'rubric', text: statusLine(item, now) }),
      el('h2', { class: 'chapter-title', text: item.title }),
      dayDots(item, now),
      item.intention
        ? el('button', { class: 'intention-block', onclick: () => editSheet(item, 'intention') },
          el('span', { class: 'muted small', text: 'For this intention' }), el('span', { text: item.intention }))
        : el('button', { class: 'text-button', onclick: () => editSheet(item, 'intention') }, 'Add your intention'),
      item.days > 1 ? dayChips : null,
      el('h3', { class: 'novena-day-title', text: content.title ? `${stepLabel(item, number)}: ${content.title}` : stepLabel(item, number) }),
      content.intention ? el('p', { class: 'devotion-guide novena-day-intention', text: content.intention }) : null,
      content.text ? el('p', { class: 'devotion-guide', text: content.text }) : null,
      content.ownText ? el('div', { class: 'own-day-text' }, content.ownText.split(/\n{2,}/).map((paragraph) => el('p', { text: paragraph }))) : null,
      content.scripture.length ? el('div', { class: 'novena-scripture' }, await scriptureNodes(content.scripture)) : null,
      el('div', { class: 'novena-prayers' }, await prayerNodes(content.prayers)),
      template && template.conditions && template.conditions.length
        ? el('details', { class: 'prayer-include' }, el('summary', { text: 'What is asked' }), el('ul', { class: 'help-do' }, template.conditions.map((line) => el('li', { text: line }))))
        : null,
      template && template.note ? el('p', { class: 'muted small', text: template.note }) : null),
    actions,
  );
}

/** Change the name, intention, prayers and time of a novena, or delete it. */
function editSheet(item, focus = null) {
  openSheet('Edit novena', (close) => {
    const title = el('input', { class: 'field', type: 'text', 'aria-label': 'Name' });
    title.value = item.title;
    const intention = el('textarea', { class: 'field note-field', rows: '3', placeholder: 'What, or whom, are you praying for?', 'aria-label': 'Intention' });
    intention.value = item.intention || '';
    let prayers = [...item.prayers];
    let time = item.time || 'any';
    const summary = el('p', { class: 'muted small' });
    const drawSummary = async () => { summary.textContent = (await Promise.all(prayers.map(referenceTitle))).filter(Boolean).join(', ') || 'None every day.'; };
    drawSummary();
    if (focus === 'intention') setTimeout(() => intention.focus(), 250);
    const save = async () => {
      if (!title.value.trim()) { title.focus(); return false; }
      await saveNovena({ ...item, title: title.value.trim(), intention: intention.value.trim(), prayers, time });
      return true;
    };
    return [
      el('label', { class: 'field-label' }, 'For this intention', intention),
      el('label', { class: 'field-label' }, 'Name', title),
      el('div', { class: 'field-label' }, 'Prayers every day', summary,
        el('button', { class: 'chip-button', onclick: () => prayerPicker(prayers, (list) => { prayers = list; drawSummary(); }) }, 'Choose prayers')),
      el('div', { class: 'field-label' }, 'Day by day',
        el('p', { class: 'muted small', text: 'Choose a different prayer for particular days, or write your own words for a day.' }),
        el('button', { class: 'chip-button', onclick: async () => { if (await save()) { close(); dayByDaySheet({ ...item, title: title.value.trim(), intention: intention.value.trim(), prayers, time }); } } }, 'Arrange day by day')),
      el('div', { class: 'field-label' }, 'On your list',
        choice(TIMES, time, (value) => { time = value; }, { label: 'Time of day', className: 'segmented time-grid' })),
      el('div', { class: 'button-row' },
        el('button', {
          class: 'button danger quiet',
          onclick: () => {
            close();
            confirmSheet('Delete this novena?', 'The novena and anything recorded for it will be removed.', 'Delete', async () => { await deleteNovena(item.id); toast('Novena deleted'); go('#/pray/novenas'); });
          },
        }, 'Delete'),
        el('button', { class: 'button', onclick: async () => { if (await save()) { close(); refresh(); } } }, 'Save')),
    ];
  }, { tall: true });
}

/** The days of a novena, each with the prayers and words the reader chose for it. */
function dayByDaySheet(item) {
  const template = templateOf(item);
  const perDay = JSON.parse(JSON.stringify(item.perDay || {}));
  openSheet('Day by day', (close) => {
    const listNode = el('div', { class: 'day-by-day' });
    const draw = async () => {
      clear(listNode);
      for (let number = 1; number <= item.days; number += 1) {
        const own = perDay[String(number)] || {};
        const fromTemplate = template && Array.isArray(template.perDay) ? template.perDay.find((entry) => entry.day === number) : null;
        const titles = (await Promise.all((own.prayers || []).map(referenceTitle))).filter(Boolean);
        const lines = [
          fromTemplate && fromTemplate.title ? fromTemplate.title : null,
          titles.length ? `Also: ${titles.join(', ')}` : null,
          own.text ? `Your words: ${own.text.slice(0, 60)}${own.text.length > 60 ? '…' : ''}` : null,
        ].filter(Boolean);
        add(listNode, el('button', { class: 'list-row tall', onclick: () => oneDaySheet(number) },
          el('span', { class: 'row-text' },
            el('span', { class: 'row-title', text: stepLabel(item, number).replace(/ of \d+$/, '') }),
            el('span', { class: 'row-sub', text: lines.length ? lines.join(' · ') : 'The prayers of every day' })),
          icon('edit', 18)));
      }
    };
    function oneDaySheet(number) {
      const own = perDay[String(number)] || { prayers: [], text: '' };
      let chosen = [...(own.prayers || [])];
      openSheet(stepLabel(item, number), (closeDay) => {
        const text = el('textarea', { class: 'field note-field', rows: '6', placeholder: 'Your own words for this day: a prayer, a reading, a thought to carry (optional)', 'aria-label': 'Your words for this day' });
        text.value = own.text || '';
        const summary = el('p', { class: 'muted small' });
        const drawSummary = async () => { summary.textContent = (await Promise.all(chosen.map(referenceTitle))).filter(Boolean).join(', ') || 'Nothing besides the prayers of every day.'; };
        drawSummary();
        return [
          el('div', { class: 'field-label' }, 'Prayers for this day', summary,
            el('button', { class: 'chip-button', onclick: () => prayerPicker(chosen, (list) => { chosen = list; drawSummary(); }, `Prayers for ${stepLabel(item, number).toLowerCase()}`) }, 'Choose prayers')),
          el('label', { class: 'field-label' }, 'Your own words', text),
          el('div', { class: 'button-row' },
            el('button', { class: 'button quiet', onclick: closeDay }, 'Cancel'),
            el('button', {
              class: 'button',
              onclick: async () => {
                const entry = { prayers: chosen, text: text.value.trim() };
                if (entry.prayers.length || entry.text) perDay[String(number)] = entry;
                else delete perDay[String(number)];
                await saveNovena({ ...item, perDay });
                item.perDay = perDay;
                closeDay();
                await draw();
              },
            }, 'Keep')),
        ];
      }, { tall: true });
    }
    draw();
    return [
      el('p', { class: 'muted small', text: 'What you choose here is prayed on that day besides the prayers of every day.' }),
      listNode,
      el('div', { class: 'button-row' }, el('button', { class: 'button', onclick: close }, 'Done')),
    ];
  }, { tall: true, onClose: refresh });
}

// ---------------------------------------------------------------------------
// Suggestions, for Today
// ---------------------------------------------------------------------------

/** Remember that a suggestion was set aside for this year's feast. */
export async function dismissSuggestion(templateId, feast) {
  await saveSetting('novenaDismissed', { ...(settings().novenaDismissed || {}), [templateId]: feast });
}

/** The day a suggestion leads to, for the line on Today. */
export function suggestionLine({ template, start, feast, underWay }, now) {
  if (underWay) return `Traditionally begun ${niceDate(start)}, before ${niceDate(feast)}. It can still be begun.`;
  if (start === now) return `Traditionally begun today, to end before ${niceDate(feast)}.`;
  return `Traditionally begun ${niceDate(start)}, to end before ${niceDate(feast)}.`;
}

