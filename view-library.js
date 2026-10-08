// view-library.js
// The prayer library, a single prayer's page, and the editor for the
// reader's own prayers.

import { dayFor, go, goBack, refresh, today } from './context.js';
import { saveSetting, settings } from './db.js';
import { dropPrayerFromNovenas } from './novenas.js';
import { endByReference, isOnList, markByReference, openEntryFor } from './practices.js';
import {
  categories, deleteOwnPrayer, findPrayer, hasLatin, isFavourite, listedPrayers, ownPrayers, plainText,
  renderPrayer, saveOwnPrayer, toggleFavourite,
} from './prayers.js';
import { add, celebrate, choice, clear, confirmSheet, el, icon, once, openSheet, toast } from './ui.js';
import { addReference } from './view-daily.js';

const remembered = { filter: '' };

export async function renderLibrary(container) {
  const own = await ownPrayers();
  const builtIn = listedPrayers();
  const filter = el('input', { class: 'field', type: 'search', placeholder: 'Find a prayer by name or by its words', 'aria-label': 'Find a prayer' });
  filter.value = remembered.filter;
  const listNode = el('div', { class: 'library' });

  const row = (prayer) => el('button', { class: 'library-row', onclick: () => go(`#/prayer/${prayer.id}`) },
    el('span', { class: 'row-text' },
      el('span', { class: 'row-title', text: prayer.title }),
      prayer.latin && prayer.latin !== prayer.title ? el('span', { class: 'row-sub latin', text: prayer.latin }) : null),
    icon('forward', 18));

  function draw() {
    clear(listNode);
    const wanted = filter.value.trim().toLowerCase();
    remembered.filter = filter.value;
    const matches = (prayer) => !wanted || plainText(prayer).includes(wanted);
    const section = (title, prayers) => {
      if (!prayers.length) return;
      add(listNode, el('h3', { class: 'list-heading', text: title }), ...prayers.map(row));
    };
    const favourites = [...own, ...builtIn].filter((prayer) => isFavourite(prayer.id) && matches(prayer));
    if (!wanted) section('Favourites', favourites);
    section('Your own prayers', own.filter(matches));
    for (const category of categories()) {
      section(category.name, builtIn.filter((prayer) => prayer.category === category.id && matches(prayer)));
    }
    if (!listNode.children.length) {
      add(listNode, el('p', { class: 'empty', text: 'No prayer matches that. If it is one you know, you can add it yourself.' }));
    }
  }
  filter.addEventListener('input', draw);

  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => go('#/pray') }, icon('back'), el('span', { text: 'Prayer' })),
      el('button', { class: 'chip-button', onclick: () => ownPrayerSheet(null, (id) => go(`#/prayer/${id}`)) }, 'Add your own')),
    el('h1', { class: 'page-title', text: 'Prayers' }),
    filter,
    listNode,
  );
  draw();
}

