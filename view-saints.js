// view-saints.js
// The saints: the reader's own (the list, one saint's page, the sheet for
// adding or changing one) and the directory of all the saints a reader can
// choose from, each with who they were, their feast and their prayers.

import { calendarEntries, dayFor, go, goBack, longDate, monthName, refresh, today } from './context.js';
import { celebrationAccount, celebrationNames } from './days.js';
import { traditionalDates } from './novenas.js';
import { ROLES, allPatrons, deletePatron, feastLabel, nextFeast, nextFeastOf, patron, saintNovenaId, savePatron, shortName } from './patrons.js';
import { settings } from './db.js';
import { findPrayer, prayerData, renderPrayer } from './prayers.js';
import { entryForPatron, loadDirectory, saintById, searchText } from './saintsdir.js';
import { add, choice, clear, confirmSheet, el, icon, keepSaved, once, openSheet, saveState, toast } from './ui.js';
import { startSheet } from './view-novenas.js';

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Add a saint, or change one. `onSaved(record)` runs afterwards. */
export function patronSheet(record, onSaved) {
  const isNew = !record.id;
  const draft = { role: ROLES[0], note: '', key: null, feast: null, ...record };
  const calendar = celebrationNames(calendarEntries());
  openSheet(isNew ? 'Add a saint' : 'Edit', (close) => {
    const name = el('input', { class: 'field', type: 'text', placeholder: 'Saint’s name', autocomplete: 'off', autocapitalize: 'words', 'aria-label': 'Name' });
    name.value = draft.name || '';
    const matches = el('div', { class: 'choice-list' });
    const role = el('input', { class: 'field', type: 'text', placeholder: 'What this saint is to you', 'aria-label': 'What this saint is to you', list: 'patron-roles' });
    role.value = draft.role || '';
    const roles = el('datalist', { id: 'patron-roles' }, ROLES.map((item) => el('option', { value: item })));
    const month = el('select', { class: 'field select', 'aria-label': 'Month of the feast' },
      el('option', { value: '', text: 'Month' }),
      Array.from({ length: 12 }, (_, index) => el('option', { value: String(index + 1), text: monthName(index + 1) })));
    const dayInput = el('input', { class: 'field short', type: 'number', min: '1', max: '31', inputmode: 'numeric', placeholder: 'Day', 'aria-label': 'Day of the feast' });
    const note = el('textarea', { class: 'field note-field', rows: '3', placeholder: 'Why this saint, a favourite saying, a grace you ask for (optional)', 'aria-label': 'Notes' });
    note.value = draft.note || '';

    const showFeast = () => {
      if (draft.feast) {
        const [m, d] = draft.feast.split('-').map(Number);
        month.value = String(m);
        dayInput.value = String(d);
      }
    };
    showFeast();

    const suggest = () => {
      clear(matches);
      const wanted = name.value.trim().toLowerCase();
      if (wanted.length < 3 || draft.key) return;
      const found = calendar.filter((item) => item.name.toLowerCase().includes(wanted)).slice(0, 5);
      for (const item of found) {
        matches.append(el('button', {
          class: 'picker-book',
          onclick: () => {
            draft.key = item.key;
            draft.feast = `${String(item.month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
            name.value = shortName(item.name);
            showFeast();
            clear(matches);
          },
        }, el('span', { text: item.name }), el('span', { class: 'picker-alt', text: `${monthName(item.month)} ${item.day}` })));
      }
    };
    name.addEventListener('input', () => {
      // Typing a different name cuts the tie to the calendar or the list of saints.
      draft.key = null;
      draft.dir = null;
      suggest();
    });

    const save = once(async () => {
      if (!name.value.trim()) { name.focus(); return; }
      const m = Number(month.value);
      const d = Number(dayInput.value);
      let feast = null;
      if (m || dayInput.value) {
        if (!(m >= 1 && m <= 12 && d >= 1 && d <= DAYS_IN_MONTH[m - 1])) { dayInput.focus(); toast('That is not a day of the year'); return; }
        feast = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      const saved = await savePatron({ ...draft, name: name.value, role: role.value, note: note.value, feast });
      close();
      toast(isNew ? `${saved.name} added to your saints` : 'Saved');
      if (onSaved) onSaved(saved);
    });

    return [
      el('label', { class: 'field-label' }, 'Name', name),
      matches,
      el('label', { class: 'field-label' }, 'Yours as', role, roles),
      el('div', { class: 'field-label' }, 'Feast day', el('div', { class: 'inline-form' }, month, dayInput),
        el('span', { class: 'muted small', text: 'Leave empty if you do not know it. Saints chosen from the calendar follow it if their day moves.' })),
      el('label', { class: 'field-label' }, 'Notes', note),
      el('div', { class: 'button-row' },
        el('button', { class: 'button quiet', onclick: close }, 'Cancel'),
        el('button', { class: 'button', onclick: save }, isNew ? 'Add' : 'Save')),
    ];
  }, { tall: true });
}

/**
 * Add a saint: choose from the list of saints, or, for a saint who is not in
 * it, type the name. `onSaved(record)` runs afterwards.
 */
export async function addSaintSheet(onSaved) {
  let saints = [];
  try {
    ({ saints } = await loadDirectory());
  } catch {
    // Without the list, typing the name is still possible.
  }
  openSheet('Add a saint', (close) => {
    const filter = el('input', { class: 'field', type: 'search', placeholder: 'Find a saint, or what they are patron of', autocomplete: 'off', 'aria-label': 'Find a saint' });
    const listNode = el('div', { class: 'picker-list saint-picker' });
    const draw = () => {
      clear(listNode);
      const wanted = filter.value.trim().toLowerCase();
      const shown = (wanted ? saints.filter((item) => searchText(item).includes(wanted)) : saints).slice(0, wanted ? 60 : 400);
      for (const item of shown) {
        add(listNode, el('button', {
          class: 'picker-book',
          onclick: () => {
            close();
            patronSheet({ name: item.name, key: item.key || null, dir: item.id, feast: item.feast || null }, onSaved);
          },
        }, el('span', { class: 'row-text' },
          el('span', { text: item.name }),
          item.patron ? el('span', { class: 'row-sub', text: item.patron }) : null),
        item.feast ? el('span', { class: 'picker-alt', text: feastLabel(item.feast, monthName) }) : null));
      }
      if (!shown.length) add(listNode, el('p', { class: 'muted', text: saints.length ? 'No saint by that name in the list. Add them by name below.' : 'The list of saints could not be loaded. You can add a saint by name.' }));
    };
    filter.addEventListener('input', draw);
    draw();
    return el('div', { class: 'picker' },
      filter,
      listNode,
      el('div', { class: 'button-row' },
        el('button', { class: 'button quiet', onclick: () => { close(); patronSheet({ name: filter.value.trim() }, onSaved); } }, 'Someone not in the list')));
  }, { tall: true });
}

export async function renderSaints(container) {
  const patrons = await allPatrons();
  const now = today();
  const listNode = el('div', {});
  if (!patrons.length) {
    add(listNode, el('p', { class: 'empty', text: 'No saints yet. Add your confirmation saint, your name saint, or any saint you turn to.' }));
  }
  for (const item of patrons) {
    const next = nextFeastOf(item, now, dayFor);
    add(listNode, el('button', { class: 'list-row tall', onclick: () => go(`#/tools/saint/${item.id}`) },
      el('span', { class: 'row-text' },
        el('span', { class: 'row-title', text: item.name }),
        el('span', { class: 'row-sub', text: [item.role, item.feast ? `Feast ${feastLabel(item.feast, monthName)}` : null].filter(Boolean).join(' · ') }),
        next === now ? el('span', { class: 'row-sub feast-today', text: 'Today is the feast' }) : null),
      icon('forward', 18)));
  }
  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => go('#/tools') }, icon('back'), el('span', { text: 'Tools' })),
      el('button', { class: 'chip-button', onclick: () => addSaintSheet((saved) => go(`#/tools/saint/${saved.id}`)) }, 'Add a saint')),
    el('h1', { class: 'page-title', text: 'My saints' }),
    el('p', { class: 'muted page-intro', text: 'The saints who are yours: by confirmation, by name, or by friendship. Their feasts are pointed out on Today when they come, with their novena a few days before.' }),
    listNode,
    el('div', { class: 'button-row' },
      el('button', { class: 'button', onclick: () => addSaintSheet((saved) => go(`#/tools/saint/${saved.id}`)) }, 'Add a saint'),
      el('button', { class: 'button quiet', onclick: () => go('#/tools/directory') }, 'All the saints')),
  );
}

/** A novena template made for a saint, by directory id or calendar key, or null. */
function novenaTemplateFor(entry, key) {
  const templates = (prayerData() && prayerData().novenas) || [];
  // A saint in the list is matched by its own id: a calendar key can be shared (Simon and Jude).
  if (entry) return templates.find((template) => template.saint === entry.id) || null;
  return templates.find((template) => key && template.saintKey === key) || null;
}

/**
 * The prayers that belong to a saint, folded: the collect of the saint's Mass
 * in the Missal of 1962, where there is one, and the prayers of devotion. Null
 * when there are none.
 */
async function saintPrayers(entry) {
  if (!entry) return null;
  const prayers = (await Promise.all((entry.prayers || []).map((prayerId) => findPrayer(prayerId)))).filter(Boolean);
  if (!prayers.length && !entry.collect) return null;
  const language = settings().prayerLanguage;
  const collect = entry.collect ? el('details', { class: 'prayer-include' },
    el('summary', { text: 'The collect of the feast' }),
    el('div', { class: 'prayer-text' },
      language !== 'la' ? el('p', { class: 'prayer-line', text: entry.collect.en }) : null,
      language !== 'en' ? el('p', { class: 'prayer-line latin', lang: 'la', text: entry.collect.la }) : null,
      el('p', { class: 'muted small', text: 'The Church’s prayer on the saint’s day, from the Roman Missal of 1962. Through our Lord Jesus Christ, thy Son, who liveth and reigneth with thee in the unity of the Holy Spirit, God, for ever and ever. Amen.' }))) : null;
  return el('div', { class: 'saint-prayers' },
    el('h3', { class: 'passage-heading', text: prayers.length + (collect ? 1 : 0) > 1 ? 'Prayers' : 'A prayer' }),
    collect,
    await Promise.all(prayers.map(async (prayer) => el('details', { class: 'prayer-include' },
      el('summary', { text: prayer.title }), await renderPrayer(prayer)))));
}

// ---------------------------------------------------------------------------
// The directory
// ---------------------------------------------------------------------------

const remembered = { filter: '', order: 'name' };

export async function renderDirectory(container) {
  let saints;
  try {
    ({ saints } = await loadDirectory());
  } catch {
    add(container,
      el('header', { class: 'reader-bar' }, el('button', { class: 'back-button', onclick: () => goBack('#/tools') }, icon('back'), el('span', { text: 'Back' }))),
      el('p', { class: 'empty', text: 'The list of saints could not be loaded. Check your connection and try again.' }));
    return;
  }
  const mine = await allPatrons();
  const theirs = new Set(mine.flatMap((item) => [item.dir, item.key]).filter(Boolean));
  const filter = el('input', { class: 'field', type: 'search', placeholder: 'Find a saint, or what they are patron of', 'aria-label': 'Find a saint' });
  filter.value = remembered.filter;
  const listNode = el('div', { class: 'library' });
  const now = today();
  const draw = () => {
    clear(listNode);
    remembered.filter = filter.value;
    const wanted = filter.value.trim().toLowerCase();
    const shown = saints.filter((item) => !wanted || searchText(item).includes(wanted));
    const row = (item) => el('button', { class: 'library-row', onclick: () => go(`#/tools/directory/${item.id}`) },
      el('span', { class: 'row-text' },
        el('span', { class: 'row-title', text: item.name }),
        el('span', { class: 'row-sub', text: [item.feast ? feastLabel(item.feast, monthName) : null, item.patron].filter(Boolean).join(' · ') })),
      theirs.has(item.id) || (item.key && theirs.has(item.key)) ? el('span', { class: 'picker-alt', text: 'Yours' }) : icon('forward', 18));
    if (remembered.order === 'feast') {
      // From today through the year.
      const withFeast = shown.filter((item) => item.feast).map((item) => ({ item, next: nextFeast(item.feast, now) })).sort((a, b) => (a.next < b.next ? -1 : 1));
      let month = null;
      for (const { item, next } of withFeast) {
        const label = `${monthName(Number(next.slice(5, 7)))}${next.slice(0, 4) !== now.slice(0, 4) ? ` ${next.slice(0, 4)}` : ''}`;
        if (label !== month) {
          month = label;
          add(listNode, el('h3', { class: 'list-heading', text: label }));
        }
        add(listNode, row(item));
      }
    } else {
      let letter = null;
      for (const item of shown) {
        const initial = (item.sort || item.name).charAt(0).toUpperCase();
        if (initial !== letter) {
          letter = initial;
          add(listNode, el('h3', { class: 'list-heading', text: letter }));
        }
        add(listNode, row(item));
      }
    }
    if (!listNode.children.length) add(listNode, el('p', { class: 'empty', text: 'No saint in the list matches that. You can still add one by name in My saints.' }));
  };
  filter.addEventListener('input', draw);
  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/tools') }, icon('back'), el('span', { text: 'Back' }))),
    el('h1', { class: 'page-title', text: 'All the saints' }),
    el('p', { class: 'muted page-intro', text: 'The saints of the Church’s calendar, and others widely loved. Each page says who they were, what they are patron of, and the prayers that belong to them; where a story is legend, it says so.' }),
    filter,
    choice([['name', 'By name'], ['feast', 'By feast']], remembered.order, (value) => { remembered.order = value; draw(); }, { label: 'Order', className: 'segmented' }),
    listNode);
  draw();
}

