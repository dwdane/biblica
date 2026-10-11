// view-early.js
// The shelf of early Christian writings: the Didache, the letters of
// Clement, Ignatius and Polycarp, the Martyrdom of Polycarp, the Letter to
// Diognetus and Justin's First Apology. They are kept apart from the Bible
// and always labelled as what they are: treasured by the Church, but not
// Scripture.
//
// The shelf and its introductions are part of the app; each work's text is
// fetched when it is first opened and then kept for reading offline.

import { go, goBack } from './context.js';
import { add, clear, el, icon, scroller } from './ui.js';
import { EARLY_PREFIX } from './study.js';

let shelf = null;
const texts = new Map();

/** The shelf: { intro, translation, entries: [{ id, title, subtitle, author, date, about, note?, works }] }. */
export async function loadShelf() {
  if (!shelf) {
    const response = await fetch('data-early.json');
    if (!response.ok) throw new Error('The early writings could not be loaded.');
    shelf = await response.json();
  }
  return shelf;
}

async function loadWork(id) {
  if (!texts.has(id)) {
    const response = await fetch(`${EARLY_PREFIX}${id}.json`);
    if (!response.ok) throw new Error('This writing could not be loaded. Check your connection and try again.');
    texts.set(id, await response.json());
  }
  return texts.get(id);
}

const NOT_SCRIPTURE = 'Early Christian writing · not Scripture';

function backBar(fallback) {
  return el('header', { class: 'reader-bar' },
    el('button', { class: 'back-button', onclick: () => goBack(fallback) }, icon('back'), el('span', { text: 'Back' })));
}

function chapterLabel(chapter) {
  return chapter.n ? `${chapter.n}. ${chapter.title}` : chapter.title;
}

