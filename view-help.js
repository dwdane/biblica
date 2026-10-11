// view-help.js
// "For times like these": counsel from the saints for hard days and good
// ones, and the short prayers to carry through the day.
//
// Each piece of counsel is opened by the reader when they want it. The app
// never offers it unasked, never guesses what someone is going through, and
// never tells anyone what stage of the spiritual life they are in: the
// research behind these pages warns against all three. The words are
// summaries of what the saints wrote, in the app's own words, with the
// sources named at the foot of each page.

import { formatSpan, versesFor } from './bible.js';
import { go, goBack, today } from './context.js';
import { aspirationFor, aspirations, findPrayer, helpTopics, renderPrayer } from './prayers.js';
import { add, el, icon } from './ui.js';

const KIND_TITLES = { hard: 'In hard times', good: 'In good times' };

// Crisis lines, to call or text from the page itself: 988 in the United States and
// Canada, Samaritans on 116 123 in the United Kingdom and Ireland.
function crisisLinks() {
  return el('div', { class: 'help-links' },
    el('a', { class: 'chip-button', href: 'tel:988' }, 'Call 988'),
    el('a', { class: 'chip-button', href: 'sms:988' }, 'Text 988'),
    el('a', { class: 'chip-button', href: 'tel:116123' }, 'Call 116 123'));
}

function urgentNote() {
  return el('div', { class: 'help-urgent quiet', role: 'note' },
    el('p', { text: 'If you are in danger, or thinking of harming yourself, call or text 988 in the United States or Canada, call Samaritans on 116 123 in the United Kingdom or Ireland, or your local emergency number, now.' }),
    crisisLinks());
}

/** The list of times of life. */
export async function renderHelp(container) {
  const topics = helpTopics();
  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/pray') }, icon('back'), el('span', { text: 'Back' }))),
    el('h1', { class: 'page-title', text: 'For times like these' }),
    el('p', { class: 'muted page-intro', text: 'What the saints counsel for the hard days and the good ones, with Scripture and a prayer for each. Open whichever fits; leave the rest. None of it replaces a confessor, a doctor or a friend.' }),
    urgentNote(),
    Object.entries(KIND_TITLES).map(([kind, title]) => {
      const list = topics.filter((item) => item.kind === kind);
      if (!list.length) return null;
      return el('section', { class: 'card list-card' },
        el('h3', { class: 'card-heading', text: title }),
        list.map((item) => el('button', { class: 'list-row', onclick: () => go(`#/pray/help/${item.id}`) },
          el('span', { class: 'row-text' },
            el('span', { class: 'row-title', text: item.title }),
            el('span', { class: 'row-sub', text: item.sub })),
          icon('forward', 18))));
    }),
  );
}

/** One time of life: the counsel, what to do now, Scripture, a prayer and where it comes from. */
export async function renderHelpTopic(container, { id }) {
  const topic = helpTopics().find((item) => item.id === id);
  const back = el('header', { class: 'reader-bar' },
    el('button', { class: 'back-button', onclick: () => goBack('#/pray/help') }, icon('back'), el('span', { text: 'Back' })));
  if (!topic) {
    add(container, back, el('p', { class: 'empty', text: 'That page is not in the app.' }));
    return;
  }

  const passages = await Promise.all((topic.scripture || []).map(async ([bookId, c1, v1, c2, v2]) => {
    const span = [c1, v1, c2, v2];
    const verses = await versesFor(bookId, [span]).catch(() => []);
    return { bookId, span, verses };
  }));
  const prayers = (await Promise.all((topic.prayers || []).map((prayerId) => findPrayer(prayerId)))).filter(Boolean);

  add(container,
    back,
    el('article', { class: 'chapter help-page' },
      el('p', { class: 'rubric', text: KIND_TITLES[topic.kind] || '' }),
      el('h2', { class: 'chapter-title', text: topic.title }),
      topic.urgent ? el('div', { class: 'help-urgent', role: 'note' }, el('p', { text: topic.urgent }), crisisLinks()) : null,
      topic.counsel.map((paragraph) => el('p', { class: 'devotion-guide', text: paragraph })),
      el('h3', { class: 'passage-heading', text: 'What to do now' }),
      el('ul', { class: 'help-do' }, topic.do.map((line) => el('li', { text: line }))),
      passages.length ? el('h3', { class: 'passage-heading', text: 'From Scripture' }) : null,
      passages.map(({ bookId, span, verses }) => el('button', {
        class: 'help-passage',
        onclick: () => go(`#/read/${bookId}/${span[0]}/${span[1]}${span[2] === span[0] && span[3] > span[1] ? `-${span[3]}` : ''}`),
      },
      el('span', { class: 'result-ref', text: formatSpan(bookId, span) }),
      el('span', { class: 'help-verses', text: verses.length ? verses.map((verse) => verse.text).join(' ') : 'Open in the Bible.' }))),
      prayers.length ? el('h3', { class: 'passage-heading', text: prayers.length > 1 ? 'Prayers' : 'A prayer' }) : null,
      await Promise.all(prayers.map(async (prayer) => el('details', { class: 'prayer-include' },
        el('summary', { text: prayer.title }), await renderPrayer(prayer)))),
      topic.links && topic.links.length
        ? el('div', { class: 'help-links' }, topic.links.map((link) => el('button', { class: 'chip-button', onclick: () => go(link.path === '#/journal' ? `#/journal/${today()}` : link.path) }, link.label)))
        : null,
      el('h3', { class: 'passage-heading', text: 'Where this comes from' }),
      el('ul', { class: 'help-from muted small' }, topic.from.map((line) => el('li', { text: line }))),
      el('p', { class: 'muted small', text: 'The counsel above is a summary in the app’s own words, not a quotation, except where Scripture is quoted.' })),
  );
}

/** The short prayers to carry through the day, today's first. */
export async function renderAspirations(container) {
  const now = today();
  const todays = aspirationFor(now);
  const all = aspirations();
  const line = (item, current) => el('li', { class: `aspiration-row${current ? ' current' : ''}` },
    el('span', { class: 'aspiration-text', text: item.text }),
    item.by || item.ref
      ? el('span', { class: 'muted small' },
        item.by || '',
        item.ref ? [item.by ? ', ' : '', el('button', {
          class: 'text-button inline',
          onclick: () => go(`#/read/${item.ref[0]}/${item.ref[1]}/${item.ref[2]}`),
        }, formatSpan(item.ref[0], item.ref.slice(1), { short: true }))] : null)
      : null);
  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => goBack('#/pray') }, icon('back'), el('span', { text: 'Back' }))),
    el('h1', { class: 'page-title', text: 'Short prayers' }),
    el('p', { class: 'muted page-intro', text: 'One short prayer at the turns of the day (the door, the desk, the kettle) keeps the heart turned to God. Saint Francis de Sales says not to tie yourself to set words: these are only a start. Today’s is first; Today shows it too.' }),
    todays ? el('section', { class: 'card aspiration-card' },
      el('span', { class: 'card-heading plain', text: 'For today' }),
      el('ul', { class: 'aspiration-list' }, line(todays, true))) : null,
    el('section', { class: 'card' },
      el('ul', { class: 'aspiration-list' }, all.filter((item) => item !== todays).map((item) => line(item, false)))),
  );
}
