// view-reader.js
// The Bible reader: one chapter at a time, with verse selection for
// highlighting, notes, links between verses, copying and study, and the
// Latin Vulgate beneath each verse for those who want it.

import {
  book, books, chapterTitle, currentTranslation, formatRange, formatVerseId, loadBook, parseReference, parseVerseId,
  TRANSLATIONS, verseId, verseOrder, verseText, vulgatePsalm,
} from './bible.js';
import { go, refresh } from './context.js';
import { db, saveSetting, settings } from './db.js';
import { addPassage, allReflections, handText, reflectionsCiting, titleOf } from './reflections.js';
import { latinFor } from './study.js';
import { add, clear, confirmSheet, copyText, el, icon, keepSaved, once, openSheet, saveState, toast } from './ui.js';
import { loadShelf } from './view-early.js';

const HIGHLIGHT_COLORS = ['gold', 'green', 'blue', 'rose'];

export async function render(container, { bookId, chapter, verse, endVerse }) {
  const entry = book(bookId);
  if (!entry) {
    container.append(el('p', { class: 'empty', text: 'That book is not in this Bible.' }));
    return undefined;
  }
  const chapterNumber = Math.min(Math.max(Number(chapter) || 1, 1), entry.chapters.length);
  const chapters = await loadBook(bookId);
  const verses = chapters[chapterNumber - 1];
  await saveSetting('lastPlace', { book: bookId, chapter: chapterNumber });

  // `settled` is set once the reader touches the page: after that it is not moved under them.
  const state = { selected: new Set(), marks: await loadMarks(bookId, chapterNumber), latin: null, settled: false };
  const textNode = el('div', { class: 'chapter-text' });
  const actionBar = el('div', { class: 'action-bar', hidden: true });

  function applyTextSettings() {
    textNode.style.fontSize = `${settings().textSize}px`;
    document.documentElement.style.setProperty('--reading-size', `${settings().textSize}px`);
    // With the Latin shown, each verse stands on its own with its Latin beneath.
    textNode.classList.toggle('flow', settings().verseLayout === 'flow' && !settings().showLatin);
    textNode.classList.toggle('with-latin', Boolean(settings().showLatin));
    showLatin();
  }

  /** Fetch the Latin of this chapter if it is wanted and not yet here, then draw it in. */
  async function showLatin() {
    if (!settings().showLatin) {
      if (state.latin) { state.latin = null; drawVerses(); }
      return;
    }
    if (state.latin) return;
    try {
      const latin = await latinFor(bookId, chapterNumber);
      // It may have been turned off again while the book was on its way.
      if (!settings().showLatin) return;
      state.latin = latin;
      drawVerses();
      // The page has just grown under the reader: go back to the verse they came for.
      arrive();
    } catch (error) {
      console.warn(error);
      toast(navigator.onLine ? 'The Latin could not be loaded' : 'The Latin of this book is not saved on this device yet');
    }
  }

  /** Bring the verse the reader came for into view and mark it, until they touch the page. */
  function arrive() {
    if (!verse || state.settled) return;
    const first = Number(verse);
    const last = Number(endVerse) || first;
    requestAnimationFrame(() => {
      const target = textNode.querySelector(`.verse[data-v="${first}"]`);
      if (target) target.scrollIntoView({ block: 'center' });
      for (let n = first; n <= last; n += 1) {
        const node = textNode.querySelector(`.verse[data-v="${n}"]`);
        if (node) node.classList.add('arrived');
      }
    });
  }

  async function refresh() {
    state.marks = await loadMarks(bookId, chapterNumber);
    drawVerses();
    drawActionBar();
  }

  // The CPDV names who speaks in the Song of Songs ("Bride to Chorus: ..."). The
  // names are drawn as rubrics, apart from the words spoken: one that opens a
  // verse stands above it, one within a verse stays in its place.
  const speakers = bookId === 'SNG' && currentTranslation().id === 'cpdv';
  function verseParts(text, number) {
    const numberNode = el('sup', { class: 'verse-number', text: number });
    if (!speakers) return [numberNode, el('span', { class: 'verse-body', text })];
    const segments = speakerSegments(text);
    const lead = segments.length > 1 && segments[0].speaker ? el('span', { class: 'speaker lead', text: segments[0].speaker }) : null;
    const rest = lead ? segments.slice(1) : segments;
    const body = el('span', { class: 'verse-body' }, rest.map((segment) => (
      segment.speaker ? el('span', { class: 'speaker', text: `${segment.speaker} ` }) : segment.text)));
    return [lead, numberNode, body];
  }

  function drawVerses() {
    clear(textNode);
    textNode.classList.toggle('speakers', speakers);
    verses.forEach((text, index) => {
      if (!text) return;
      const number = index + 1;
      const id = verseId(bookId, chapterNumber, number);
      const highlight = state.marks.highlights.get(id);
      const node = el('span', {
        class: `verse${number === 1 ? ' first' : ''}${state.selected.has(number) ? ' selected' : ''}`,
        dataset: { v: number, ...(highlight ? { highlight } : {}) },
        role: 'button',
        tabindex: '0',
        'aria-pressed': state.selected.has(number) ? 'true' : 'false',
        onclick: () => toggle(number),
        onkeydown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(number); }
        },
      },
      ...verseParts(text, number),
      state.latin && state.latin[index] ? el('span', { class: 'verse-latin', lang: 'la', text: state.latin[index] }) : null);
      textNode.append(node, ' ');

      const notes = state.marks.notes.filter((note) => parseVerseId(note.end || note.start).verse === number);
      const links = state.marks.links.filter((link) => link.anchor === number);
      const cited = state.marks.reflections.filter((item) => item.verse === number);
      if (notes.length || links.length || cited.length) {
        textNode.append(el('span', { class: 'annotations' },
          notes.map((note) => el('button', { class: 'note-card', onclick: () => editNote(note) },
            note.end && note.end !== note.start ? el('span', { class: 'note-range', text: formatRange(note.start, note.end, { short: true }) }) : null,
            el('span', { class: 'note-body', text: note.text }))),
          links.length || cited.length ? el('span', { class: 'link-chips' },
            links.map((link) => el('button', {
              class: `link-chip${link.incoming ? ' incoming' : ''}`,
              onclick: () => openLink(link),
            }, link.incoming ? `from ${link.label}` : link.label)),
            cited.map((item) => el('button', {
              class: 'link-chip reflection-chip',
              onclick: () => go(`#/reflection/${item.reflection.id}`),
            }, titleOf(item.reflection)))) : null));
      }
    });
  }

  function toggle(number) {
    if (state.selected.has(number)) state.selected.delete(number);
    else state.selected.add(number);
    for (const node of textNode.querySelectorAll('.verse')) {
      const on = state.selected.has(Number(node.dataset.v));
      node.classList.toggle('selected', on);
      node.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    drawActionBar();
  }

  function selectionRange() {
    const numbers = [...state.selected].sort((a, b) => a - b);
    return {
      numbers,
      start: verseId(bookId, chapterNumber, numbers[0]),
      end: verseId(bookId, chapterNumber, numbers[numbers.length - 1]),
      contiguous: numbers.every((n, i) => i === 0 || n === numbers[i - 1] + 1),
    };
  }

  function selectionLabel() {
    const { numbers, start, end, contiguous } = selectionRange();
    if (contiguous) return formatRange(start, end);
    return `${chapterTitle(bookId, chapterNumber)}:${numbers.join(', ')}`;
  }

  function clearSelection() {
    state.selected.clear();
    drawVerses();
    drawActionBar();
  }

  function drawActionBar() {
    clear(actionBar);
    actionBar.hidden = state.selected.size === 0;
    document.body.classList.toggle('has-action-bar', state.selected.size > 0);
    if (!state.selected.size) return;
    const { numbers } = selectionRange();
    const anyHighlighted = numbers.some((n) => state.marks.highlights.has(verseId(bookId, chapterNumber, n)));
    actionBar.append(
      el('div', { class: 'action-top' },
        el('span', { class: 'action-label', text: selectionLabel() }),
        el('button', { class: 'icon-button', 'aria-label': 'Clear selection', onclick: clearSelection }, icon('close'))),
      el('div', { class: 'action-row' },
        el('div', { class: 'swatches', role: 'group', 'aria-label': 'Highlight colour' },
          HIGHLIGHT_COLORS.map((color) => el('button', {
            class: 'swatch', dataset: { highlight: color }, 'aria-label': `Highlight ${color}`, onclick: () => setHighlight(color),
          })),
          anyHighlighted ? el('button', { class: 'swatch none', 'aria-label': 'Remove highlight', onclick: () => setHighlight(null) }, icon('close', 16)) : null),
        el('div', { class: 'action-buttons' },
          el('button', { class: 'action-button', onclick: addNote }, icon('note', 20), el('span', { text: 'Note' })),
          el('button', { class: 'action-button', onclick: addLink }, icon('link', 20), el('span', { text: 'Link' })),
          el('button', { class: 'action-button', onclick: copySelection }, icon('copy', 20), el('span', { text: 'Copy' })),
          el('button', { class: 'action-button', onclick: study }, icon('study', 20), el('span', { text: 'Study' })),
          el('button', { class: 'action-button', onclick: findWords }, icon('search', 20), el('span', { text: 'Find' })),
          el('button', { class: 'action-button', onclick: prayWith }, icon('cross', 20), el('span', { text: 'Pray' })))));
  }

  /** Open the study screen for the selected verses: the Fathers, cross-references and Latin. */
  function study() {
    const { numbers, contiguous } = selectionRange();
    if (!contiguous) {
      toast('Choose verses that follow one another to study them together');
      return;
    }
    const first = numbers[0];
    const last = numbers[numbers.length - 1];
    go(`#/study/${bookId}/${chapterNumber}/${first === last ? first : `${first}-${last}`}`);
  }

  /** Choose words from the selected verses and look for them across the Bible. */
  function findWords() {
    const { numbers } = selectionRange();
    const tokens = numbers.flatMap((n) => verses[n - 1].split(/\s+/)).map((token) => token.replace(/^[^\p{L}]+|[^\p{L}’']+$/gu, '').replace(/[’']s?$/u, '')).filter(Boolean);
    openSheet('Find elsewhere in the Bible', (close) => {
      const chosen = new Set();
      const summary = el('p', { class: 'muted small', text: 'Tap a word, or several words in a row for a phrase.' });
      const searchButton = el('button', { class: 'button', disabled: true }, 'Search');
      const query = () => {
        const picked = [...chosen].sort((a, b) => a - b);
        const adjacent = picked.length > 1 && picked.every((position, i) => i === 0 || position === picked[i - 1] + 1);
        const text = picked.map((position) => tokens[position]).join(' ');
        return adjacent ? `"${text}"` : text;
      };
      const chips = el('div', { class: 'word-chips' }, tokens.map((token, position) => el('button', {
        class: 'word-chip', 'aria-pressed': 'false',
        onclick: (event) => {
          if (chosen.has(position)) chosen.delete(position);
          else chosen.add(position);
          event.currentTarget.classList.toggle('on', chosen.has(position));
          event.currentTarget.setAttribute('aria-pressed', chosen.has(position) ? 'true' : 'false');
          searchButton.disabled = chosen.size === 0;
          summary.textContent = chosen.size ? `Search for ${query()}` : 'Tap a word, or several words in a row for a phrase.';
        },
      }, token)));
      searchButton.addEventListener('click', () => {
        close();
        document.body.classList.remove('has-action-bar');
        go(`#/search/${encodeURIComponent(query())}`);
      });
      return [chips, summary, el('div', { class: 'button-row' }, el('button', { class: 'button quiet', onclick: close }, 'Cancel'), searchButton)];
    });
  }

  /** Take the selected verses to Lectio Divina. */
  function prayWith() {
    const { numbers, contiguous } = selectionRange();
    if (!contiguous) {
      toast('Choose verses that follow one another to pray with them');
      return;
    }
    go(`#/pray/lectio/${bookId}/${chapterNumber}/${numbers[0]}-${numbers[numbers.length - 1]}`);
  }

  async function setHighlight(color) {
    for (const number of state.selected) {
      const id = verseId(bookId, chapterNumber, number);
      if (color) await db.put('highlights', { id, color, updated: new Date().toISOString() });
      else await db.remove('highlights', id);
    }
    state.selected.clear();
    await refresh();
  }

  function addNote() {
    const { start, end } = selectionRange();
    noteSheet({ start, end, text: '' }, async () => { state.selected.clear(); await refresh(); });
  }


  function editNote(note) {
    noteSheet(note, refresh);
  }

  function addLink() {
    const { start, end } = selectionRange();
    linkSheet(start, end, async () => { state.selected.clear(); await refresh(); });
  }

  function openLink(link) {
    openSheet(link.incoming ? `Linked from ${link.label}` : `Linked to ${link.label}`, (close) => {
      const preview = el('p', { class: 'sheet-quote', text: '' });
      verseText(link.target).then((text) => { preview.textContent = text; });
      return [
        preview,
        link.record.note ? el('p', { class: 'sheet-text', text: link.record.note }) : null,
        el('div', { class: 'button-row' },
          el('button', { class: 'button danger quiet', onclick: async () => { await db.remove('links', link.record.id); close(); await refresh(); toast('Link removed'); } }, 'Remove link'),
          el('button', { class: 'button', onclick: () => { close(); const t = parseVerseId(link.target); go(`#/read/${t.book}/${t.chapter}/${t.verse}`); } }, `Go to ${link.label}`)),
      ];
    });
  }

  async function copySelection() {
    const { numbers } = selectionRange();
    const body = numbers.map((n) => verses[n - 1]).join(' ');
    const ok = await copyText(`${body}\n${selectionLabel()} (${currentTranslation().short})`);
    toast(ok ? 'Copied' : 'Copying is not available here');
    clearSelection();
  }

  // --- Page furniture ---

  const vulgate = bookId === 'PSA' ? vulgatePsalm(chapterNumber) : null;
  const previous = neighbour(bookId, chapterNumber, -1);
  const next = neighbour(bookId, chapterNumber, 1);
  const toPath = (place) => `#/read/${place.book}/${place.chapter}`;

  container.append(
    el('header', { class: 'reader-bar' },
      el('button', { class: 'place-button', onclick: () => bookPicker(bookId, chapterNumber) },
        el('span', { text: chapterTitle(bookId, chapterNumber) }),
        el('span', { class: 'caret', 'aria-hidden': 'true' })),
      el('div', { class: 'reader-tools' },
        el('button', { class: 'icon-button', 'aria-label': 'Previous chapter', disabled: !previous, onclick: () => previous && go(toPath(previous)) }, icon('back')),
        el('button', { class: 'icon-button', 'aria-label': 'Next chapter', disabled: !next, onclick: () => next && go(toPath(next)) }, icon('forward')),
        el('button', { class: 'icon-button', 'aria-label': 'Text settings', onclick: () => textSheet(applyTextSettings) }, icon('text', 24)))),
    el('article', { class: 'chapter' },
      el('h2', { class: 'chapter-title', text: chapterTitle(bookId, chapterNumber) }),
      currentTranslation() !== TRANSLATIONS[0] ? el('p', { class: 'chapter-sub translation-name', text: currentTranslation().name }) : null,
      vulgate ? el('p', { class: 'chapter-sub', text: `Psalm ${vulgate} in the Vulgate and older Catholic Bibles` }) : null,
      entry.drName && chapterNumber === 1 ? el('p', { class: 'chapter-sub', text: `Called ${entry.drName} in the Douay-Rheims` }) : null,
      chapterNumber === 1 ? el('button', { class: 'text-button book-link', onclick: () => go(`#/book/${bookId}`) }, `About ${entry.name}`) : null,
      textNode),
    el('nav', { class: 'chapter-nav' },
      previous ? el('button', { class: 'button quiet', onclick: () => go(toPath(previous)) }, chapterTitle(previous.book, previous.chapter)) : el('span'),
      next ? el('button', { class: 'button quiet', onclick: () => go(toPath(next)) }, chapterTitle(next.book, next.chapter)) : el('span')),
    actionBar,
  );
  applyTextSettings();
  drawVerses();

  // Arriving at a verse: show it and mark it briefly.
  arrive();

  // Swipe left and right to turn chapters.
  let touchStart = null;
  const onTouchStart = (event) => {
    const t = event.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (event) => {
    if (!touchStart || state.selected.size) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 90 || Math.abs(dy) > 50) return;
    if (dx < 0 && next) go(toPath(next));
    if (dx > 0 && previous) go(toPath(previous));
  };
  container.addEventListener('touchstart', onTouchStart, { passive: true });
  for (const kind of ['pointerdown', 'wheel']) container.addEventListener(kind, () => { state.settled = true; }, { passive: true, once: true });
  container.addEventListener('touchend', onTouchEnd, { passive: true });

  return () => {
    document.body.classList.remove('has-action-bar');
    container.removeEventListener('touchstart', onTouchStart);
    container.removeEventListener('touchend', onTouchEnd);
  };
}

