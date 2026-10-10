// storage.js
// What the app takes up on this device, and how to give some of it back.
//
// Biblica keeps exactly three kinds of thing: its own files, the Bible text
// and study material saved for offline use, and what the reader has written.
// The first two are copies of files on the site and can never be larger than
// those files; nothing is logged or accumulated in the background. This module
// measures each so that Settings can show it rather than ask to be believed.

import { TEXT_PREFIX } from './bible.js';
import { storageProtected, writtenBytes } from './db.js';
import { FATHERS_PREFIX, STUDY_PREFIX } from './study.js';

const SHELL_CACHES = 'biblica-shell-';
const TEXT_CACHES = 'biblica-text';

/** Which kind of text file a cached address is: 'bible', 'study' or null. */
function textKind(url) {
  const path = new URL(url).pathname;
  const base = new URL('.', window.location.href).pathname;
  const local = path.startsWith(base) ? path.slice(base.length) : path;
  if (local.startsWith(TEXT_PREFIX)) return 'bible';
  if (local.startsWith(STUDY_PREFIX) || local.startsWith(FATHERS_PREFIX)) return 'study';
  return null;
}

async function sizeOf(cache, request) {
  const response = await cache.match(request);
  return response ? (await response.blob()).size : 0;
}

/**
 * Measure what is kept on this device.
 *
 * @returns {Promise<object>} {
 *   app: { bytes, files },      the app's own files
 *   bible: { bytes, files },    books of the Bible saved for offline use
 *   study: { bytes, files },    Latin, cross-references and commentary saved
 *   written: { bytes },         everything the reader has written, and settings
 *   total: number,              the sum of the above
 *   browser: { usage, quota } | null,  the browser's own figure, where it gives one
 *   protected: boolean | null,  whether the browser has agreed not to clear it
 * }
 */
export async function storageReport() {
  const report = {
    app: { bytes: 0, files: 0 },
    bible: { bytes: 0, files: 0 },
    study: { bytes: 0, files: 0 },
    written: { bytes: 0 },
    total: 0,
    browser: null,
    protected: null,
  };
  if ('caches' in window) {
    for (const name of await caches.keys()) {
      const isShell = name.startsWith(SHELL_CACHES);
      if (!isShell && !name.startsWith(TEXT_CACHES)) continue;
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        const part = isShell ? report.app : report[textKind(request.url) || 'app'];
        part.bytes += await sizeOf(cache, request);
        part.files += 1;
      }
    }
  }
  report.written.bytes = await writtenBytes().catch(() => 0);
  report.total = report.app.bytes + report.bible.bytes + report.study.bytes + report.written.bytes;
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const { usage, quota } = await navigator.storage.estimate();
      if (typeof usage === 'number') report.browser = { usage, quota: typeof quota === 'number' ? quota : null };
    } catch {
      // The browser will not say; the app's own count stands.
    }
  }
  report.protected = await storageProtected();
  return report;
}

/**
 * Remove the saved Latin, cross-references and commentary from this device.
 * They are fetched again, book by book, when next wanted.
 *
 * @returns {Promise<number>} How many files were removed.
 */
export async function removeSavedStudy() {
  if (!('caches' in window)) return 0;
  let removed = 0;
  for (const name of await caches.keys()) {
    if (!name.startsWith(TEXT_CACHES)) continue;
    const cache = await caches.open(name);
    for (const request of await cache.keys()) {
      if (textKind(request.url) === 'study' && await cache.delete(request)) removed += 1;
    }
  }
  return removed;
}

/** "5.1 MB", "48 KB": a size a person can read. */
export function readableSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}
