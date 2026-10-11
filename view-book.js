// view-book.js
// "About this book": a short introduction to one book of the Bible. What it
// is, who wrote it and when as far as can be known, the world it came from,
// what to look for in it, and a few passages worth knowing, shown in the
// translation the reader has chosen.

import { book, formatSpan, versesFor } from './bible.js';
import { go, goBack } from './context.js';
import { add, el, icon } from './ui.js';

let introductions = null;

/** Every introduction, keyed by book id; fetched once. */
async function loadIntroductions() {
  if (!introductions) {
    const response = await fetch('data-introductions.json');
    if (!response.ok) throw new Error('The introductions could not be loaded.');
    introductions = (await response.json()).books;
  }
  return introductions;
}

/** The introduction to one book, or null. */
export async function introductionTo(bookId) {
  return (await loadIntroductions())[bookId] || null;
}

function fact(label, value) {
  return value ? el('div', { class: 'book-fact' }, el('dt', { text: label }), el('dd', { text: value })) : null;
}

/** A passage worth knowing: its reference, what it is, and its opening words. */
async function keyPassage(bookId, { ref, note }) {
  const [chapter, first, last = first] = ref;
  const verses = await versesFor(bookId, [[chapter, first, chapter, last]]).catch(() => []);
  const words = verses.map((verse) => verse.text).join(' ');
  const shown = words.length > 220 ? `${words.slice(0, 218).replace(/\s+\S*$/, '')}…` : words;
  return el('button', {
    class: 'help-passage book-passage',
    onclick: () => go(`#/read/${bookId}/${chapter}/${first}${last > first ? `-${last}` : ''}`),
  },
  el('span', { class: 'result-ref', text: formatSpan(bookId, [chapter, first, chapter, last]) }),
  el('span', { class: 'book-passage-note', text: note }),
  shown ? el('span', { class: 'help-verses', text: shown }) : null);
}

export async function renderBook(container, { id }) {
  const entry = book(id);
  const back = el('header', { class: 'reader-bar' },
    el('button', { class: 'back-button', onclick: () => goBack(`#/read/${id}/1`) }, icon('back'), el('span', { text: 'Back' })));
  if (!entry) {
    add(container, back, el('p', { class: 'empty', text: 'That book is not in the app.' }));
    return;
  }
  let about;
  try {
    about = await introductionTo(id);
  } catch {
    about = null;
  }
  const chapters = entry.chapters.length;
  add(container,
    back,
    el('article', { class: 'chapter book-about' },
      el('p', { class: 'rubric', text: `${entry.group} · ${chapters === 1 ? 'One chapter' : `${chapters} chapters`}` }),
      el('h2', { class: 'chapter-title', text: entry.name }),
      entry.drName ? el('p', { class: 'chapter-sub', text: `${entry.drName} in the Douay-Rheims` }) : null,
      about
        ? [
          el('p', { class: 'book-lead', text: about.about }),
          el('dl', { class: 'book-facts' },
            fact('Written by', about.author),
            fact('When', about.date),
            fact('Language', about.language),
            fact('Its world', about.setting)),
          el('h3', { class: 'passage-heading', text: 'What to look for' }),
          el('ul', { class: 'book-themes' }, about.themes.map((theme) => el('li', { text: theme }))),
          el('h3', { class: 'passage-heading', text: 'Passages worth knowing' }),
          await Promise.all(about.key.map((item) => keyPassage(id, item))),
          about.canon ? el('p', { class: 'book-canon muted', text: about.canon }) : null,
          el('div', { class: 'button-row' },
            el('button', { class: 'button', onclick: () => go(`#/read/${id}/1`) }, chapters === 1 ? `Read ${entry.name}` : `Read from chapter 1`)),
          el('h3', { class: 'passage-heading', text: 'Where this comes from' }),
          el('ul', { class: 'help-from muted small' }, about.sources.map((line) => el('li', { text: line }))),
          el('p', { class: 'muted small', text: 'A summary in the app’s own words from standard Catholic and scholarly introductions. Where the Church’s tradition and present-day scholarship differ about who wrote a book or when, both are given; the Church teaches that God is the author of every book of Scripture, whoever held the pen.' }),
        ]
        : el('p', { class: 'empty', text: 'The introduction could not be loaded. Check your connection and try again.' })),
  );
}