/** The chapter before or after, crossing into the neighbouring book. */
function neighbour(bookId, chapter, step) {
  const entry = book(bookId);
  const target = chapter + step;
  if (target >= 1 && target <= entry.chapters.length) return { book: bookId, chapter: target };
  const other = books()[entry.position + step];
  if (!other) return null;
  return { book: other.id, chapter: step > 0 ? 1 : other.chapters.length };
}

/** Highlights, notes and links touching one chapter. */
async function loadMarks(bookId, chapter) {
  const prefix = `${bookId}.${chapter}.`;
  const [highlightRows, noteRows, linkRows, reflections] = await Promise.all([
    db.all('highlights'), db.all('notes'), db.all('links'), reflectionsCiting(bookId, chapter),
  ]);
  const highlights = new Map(highlightRows.filter((row) => row.id.startsWith(prefix)).map((row) => [row.id, row.color]));
  const notes = noteRows.filter((note) => (note.end || note.start).startsWith(prefix));
  const links = [];
  for (const record of linkRows) {
    const fromEnd = record.fromEnd || record.from;
    const toEnd = record.toEnd || record.to;
    if (fromEnd.startsWith(prefix)) {
      links.push({ record, incoming: false, anchor: parseVerseId(fromEnd).verse, target: record.to, label: formatRange(record.to, toEnd, { short: true }) });
    }
    if (toEnd.startsWith(prefix)) {
      links.push({ record, incoming: true, anchor: parseVerseId(toEnd).verse, target: record.from, label: formatRange(record.from, fromEnd, { short: true }) });
    }
  }
  return { highlights, notes, links, reflections };
}