export async function renderDirectoryEntry(container, { id }) {
  const back = el('header', { class: 'reader-bar' },
    el('button', { class: 'back-button', onclick: () => goBack('#/tools/directory') }, icon('back'), el('span', { text: 'Back' })));
  let entry = null;
  try {
    entry = await saintById(id);
  } catch {
    add(container, back, el('p', { class: 'empty', text: navigator.onLine
      ? 'The list of saints could not be loaded.'
      : 'You are offline, and the list of saints has not been saved to the device yet.' }));
    return;
  }
  if (!entry) {
    add(container, back, el('p', { class: 'empty', text: 'That saint is not in the list.' }));
    return;
  }
  const now = today();
  const mine = (await allPatrons()).find((item) => item.dir === entry.id || (entry.key && item.key === entry.key));
  const account = entry.key ? celebrationAccount(entry.key) : null;
  const next = entry.feast ? nextFeastOf({ feast: entry.feast, key: entry.key || null }, now, dayFor) : null;
  const own = novenaTemplateFor(entry, entry.key);
  const template = own || (entry.feast ? {
    id: saintNovenaId({ dir: entry.id }),
    name: `Novena to ${entry.name}`,
    title: `Novena to ${entry.name}`,
    about: 'Nine days of prayer through the saint’s intercession, ending on the eve of the feast.',
    days: 9,
    prayers: ['prayer:our-father', 'prayer:hail-mary', 'prayer:glory-be', ...(entry.prayers || []).map((prayerId) => `prayer:${prayerId}`)],
    ends: { before: next.slice(5) },
  } : null);
  add(container,
    back,
    el('article', { class: 'chapter prayer-page' },
      entry.status && entry.status !== 'saint' ? el('p', { class: 'rubric', text: { blessed: 'Blessed', venerable: 'Venerable', suppressed: 'No longer in the calendar' }[entry.status] || '' }) : null,
      el('h2', { class: 'chapter-title', text: entry.name }),
      entry.lived ? el('p', { class: 'chapter-sub', text: entry.lived }) : null,
      next ? el('p', { class: 'chapter-sub', text: `Feast: ${longDate(next, dayFor(next).weekdayName)}${entry.feastNote ? `. ${entry.feastNote}` : ''}` }) : null,
      el('p', { class: 'devotion-guide', text: account ? account.about : entry.about }),
      entry.patron ? el('p', { class: 'muted', text: entry.patron }) : null,
      entry.cautions ? el('p', { class: 'muted small', text: entry.cautions }) : null,
      await saintPrayers(entry),
      el('p', { class: 'prayer-line saint-invocation', text: `${entry.name}, pray for us.` }),
      entry.sources && entry.sources.length ? el('p', { class: 'muted small', text: `Written for this app from: ${entry.sources.join('; ')}.` }) : null),
    el('div', { class: 'prayer-actions' },
      mine
        ? el('button', { class: 'button quiet wide', onclick: () => go(`#/tools/saint/${mine.id}`) }, 'One of your saints')
        : el('button', { class: 'button wide', onclick: () => patronSheet({ name: entry.name, key: entry.key || null, dir: entry.id, feast: entry.feast || null }, (saved) => go(`#/tools/saint/${saved.id}`)) }, 'Add to my saints'),
      template ? el('button', { class: 'button quiet wide', onclick: () => startSheet(template) }, 'Begin a novena') : null),
  );
}

