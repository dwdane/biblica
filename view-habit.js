// view-habit.js
// Interior habits: the list of them, one habit's page, and the reader's
// focus (the particular examen, kept gently).

import { formatSpan, versesFor } from './bible.js';
import { go, goBack, longDate, dayFor, refresh, today } from './context.js';
import { FOCUS_WEEKS, clearFocus, currentFocus, extendFocus, focusGuide, habitById, habits, setFocus } from './habits.js';
import { isOnList } from './practices.js';
import { add, choice, el, icon, openSheet, toast } from './ui.js';
import { addReference } from './view-daily.js';

function backBar(fallback) {
  return el('header', { class: 'reader-bar' },
    el('button', { class: 'back-button', onclick: () => goBack(fallback) }, icon('back'), el('span', { text: 'Back' })));
}

/** The weeks sheet: how long to keep a habit as the focus. */
function focusSheet(habit, onDone = refresh) {
  const now = today();
  let weeks = FOCUS_WEEKS[1];
  const guide = focusGuide();
  openSheet('Make this my focus', (close) => [
    el('p', { class: 'muted small', text: `“${habit.title}” will be shown on Today, and the evening examen and the midday pause will ask about it. Nothing is counted.` }),
    guide.cautions && guide.cautions.length ? el('ul', { class: 'help-do quiet small' }, guide.cautions.map((line) => el('li', { text: line }))) : null,
    el('div', { class: 'field-label' }, 'For',
      choice(FOCUS_WEEKS.map((value) => [value, `${value} weeks`]), weeks, (value) => { weeks = value; }, { label: 'How long', className: 'segmented' })),
    el('div', { class: 'button-row' },
      el('button', { class: 'button quiet', onclick: close }, 'Cancel'),
      el('button', {
        class: 'button',
        onclick: async () => {
          await setFocus(habit.id, weeks, now);
          close();
          toast(`Your focus: ${habit.title}`);
          await onDone();
        },
      }, 'Begin')),
  ]);
}

/** One habit's page. */
export async function renderHabit(container, { id }) {
  const habit = habitById(id);
  if (!habit) {
    add(container, backBar('#/pray/habits'), el('p', { class: 'empty', text: 'That habit is not in the app.' }));
    return;
  }
  const now = today();
  const focus = currentFocus(now);
  const isFocus = focus && focus.habit.id === habit.id;
  const onList = await isOnList(`habit:${habit.id}`);
  const passages = await Promise.all((habit.scripture || []).map(async ([bookId, c1, v1, c2, v2]) => {
    const span = [c1, v1, c2, v2];
    return { bookId, span, verses: await versesFor(bookId, [span], { translation: 'drb' }).catch(() => []) };
  }));

  add(container,
    backBar('#/pray/habits'),
    el('article', { class: 'chapter help-page habit-page' },
      el('p', { class: 'rubric', text: isFocus ? 'Your focus' : 'An interior habit' }),
      el('h2', { class: 'chapter-title', text: habit.title }),
      habit.sub ? el('p', { class: 'chapter-sub', text: habit.sub }) : null,
      (habit.what || []).map((paragraph) => el('p', { class: 'devotion-guide', text: paragraph })),
      habit.saints && habit.saints.length ? el('div', { class: 'habit-saints' }, habit.saints.map((line) => el('blockquote', { class: line.verbatim ? 'quote' : 'quote paraphrase' },
        el('p', { text: line.verbatim ? `“${line.text}”` : line.text }),
        el('footer', { class: 'muted small', text: line.by })))) : null,
      el('h3', { class: 'passage-heading', text: 'How' }),
      el('ul', { class: 'help-do' }, (habit.how || []).map((line) => el('li', { text: line }))),
      habit.start ? [el('h3', { class: 'passage-heading', text: 'To begin' }), el('p', { class: 'devotion-guide', text: habit.start })] : null,
      habit.examine ? [el('h3', { class: 'passage-heading', text: 'At night' }), el('p', { class: 'devotion-guide', text: habit.examine })] : null,
      habit.caution ? el('p', { class: 'help-urgent quiet', text: habit.caution }) : null,
      passages.length ? [
        el('h3', { class: 'passage-heading', text: 'From Scripture' }),
        passages.map(({ bookId, span, verses }) => el('button', { class: 'help-passage', onclick: () => go(`#/read/${bookId}/${span[0]}/${span[1]}`) },
          el('span', { class: 'result-ref', text: formatSpan(bookId, span) }),
          el('span', { class: 'help-verses', text: verses.length ? verses.map((verse) => verse.text).join(' ') : 'Open in the Bible.' }))),
      ] : null,
      habit.from && habit.from.length ? [
        el('h3', { class: 'passage-heading', text: 'Where this comes from' }),
        el('ul', { class: 'help-from muted small' }, habit.from.map((line) => el('li', { text: line }))),
      ] : null),
    el('div', { class: 'prayer-actions' },
      onList
        ? el('p', { class: 'muted small centre', text: 'This is in your habits.' })
        : el('button', { class: 'button quiet wide', onclick: () => addReference(`habit:${habit.id}`, refresh) }, 'Add to my habits'),
      isFocus
        ? el('button', { class: 'text-button', onclick: () => go('#/pray/focus') }, `Your focus until ${longDate(focus.until, dayFor(focus.until).weekdayName)}`)
        : el('button', { class: 'button wide', onclick: () => focusSheet(habit) }, 'Make this my focus')),
  );
}

