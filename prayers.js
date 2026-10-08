// prayers.js
// The prayer library: the prayers that ship with the app, the reader's own
// prayers, and the code that turns a prayer's text into what is shown.
//
// A prayer's text is a list of stanzas, each a list of lines. A line may
// begin with a marker (see tools/sources/prayers/README.md):
//   "V. " / "R. "  versicle and response      "! "  a rubric
//   "# "           a heading                  "@ "  a Scripture passage
//   "> "           another prayer, by id      "- "  a litany line: "- invocation | response"

import { versesFor } from './bible.js';
import { db, saveSetting, settings } from './db.js';
import { el } from './ui.js';

let library = null;
let builtIn = new Map();

// Prayers of this category are fragments used inside others; the library does not list them.
const PART = 'part';

export async function loadPrayers() {
  if (!library) {
    const response = await fetch('data-prayers.json');
    if (!response.ok) throw new Error('The prayers could not be loaded.');
    library = await response.json();
    builtIn = new Map(library.prayers.map((item) => [item.id, item]));
  }
  return library;
}

/** Everything in data-prayers.json. Call loadPrayers() first. */
export function prayerData() {
  return library;
}

export function categories() {
  return library ? library.categories : [];
}

/** The prayers that ship with the app, without the fragments. */
export function listedPrayers() {
  return library ? library.prayers.filter((item) => item.category !== PART) : [];
}

// ---------------------------------------------------------------------------
// The reader's own prayers
// ---------------------------------------------------------------------------

function toStanzas(text) {
  return (text || '')
    .split(/\n\s*\n/)
    .map((stanza) => stanza.split('\n').map((line) => line.trim()).filter(Boolean))
    .filter((stanza) => stanza.length);
}

function fromOwn(record) {
  const prayer = { id: `own-${record.id}`, own: true, record, title: record.title, category: 'own', en: toStanzas(record.text) };
  const latin = toStanzas(record.latin);
  if (latin.length) prayer.la = latin;
  return prayer;
}

export async function ownPrayers() {
  const rows = await db.all('ownPrayers');
  return rows.sort((a, b) => a.title.localeCompare(b.title)).map(fromOwn);
}

/** Save one of the reader's own prayers; returns its library id ("own-3"). */
export async function saveOwnPrayer({ id, title, text, latin }) {
  const now = new Date().toISOString();
  const record = { title: title.trim(), text: text.trim(), latin: (latin || '').trim(), updated: now };
  if (id) {
    const existing = await db.get('ownPrayers', id);
    Object.assign(record, { id, created: existing ? existing.created : now });
  } else {
    record.created = now;
  }
  const key = await db.put('ownPrayers', record);
  return `own-${key}`;
}

/**
 * Delete one of the reader's own prayers and forget it as a favourite.
 * Whoever calls this also takes it off the daily list and out of novenas
 * (see view-library.js), so that nothing is left pointing at its id.
 */
export async function deleteOwnPrayer(id) {
  await db.remove('ownPrayers', id);
  const current = settings().favourites || [];
  if (current.includes(`own-${id}`)) await saveSetting('favourites', current.filter((item) => item !== `own-${id}`));
}

/** Find any prayer, built-in or the reader's own, by its library id. */
export async function findPrayer(id) {
  if (builtIn.has(id)) return builtIn.get(id);
  const match = /^own-(\d+)$/.exec(id || '');
  if (match) {
    const record = await db.get('ownPrayers', Number(match[1]));
    if (record) return fromOwn(record);
  }
  return null;
}

/** A prayer's title without loading it, for lists; falls back to the id. */
export function builtInTitle(id) {
  return builtIn.has(id) ? builtIn.get(id).title : null;
}

// ---------------------------------------------------------------------------
// Favourites
// ---------------------------------------------------------------------------

export function isFavourite(id) {
  return (settings().favourites || []).includes(id);
}

export async function toggleFavourite(id) {
  const current = settings().favourites || [];
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  await saveSetting('favourites', next);
  return next.includes(id);
}

// ---------------------------------------------------------------------------
// Prayers that follow the liturgical year
// ---------------------------------------------------------------------------

/** The Angelus, or in the Easter season the Regina Caeli that replaces it. */
export function angelusFor(day) {
  return day.season === 'easter' ? 'regina-caeli' : 'angelus';
}

/**
 * The antiphon of Our Lady proper to the season: Alma Redemptoris Mater from
 * Advent to 1 February, Ave Regina Caelorum until Holy Week, Regina Caeli in
 * Easter, and the Salve Regina for the rest of the year.
 */
export function marianAntiphonFor(day) {
  const monthDay = day.date.slice(5);
  if (day.season === 'easter') return 'regina-caeli';
  if (day.season === 'advent' || day.season === 'christmas') return 'alma-redemptoris';
  if (day.season === 'lent' || day.season === 'holy-week' || day.season === 'triduum') return 'ave-regina-caelorum';
  // Ordinary Time: the weeks before Lent belong to the winter antiphons.
  if (monthDay < '02-02') return 'alma-redemptoris';
  if (monthDay < '04-01' && day.week <= 9) return 'ave-regina-caelorum';
  return 'hail-holy-queen';
}

