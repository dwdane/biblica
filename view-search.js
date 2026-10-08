// view-search.js
// Search the whole Bible for a word or phrase.

import { book, books } from './bible.js';
import { go } from './context.js';
import { prepare, search, splitMatches } from './search.js';
import { clear, el } from './ui.js';

const PAGE_SIZE = 60;

// What the reader last searched for, kept while the app stays open so that
// coming back from a result returns to the same list.
const remembered = { query: '', scope: 'all', exact: false };

export async function render(container, { query }) {
  if (query !== undefined) {
    // Arriving with words to look for (from a verse in the reader) starts a fresh search.
    remembered.query = query;
    remembered.scope = 'all';
    remembered.exact = false;
  }
  const input = el('input', {
    class: 'field search-field', type: 'search', placeholder: 'A word, or a “phrase in quotes”',
    autocomplete: 'off', autocapitalize: 'none', enterkeyhint: 'search', 'aria-label': 'Search the Bible',
  });
  input.value = remembered.query;
  const scope = el('select', { class: 'field select', 'aria-label': 'Where to search' },
    el('option', { value: 'all' }, 'Whole Bible'),
    el('option', { value: 'OT' }, 'Old Testament'),
    el('option', { value: 'NT' }, 'New Testament'),
    books().map((entry) => el('option', { value: entry.id }, entry.name)));
  scope.value = remembered.scope;
  const exact = el('input', { type: 'checkbox', id: 'exact-word' });
  exact.checked = remembered.exact;
  const status = el('p', { class: 'muted search-status', role: 'status' });
  const summary = el('div', { class: 'book-counts' });
  const list = el('ol', { class: 'result-list' });
  const more = el('button', { class: 'button quiet wide', hidden: true }, 'Show more');

  let shown = 0;
  let current = { results: [], byBook: new Map(), highlight: null };

  function drawMore() {
    const slice = current.results.slice(shown, shown + PAGE_SIZE);
    for (const verse of slice) {
      const entry = book(verse.book);
      list.append(el('li', {},
        el('button', { class: 'result', onclick: () => go(`#/read/${verse.book}/${verse.chapter}/${verse.verse}`) },
          el('span', { class: 'result-ref', text: `${verse.book === 'PSA' ? 'Psalm' : entry.name} ${verse.chapter}:${verse.verse}` }),
          el('span', { class: 'result-text' }, splitMatches(verse.text, current.highlight).map((piece) => (piece.hit ? el('mark', { text: piece.text }) : piece.text))))));
    }
    shown += slice.length;
    more.hidden = shown >= current.results.length;
  }

  function run() {
    remembered.query = input.value;
    remembered.scope = scope.value;
    remembered.exact = exact.checked;
    clear(list);
    clear(summary);
    shown = 0;
    more.hidden = true;
    const text = input.value.trim();
    if (!text) {
      status.textContent = 'Search every verse of the Douay-Rheims. Related forms are found together: “oak” also finds “oaks”.';
      return;
    }
    current = search(text, { scope: scope.value, exact: exact.checked });
    const count = current.results.length;
    if (!count) {
      status.textContent = scope.value === 'all'
        ? `No verse contains “${text}”. Older spellings are common in this translation: try “shew” for “show”.`
        : `No verse here contains “${text}”. Try the whole Bible.`;
      return;
    }
    status.textContent = `${count.toLocaleString()} ${count === 1 ? 'verse' : 'verses'} in ${current.byBook.size} ${current.byBook.size === 1 ? 'book' : 'books'}`;
    if (current.byBook.size > 1) {
      for (const [bookId, total] of current.byBook) {
        summary.append(el('button', { class: 'chip-button', onclick: () => { scope.value = bookId; run(); } }, `${book(bookId).short} ${total}`));
      }
    }
    drawMore();
  }

  let timer = null;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 220); });
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { clearTimeout(timer); run(); input.blur(); } });
  scope.addEventListener('change', run);
  exact.addEventListener('change', run);
  more.addEventListener('click', drawMore);

  container.append(
    el('header', { class: 'app-header' }, el('h1', { class: 'app-title', text: 'Search' })),
    el('div', { class: 'search-controls' },
      input,
      el('div', { class: 'search-options' },
        scope,
        el('label', { class: 'check', for: 'exact-word' }, exact, el('span', { text: 'Exact word only' })))),
    status, summary, list, more,
  );

  status.textContent = 'Getting the text ready…';
  try {
    await prepare((done, total) => { status.textContent = `Getting the text ready: ${done} of ${total} books`; });
    run();
  } catch {
    status.textContent = 'The Bible text could not be loaded. Connect to the internet once so the app can save it for offline use.';
  }
}