// ---------------------------------------------------------------------------
// Sheets
// ---------------------------------------------------------------------------

/**
 * Write or change a note on some verses. What is typed is kept as it is
 * written, and the sheet says so; there is no Save button to forget. A note
 * left empty when the sheet closes is not kept.
 */
function noteSheet(note, onDone) {
  const isNew = !note.id;
  // What is stored, once anything has been: a new note gets its key from the first save.
  let stored = isNew ? null : { ...note };
  let discarded = false;
  const status = saveState(isNew ? 'new' : 'saved');
  const area = el('textarea', { class: 'field note-field', rows: '6', placeholder: 'What do you want to remember about this passage?', 'aria-label': 'Note' });
  area.value = note.text || '';
  const saver = keepSaved(async () => {
    const text = area.value.trim();
    // An empty note is not written; whether to remove one is decided when the sheet closes.
    if (discarded || !text) return;
    const now = new Date().toISOString();
    const record = { ...(stored || note), text, order: verseOrder(note.start), updated: now, created: (stored || note).created || now };
    const id = await db.put('notes', record);
    stored = { ...record, id: record.id ?? id };
  }, 700, { onState: status.show });
  area.addEventListener('input', () => saver.touch());
  // Words handed to a new note (coming back from "Add to a reflection instead") are not yet kept.
  if (isNew && area.value.trim()) saver.touch();

  // Closing the sheet in any way keeps what is there, or removes a note emptied of its words.
  const finish = async () => {
    await saver.stop();
    if (!discarded && stored && !area.value.trim()) {
      await db.remove('notes', stored.id);
      stored = null;
      toast('The empty note was removed');
    }
    await onDone();
  };

  openSheet(`Note on ${formatRange(note.start, note.end, { short: true })}`, (close) => {
    setTimeout(() => area.focus(), 250);
    return [
      area,
      status.node,
      el('div', { class: 'button-row' },
        isNew
          ? el('button', {
            class: 'button quiet',
            onclick: async () => {
              discarded = true;
              await saver.stop();
              if (stored) await db.remove('notes', stored.id);
              stored = null;
              close();
            },
          }, 'Discard')
          : el('button', {
            class: 'button danger quiet',
            onclick: async () => {
              // Whatever was just typed is kept first, so that changing one's mind loses nothing.
              await saver.stop();
              discarded = true;
              close();
              confirmSheet('Delete this note?', 'The note will be removed from this device.', 'Delete note', async () => {
                await db.remove('notes', note.id);
                toast('Note deleted');
                await onDone();
              }, { onCancel: onDone });
            },
          }, 'Delete'),
        el('button', { class: 'button', onclick: close }, 'Done')),
      // Whatever has been typed goes along: it becomes part of the reflection chosen.
      isNew ? el('button', {
        class: 'text-button',
        onclick: async () => {
          const words = area.value;
          discarded = true;
          await saver.stop();
          if (stored) await db.remove('notes', stored.id);
          stored = null;
          close();
          reflectionSheet(note.start, note.end, onDone, words);
        },
      }, 'Add to a reflection instead') : null,
    ];
  }, { onClose: () => { if (!discarded) finish(); } });
}

