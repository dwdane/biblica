// sw.js
// Offline support. Two caches are kept:
//
//   biblica-shell-<VERSION>  the app itself and its small data files. It is
//                            replaced whole on every release, which is how
//                            updates reach an installed app.
//   biblica-text-<TEXT>      the Bible text, one file per book, saved as each
//                            book is first opened. It survives app updates
//                            and is only replaced when the text changes.
//
// On every release, bump VERSION here and APP_VERSION in version.js
// together. Bump TEXT_VERSION only when the Bible text (drb-*.json) changes.

const VERSION = '0.2.0';
const TEXT_VERSION = '1';

const SHELL_CACHE = `biblica-shell-${VERSION}`;
const TEXT_CACHE = `biblica-text-flat-${TEXT_VERSION}`;
// Requests for the Bible text are recognised by this part of their address.
const TEXT_PATH = '/drb-';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './app.js',
  './bible.js',
  './calendar.js',
  './context.js',
  './db.js',
  './devotions.js',
  './lectionary.js',
  './novenas.js',
  './plans.js',
  './practices.js',
  './prayers.js',
  './search.js',
  './ui.js',
  './version.js',
  './view-confession.js',
  './view-daily.js',
  './view-devotion.js',
  './view-guided.js',
  './view-intentions.js',
  './view-library.js',
  './view-notes.js',
  './view-novenas.js',
  './view-passage.js',
  './view-plans.js',
  './view-pray.js',
  './view-reader.js',
  './view-search.js',
  './view-settings.js',
  './view-today.js',
  './data-books.json',
  './data-calendar.json',
  './data-lectionary.json',
  './data-plans.json',
  './data-prayers.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
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

async function fromCacheThenNetwork(request, cacheName) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const cacheName = url.pathname.includes(TEXT_PATH) ? TEXT_CACHE : SHELL_CACHE;
  event.respondWith(
    fromCacheThenNetwork(request, cacheName).catch(() => (
      request.mode === 'navigate' ? caches.match('./index.html') : Response.error()
    )),
  );
});
