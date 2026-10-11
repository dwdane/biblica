// updates.js
// Keeping an installed copy of the app up to date.
//
// A new release reaches a device in three steps: the browser notices that
// sw.js on the site has changed, the new worker fetches and checks the whole
// release, and the open page restarts into it. An app on a phone's home
// screen is rarely started afresh (it is resumed), so waiting for the next
// start is not enough: the site is asked again whenever the app comes back
// into view, and the release is applied at the next quiet moment. Settings
// can also ask at once, and says plainly what happened.
//
// Two things are guarded against. The page never restarts under the reader's
// hands: not while something is being typed, a sheet is open, a prayer is
// under way or the Mass is being followed, not after "Later", and between
// screens only on the way to one of the main tabs. And it never restarts in a
// loop: only for a release newer than the one running, and not twice within a
// few minutes, so a host that hands out two versions of sw.js by turns cannot
// make it flicker.

import { saveSetting, settings } from './db.js';
import { el, scrollPosition, sheetIsOpen } from './ui.js';
import { APP_VERSION } from './version.js';

// How long the app must have gone without asking before coming back into view asks again.
const ASK_AGAIN_AFTER = 5 * 60 * 1000;
const ASK_WHILE_OPEN_EVERY = 30 * 60 * 1000;
// An update that lands this soon after opening is applied at once: nothing has been begun.
const JUST_OPENED = 8000;
// How long a release is given to arrive before the check gives up waiting.
const INSTALL_PATIENCE = 90 * 1000;
// The page does not restart itself for an update twice within this time.
const RESTART_NO_SOONER = 5 * 60 * 1000;
// A question the site did not answer is put again after these waits, while the app is in view.
const ASK_AGAIN_ON_FAILURE = [5 * 1000, 20 * 1000];
// A release that arrived incomplete is tried again this often, this many times: an upload
// in progress, or a host half-way through publishing, is usually whole a minute later.
const TRY_INCOMPLETE_AFTER = 60 * 1000;
const TRY_INCOMPLETE_TIMES = 3;
const RESUME_KEY = 'biblica:resume';
const RESTARTED_KEY = 'biblica:restarted';
// The screens the tab bar leads to. Arriving at one, there is no "Back" to lose by restarting.
const TAB_ROOTS = ['#/today', '#/read', '#/pray', '#/search', '#/notes'];

const state = {
  registration: null,
  hadController: false,
  ready: false, // another release has taken over and the page has not yet restarted into it
  newer: false, // that release is newer than this page, so it may be applied unasked
  failure: null, // { version, reason, missing, total } from the last release that could not be installed
  lastAsked: 0,
  failedAsks: 0, // questions in a row that the site did not answer
  incompleteTries: 0, // times an incomplete release has been asked for again
  holdUntil: 0, // no unasked restart before this time (a file picker or share sheet is open)
  banner: null,
  dismissed: false, // the reader said "Later": nothing restarts unasked until the app is next opened
};

/** Whether this browser can install and update the app at all. */
export function updatesSupported() {
  return 'serviceWorker' in navigator;
}

/** Whether another release is waiting for the page to restart. */
export function updateReady() {
  return state.ready;
}

/** Compare two release numbers such as "0.4.0" and "0.10.1": negative, zero or positive. */
export function compareVersions(a, b) {
  const parts = (version) => String(version || '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const [left, right] = [parts(a), parts(b)];
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] || 0) - (right[index] || 0);
    if (difference) return difference;
  }
  return 0;
}

/**
 * The release that is published now, read from the site itself and never
 * from a cache: { version, build }, either of which is null if sw.js does not
 * say (a later release may be laid out differently). Rejects only if the site
 * cannot be reached.
 */