/**
 * Cite a passage in one of the reader's reflections, or begin a new one with
 * it. `words` is anything already typed about the passage, which is kept as
 * part of the reflection.
 */
async function reflectionSheet(start, end, onDone, words = '') {
  const all = (await allReflections().catch(() => [])).sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  const typed = words.trim();
  // Until a reflection has taken the words, closing this sheet goes back to the note they were typed in.
  let taken = false;
  const backToNote = () => { if (!taken && typed) noteSheet({ start, end, text: typed }, onDone); };
  openSheet(`Add ${formatRange(start, end, { short: true })} to a reflection`, (close) => [
    el('p', { class: 'muted small', text: typed
      ? 'A reflection is a note on a theme that can gather many passages. What you have written goes with the passage.'
      : 'A reflection is a note on a theme that can gather many passages.' }),
    el('div', { class: 'choice-list' },
      el('button', { class: 'picker-book current', onclick: () => { taken = true; close(); handText(typed); go(`#/reflection/new/${start}/${end}`); } }, 'A new reflection'),
      all.map((record) => el('button', {
        class: 'picker-book',
        onclick: once(async () => {
          const saved = await addPassage(record.id, start, end, typed);
          if (!saved) {
            close();
            toast('That reflection is no longer here');
            return;
          }
          taken = true;
          close();
          toast(`Added to “${titleOf(record)}”`);
          await onDone();
        }),
      }, el('span', { text: titleOf(record) })))),
  ], { tall: all.length > 5, onClose: backToNote });
}