/** All the interior habits, with the focus at the top. */
export async function renderHabits(container) {
  const now = today();
  const focus = currentFocus(now);
  add(container,
    backBar('#/pray'),
    el('h1', { class: 'page-title', text: 'Interior habits' }),
    el('p', { class: 'muted page-intro', text: 'Prayer said at set times is half of a rule of life. The other half is kept through the day, in the mind and the tongue and the will: how we think of others, what we say, how we bear what comes. These are the habits the saints worked at. Put any of them in your habits, or choose one as your focus for a few weeks.' }),
    el('button', { class: 'card card-button', onclick: () => go('#/pray/focus') },
      el('span', { class: 'card-heading plain', text: focus ? `Your focus: ${focus.habit.title}` : 'Choose a focus' }),
      el('span', { class: 'muted', text: focus ? (focus.over ? 'Its weeks are over. Keep it, or choose another.' : `Until ${longDate(focus.until, dayFor(focus.until).weekdayName)}`) : 'One habit at a time, for a few weeks: what Saint Ignatius called the particular examen.' })),
    el('div', { class: 'list-card' }, habits().map((habit) => el('button', { class: 'list-row tall', onclick: () => go(`#/pray/habit/${habit.id}`) },
      el('span', { class: 'row-text' },
        el('span', { class: 'row-title', text: habit.title }),
        el('span', { class: 'row-sub', text: habit.sub })),
      icon('forward', 18)))),
  );
}

/** The focus: what it is, the one chosen, and the way to keep, change or set it down. */
export async function renderFocus(container) {
  const now = today();
  const focus = currentFocus(now);
  const guide = focusGuide();
  add(container,
    backBar('#/pray/habits'),
    el('article', { class: 'chapter help-page focus-page' },
      el('p', { class: 'rubric', text: 'The particular examen' }),
      el('h2', { class: 'chapter-title', text: focus ? `Your focus: ${focus.habit.title}` : 'A focus' }),
      (guide.about || []).map((paragraph) => el('p', { class: 'devotion-guide', text: paragraph })),
      guide.cautions && guide.cautions.length ? el('ul', { class: 'help-do quiet' }, guide.cautions.map((line) => el('li', { text: line }))) : null,
      focus ? [
        el('h3', { class: 'passage-heading', text: focus.over ? 'Its weeks are over' : `Until ${longDate(focus.until, dayFor(focus.until).weekdayName)}` }),
        el('p', { class: 'devotion-guide', text: focus.habit.examine || '' }),
        el('div', { class: 'button-row wrap' },
          el('button', { class: 'button quiet', onclick: () => go(`#/pray/habit/${focus.habit.id}`) }, 'About this habit'),
          el('button', { class: 'button quiet', onclick: async () => { await extendFocus(FOCUS_WEEKS[1], now); toast('Kept for four more weeks'); refresh(); } }, 'Keep it longer'),
          el('button', { class: 'button quiet danger', onclick: async () => { await clearFocus(); toast('Your focus is set down'); refresh(); } }, 'Set it down')),
      ] : null,
      el('h3', { class: 'passage-heading', text: focus ? 'Or choose another' : 'Choose one' }),
      el('div', { class: 'list-card' }, habits().map((habit) => el('button', { class: 'list-row', onclick: () => focusSheet(habit) },
        el('span', { class: 'row-text' }, el('span', { class: 'row-title', text: habit.title }), el('span', { class: 'row-sub', text: habit.sub })),
        icon('forward', 18))))),
  );
}
