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
// fingerprints (a test fails if they are out of date). Bump TEXT_VERSION
// only when the files under drb-, study- or fathers- change.

const VERSION = '0.4.0';
const TEXT_VERSION = '1';

const TEXT_CACHE = `biblica-text-flat-${TEXT_VERSION}`;
// Requests for the per-book files are recognised by how their address begins,
// counted from the folder the app is served from.
const TEXT_PATHS = ['drb-', 'study-', 'fathers-'];
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
  './view-confession.js',
  './view-daily.js',
  './view-day.js',
  './view-devotion.js',
  './view-guided.js',
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
  './data-fathers.json',
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
const BUILD = '1d2942a685df';
const DIGESTS = {
  'app.js': 'c6432c5b3a7988f7',
  'bible.js': '70c6b60d3f356b25',
  'calendar.js': 'd26a8868ed2fb288',
  'context.js': 'c04eeabb23568654',
  'data-about.json': 'b61ebf131429df9a',
  'data-books.json': '8a9ca60dbc69971a',
  'data-calendar.json': '275e4c3621034b4d',
  'data-days.json': '4839bddc4047a24f',
  'data-fathers.json': '32b1458e7120ec78',
  'data-lectionary.json': 'c0035be8c74410f0',
  'data-mass.json': '09fa91e0a1490e23',
  'data-onthisday.json': 'a9b67aafe076b18b',
  'data-plans.json': 'cb0d4f7ea1c2ac0d',
  'data-prayers.json': 'fd030f41db2a564f',
  'days.js': '604018c153cebb49',
  'db.js': '6f7558e2f2154ec6',
  'devotions.js': 'e4a36f6e45288a12',
  'icon-180.png': 'd5c009fac9fd5cec',
  'icon-192.png': '077fee603f608dd1',
  'icon-512.png': 'e9e10eb53cea8654',
  'icon-maskable-512.png': 'bc06081eb1965434',
  'index.html': 'fd79297816d1b2c5',
  'journal.js': '711577c1088c4651',
  'lectionary.js': '015fd8fcca22cf5f',
  'manifest.json': '5b0dfaf63b5a8a81',
  'mass.js': '1c8157247e0d2f04',
  'novenas.js': 'c010c022a2ae6a69',
  'patrons.js': 'a06e84c1d54aaa4b',
  'plans.js': '5a13397ce62afa20',
  'practices.js': '35eae0e0d49b34ed',
  'prayers.js': '8c68bd036e76cede',
  'reflections.js': '87eb5ad2500efa58',
  'schedule.js': '012816d7c2c7db60',
  'search.js': '7c082e7001494d5d',
  'storage.js': '9cb86059ca04a0d1',
  'study.js': 'c2762ec86926282f',
  'styles.css': 'b7d227af7f737798',
  'ui.js': '040272ff4b945918',
  'updates.js': 'f6bc69f0e6bcd76f',
  'version.js': '5b7d399642a2d1fa',
  'view-about.js': '95e498a839851247',
  'view-confession.js': 'eb79f3b0e90c0476',
  'view-daily.js': 'bb277baa30cb24e0',
  'view-day.js': '27764378c634f83a',
  'view-devotion.js': 'ffb625adaa8f5f62',
  'view-guided.js': 'de614938813394cd',
  'view-intentions.js': 'cb998b9e1925042c',
  'view-journal.js': '09d32c4e875d183b',
  'view-library.js': '68d3590219adfc47',
  'view-mass.js': 'c084f42c9f89c7e4',
  'view-notes.js': '73838becfff7440c',
  'view-novenas.js': '16b406f2e3ba6ba3',
  'view-office.js': 'b36b26c059b7080a',
  'view-passage.js': 'f322f2819b1baf73',
  'view-plans.js': '7f435016f271b7fe',
  'view-pray.js': '04dc9143df80bd32',
  'view-reader.js': 'b54cb56caa5d546d',
  'view-reflection.js': '0c19a8c77324ebf7',
  'view-saints.js': 'cbb28b6c3eae36a3',
  'view-search.js': '7df7aced80d348d5',
  'view-settings.js': '8ba5d26a57494bd4',
  'view-study.js': '2c8197682e345650',
  'view-today.js': 'f0f71c39b3db6397',
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