function linkSheet(start, end, onDone) {
  openSheet(`Link ${formatRange(start, end, { short: true })} to another passage`, (close) => {
    const input = el('input', { class: 'field', type: 'text', placeholder: 'John 3:16', autocomplete: 'off', autocapitalize: 'words', 'aria-label': 'Passage to link to' });
    const preview = el('p', { class: 'sheet-quote muted', text: 'Type a reference, such as “Isaiah 53:5” or “1 Cor 13:4-7”.' });
    const reason = el('input', { class: 'field', type: 'text', placeholder: 'Why they belong together (optional)', 'aria-label': 'Why they belong together' });
    const saveButton = el('button', { class: 'button', disabled: true }, 'Save link');
    let target = null;

    input.addEventListener('input', async () => {
      const parsed = parseReference(input.value);
      target = null;
      saveButton.disabled = true;
      if (!parsed) {
        preview.textContent = input.value.trim() ? 'No passage matches that yet.' : 'Type a reference, such as “Isaiah 53:5” or “1 Cor 13:4-7”.';
        preview.classList.add('muted');
        return;
      }
      const [c1, v1, c2, v2] = parsed.span;
      const from = verseId(parsed.book, c1, v1);
      const to = verseId(parsed.book, c2, v2);
      const text = await verseText(from);
      target = { from, to };
      preview.classList.remove('muted');
      preview.textContent = `${formatRange(from, to)}: ${text}${from !== to ? ' …' : ''}`;
      saveButton.disabled = false;
    });
    saveButton.addEventListener('click', async () => {
      if (!target) return;
      await db.put('links', {
        from: start, fromEnd: end, to: target.from, toEnd: target.to,
        note: reason.value.trim(), created: new Date().toISOString(),
      });
      close();
      toast(`Linked to ${formatRange(target.from, target.to, { short: true })}`);
      await onDone();
    });
    setTimeout(() => input.focus(), 250);
    return [input, preview, reason, el('div', { class: 'button-row' }, el('button', { class: 'button quiet', onclick: close }, 'Cancel'), saveButton)];
  });
}