async function published() {
  const response = await fetch(`sw.js?live=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`sw.js answered ${response.status}`);
  const text = await response.text();
  const find = (pattern) => (pattern.exec(text) || [])[1] || null;
  return { version: find(/const VERSION = '([^']+)'/), build: find(/const BUILD = '([^']+)'/) };
}

/** Put a question to the worker now serving this page; resolves to its answer, or null if it gives none. */
function askWorker(message, patience = 2000) {
  const worker = navigator.serviceWorker && navigator.serviceWorker.controller;
  if (!worker) return Promise.resolve(null);
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), patience);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(event.data || null);
    };
    worker.postMessage(message, [channel.port2]);
  });
}

/** The worker now serving this page: { version, build }, or null if it does not say. */
async function servingWorker() {
  // Asked twice: a worker that was asleep can be slow to answer the first time.
  const answer = (await askWorker({ type: 'biblica:version' })) || (await askWorker({ type: 'biblica:version' }));
  return answer && answer.version ? { version: answer.version, build: answer.build || null } : null;
}

/** The release held by the worker now serving this page, or null if it does not say. */
export async function installedVersion() {
  const worker = await servingWorker();
  return worker ? worker.version : null;
}

/**
 * Tell a worker that is installed and waiting to take over. This release's
 * worker never waits; a later one may, and pages of this release must not
 * leave it waiting for ever (a home-screen app is rarely closed).
 */
function activateWaiting() {
  const waiting = state.registration && state.registration.waiting;
  if (waiting) waiting.postMessage({ type: 'biblica:activate' });
}

/** Wait for a worker that is being installed to succeed or fail. */
function outcomeOf(worker) {
  return new Promise((resolve) => {
    const settle = () => {
      if (worker.state === 'redundant') resolve('failed');
      else if (worker.state === 'activated') resolve('ready');
      else return;
      worker.removeEventListener('statechange', settle);
    };
    worker.addEventListener('statechange', settle);
    settle();
    setTimeout(() => resolve('slow'), INSTALL_PATIENCE);
  });
}

/**
 * Which files a release that failed to install could not be had. The worker
 * says so in a message, which can arrive a moment after the failure itself.
 */
async function failureDetails() {
  for (let waited = 0; waited < 2000 && !state.failure; waited += 100) {
    await new Promise((resolve) => { setTimeout(resolve, 100); });
  }
  return state.failure || { missing: [], total: 0 };
}

/**
 * Ask the site quietly whether sw.js has changed. Anything found installs by
 * itself. A question that gets no answer (a phone just woken has often not
 * found its connection yet) is put again shortly, twice, while the app is in
 * view; after that the next return to the app asks afresh.
 */
function ask() {
  if (!state.registration || !navigator.onLine) return;
  state.lastAsked = Date.now();
  state.registration.update().then(() => {
    state.failedAsks = 0;
  }, () => {
    const wait = ASK_AGAIN_ON_FAILURE[state.failedAsks];
    state.failedAsks += 1;
    if (wait === undefined) {
      state.failedAsks = 0;
      state.lastAsked = 0;
      return;
    }
    setTimeout(() => { if (document.visibilityState === 'visible') ask(); else state.lastAsked = 0; }, wait);
  });
}

/** A release arrived incomplete: look again in a minute, a few times, without being asked. */
function tryIncompleteAgain() {
  if (state.incompleteTries >= TRY_INCOMPLETE_TIMES) return;
  state.incompleteTries += 1;
  setTimeout(() => { if (document.visibilityState === 'visible') ask(); else state.lastAsked = 0; }, TRY_INCOMPLETE_AFTER);
}

/**
 * Ask the site for sw.js and wait for whatever follows.
 *
 * @returns {Promise<object>} One of
 *   { kind: 'offline' }            the site could not be reached
 *   { kind: 'current', version }   this is the published release
 *   { kind: 'ready', version }     another release has arrived; restart to use it
 *   { kind: 'failed', version, reason, missing, total }  a release is published but could not be
 *                                  installed: files missing or stale ('files'), or no room ('storage')
 *   { kind: 'coming', version }    a release is published and has not reached this device yet
 * `version` is null where the published sw.js does not name one.
 */
async function seek() {
  let site;
  try {
    site = await published();
  } catch {
    return { kind: 'offline' };
  }
  const version = site.version;
  state.lastAsked = Date.now();
  state.failure = null;
  // The worker being installed is noted as it appears: by the time update() has
  // resolved it may already have finished, one way or the other.
  let arriving = null;
  const note = () => { arriving = state.registration.installing || arriving; };
  state.registration.addEventListener('updatefound', note);
  // If the worker script itself cannot be fetched or will not run, what is already here decides.
  await state.registration.update().catch(() => {});
  state.registration.removeEventListener('updatefound', note);
  arriving = arriving || state.registration.installing || state.registration.waiting;
  if (arriving) {
    activateWaiting();
    const outcome = await outcomeOf(arriving);
    if (outcome === 'failed') {
      const failure = await failureDetails();
      return { kind: 'failed', version, reason: failure.reason || 'files', missing: failure.missing, total: failure.total };
    }
    return { kind: outcome === 'ready' ? 'ready' : 'coming', version };
  }
  if (state.ready) return { kind: 'ready', version };
  // Nothing new was handed over. This is the published release if the worker serving
  // the page is the very build on the site; otherwise the browser was given the old
  // sw.js because the host's own cache has not caught up (GitHub Pages can take about
  // ten minutes), or sw.js could not be had at all.
  const serving = await servingWorker();
  const same = serving
    ? serving.version === version && (!site.build || !serving.build || serving.build === site.build)
    : version === APP_VERSION;
  if (same && version === APP_VERSION) return { kind: 'current', version };
  if (same) return { kind: 'ready', version };
  return { kind: 'coming', version };
}

/**
 * Ask now, and report what was found. Used by Settings. Resolves as seek()
 * does, or to { kind: 'unsupported' } where the browser cannot install the app.
 */
export async function checkForUpdate() {
  if (!updatesSupported() || !state.registration) return { kind: 'unsupported' };
  const result = await seek();
  if (result.kind !== 'offline') await saveSetting('updateChecked', new Date().toISOString()).catch(() => {});
  return result;
}

/**
 * Fetch the app's files again, for a copy that seems stuck or is misbehaving.
 * What the reader has written, and the saved Bible text, are not touched.
 *
 * A newer release, if there is one, is the better cure and is installed in
 * the ordinary way. Otherwise the worker is asked to fetch its own files
 * again: it checks each against the release's fingerprints and replaces them
 * only if every one arrived, so a copy that works is never exchanged for part
 * of another.
 *
 * @returns {Promise<object>} { kind: 'restarting' } when the page is about to
 *   reload; otherwise as seek() ('offline', 'failed', 'coming') or
 *   { kind: 'unsupported' }, and nothing has been changed.
 */
export async function reinstallApp() {
  if (!updatesSupported() || !state.registration) return { kind: 'unsupported' };
  const found = await seek();
  if (found.kind === 'ready') {
    restartNow();
    return { kind: 'restarting' };
  }
  if (found.kind !== 'current') return found;
  const answer = await askWorker({ type: 'biblica:refetch' }, INSTALL_PATIENCE);
  if (!answer) return { kind: 'offline' };
  if (!answer.ok) {
    return { kind: 'failed', version: found.version, reason: answer.reason || 'files', missing: answer.missing || [], total: 0 };
  }
  restartNow();
  return { kind: 'restarting' };
}

/**
 * Keep the page from restarting itself for a while: a file picker or the
 * share sheet is about to open, and coming back from it must not be taken
 * for the reader returning with nothing in hand.
 */
export function holdRestarts(milliseconds = 2 * 60 * 1000) {
  state.holdUntil = Date.now() + milliseconds;
}

/** Whether restarting now would interrupt the reader or lose something not yet kept. */
function busy() {
  if (Date.now() < state.holdUntil || sheetIsOpen()) return true;
  // A guided prayer under way, or verses selected in the Bible.
  if (document.body.classList.contains('has-step-bar') || document.body.classList.contains('has-action-bar')) return true;
  // Following the Mass: the phone is locked and woken again and again, and the place must hold.
  if (atMass()) return true;
  // Something the reader opened on the screen (a prayer in full, a note) would shut again.
  if (document.querySelector('.screen details[open]')) return true;
  const active = document.activeElement;
  if (active && ['TEXTAREA', 'INPUT', 'SELECT'].includes(active.tagName)) return true;
  // Something typed and perhaps not yet added or saved, even with the keyboard put away.
  return [...document.querySelectorAll('.screen textarea, .screen input[type="text"], .screen input[type="search"], .screen input:not([type])')]
    .some((field) => field.value.trim() !== '');
}

function read(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function keep(key, value) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Without session storage the screen is still kept (it is in the address); only the scroll is lost.
  }
}

/** Whether the page may restart itself for the release that is waiting. */
function mayRestartUnasked() {
  if (!state.ready || !state.newer || state.dismissed || settings().autoUpdate === false) return false;
  // Once, not over and over: a host answering with two releases by turns must not make the app flicker.
  // A time in the future means the device's clock was set back, and counts for nothing.
  const since = Date.now() - (Number(read(RESTARTED_KEY)) || 0);
  return since < 0 || since > RESTART_NO_SOONER;
}

/**
 * Restart into the release that has arrived.
 *
 * @param {object} [options]
 * @param {boolean} [options.samePlace=true] - Come back to this screen at this
 *   scroll position. False when the reader is on the way to another screen,
 *   which should open as it always does.
 * @param {boolean} [options.unasked=false] - The page is restarting itself, which it does only once in a while.
 */
export function restartNow({ samePlace = true, unasked = false } = {}) {
  keep(RESUME_KEY, samePlace ? { hash: window.location.hash, y: scrollPosition(), at: Date.now() } : null);
  if (unasked) keep(RESTARTED_KEY, Date.now());
  window.location.reload();
}

/**
 * Where the reader was before a restart for an update: the scroll position
 * for `hash`, or null. Read once; a restart long ago is ignored.
 */
export function placeBeforeRestart(hash) {
  const kept = read(RESUME_KEY);
  keep(RESUME_KEY, null);
  return kept && kept.hash === hash && Date.now() - kept.at < 60 * 1000 ? Number(kept.y) || 0 : null;
}

/**
 * Called by the router between screens, once the screen being left has saved
 * its work. Returns true if the app is restarting instead of drawing.
 *
 * Only on the way to one of the main tabs: a restart forgets the screens
 * visited, so on the way anywhere else "Back" would no longer lead back.
 *
 * @param {string} destination - The address of the screen about to be drawn, such as "#/pray".
 */
export function restartBetweenScreens(destination) {
  if (TAB_ROOTS.includes(destination) && mayRestartUnasked() && Date.now() >= state.holdUntil) {
    restartNow({ samePlace: false, unasked: true });
    return true;
  }
  // An offer held back while the Mass was being followed is made now.
  if (state.ready) showBanner();
  return false;
}

/** Whether the reader is following the Mass, where nothing should move or ask for attention. */
function atMass() {
  return window.location.hash.startsWith('#/mass');
}

function showBanner() {
  if (state.banner || state.dismissed || atMass()) return;
  const later = () => {
    state.dismissed = true;
    state.banner.remove();
    state.banner = null;
  };
  state.banner = el('div', { class: 'update-banner', role: 'status' },
    el('span', { text: state.newer ? 'A new version of Biblica is ready.' : 'This copy of Biblica has changed on the site.' }),
    el('span', { class: 'update-actions' },
      el('button', { class: 'button quiet', onclick: later }, 'Later'),
      el('button', { class: 'button', onclick: () => restartNow() }, 'Refresh')));
  document.body.append(state.banner);
}

/** Another release has taken over from the one this page was started with. */
async function arrived() {
  if (state.ready) return;
  state.ready = true;
  state.incompleteTries = 0;
  // Only a release newer than this page is applied unasked. The same number again
  // (a correction published without a new number) or an older one is offered, not imposed.
  state.newer = compareVersions(await installedVersion(), APP_VERSION) > 0;
  window.dispatchEvent(new Event('biblica:update'));
  if (mayRestartUnasked() && document.visibilityState === 'visible' && performance.now() < JUST_OPENED && !busy()) {
    restartNow({ unasked: true });
    return;
  }
  // Otherwise it is applied when the reader next goes to one of the main tabs or
  // comes back to the app; until then, or if they prefer to be asked, the banner offers it.
  showBanner();
}

/** The app has been brought back into view, or may have been. */
function returned() {
  if (document.visibilityState !== 'visible') return;
  if (mayRestartUnasked() && !busy()) {
    restartNow({ unasked: true });
    return;
  }
  if (Date.now() - state.lastAsked > ASK_AGAIN_AFTER) ask();
}

async function register() {
  try {
    // The worker script is always fetched from the site, never from the browser's cache.
    state.registration = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
  } catch (error) {
    // Offline at start-up, for one: the worker already installed still serves the
    // app, and the registration it came with is enough to ask for updates later.
    console.warn('Service worker registration failed', error);
    state.registration = (await navigator.serviceWorker.getRegistration().catch(() => null)) || null;
  }
  return state.registration;
}

/** Register the worker and keep watch for new releases. Call once at start-up. */
export function watchForUpdates() {
  if (!updatesSupported()) return;
  state.hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // A worker taking charge of a page that had none is the first install, not an update.
    if (state.hadController) arrived();
    state.hadController = true;
  });
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'biblica:install-failed') {
      state.failure = {
        version: event.data.version,
        reason: event.data.reason || 'files',
        missing: event.data.missing || [],
        total: event.data.total || 0,
      };
      tryIncompleteAgain();
    }
  });
  window.addEventListener('load', async () => {
    // A home-screen app is resumed, not started. Browsers differ in which of
    // these they send on the way back, so all three are heard; asking is
    // rationed by time, not by event.
    document.addEventListener('visibilitychange', returned);
    window.addEventListener('pageshow', returned);
    window.addEventListener('focus', returned);
    window.addEventListener('online', async () => {
      if (state.registration || await register()) ask();
    });
    setInterval(() => { if (document.visibilityState === 'visible') ask(); }, ASK_WHILE_OPEN_EVERY);
    if (!(await register())) return;
    state.registration.addEventListener('updatefound', () => {
      const worker = state.registration.installing;
      if (worker) worker.addEventListener('statechange', () => { if (worker.state === 'installed') activateWaiting(); });
    });
    activateWaiting();
    // A release can take over while this page is still being loaded, before anything
    // here was listening. The worker in charge then is not the one the page came from.
    const serving = await installedVersion();
    if (serving && serving !== APP_VERSION) arrived();
    ask();
    // Corrections to the Bible text kept for offline reading are brought in
    // quietly once the app is running (see TEXT_CORRECTIONS in sw.js).
    askWorker({ type: 'biblica:refresh-text' }, 120000);
  });
}
