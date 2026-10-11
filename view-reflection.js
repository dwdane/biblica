// view-reflection.js
// Writing a reflection: a title, the text, a date, and the passages of
// Scripture it draws on.

import { formatRange, parseReference, parseVerseId, verseId, verseText } from './bible.js';
import { go, goBack, today } from './context.js';
import { deleteReflection, reflection, saveReflection, sortRefs, takeHandedText } from './reflections.js';
import { add, clear, confirmSheet, el, icon, keepSaved, saveState, scrollPosition, scrollToPosition, toast } from './ui.js';

const VERSE_ID = /^[1-3A-Z]{3}\.\d+\.\d+$/;

export async function render(container, { id, start, end }) {
  const existing = id && id !== 'new' ? await reflection(id) : null;
  if (id && id !== 'new' && !existing) {
    add(container,
      el('header', { class: 'reader-bar' },
        el('button', { class: 'back-button', onclick: () => go('#/notes') }, icon('back'), el('span', { text: 'Notes' }))),
      el('p', { class: 'empty', text: 'That reflection is no longer here.' }));
    return undefined;
  }
  let record = existing || { title: '', text: '', date: today(), refs: [] };
  // Arriving from the Bible with a passage: it is the first thing cited.
  if (!existing && VERSE_ID.test(start || '')) {
    record.refs = [{ start, end: VERSE_ID.test(end || '') ? end : start }];
  }
  let refs = sortRefs(record.refs || []);
  let deleted = false;
  // Words typed for a verse note in the Bible, brought here instead.
  const handed = existing ? '' : takeHandedText();

  // The title is a one-line text area, so a long title wraps instead of running off the screen.
  const title = el('textarea', { class: 'field reflection-title', rows: '1', placeholder: 'On …', 'aria-label': 'Title', autocapitalize: 'sentences', enterkeyhint: 'next' });
  title.value = record.title || '';
  const text = el('textarea', { class: 'field note-field reflection-text', rows: '5', placeholder: 'Write what you want to keep.', 'aria-label': 'Reflection' });
  text.value = record.text || handed;
  const date = el('input', { class: 'field', type: 'date', 'aria-label': 'Date', max: '2100-12-31' });
  date.value = record.date || today();
  const refList = el('div', { class: 'reflection-refs' });

  const empty = () => !title.value.trim() && !text.value.trim() && !refs.length;

  /**
   * Write the reflection as it stands. One with nothing in it is not kept:
   * a new one is not begun, and one that has been emptied is taken away.
   */
  async function store() {
    if (deleted) return;
    if (empty()) {
      if (record.id) {
        await deleteReflection(record.id);
        record = { ...record, id: undefined, created: undefined };
      }
      return;
    }
    const before = record.id;
    record = await saveReflection({ ...record, title: title.value, text: text.value, date: date.value || today(), refs });
    // A reflection takes its own address, so that coming back to this screen finds it.
    // Only while this screen is still the one showing: afterwards the address is another screen's.
    if (record.id !== before && container.isConnected && window.location.hash.startsWith('#/reflection/')) {
      window.history.replaceState(null, '', `#/reflection/${record.id}`);
    }
  }
  // Saved a moment after each pause in the writing, and whenever the app is put away.
  // The line under the title says whether it is kept; there is no Save button to forget.
  const status = saveState(existing ? 'saved' : 'new');
  const saver = keepSaved(store, 900, { onState: status.show });
  const mark = () => {
    saver.touch();
    // The first words of a new reflection are saved at once, so that it has its
    // own address before the reader can leave: Back then returns to it, not to a blank.
    if (!record.id && container.isConnected) saver.flush();
  };
  for (const node of [title, text, date]) node.addEventListener('input', mark);

  // Both text areas grow with what is written. Measuring means collapsing them
  // for an instant, so the page is put back where it was.
  const fit = (node, least) => { node.style.height = 'auto'; node.style.height = `${Math.max(node.scrollHeight + 2, least)}px`; };
  const grow = () => {
    const y = scrollPosition();
    fit(title, 0);
    fit(text, 132);
    if (scrollPosition() !== y) scrollToPosition(y);
  };
  title.addEventListener('input', () => {
    // A title is one line of thought: a pasted line break becomes a space.
    if (title.value.includes('\n')) title.value = title.value.replace(/\s*\n\s*/g, ' ');
    grow();
  });
  title.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); text.focus(); } });
  text.addEventListener('input', grow);

  async function drawRefs() {
    clear(refList);
    if (!refs.length) {
      add(refList, el('p', { class: 'muted small', text: 'No passages yet. Add one below, or in the Bible select verses and choose Note, then “Add to a reflection”.' }));
      return;
    }
    const previews = await Promise.all(refs.map((ref) => verseText(ref.start).catch(() => '')));
    refs.forEach((ref, index) => {
      const place = parseVerseId(ref.start);
      const last = parseVerseId(ref.end);
      add(refList, el('div', { class: 'reflection-ref' },
        el('button', { class: 'ref-open', onclick: () => go(`#/read/${place.book}/${place.chapter}/${place.verse}${last.chapter === place.chapter && last.verse > place.verse ? `-${last.verse}` : ''}`) },
          el('span', { class: 'result-ref', text: formatRange(ref.start, ref.end) }),
          el('span', { class: 'xref-text', text: `${previews[index]}${ref.start !== ref.end ? ' …' : ''}` })),
        el('button', { class: 'icon-button', 'aria-label': `Remove ${formatRange(ref.start, ref.end)}`, onclick: () => { refs = refs.filter((other) => other !== ref); mark(); drawRefs(); } }, icon('close', 18))));
    });
  }

  // Adding a passage by typing its reference.
  const refInput = el('input', { class: 'field', type: 'text', placeholder: 'Add a passage, such as “Gen 1:26-27”', autocomplete: 'off', autocapitalize: 'words', 'aria-label': 'Passage to add' });
  const refPreview = el('p', { class: 'muted small' });
  const refButton = el('button', { class: 'button quiet', disabled: true }, 'Add');
  let pending = null;
  refInput.addEventListener('input', async () => {
    const typed = refInput.value;
    const parsed = parseReference(typed);
    pending = null;
    refButton.disabled = true;
    if (!parsed) {
      refPreview.textContent = typed.trim() ? 'No passage matches that yet.' : '';
      return;
    }
    const [c1, v1, c2, v2] = parsed.span;
    const from = verseId(parsed.book, c1, v1);
    const to = verseId(parsed.book, c2, v2);
    // The passage can be added at once; its words follow when the book has loaded.
    pending = { start: from, end: to };
    refButton.disabled = false;
    refPreview.textContent = formatRange(from, to);
    const preview = await verseText(from).catch(() => '');
    if (refInput.value === typed && preview) refPreview.textContent = `${formatRange(from, to)}: ${preview}${from !== to ? ' …' : ''}`;
  });
  const addPending = () => {
    if (!pending) return;
    refs = sortRefs([...refs, pending]);
    pending = null;
    refInput.value = '';
    refPreview.textContent = '';
    refButton.disabled = true;
    mark();
    drawRefs();
  };
  refButton.addEventListener('click', addPending);
  refInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); addPending(); } });

  // Words brought from the Bible are the reader's own and are kept as soon as the
  // screen is up; a passage alone is not, until something is written about it.
  if (handed) requestAnimationFrame(mark);

  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/notes') }, icon('back'), el('span', { text: 'Back' })),
      status.node),
    el('article', { class: 'chapter reflection-page' },
      el('p', { class: 'rubric', text: existing ? 'Reflection' : 'New reflection' }),
      title,
      text,
      el('h3', { class: 'passage-heading', text: 'Passages' }),
      refList,
      el('div', { class: 'inline-form' }, refInput, refButton),
      refPreview,
      el('label', { class: 'field-label inline reflection-date' }, 'Filed under', date),
      existing ? el('div', { class: 'prayer-actions' },
        el('button', {
          class: 'text-button',
          onclick: () => confirmSheet('Delete this reflection?', 'It will be removed from this device.', 'Delete', async () => {
            deleted = true;
            await saver.stop();
            if (record.id) await deleteReflection(record.id);
            toast('Reflection deleted');
            go('#/notes');
          }),
        }, 'Delete this reflection')) : null),
  );
  await drawRefs();
  requestAnimationFrame(grow);
  if (!existing) setTimeout(() => (title.value ? text : title).focus(), 250);
  // Leaving the screen keeps what was written, a reference typed but not yet added included.
  return () => {
    if (!deleted) addPending();
    return saver.stop();
  };
}
