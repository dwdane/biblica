// sw.js
// Offline support and updates. Two caches are kept:
//
//   biblica-shell-<VERSION>-<BUILD>
//                            the app itself and its small data files. It is
//                            replaced whole on every release, which is how
//                            updates reach an installed app. The build is in
//                            the name so that a correction published under
//                            the same version number is fetched into a cache
//                            of its own, and never into the one a running
//                            page is being served from.
//   biblica-text-<TEXT>      the Bible text and the study material (the Latin,
//                            cross-references and the Fathers), one file per
//                            book, saved as each is first opened. It survives
//                            app updates and is only replaced when those
//                            files change.
//
// Nothing else is ever stored, and every cache that is not one of these two
// is deleted when a release takes over, so what the app keeps on a device
// does not grow from one release to the next.
//
// A release is installed whole or not at all. Each of its files is fetched
// under an address no cache has seen and checked against the fingerprint
// recorded below, so a file that is missing from the site, or left over from
// an earlier release because an upload fell short, stops the install instead
// of being mixed in. The release already on the device carries on, and the
// open pages are told which files were at fault.
//
// On every release, bump VERSION here and APP_VERSION in version.js
// together, then run `uv run biblica-stamp` in tools/ to record the
// fingerprints (a test fails if they are out of date). The per-book text
// (drb-, cpdv-, study-, fathers-, early-) is kept apart in its own
// cache, which outlives releases. When some of those files are corrected, add
// an entry to TEXT_CORRECTIONS with the next revision number and the folders or
// files it touched, and leave the earlier entries in place. Bump TEXT_VERSION
// only when the text is replaced wholesale, since a new TEXT_VERSION discards
// everything saved for reading offline.

const VERSION = '0.5.0';
const TEXT_VERSION = '1';

const TEXT_CACHE = `biblica-text-flat-${TEXT_VERSION}`;
// Requests for the per-book files are recognised by how their address begins,
// counted from the folder the app is served from.
const TEXT_PATHS = ['drb-', 'cpdv-', 'study-', 'fathers-', 'early-'];
// Corrections to the per-book text since TEXT_VERSION was set, oldest first. A
// copy kept for reading offline from before a correction is fetched again, so
// the correction arrives without discarding the rest of what was saved. The
// device records the last revision it has, and so catches up on every
// correction however many releases it skips.
const TEXT_CORRECTIONS = [
  // 0.5.0: words lost in transcription restored, and Baruch 6:7.
  { revision: 2, paths: ['drb-'] },
];
// Where the cache notes which revision its kept copies are; never a file of the site.
const TEXT_REVISION_NOTE = 'biblica-text-revision';
const SCOPE = new URL(self.registration.scope).pathname;

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './app.js',
  './bible.js',
  './calendar.js',
  './context.js',
  './dashboard.js',
  './days.js',
  './db.js',
  './devotions.js',
  './journal.js',
  './lectionary.js',
  './mass.js',
  './novenas.js',
  './patrons.js',
  './plans.js',
  './practices.js',
  './prayers.js',
  './reflections.js',
  './schedule.js',
  './search.js',
  './storage.js',
  './study.js',
  './ui.js',
  './updates.js',
  './version.js',
  './view-about.js',
  './view-book.js',
  './view-confession.js',
  './view-daily.js',
  './view-day.js',
  './view-devotion.js',
  './view-early.js',
  './view-guided.js',
  './view-help.js',
  './view-intentions.js',
  './view-journal.js',
  './view-library.js',
  './view-mass.js',
  './view-notes.js',
  './view-novenas.js',
  './view-office.js',
  './view-passage.js',
  './view-plans.js',
  './view-pray.js',
  './view-reader.js',
  './view-reflection.js',
  './view-saints.js',
  './view-search.js',
  './view-settings.js',
  './view-study.js',
  './view-today.js',
  './data-about.json',
  './data-books.json',
  './data-calendar.json',
  './data-days.json',
  './data-early.json',
  './data-fathers.json',
  './data-introductions.json',
  './data-lectionary.json',
  './data-mass.json',
  './data-onthisday.json',
  './data-plans.json',
  './data-prayers.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

