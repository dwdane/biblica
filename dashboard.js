// dashboard.js
// Which cards Today shows below the day itself, and in what order. The
// reader arranges them; this module keeps the arrangement and has no DOM,
// so that it can be tested on its own.
//
// The day's banner and the week strip are always at the top: they are the
// day. Everything below them is the reader's to show, hide and order.

/**
 * Every card Today can show, in the order a new reader sees them.
 * `on` is whether it is shown before the reader has said otherwise.
 */
export const TODAY_CARDS = [
  { id: 'rule', label: 'For today', about: 'What you try to do today, from your rule of life, a tap away.', on: true },
  { id: 'sunday', label: 'The Lord’s day', about: 'On Sundays and holy days of obligation, a word on keeping the day.', on: true },
  { id: 'readings', label: 'Mass readings', about: 'The readings of the day, and the way into the Mass companion.', on: true },
  { id: 'saints', label: 'Your saints', about: 'On the feast of one of your own saints.', on: true },
  { id: 'aspiration', label: 'A short prayer', about: 'One short prayer to carry through the day.', on: true },
  { id: 'intentions', label: 'Intentions', about: 'The people and needs you are praying for.', on: false },
  { id: 'journal', label: 'Journal', about: 'Today’s page of your journal.', on: false },
  { id: 'help', label: 'For times like these', about: 'Counsel from the saints for hard days and good ones.', on: false },
  { id: 'history', label: 'On this day', about: 'Something that happened on this date in the Church’s history.', on: true },
  { id: 'continue', label: 'Continue reading', about: 'Where you left off in the Bible.', on: true },
  { id: 'plans', label: 'Reading plans', about: 'Shown only while you are following a reading plan.', on: true },
];

const KNOWN = new Set(TODAY_CARDS.map((card) => card.id));

/**
 * The arrangement to draw: every known card once, in the reader's order,
 * with any card added in a later release placed where it stands by default.
 *
 * @param {Array<{id: string, on: boolean}>|null} saved - What the reader last chose, or null.
 * @param {object} [legacy] - Older settings that still say something: `showOnThisDay`.
 * @returns {Array<{id: string, on: boolean}>}
 */
export function todayLayout(saved, legacy = {}) {
  const layout = [];
  const seen = new Set();
  for (const item of Array.isArray(saved) ? saved : []) {
    if (!item || !KNOWN.has(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    layout.push({ id: item.id, on: item.on !== false });
  }
  TODAY_CARDS.forEach((card, index) => {
    if (seen.has(card.id)) return;
    const on = card.id === 'history' && legacy.showOnThisDay === false ? false : card.on;
    // A card new to this reader goes after the card it follows by default, if that is shown.
    const before = TODAY_CARDS.slice(0, index).map((other) => other.id).filter((id) => seen.has(id));
    const after = before.length ? layout.findIndex((item) => item.id === before[before.length - 1]) + 1 : 0;
    layout.splice(after, 0, { id: card.id, on });
    seen.add(card.id);
  });
  return layout;
}

/** The layout with one card moved up (delta -1) or down (+1), within bounds. */
export function moveCard(layout, id, delta) {
  const from = layout.findIndex((item) => item.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= layout.length) return layout;
  const next = [...layout];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** The layout with one card shown or hidden. */
export function setCardOn(layout, id, on) {
  return layout.map((item) => (item.id === id ? { ...item, on } : item));
}

/** What a card is, by id. */
export function cardInfo(id) {
  return TODAY_CARDS.find((card) => card.id === id) || null;
}