/** A paragraph whose verses are numbered in the text, with the numbers drawn as in the Bible. */
function withVerseNumbers(text) {
  const pieces = text.split(/(?:^|\s)(\d{1,2})\. (?=[A-Z‘“(])/);
  const nodes = [];
  if (pieces[0]) nodes.push(pieces[0]);
  for (let index = 1; index < pieces.length; index += 2) {
    nodes.push(el('sup', { class: 'verse-number', text: pieces[index] }), `${pieces[index + 1]} `);
  }
  return nodes;
}

/** Rows for the shelf, for the book picker and the shelf page alike. */
export function shelfRows(entries, onOpen) {
  return entries.map((entry) => el('button', { class: 'list-row', onclick: () => onOpen(entry) },
    el('span', { class: 'row-text' },
      el('span', { class: 'row-title', text: entry.title }),
      el('span', { class: 'row-sub', text: entry.subtitle })),
    icon('forward', 18)));
}

/** The whole shelf, with what it is and is not. */
export async function renderShelf(container) {
  const { intro, translation, entries } = await loadShelf();
  add(container,
    backBar('#/read'),
    el('h1', { class: 'page-title', text: 'Early Christian writings' }),
    el('p', { class: 'muted page-intro', text: intro }),
    el('section', { class: 'card list-card' }, shelfRows(entries, (entry) => go(`#/early/${entry.id}`))),
    el('p', { class: 'muted small', text: translation }));
}

function aboutBlock(entry, open) {
  return el('details', { class: 'early-about', ...(open ? { open: true } : {}) },
    el('summary', { text: 'About this writing' }),
    el('p', { class: 'early-lead', text: entry.about }),
    el('dl', { class: 'book-facts' },
      el('div', { class: 'book-fact' }, el('dt', { text: 'Written by' }), el('dd', { text: entry.author })),
      el('div', { class: 'book-fact' }, el('dt', { text: 'When' }), el('dd', { text: entry.date }))),
    entry.note ? el('p', { class: 'book-canon muted', text: entry.note }) : null);
}

/** An entry with several works (the letters of Ignatius): what they are, and the list. */
async function renderGroup(container, entry, translation) {
  add(container,
    backBar('#/early'),
    el('article', { class: 'chapter' },
      el('p', { class: 'rubric', text: NOT_SCRIPTURE }),
      el('h2', { class: 'chapter-title', text: entry.title }),
      el('p', { class: 'chapter-sub', text: entry.subtitle }),
      aboutBlock(entry, true),
      el('section', { class: 'card list-card' }, entry.works.map((work) => el('button', { class: 'list-row tall', onclick: () => go(`#/early/${entry.id}/${work.id}`) },
        el('span', { class: 'row-text' },
          el('span', { class: 'row-title', text: work.title }),
          el('span', { class: 'row-sub', text: work.about })),
        icon('forward', 18)))),
      el('p', { class: 'muted small', text: translation })));
}

/** One work, whole, with its chapters to jump between. */
async function renderWork(container, entry, workId, translation) {
  const listed = entry.works.find((work) => work.id === workId) || entry.works[0];
  const grouped = entry.works.length > 1;
  const body = el('div', { class: 'early-text' }, el('p', { class: 'muted', text: 'Opening…' }));
  const anchors = new Map();
  const jump = (index) => {
    const target = anchors.get(index);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const position = entry.works.indexOf(listed);
  const previous = grouped ? entry.works[position - 1] : null;
  const next = grouped ? entry.works[position + 1] : null;
  add(container,
    backBar(grouped ? `#/early/${entry.id}` : '#/early'),
    el('article', { class: 'chapter early-work' },
      el('p', { class: 'rubric', text: NOT_SCRIPTURE }),
      el('h2', { class: 'chapter-title', text: grouped ? listed.title : entry.title }),
      el('p', { class: 'chapter-sub', text: grouped ? entry.subtitle : entry.subtitle }),
      grouped ? el('p', { class: 'early-lead', text: listed.about }) : aboutBlock(entry, false),
      listed.chapters.length > 1
        ? el('details', { class: 'early-contents' },
          el('summary', { text: `Chapters (${listed.chapters.length})` }),
          el('ol', { class: 'early-contents-list' }, listed.chapters.map((chapter, index) => el('li', {},
            el('button', { class: 'text-button', onclick: () => jump(index) }, chapterLabel(chapter))))))
        : null,
      body,
      grouped
        ? el('nav', { class: 'chapter-nav' },
          previous ? el('button', { class: 'button quiet', onclick: () => go(`#/early/${entry.id}/${previous.id}`) }, previous.title) : el('span'),
          next ? el('button', { class: 'button quiet', onclick: () => go(`#/early/${entry.id}/${next.id}`) }, next.title) : el('span'))
        : null,
      el('p', { class: 'muted small early-translation', text: translation })));

  // The Didache's translation numbers its verses in the running text ("1. There are two ways").
  const numbered = listed.id === 'didache';
  try {
    const work = await loadWork(listed.id);
    clear(body);
    work.chapters.forEach((chapter, index) => {
      const heading = el('h3', { class: 'early-chapter', id: `early-${index}`, text: chapterLabel(chapter) });
      anchors.set(index, heading);
      add(body,
        heading,
        chapter.addition ? el('p', { class: 'muted small', text: 'Thought to be a later addition, by another hand.' }) : null,
        chapter.paragraphs.map((text) => el('p', { class: 'early-p' }, numbered && /^\d+\. /.test(text) ? withVerseNumbers(text) : text)));
    });
  } catch (error) {
    clear(body).append(el('p', { class: 'empty', text: error.message }));
  }
  // Arriving from another work, start at the top.
  const area = scroller();
  if (area) area.scrollTop = 0;
}

/** #/early/<entry> or #/early/<entry>/<work>. */
export async function renderEntry(container, { id, work }) {
  const { entries, translation } = await loadShelf();
  const entry = entries.find((item) => item.id === id);
  if (!entry) {
    add(container, backBar('#/early'), el('p', { class: 'empty', text: 'That writing is not on the shelf.' }));
    return;
  }
  if (entry.works.length > 1 && !work) await renderGroup(container, entry, translation);
  else await renderWork(container, entry, work || entry.works[0].id, translation);
}