// <stamp> Written by `uv run biblica-stamp` (in tools/). Do not edit by hand.
const BUILD = 'f5a57b81c1a5';
const DIGESTS = {
  'app.js': '7c8c92df4573b864',
  'bible.js': '3f88765ca854c643',
  'calendar.js': 'd26a8868ed2fb288',
  'context.js': 'c04eeabb23568654',
  'dashboard.js': '6edd6b4f1293350e',
  'data-about.json': 'a486fb69a3a453d1',
  'data-books.json': '8a9ca60dbc69971a',
  'data-calendar.json': '275e4c3621034b4d',
  'data-days.json': '4839bddc4047a24f',
  'data-early.json': '8bec46de509efcb1',
  'data-fathers.json': '32b1458e7120ec78',
  'data-introductions.json': 'ec373fef28d56f61',
  'data-lectionary.json': 'c0035be8c74410f0',
  'data-mass.json': '09fa91e0a1490e23',
  'data-onthisday.json': 'a9b67aafe076b18b',
  'data-plans.json': '2b0388dc9511b503',
  'data-prayers.json': '7c590d0b9cc53f1e',
  'days.js': '604018c153cebb49',
  'db.js': 'ba56c3aea6aa420e',
  'devotions.js': 'e4a36f6e45288a12',
  'icon-180.png': 'd5c009fac9fd5cec',
  'icon-192.png': '077fee603f608dd1',
  'icon-512.png': 'e9e10eb53cea8654',
  'icon-maskable-512.png': 'bc06081eb1965434',
  'index.html': 'fd79297816d1b2c5',
  'journal.js': 'caf228eb6e9cf80a',
  'lectionary.js': '015fd8fcca22cf5f',
  'manifest.json': '5b0dfaf63b5a8a81',
  'mass.js': '1c8157247e0d2f04',
  'novenas.js': 'c010c022a2ae6a69',
  'patrons.js': 'a06e84c1d54aaa4b',
  'plans.js': '5a13397ce62afa20',
  'practices.js': '35eae0e0d49b34ed',
  'prayers.js': 'cc2d43d7ee15c9e9',
  'reflections.js': '87eb5ad2500efa58',
  'schedule.js': '70788fa6bf01ac89',
  'search.js': 'a40f5849800af069',
  'storage.js': 'bdcf4250c18ff75f',
  'study.js': '341bfcaea5a623bd',
  'styles.css': '868ad82731379060',
  'ui.js': '6f2d021247ca602f',
  'updates.js': 'a64cd7e17ca98236',
  'version.js': 'f7e9e071e815f968',
  'view-about.js': '95e498a839851247',
  'view-book.js': '59608164cf81f9e7',
  'view-confession.js': 'f920292af2fc9811',
  'view-daily.js': '95b07165434f4fc4',
  'view-day.js': '27764378c634f83a',
  'view-devotion.js': '2b42ee8a3871d176',
  'view-early.js': '80057ba07dbac91e',
  'view-guided.js': '7035ebec27672432',
  'view-help.js': '9944d6a8eef25969',
  'view-intentions.js': '01b32607fca9258d',
  'view-journal.js': 'd5fa754d93f3b7d5',
  'view-library.js': '68d3590219adfc47',
  'view-mass.js': 'add179512a2b8620',
  'view-notes.js': '73838becfff7440c',
  'view-novenas.js': '0fcf46df70071a3a',
  'view-office.js': 'b36b26c059b7080a',
  'view-passage.js': 'a75530751d5aecb5',
  'view-plans.js': '7f435016f271b7fe',
  'view-pray.js': '820b212bb73d1108',
  'view-reader.js': '51295e7378749879',
  'view-reflection.js': '25c35d804473a759',
  'view-saints.js': 'e6e2a744807b2850',
  'view-search.js': 'f7c1863fad5a8612',
  'view-settings.js': '7026171c7a50932b',
  'view-study.js': '2c8197682e345650',
  'view-today.js': 'd9e640c2b986c286',
};
// </stamp>