// A speaker's name as the CPDV writes it in the Song of Songs, with the colon
// and space after it; the name alone is captured.
// (Written without a lookbehind, which Safari before iOS 16.4 cannot parse.)
const SPEAKER = /(^|\s)((?:Bride|Groom|Chorus)(?: to (?:Bride|Groom|Chorus)(?: and (?:Bride|Groom))?)?): /g;

/** A verse cut into what is spoken ({ text }) and who speaks it ({ speaker }), in order. */
function speakerSegments(text) {
  const segments = [];
  let last = 0;
  SPEAKER.lastIndex = 0;
  for (let match = SPEAKER.exec(text); match; match = SPEAKER.exec(text)) {
    const nameStart = match.index + match[1].length;
    if (nameStart > last) segments.push({ text: text.slice(last, nameStart) });
    segments.push({ speaker: match[2] });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}

function textSheet(onChange) {
  openSheet('Text', (close) => {
    const translationChoice = el('div', { class: 'segmented' }, TRANSLATIONS.map((item) => el('button', {
      class: `segment${currentTranslation().id === item.id ? ' on' : ''}`,
      onclick: async () => {
        if (currentTranslation().id === item.id) return;
        await saveSetting('translation', item.id);
        close();
        // The chapter is drawn again in the translation chosen.
        refresh();
      },
    }, item.short)));
    const size = el('input', { type: 'range', min: '15', max: '28', step: '1', value: String(settings().textSize), 'aria-label': 'Text size', class: 'slider' });
    const sample = el('span', { class: 'slider-value', text: `${settings().textSize}` });
    size.addEventListener('input', async () => {
      sample.textContent = size.value;
      await saveSetting('textSize', Number(size.value));
      onChange();
    });
    const layout = (value, label) => el('button', {
      class: `segment${settings().verseLayout === value ? ' on' : ''}`,
      onclick: async (event) => {
        const chosen = event.currentTarget; // not available after the first await
        await saveSetting('verseLayout', value);
        for (const node of chosen.parentNode.children) node.classList.toggle('on', node === chosen);
        onChange();
      },
    }, label);
    const latin = el('input', { type: 'checkbox', id: 'text-latin' });
    latin.checked = Boolean(settings().showLatin);
    latin.addEventListener('change', async () => {
      await saveSetting('showLatin', latin.checked);
      onChange();
    });
    return [
      el('div', { class: 'setting-row' }, el('span', { text: 'Translation' }), translationChoice),
      el('label', { class: 'setting-row' }, el('span', { text: 'Size' }), size, sample),
      el('div', { class: 'setting-row' }, el('span', { text: 'Verses' }),
        el('div', { class: 'segmented' }, layout('lines', 'One per line'), layout('flow', 'Running text'))),
      el('label', { class: 'setting-row check-row', for: 'text-latin' },
        el('span', { class: 'setting-text' }, el('span', { text: 'Latin beneath each verse' }), el('span', { class: 'muted small', text: 'The Clementine Vulgate, the Latin both translations were made from.' })),
        latin),
    ];
  });
}

/** Choose a book and chapter, or type a reference. */
export function bookPicker(currentBook, currentChapter) {
  openSheet('Go to', (close) => {
    const body = el('div', { class: 'picker' });
    const input = el('input', { class: 'field', type: 'text', placeholder: 'Book or reference, such as “Jn 3:16”', autocomplete: 'off', 'aria-label': 'Book or reference' });
    const listNode = el('div', { class: 'picker-list' });

    const open = (bookId, chapter, verse) => {
      close();
      go(`#/read/${bookId}/${chapter}${verse ? `/${verse}` : ''}`);
    };

    function showChapters(entry) {
      clear(listNode);
      listNode.append(
        el('div', { class: 'picker-actions' },
          el('button', { class: 'chip-button', onclick: () => showBooks('') }, 'All books'),
          el('button', { class: 'chip-button', onclick: () => { close(); go(`#/book/${entry.id}`); } }, `About ${entry.name}`)),
        el('h3', { class: 'picker-group', text: entry.name }),
        el('div', { class: 'chapter-grid' }, entry.chapters.map((_, index) => el('button', {
          class: `chapter-cell${entry.id === currentBook && index + 1 === currentChapter ? ' current' : ''}`,
          onclick: () => open(entry.id, index + 1),
        }, String(index + 1)))));
      listNode.scrollTop = 0;
    }

    function showBooks(filter) {
      clear(listNode);
      const wanted = filter.toLowerCase().replace(/\s+/g, '');
      let group = null;
      let any = false;
      for (const entry of books()) {
        const haystack = [entry.name, entry.short, entry.drName || ''].join('|').toLowerCase().replace(/\s+/g, '');
        if (wanted && !haystack.includes(wanted)) continue;
        any = true;
        if (entry.group !== group) {
          group = entry.group;
          listNode.append(el('h3', { class: 'picker-group', text: group }));
        }
        listNode.append(el('button', {
          class: `picker-book${entry.id === currentBook ? ' current' : ''}`,
          onclick: () => (entry.chapters.length === 1 ? open(entry.id, 1) : showChapters(entry)),
        }, el('span', { text: entry.name }), entry.drName ? el('span', { class: 'picker-alt', text: entry.drName }) : null));
      }
      if (!any) listNode.append(el('p', { class: 'muted', text: 'No book has that name.' }));
      if (!wanted) listNode.append(earlyShelf());
    }

    // After the Bible, and kept apart from it: the earliest writings of the Church.
    function earlyShelf() {
      const rows = el('div', { class: 'picker-early-list' });
      const shelfNode = el('details', { class: 'picker-early' },
        el('summary', {},
          el('span', { class: 'picker-early-title', text: 'Early Christian writings' }),
          el('span', { class: 'picker-alt', text: 'Not Scripture' })),
        el('p', { class: 'muted small', text: 'The Didache and letters of the first bishops and martyrs, from the generation after the apostles.' }),
        rows);
      shelfNode.addEventListener('toggle', async () => {
        if (!shelfNode.open || rows.childElementCount) return;
        try {
          const { entries } = await loadShelf();
          add(rows,
            entries.map((entry) => el('button', { class: 'picker-book', onclick: () => { close(); go(`#/early/${entry.id}`); } },
              el('span', { text: entry.title }), el('span', { class: 'picker-alt', text: entry.subtitle }))),
            el('button', { class: 'text-button', onclick: () => { close(); go('#/early'); } }, 'About these writings'));
        } catch {
          add(rows, el('p', { class: 'muted small', text: 'They could not be loaded. Check your connection and try again.' }));
        }
      });
      return shelfNode;
    }

    input.addEventListener('input', () => {
      const value = input.value.trim();
      const parsed = /\d/.test(value) ? parseReference(value) : null;
      if (parsed) {
        clear(listNode);
        const [c1, v1] = parsed.span;
        const label = parsed.wholeChapter ? chapterTitle(parsed.book, c1) : formatVerseId(verseId(parsed.book, c1, v1));
        listNode.append(el('button', { class: 'picker-book current', onclick: () => open(parsed.book, c1, parsed.wholeChapter ? null : v1) }, `Go to ${label}`));
      } else {
        showBooks(value.replace(/\d+\s*$/, ''));
      }
    });
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const first = listNode.querySelector('button.picker-book');
      if (first) first.click();
    });

    showBooks('');
    body.append(input, listNode);
    requestAnimationFrame(() => {
      const currentNode = listNode.querySelector('.picker-book.current');
      if (currentNode) currentNode.scrollIntoView({ block: 'center' });
    });
    return body;
  }, { tall: true });
}