export async function renderPrayerPage(container, { id }) {
  const prayer = await findPrayer(id);
  if (!prayer) {
    add(container,
      el('header', { class: 'reader-bar' },
        el('button', { class: 'back-button', onclick: () => go('#/pray/library') }, icon('back'), el('span', { text: 'Prayers' }))),
      el('p', { class: 'empty', text: 'That prayer is no longer in your library.' }));
    return;
  }
  const reference = `prayer:${prayer.id}`;
  // In Easter an Angelus entry on the list stands for the Regina Caeli, so
  // this page then answers for both.
  const listReferences = prayer.id === 'regina-caeli' && dayFor(today()).season === 'easter' ? [reference, 'prayer:angelus'] : [reference];
  const textNode = el('div', {});
  const actions = el('div', { class: 'prayer-actions' });
  const star = el('button', { class: 'icon-button', 'aria-label': 'Favourite' }, icon('star', 24));

  async function drawText() {
    clear(textNode).append(await renderPrayer(prayer));
  }

  const drawStar = () => {
    const on = isFavourite(prayer.id);
    star.classList.toggle('on', on);
    star.setAttribute('aria-pressed', on ? 'true' : 'false');
  };
  star.addEventListener('click', async () => {
    const on = await toggleFavourite(prayer.id);
    drawStar();
    toast(on ? 'Added to favourites' : 'Removed from favourites');
  });
  drawStar();

  async function drawActions() {
    clear(actions);
    const open = await openEntryFor(listReferences, today());
    const onList = await isOnList(listReferences);
    if (open) {
      add(actions, el('button', {
        class: 'button wide',
        onclick: once(async () => {
          await markByReference(listReferences, today());
          celebrate({ season: dayFor(today()).season, count: 10 });
          toast('Marked on today’s list');
          await drawActions();
        }),
      }, 'Mark as prayed today'));
    } else if (onList) {
      add(actions, el('p', { class: 'muted small centre', text: 'On your daily list.' }));
    } else {
      add(actions, el('button', { class: 'button quiet wide', onclick: () => addReference(reference, drawActions) }, 'Add to my daily list'));
    }
  }

  const language = hasLatin(prayer)
    ? choice([['en', 'English'], ['la', 'Latin'], ['both', 'Both']], settings().prayerLanguage, async (mode) => {
      await saveSetting('prayerLanguage', mode);
      await drawText();
    }, { label: 'Language' })
    : null;

  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/pray/library') }, icon('back'), el('span', { text: 'Back' })),
      el('div', { class: 'reader-tools' },
        prayer.own ? el('button', { class: 'icon-button', 'aria-label': 'Edit this prayer', onclick: () => ownPrayerSheet(prayer.record, (saved) => (saved ? refresh() : go('#/pray/library'))) }, icon('edit', 22)) : null,
        star)),
    el('article', { class: 'chapter prayer-page' },
      el('h2', { class: 'chapter-title', text: prayer.title }),
      prayer.latin && prayer.latin !== prayer.title ? el('p', { class: 'chapter-sub latin', text: prayer.latin }) : null,
      prayer.note ? el('p', { class: 'chapter-sub', text: prayer.note }) : null,
      language,
      textNode),
    actions,
  );
  await drawText();
  await drawActions();
}

/**
 * Write, paste or edit one of the reader's own prayers.
 * `onSaved(id)` is called with the library id after saving, or null after deleting.
 */
export function ownPrayerSheet(record, onSaved) {
  const isNew = !record;
  openSheet(isNew ? 'Add your own prayer' : 'Edit prayer', (close) => {
    const title = el('input', { class: 'field', type: 'text', placeholder: 'Its name', 'aria-label': 'Name of the prayer' });
    const text = el('textarea', { class: 'field note-field', rows: '9', placeholder: 'Type or paste the prayer. Leave a blank line between stanzas.', 'aria-label': 'Text of the prayer' });
    const latin = el('textarea', { class: 'field note-field', rows: '6', placeholder: 'The Latin text, if you want it alongside', 'aria-label': 'Latin text' });
    if (record) {
      title.value = record.title;
      text.value = record.text;
      latin.value = record.latin || '';
    }
    const save = once(async () => {
      if (!title.value.trim()) { title.focus(); return; }
      if (!text.value.trim()) { text.focus(); return; }
      const id = await saveOwnPrayer({ id: record ? record.id : undefined, title: title.value, text: text.value, latin: latin.value });
      close();
      toast(isNew ? 'Prayer added to your library' : 'Prayer saved');
      if (onSaved) onSaved(id);
    });
    return [
      title,
      text,
      el('details', { class: 'prayer-include', open: Boolean(record && record.latin) }, el('summary', { text: 'Latin text (optional)' }), latin),
      el('p', { class: 'muted small', text: 'Leave a blank line between stanzas. Lines beginning “V.” and “R.” are shown as versicle and response. Your prayers stay on this device and are included in backups.' }),
      el('div', { class: 'button-row' },
        isNew ? el('button', { class: 'button quiet', onclick: close }, 'Cancel')
          : el('button', {
            class: 'button danger quiet',
            onclick: () => {
              close();
              confirmSheet('Delete this prayer?', 'It will be removed from your library, your daily list and any novena that uses it. Days already recorded are kept.', 'Delete prayer', async () => {
                await deleteOwnPrayer(record.id);
                await endByReference(`prayer:own-${record.id}`, today());
                await dropPrayerFromNovenas(`prayer:own-${record.id}`);
                toast('Prayer deleted');
                if (onSaved) onSaved(null);
              });
            },
          }, 'Delete'),
        el('button', { class: 'button', onclick: save }, isNew ? 'Add prayer' : 'Save')),
    ];
  }, { tall: true });
}
