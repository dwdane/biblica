// view-study.js
// Study a passage: its Latin, your own notes on it, the passages connected
// with it, and what the Fathers of the Church wrote about it.

import { book, chapterTitle, formatRange, formatSpan, loadBook, verseId, verseText } from './bible.js';
import { go, goBack } from './context.js';
import { db } from './db.js';
import { reflectionsOn, titleOf } from './reflections.js';
import { commentaryOn, crossReferences, latinFor } from './study.js';
import { add, clear, el, icon } from './ui.js';

// A passage longer than this is shown folded, with the rest a tap away.
const FOLD_AT = 520;

/** A passage of commentary, folded if long. */
function passageNode(bookId, passage, selection) {
  const [c1, v1, c2, v2] = passage.span;
  const same = c1 === selection.chapter && c2 === selection.chapter && v1 === selection.first && v2 === selection.last;
  const head = el('p', { class: 'father-source' },
    passage.catena ? 'Catena Aurea' : (passage.work || 'Source not named'),
    same ? null : el('span', { class: 'muted', text: ` · on ${formatSpan(bookId, passage.span, { short: true })}` }));
  const body = el('div', { class: 'father-text' });
  const paragraphs = (text) => text.split('\n\n').map((paragraph) => el('p', { text: paragraph }));
  if (passage.text.length <= FOLD_AT * 1.3) {
    add(body, paragraphs(passage.text));
    return el('div', { class: 'father-passage' }, head, body);
  }
  const cut = passage.text.lastIndexOf(' ', FOLD_AT);
  const more = el('button', { class: 'text-button', 'aria-expanded': 'false' }, 'Read more');
  const draw = (open) => {
    clear(body);
    add(body, paragraphs(open ? passage.text : `${passage.text.slice(0, cut)} …`));
    more.textContent = open ? 'Show less' : 'Read more';
    more.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  let open = false;
  more.addEventListener('click', () => { open = !open; draw(open); });
  draw(false);
  return el('div', { class: 'father-passage' }, head, body, more);
}

export async function render(container, { bookId, chapter, verses }) {
  const entry = book(bookId);
  const chapterNumber = Number(chapter);
  if (!entry || !(chapterNumber >= 1 && chapterNumber <= entry.chapters.length)) {
    add(container, el('p', { class: 'empty', text: 'That passage is not in this Bible.' }));
    return;
  }
  const count = entry.chapters[chapterNumber - 1];
  const [a, b] = String(verses || '1').split('-').map(Number);
  const first = Math.min(Math.max(a || 1, 1), count);
  const last = Math.min(Math.max(b || first, first), count);
  const selection = { chapter: chapterNumber, first, last };
  const start = verseId(bookId, chapterNumber, first);
  const end = verseId(bookId, chapterNumber, last);
  const text = (await loadBook(bookId))[chapterNumber - 1];
  const here = (verse) => `#/study/${bookId}/${chapterNumber}/${verse}`;
  const single = first === last;

  const latinNode = el('div', { class: 'study-latin', lang: 'la' });
  const mineNode = el('div', {});
  const xrefNode = el('div', {});
  const fathersNode = el('div', {}, el('p', { class: 'muted', text: 'Looking up the Fathers…' }));

  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack(`#/read/${bookId}/${chapterNumber}/${first}`) }, icon('back'), el('span', { text: 'Back' })),
      single ? el('div', { class: 'reader-tools' },
        el('button', { class: 'icon-button', 'aria-label': 'Previous verse', disabled: first <= 1, onclick: () => go(here(first - 1)) }, icon('back')),
        el('button', { class: 'icon-button', 'aria-label': 'Next verse', disabled: first >= count, onclick: () => go(here(first + 1)) }, icon('forward'))) : null),
    el('article', { class: 'chapter study-page' },
      el('p', { class: 'rubric', text: 'Study' }),
      el('h2', { class: 'chapter-title', text: formatRange(start, end) }),
      el('div', { class: 'study-text' },
        Array.from({ length: last - first + 1 }, (_, offset) => first + offset).filter((verse) => text[verse - 1]).map((verse) => el('p', { class: 'study-verse' },
          single ? null : el('sup', { class: 'verse-number', text: verse }),
          el('span', { text: text[verse - 1] })))),
      latinNode,
      el('div', { class: 'button-row spread' },
        el('button', { class: 'button quiet', onclick: () => go(`#/read/${bookId}/${chapterNumber}/${first}${single ? '' : `-${last}`}`) }, `Open ${chapterTitle(bookId, chapterNumber)}`),
        el('button', { class: 'button quiet', onclick: () => go(`#/pray/lectio/${bookId}/${chapterNumber}/${first}-${last}`) }, 'Pray with it')),
      mineNode,
      fathersNode,
      xrefNode),
  );

  // Each part fills in as it arrives; one failing does not hold up the others.
  latinFor(bookId, chapterNumber).then((latin) => {
    const lines = [];
    for (let verse = first; verse <= last; verse += 1) if (latin && latin[verse - 1]) lines.push(latin[verse - 1]);
    if (lines.length) add(latinNode, el('p', { class: 'study-latin-text', text: lines.join(' ') }), el('p', { class: 'muted small', text: 'Clementine Vulgate' }));
  }).catch(() => {});

  (async () => {
    const [notes, links, reflections] = await Promise.all([db.all('notes'), db.all('links'), reflectionsOn(bookId, chapterNumber, first, last)]);
    // Whether a passage of the reader's, from one verse id to another, takes in any verse being studied.
    const order = (id) => {
      const [bk, ch, vs] = id.split('.');
      return bk === bookId ? Number(ch) * 1000 + Number(vs) : null;
    };
    const touches = (startId, endId) => {
      const a = order(startId);
      const b = order(endId || startId);
      return a !== null && b !== null && a <= chapterNumber * 1000 + last && b >= chapterNumber * 1000 + first;
    };
    const myNotes = notes.filter((note) => touches(note.start, note.end));
    const myLinks = links.filter((link) => touches(link.from, link.fromEnd) || touches(link.to, link.toEnd));
    if (!myNotes.length && !myLinks.length && !reflections.length) return;
    add(mineNode, el('h3', { class: 'passage-heading', text: 'Yours' }),
      myNotes.map((note) => el('div', { class: 'note-card static' }, el('span', { class: 'note-body', text: note.text }))),
      reflections.map((record) => el('button', { class: 'list-row', onclick: () => go(`#/reflection/${record.id}`) },
        el('span', { class: 'row-text' }, el('span', { class: 'row-title', text: titleOf(record) }), el('span', { class: 'row-sub', text: 'Reflection' })), icon('forward', 18))),
      myLinks.map((link) => {
        const outgoing = touches(link.from, link.fromEnd);
        const target = outgoing ? [link.to, link.toEnd] : [link.from, link.fromEnd];
        const [bk, ch, vs] = target[0].split('.');
        return el('button', { class: 'list-row', onclick: () => go(`#/read/${bk}/${ch}/${vs}`) },
          el('span', { class: 'row-text' },
            el('span', { class: 'row-title', text: formatRange(target[0], target[1] || target[0]) }),
            el('span', { class: 'row-sub', text: link.note || 'Linked by you' })),
          icon('forward', 18));
      }));
  })().catch(() => {});

  crossReferences(bookId, chapterNumber, first, last).then(async (spans) => {
    if (!spans.length) return;
    const previews = await Promise.all(spans.map(([bk, c1, v1]) => verseText(verseId(bk, c1, v1)).catch(() => '')));
    add(xrefNode,
      el('h3', { class: 'passage-heading', text: 'Cross-references' }),
      spans.map(([bk, c1, v1, c2, v2], index) => el('button', { class: 'list-row tall xref', onclick: () => go(`#/read/${bk}/${c1}/${v1}${c1 === c2 && v2 > v1 ? `-${v2}` : ''}`) },
        el('span', { class: 'row-text' },
          el('span', { class: 'result-ref', text: formatSpan(bk, [c1, v1, c2, v2]) }),
          el('span', { class: 'xref-text', text: previews[index] })),
        icon('forward', 18))),
      el('p', { class: 'muted small', text: 'Cross-references from OpenBible.info, used under a Creative Commons Attribution licence.' }));
  }).catch(() => {});

  // Not waited for: a book's commentary can be several megabytes, and the screen
  // should show the verse, the Latin and the reader's own notes meanwhile.
  (async () => {
    try {
      const authors = await commentaryOn(bookId, chapterNumber, first, last);
      clear(fathersNode);
      add(fathersNode, el('h3', { class: 'passage-heading', text: 'The Fathers' }));
      if (!authors.length) {
        add(fathersNode, el('p', { class: 'muted', text: single
          ? 'Nothing on this verse in the app. The verses on either side may have something; use the arrows above.'
          : 'Nothing on these verses in the app.' }));
      } else {
        const total = authors.reduce((sum, author) => sum + author.passages.length, 0);
        add(fathersNode, el('p', { class: 'muted small', text: `${total} ${total === 1 ? 'passage' : 'passages'} from ${authors.length} ${authors.length === 1 ? 'writer' : 'writers'}, earliest first.` }));
        for (const author of authors) {
          const block = el('details', { class: 'father', open: authors.length <= 3 || total <= 6 },
            el('summary', {},
              el('span', { class: 'father-name', text: author.name }),
              author.year ? el('span', { class: 'father-year', text: author.year < 0 ? `${-author.year} BC` : String(author.year) }) : null,
              author.passages.length > 1 ? el('span', { class: 'father-count', text: String(author.passages.length) }) : null),
            author.note ? el('p', { class: 'father-note', text: author.note }) : null,
            author.passages.map((passage) => passageNode(bookId, passage, selection)));
          add(fathersNode, block);
        }
        add(fathersNode, el('p', { class: 'muted small', text: 'From the nineteenth-century English editions of the Fathers, and from the Catena Aurea of Saint Thomas Aquinas in Newman’s edition. The year is that of the writer’s death, or of the work; writers of unknown date come last. Not every writer quoted is a saint; where that matters, a note says so.' }));
      }
    } catch (error) {
      console.warn(error);
      clear(fathersNode);
      add(fathersNode, el('h3', { class: 'passage-heading', text: 'The Fathers' }),
        el('p', { class: 'muted', text: navigator.onLine ? 'The commentary on this book could not be loaded.' : 'The commentary on this book has not been saved to this device yet. It will load when you are back online.' }));
    }
  })();
}