const SHELL_CACHE = `biblica-shell-${VERSION}-${BUILD}`;
// How many files the app is made of, the folder and its index.html being one.
const SHELL_COUNT = new Set(SHELL.map((path) => path.slice(2) || 'index.html')).size;

/** Tell every open page of the app something about this worker. */
async function tell(message) {
  const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const page of pages) page.postMessage(message);
}

/** The first sixteen hex digits of a file's SHA-256, as recorded in DIGESTS. */
async function fingerprint(buffer) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', buffer));
  return [...hash.slice(0, 8)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

// How long one file is waited for before the install is given up as unreachable.
const FETCH_PATIENCE = 45 * 1000;

/**
 * Fetch one file of the release and check it is the one this release was
 * built with. Resolves to { path, response } or to { file, status }, where
 * status is the HTTP status, 0 if the site could not be reached (or took too
 * long), or -1 if the file is there but is not this release's (an older
 * copy, or changed).
 */
async function fetchFile(path) {
  const file = path.slice(2) || 'index.html';
  // A connection that stalls must not hold an install, and every later update, open for ever.
  const limit = new AbortController();
  const timer = setTimeout(() => limit.abort(), FETCH_PATIENCE);
  try {
    // An address that is new with every build: neither the browser's cache
    // nor the host's can answer it with an older copy.
    const response = await fetch(`${path}?build=${BUILD}`, { cache: 'no-store', signal: limit.signal });
    if (!response.ok) return { file, status: response.status };
    const body = await response.arrayBuffer();
    if (DIGESTS[file] && (await fingerprint(body)) !== DIGESTS[file]) return { file, status: -1 };
    // Kept as a plain answer to the plain address, with nothing of the address it was fetched under.
    const headers = new Headers();
    if (response.headers.has('content-type')) headers.set('content-type', response.headers.get('content-type'));
    return { path, response: new Response(body, { status: 200, headers }) };
  } catch {
    return { file, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch every file of the app and keep them, all or none. Rejects with an
 * error carrying `missing` (the files at fault) and `reason` ('files', or
 * 'storage' when the device had no room to keep them), after telling the
 * open pages.
 */
async function fetchShell() {
  const fetched = await Promise.all(SHELL.map(fetchFile));
  const missing = fetched.filter((item) => !item.response).map(({ file, status }) => ({ file, status }));
  // The folder and its index.html are one file, asked for twice.
  const faults = missing.filter((item, index) => missing.findIndex((other) => other.file === item.file) === index);
  const refuse = async (reason, text) => {
    await tell({ type: 'biblica:install-failed', version: VERSION, reason, missing: faults, total: SHELL_COUNT });
    const error = new Error(`Biblica ${VERSION} was not installed: ${text}.`);
    error.missing = faults;
    error.reason = reason;
    throw error;
  };
  if (faults.length) await refuse('files', `${faults.length} of its ${SHELL_COUNT} files could not be had`);
  const begun = await caches.has(SHELL_CACHE);
  const cache = await caches.open(SHELL_CACHE);
  try {
    await Promise.all(fetched.map(({ path, response }) => cache.put(new Request(path), response)));
  } catch {
    // Out of room, most likely. A cache this call began is removed, so that no half of a
    // release is left taking up space; one that was already whole holds only this build's
    // files, old or just written, and is left as it is.
    if (!begun) await caches.delete(SHELL_CACHE).catch(() => {});
    await refuse('storage', 'the device could not keep its files');
  }
}

self.addEventListener('install', (event) => {
  // The new release takes over as soon as it is whole; the page decides when to restart into it.
  event.waitUntil(fetchShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith('biblica-') && key !== SHELL_CACHE && key !== TEXT_CACHE)
        .map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  );
});

/**
 * Fetch again every kept text file that a correction since this device's last
 * revision touched. Asked for by the page once it is running, so that taking
 * over is never held up by downloads. A copy that cannot be fetched now stays
 * as it is, and the revision is not recorded, so the next start tries again.
 */
async function refreshCorrectedText() {
  const cache = await caches.open(TEXT_CACHE);
  const note = new URL(TEXT_REVISION_NOTE, self.registration.scope).href;
  const kept = await cache.match(note);
  const done = kept ? Number(await kept.text()) || 1 : 1;
  const due = TEXT_CORRECTIONS.filter((item) => item.revision > done);
  if (!due.length) return;
  const wanted = due[due.length - 1].revision;
  const paths = due.flatMap((item) => item.paths);
  for (const request of await cache.keys()) {
    const address = new URL(request.url);
    const local = address.pathname.startsWith(SCOPE) ? address.pathname.slice(SCOPE.length) : address.pathname;
    if (!paths.some((path) => local.startsWith(path))) continue;
    try {
      // Asked for under an address of its own, past any cache between here and the site.
      const fresh = new URL(address.href);
      fresh.searchParams.set('revision', String(wanted));
      const response = await fetch(fresh.href, { cache: 'no-cache' });
      if (!response.ok || response.type !== 'basic') return;
      // A file from before the correction means the site has not been given the corrected
      // text yet: stop, record nothing, and try again at a later start.
      const book = await response.clone().json();
      if (!(book.revision >= wanted)) return;
      await cache.put(request, response);
    } catch {
      return;
    }
  }
  await cache.put(note, new Response(String(wanted)));
}

/**
 * Answer from the cache; failing that from the network. Only the per-book
 * text is kept as it is fetched (`keep`). The app's own files are kept by
 * fetchShell() alone, which checks each one: a file fetched here has not been
 * checked, and keeping it could mix another release into this one.
 */
async function fromCacheThenNetwork(event, cacheName, keep) {
  const request = event.request;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (keep && response && response.ok && response.type === 'basic') {
    // Kept under the plain address, whatever was added to it. The page has its
    // answer at once; the worker is held open until the copy is written. If
    // the device is out of room the file is simply not kept, and the page
    // checks what was saved.
    const plain = new URL(request.url);
    plain.search = '';
    event.waitUntil(cache.put(plain.href, response.clone()).catch(() => {}));
  }
  return response;
}

self.addEventListener('message', (event) => {
  const type = event.data && event.data.type;
  // A page asking a worker that is waiting to take over. This release never waits (see
  // 'install'), but a later one may choose to, and pages of this release can then ask it.
  if (type === 'biblica:activate') self.skipWaiting();
  const reply = event.ports[0];
  if (!reply) return;
  // A page asking which release this worker is.
  if (type === 'biblica:version') reply.postMessage({ version: VERSION, build: BUILD });
  // A page that has started, asking for corrected text to be brought in.
  if (type === 'biblica:refresh-text') {
    event.waitUntil(refreshCorrectedText().then(
      () => reply.postMessage({ ok: true }),
      () => reply.postMessage({ ok: false }),
    ));
  }
  // A page asking for the app's files to be fetched again and checked, all or none.
  if (type === 'biblica:refetch') {
    event.waitUntil(fetchShell().then(
      () => reply.postMessage({ ok: true }),
      (error) => reply.postMessage({ ok: false, reason: error.reason || 'files', missing: error.missing || [] }),
    ));
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const local = url.pathname.startsWith(SCOPE) ? url.pathname.slice(SCOPE.length) : url.pathname;
  // Questions about what is published now (the update check, and the page that checks
  // an upload) go to the network untouched; an answer from a cache would defeat them.
  if (url.searchParams.has('live') || local === 'check.html') return;
  const isText = TEXT_PATHS.some((part) => local.startsWith(part));
  const cacheName = isText ? TEXT_CACHE : SHELL_CACHE;
  event.respondWith(
    fromCacheThenNetwork(event, cacheName, isText).catch(() => (
      request.mode === 'navigate' ? caches.match('./index.html') : Response.error()
    )),
  );
});