export async function renderSaint(container, { id }) {
  const item = await patron(id);
  const back = el('header', { class: 'reader-bar' },
    el('button', { class: 'back-button', onclick: () => goBack('#/tools/saints') }, icon('back'), el('span', { text: 'Back' })));
  if (!item) {
    add(container, back, el('p', { class: 'empty', text: 'That saint is no longer in your list.' }));
    return;
  }
  const now = today();
  const entry = await entryForPatron(item).catch(() => null);
  const account = item.key ? celebrationAccount(item.key) : null;
  const next = nextFeastOf(item, now, dayFor);
  const own = novenaTemplateFor(entry, item.key);
  const template = own ? { ...own, title: own.name } : item.feast ? {
    id: saintNovenaId(item),
    name: `Novena to ${item.name}`,
    title: `Novena to ${item.name}`,
    about: 'Nine days of prayer through the intercession of your saint, ending on the eve of the feast.',
    days: 9,
    prayers: ['prayer:our-father', 'prayer:hail-mary', 'prayer:glory-be'],
    // The next feast's own day: a feast of 29 February falls on the 28th in most years.
    ends: { before: next.slice(5) },
  } : null;
  const dates = template ? traditionalDates(template, now) : null;

  const note = el('textarea', { class: 'field note-field', rows: '5', placeholder: 'Why this saint, a favourite saying, graces asked and received.', 'aria-label': 'Notes' });
  note.value = item.note || '';
  // Saved a moment after each pause in the writing, and whenever the app is put away.
  let removed = false;
  const status = saveState(item.note ? 'saved' : 'new');
  const saver = keepSaved(async () => {
    const written = note.value.trim();
    if (removed || written === (item.note || '')) return;
    await savePatron({ ...item, note: written });
    // Only once it is safely kept does the record in hand count it as written.
    item.note = written;
  }, 1200, { onState: status.show });
  note.addEventListener('input', () => saver.touch());
  note.addEventListener('blur', () => saver.flush());

  // The sheet starts from what is on the page now, so notes just typed are saved first.
  add(back, el('button', { class: 'icon-button', 'aria-label': 'Edit', onclick: async () => { saver.touch(); await saver.flush(); patronSheet(item, refresh); } }, icon('edit', 22)));
  add(container,
    back,
    el('article', { class: 'chapter prayer-page' },
      item.role ? el('p', { class: 'rubric', text: item.role }) : null,
      el('h2', { class: 'chapter-title', text: item.name }),
      account && account.dates ? el('p', { class: 'chapter-sub', text: account.dates.replace(/ to /g, '–').replace(/about /g, 'c. ') }) : null,
      next ? el('p', { class: 'chapter-sub', text: next === now ? 'Today is the feast.' : `Feast: ${longDate(next, dayFor(next).weekdayName)}${next.slice(0, 4) === now.slice(0, 4) ? '' : `, ${next.slice(0, 4)}`}` }) : null,
      account ? el('p', { class: 'devotion-guide', text: account.about }) : (entry && entry.about ? el('p', { class: 'devotion-guide', text: entry.about }) : null),
      account && account.patron ? el('p', { class: 'muted', text: account.patron }) : (entry && entry.patron ? el('p', { class: 'muted', text: entry.patron }) : null),
      entry && entry.cautions ? el('p', { class: 'muted small', text: entry.cautions }) : null,
      el('label', { class: 'field-label saint-notes' }, 'Your notes', note, status.node),
      await saintPrayers(entry),
      el('p', { class: 'prayer-line saint-invocation', text: `${item.name}, pray for us.` })),
    el('div', { class: 'prayer-actions' },
      template ? el('button', { class: 'button quiet wide', onclick: () => startSheet(template) }, 'Begin a novena') : null,
      dates && !dates.underWay ? el('p', { class: 'muted small centre', text: `To end on the eve of the feast, a novena begins on ${longDate(dates.start, dayFor(dates.start).weekdayName)}.` }) : null,
      el('button', {
        class: 'text-button',
        onclick: () => confirmSheet('Remove this saint?', 'The saint and your notes will be removed from your list.', 'Remove', async () => {
          removed = true;
          await saver.stop();
          await deletePatron(item.id);
          toast(`${item.name} removed`);
          go('#/tools/saints');
        }),
      }, 'Remove from my saints')),
  );
  // What was typed is kept even if the reader leaves without tapping elsewhere first.
  return () => saver.stop();
}