/** Resolve the prayer a daily-list entry points at, allowing for the season. */
export function seasonalPrayerId(id, day) {
  return id === 'angelus' ? angelusFor(day) : id;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function words(text) {
  return settings().holyGhost ? text.replace(/Holy Spirit/g, 'Holy Ghost') : text;
}

async function renderLine(line, language, depth, plain) {
  const marker = line.slice(0, 2);
  const rest = line.slice(2).trim();
  const say = (text) => (language === 'en' ? words(text) : text);
  // In a prayer the reader typed or pasted, only "V." and "R." mean anything;
  // a line that happens to begin with a dash or a hash is just a line.
  if (plain && !/^[VR]\. /.test(line)) return el('p', { class: 'prayer-line', text: say(line) });
  if (line.startsWith('V. ') || line.startsWith('R. ')) {
    const response = line.startsWith('R. ');
    return el('p', { class: `prayer-line ${response ? 'response' : 'versicle'}` },
      el('span', { class: 'vr', 'aria-label': response ? 'Response' : 'Versicle', text: response ? '℟' : '℣' }),
      el('span', { text: say(line.slice(3)) }));
  }
  if (marker === '! ') return el('p', { class: 'prayer-rubric', text: say(rest) });
  if (marker === '# ') return el('h4', { class: 'prayer-heading', text: say(rest) });
  if (marker === '- ') {
    const [invocation, response] = rest.split(' | ');
    if (!response) return el('p', { class: 'prayer-line', text: say(rest) });
    return el('p', { class: 'prayer-line litany' },
      el('span', { class: 'invocation', text: `${say(invocation)},` }), ' ',
      el('span', { class: 'answer', text: `${say(response)}.` }));
  }
  if (marker === '@ ') {
    const [bookId, c1, v1, c2, v2] = rest.split(' ');
    const verses = await versesFor(bookId, [[Number(c1), Number(v1), Number(c2), Number(v2)]]);
    return el('div', { class: 'prayer-scripture' }, verses.map((verse) => el('p', { class: 'prayer-line', text: verse.text })));
  }
  if (marker === '> ') {
    const [id, times] = rest.split(' x');
    const target = builtIn.get(id);
    if (!target || depth > 1) return null;
    const body = await renderStanzas(target, language, depth + 1);
    // Fragments of a litany read as part of it; whole prayers fold away, since
    // whoever is praying the Angelus knows the Hail Mary.
    if (target.category === PART) return body;
    const label = times ? `${target.title}, ${times} times` : target.title;
    return el('details', { class: 'prayer-include' }, el('summary', { text: language === 'la' && target.latin ? target.latin : label }), body);
  }
  return el('p', { class: 'prayer-line', text: say(line) });
}

async function renderStanza(stanza, language, depth, plain) {
  const lines = await Promise.all(stanza.map((line) => renderLine(line, language, depth, plain)));
  return el('div', { class: `stanza${language === 'la' ? ' latin' : ''}`, lang: language }, lines);
}

async function renderStanzas(prayer, mode, depth = 0) {
  const english = prayer.en || prayer.la || [];
  const latin = prayer.la || null;
  const wrapper = el('div', { class: 'prayer-text' });
  const plain = Boolean(prayer.own);
  if (mode === 'both' && latin && prayer.en) {
    if (latin.length === english.length) {
      for (let index = 0; index < english.length; index += 1) {
        wrapper.append(el('div', { class: 'stanza-pair' },
          await renderStanza(english[index], 'en', depth, plain),
          await renderStanza(latin[index], 'la', depth, plain)));
      }
      return wrapper;
    }
    // The two texts do not divide alike, so they cannot be set side by side:
    // the English in full, then the Latin.
    for (const stanza of english) wrapper.append(await renderStanza(stanza, 'en', depth, plain));
    for (const stanza of latin) wrapper.append(await renderStanza(stanza, 'la', depth, plain));
    return wrapper;
  }
  const useLatin = (mode === 'la' || !prayer.en) && latin;
  const stanzas = useLatin ? latin : english;
  for (const stanza of stanzas) wrapper.append(await renderStanza(stanza, useLatin ? 'la' : 'en', depth, plain));
  return wrapper;
}

/**
 * Build the text of a prayer.
 *
 * @param {object} prayer - From findPrayer().
 * @param {string} [mode] - 'en', 'la' or 'both'; defaults to the reader's setting.
 *   A prayer with no Latin is shown in English whatever the mode.
 */
export function renderPrayer(prayer, mode = settings().prayerLanguage) {
  return renderStanzas(prayer, mode);
}

/**
 * The books of the Bible the prayers and devotions quote, so they can be
 * fetched ahead of time and be there when the reader is offline.
 */
export function scriptureBooks() {
  if (!library) return [];
  const books = new Set();
  for (const prayer of library.prayers) {
    for (const line of [...(prayer.en || []), ...(prayer.la || [])].flat()) {
      if (line.startsWith('@ ')) books.add(line.split(' ')[1]);
    }
  }
  for (const group of library.rosary.sets) for (const mystery of group.mysteries) books.add(mystery.scripture[0]);
  for (const station of library.stations) books.add(station.scripture[0]);
  return [...books];
}

/** Whether a language choice makes any difference for this prayer. */
export function hasLatin(prayer) {
  return Boolean(prayer.la && prayer.en);
}

/** The plain words of a prayer, for searching the library. */
export function plainText(prayer) {
  return [prayer.title, prayer.latin || '', ...(prayer.en || []).flat(), ...(prayer.la || []).flat()]
    .join(' ')
    .toLowerCase();
}
