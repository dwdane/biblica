// app.js
// Start-up, navigation between screens, theming and the service worker.

import { loadBook, loadIndex, saveLoadedBooks } from './bible.js';
import { dayFor, loadLiturgy, noteScreenShown, today } from './context.js';
import { loadDays } from './days.js';
import { loadSettings, requestPersistence, saveSetting, settings } from './db.js';
import { loadPrayers, scriptureBooks } from './prayers.js';
import { saveLoadedStudy } from './study.js';
import { clear, el, icon, scrollPosition, scrollToPosition, showFlash, toast } from './ui.js';
import { compareVersions, placeBeforeRestart, reinstallApp, restartBetweenScreens, watchForUpdates } from './updates.js';
import { APP_VERSION } from './version.js';
import * as aboutView from './view-about.js';
import * as bookView from './view-book.js';
import * as confessionView from './view-confession.js';
import * as dailyView from './view-daily.js';
import * as dayView from './view-day.js';
import * as earlyView from './view-early.js';
import * as devotionView from './view-devotion.js';
import * as guidedView from './view-guided.js';
import * as helpView from './view-help.js';
import * as intentionsView from './view-intentions.js';
import * as journalView from './view-journal.js';
import * as libraryView from './view-library.js';
import * as massView from './view-mass.js';
import * as notesView from './view-notes.js';
import * as novenasView from './view-novenas.js';
import * as officeView from './view-office.js';
import * as passageView from './view-passage.js';
import * as plansView from './view-plans.js';
import * as prayView from './view-pray.js';
import * as readerView from './view-reader.js';
import * as reflectionView from './view-reflection.js';
import * as saintsView from './view-saints.js';
import * as searchView from './view-search.js';
import * as settingsView from './view-settings.js';
import * as studyView from './view-study.js';
import * as todayView from './view-today.js';

const TABS = [
  { id: 'today', label: 'Today', icon: 'today', path: '#/today' },
  { id: 'bible', label: 'Bible', icon: 'bible', path: '#/read' },
  { id: 'pray', label: 'Pray', icon: 'cross', path: '#/pray' },
  { id: 'search', label: 'Search', icon: 'search', path: '#/search' },
  { id: 'notes', label: 'Notes', icon: 'notes', path: '#/notes' },
];

// Liturgical colours as browser chrome colours, light and dark.
const THEME_COLORS = {
  green: ['#f2f6f1', '#141a16'],
  violet: ['#f5f2f8', '#18151c'],
  white: ['#faf7ee', '#1a1812'],
  red: ['#faf2f1', '#1c1514'],
  rose: ['#fbf2f5', '#1c1518'],
};

const root = document.getElementById('app');
const screen = el('main', { class: 'screen', id: 'screen', tabindex: '-1' });
// The screens scroll inside this, not the page: see scroller() in ui.js.
const scrollArea = el('div', { class: 'scroller', id: 'scroller' }, screen);
const tabbar = el('nav', { class: 'tabbar', 'aria-label': 'Sections' });
const scrollPositions = new Map();
let cleanup = null;
let currentHash = null;
let renderedOn = null;

/** Work out which screen a hash names. */
function resolve(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [head, a, b, c] = parts;
  switch (head) {
    case undefined:
    case 'today':
      return { tab: 'today', view: todayView.render, params: { date: /^\d{4}-\d{2}-\d{2}$/.test(a || '') ? a : undefined } };
    case 'read': {
      const place = settings().lastPlace || { book: 'GEN', chapter: 1 };
      const [verse, endVerse] = (c || '').split('-');
      return {
        tab: 'bible',
        view: readerView.render,
        params: { bookId: a || place.book, chapter: b || (a ? 1 : place.chapter), verse: verse || undefined, endVerse },
        keepScroll: Boolean(verse),
      };
    }
    case 'book':
      return { tab: 'bible', view: bookView.renderBook, params: { id: a } };
    case 'early':
      return a
        ? { tab: 'bible', view: earlyView.renderEntry, params: { id: a, work: b } }
        : { tab: 'bible', view: earlyView.renderShelf, params: {} };
    case 'day':
      return { tab: 'today', view: dayView.render, params: { date: a } };
    case 'study':
      return { tab: 'bible', view: studyView.render, params: { bookId: a, chapter: b, verses: c } };
    case 'reflection':
      return { tab: 'notes', view: reflectionView.render, params: { id: a, start: b, end: c } };
    case 'journal':
      return a
        ? { tab: 'notes', view: journalView.renderEntry, params: { date: a } }
        : { tab: 'notes', view: journalView.renderJournal, params: {} };
    case 'reading':
      return { tab: 'today', view: passageView.renderReading, params: { date: a, index: b, mass: c } };
    case 'plans':
      return a
        ? { tab: 'pray', view: plansView.renderDetail, params: { planId: a } }
        : { tab: 'pray', view: plansView.renderList, params: {} };
    case 'plan':
      return { tab: 'pray', view: passageView.renderPlanDay, params: { planId: a, dayNumber: b } };
    case 'prayer':
      return { tab: 'pray', view: libraryView.renderPrayerPage, params: { id: a } };
    case 'pray':
      return resolvePray(a, b, c, parts[4]);
    case 'search':
      return { tab: 'search', view: searchView.render, params: { query: a } };
    case 'notes':
      return { tab: 'notes', view: notesView.render, params: {} };
    case 'settings':
      return { tab: 'today', view: settingsView.render, params: {} };
    case 'mass':
      return { tab: 'pray', view: massView.render, params: { form: a } };
    case 'about':
      return a === 'news'
        ? { tab: 'today', view: aboutView.renderNews, params: {} }
        : { tab: 'today', view: aboutView.renderPage, params: { page: a } };
    default:
      return { tab: 'today', view: todayView.render, params: {} };
  }
}

/** The screens under the Pray tab. */
function resolvePray(section, a, b, c) {
  const tab = 'pray';
  switch (section) {
    case 'library':
      return { tab, view: libraryView.renderLibrary, params: {} };
    case 'list':
      return { tab, view: dailyView.renderList, params: {} };
    case 'history':
      return { tab, view: dailyView.renderHistory, params: { month: a } };
    case 'rosary':
      return { tab, view: devotionView.renderRosary, params: { set: a } };
    case 'stations':
      return { tab, view: devotionView.renderStations, params: {} };
    case 'lectio':
      return { tab, view: guidedView.renderLectio, params: { bookId: a, chapter: b, verses: c } };
    case 'examen':
      return { tab, view: guidedView.renderExamen, params: {} };
    case 'novenas':
      return { tab, view: novenasView.renderNovenas, params: {} };
    case 'novena':
      return { tab, view: novenasView.renderNovena, params: { id: a } };
    case 'intentions':
      return { tab, view: intentionsView.renderIntentions, params: {} };
    case 'confession':
      return { tab, view: confessionView.renderConfession, params: {} };
    case 'guide':
      return { tab, view: guidedView.renderGuide, params: { id: a } };
    case 'office':
      return { tab, view: officeView.render, params: {} };
    case 'help':
      return a
        ? { tab, view: helpView.renderHelpTopic, params: { id: a } }
        : { tab, view: helpView.renderHelp, params: {} };
    case 'aspirations':
      return { tab, view: helpView.renderAspirations, params: {} };
    case 'saints':
      return { tab, view: saintsView.renderSaints, params: {} };
    case 'saint':
      return { tab, view: saintsView.renderSaint, params: { id: a } };
    default:
      return { tab, view: prayView.render, params: {} };
  }
}

function drawTabs(active) {
  clear(tabbar);
  for (const tab of TABS) {
    tabbar.append(el('a', {
      class: `tab${tab.id === active ? ' active' : ''}`,
      href: tab.path,
      'aria-current': tab.id === active ? 'page' : null,
    }, icon(tab.icon, 24), el('span', { text: tab.label })));
  }
}

/** Apply the reader's theme choice and today's liturgical colour to the page. */
function applyTheme() {
  const html = document.documentElement;
  const choice = settings().theme;
  if (choice === 'auto') delete html.dataset.theme;
  else html.dataset.theme = choice;
  html.style.setProperty('--reading-size', `${settings().textSize}px`);
  const color = dayFor(today()).color;
  html.dataset.lit = THEME_COLORS[color] ? color : 'green';
  const dark = choice === 'dark' || (choice === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[html.dataset.lit][dark ? 1 : 0]);
}

// Counts every call to route(), so a slow screen can tell it has been overtaken.
let latestVisit = 0;
// The last screen's leave-taking, while it is still under way.
let leaving = null;
// True until the first screen of this start has been drawn.
let firstScreen = true;

async function route() {
  const visit = (latestVisit += 1);
  if (currentHash !== null) scrollPositions.set(currentHash, scrollPosition());
  if (cleanup) {
    // A screen with something half-written saves it as it goes; the next screen
    // waits for that, so that it lists what was just written. Not for ever: a
    // save that hangs must not hold the reader on the old screen.
    const leave = cleanup;
    cleanup = null;
    leaving = Promise.race([
      Promise.resolve().then(leave).catch((error) => console.warn(error)).then(() => true),
      new Promise((resolve) => { setTimeout(() => resolve(false), 1500); }),
    ]);
  }
  let saved = true;
  if (leaving) {
    saved = await leaving;
    // The reader moved on again during the wait: that later visit does the drawing.
    if (visit !== latestVisit) return;
    leaving = null;
  }
  // Between two screens, with the last one's work saved, is the moment a waiting update is
  // applied. Not if that work is still being saved: a restart would cut it off.
  const destination = window.location.hash || '#/today';
  if (saved && currentHash !== null && destination !== currentHash && restartBetweenScreens(destination)) return;
  const hash = window.location.hash || '#/today';
  // Drawing the same screen again (after a change, or at midnight) is not a
  // step in the reader's history, so it does not count towards "Back".
  if (hash !== currentHash) noteScreenShown();
  currentHash = hash;
  renderedOn = today();
  // Whatever the last screen added to the page frame goes, even if it failed
  // before it could hand back its own clean-up.
  document.body.classList.remove('has-step-bar', 'has-action-bar');
  const target = resolve(hash);
  drawTabs(target.tab);
  const fresh = el('div', { class: 'screen-inner' });
  try {
    const result = await target.view(fresh, target.params, { applyTheme });
    if (visit !== latestVisit) {
      // The reader moved on while this was loading: undo what it set up and leave the screen alone.
      if (typeof result === 'function') result();
      return;
    }
    cleanup = typeof result === 'function' ? result : null;
  } catch (error) {
    console.error(error);
    if (visit !== latestVisit) return;
    clear(fresh).append(
      el('section', { class: 'card' },
        el('h2', { class: 'card-heading', text: 'This screen could not be shown' }),
        el('p', { class: 'muted', text: navigator.onLine ? 'Something went wrong while loading it.' : 'You are offline, and this part has not been saved to the device yet.' }),
        el('button', { class: 'button', onclick: route }, 'Try again')));
  }
  clear(screen).append(fresh);
  if (firstScreen) {
    // Restarted for an update: back to where the reader was.
    firstScreen = false;
    const place = placeBeforeRestart(window.location.hash);
    if (place !== null) {
      scrollToPosition(place);
      return;
    }
  }
  if (!target.keepScroll) scrollToPosition(scrollPositions.get(hash) || 0);
}

/**
 * The page is laid out to fill the screen and never scroll. On an iPhone the
 * keyboard can leave it scrolled a little when it closes, which would leave
 * the tab bar short of the bottom edge; put it back.
 */
function keepPageStill() {
  const typing = () => {
    const active = document.activeElement;
    return Boolean(active) && (active.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName));
  };
  // Not while something is being typed: then the phone moves the page on purpose, to keep the field in view.
  const settle = () => { if (!typing() && (window.scrollY || window.scrollX)) window.scrollTo(0, 0); };
  if (window.visualViewport) window.visualViewport.addEventListener('resize', () => setTimeout(settle, 60));
  document.addEventListener('focusout', () => setTimeout(settle, 150));
}

async function start() {
  root.append(scrollArea, tabbar);
  keepPageStill();
  drawTabs('today');
  screen.append(el('p', { class: 'loading', text: 'Opening…' }));
  try {
    await loadSettings();
    await Promise.all([loadIndex(), loadLiturgy(), loadPrayers(), loadDays()]);
  } catch (error) {
    console.error(error);
    clear(screen).append(el('section', { class: 'card' },
      el('h2', { class: 'card-heading', text: 'Biblica could not start' }),
      el('p', { class: 'muted', text: 'The app’s data could not be loaded. Check your connection and open it again.' }),
      el('div', { class: 'button-row' },
        el('button', { class: 'button', onclick: () => window.location.reload() }, 'Try again'),
        el('button', { class: 'button quiet', onclick: fetchAfresh }, 'Fetch the app afresh')),
      el('p', { class: 'muted small', text: 'Fetching afresh brings every file of the app from the site again. Nothing you have written is touched.' })));
    return;
  }
  applyTheme();
  requestPersistence();
  window.addEventListener('hashchange', route);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  // The app may sit open overnight: when it comes back, catch up with the date.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && renderedOn !== today()) {
      applyTheme();
      // Someone praying, writing or following the Mass across midnight keeps
      // their place; the screen catches up with the date when they leave it.
      const writing = ['TEXTAREA', 'INPUT'].includes(document.activeElement && document.activeElement.tagName);
      const atMass = window.location.hash.startsWith('#/mass');
      if (!document.body.classList.contains('has-step-bar') && !writing && !atMass) route();
    }
  });
  warmScripture();
  await route();
  showFlash();
  noteVersion();
}

/** From the card shown when the app could not start: fetch its files again, and say if that failed. */
async function fetchAfresh(event) {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'Fetching…';
  const result = await reinstallApp().catch(() => ({ kind: 'offline' }));
  if (result.kind === 'restarting') return;
  button.disabled = false;
  button.textContent = result.kind === 'failed'
    ? 'The site’s copy is incomplete. Try later'
    : 'The site could not be reached. Try again';
}

/** Say so, once, when the app has come back as a newer release. */
function noteVersion() {
  const seen = settings().seenVersion;
  if (seen === APP_VERSION) return;
  if (seen && compareVersions(APP_VERSION, seen) > 0) toast(`Biblica has been updated to version ${APP_VERSION}.`);
  saveSetting('seenVersion', APP_VERSION).catch(() => {});
}

/**
 * Fetch the books the prayers quote (the Gospels of the mysteries, the
 * psalms and canticles) while the device is idle, so the Rosary and the
 * Stations work offline even if those books were never opened.
 */
function warmScripture() {
  const fetchAll = async () => {
    if (!navigator.onLine || (navigator.connection && navigator.connection.saveData)) return;
    // Only what passes through the service worker is kept for offline use.
    // On a first visit it takes a moment for the worker to take charge.
    if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
        setTimeout(resolve, 20000);
      });
    }
    try {
      // Whatever was read before the worker took charge went past it; save that first.
      await saveLoadedBooks();
      await saveLoadedStudy();
      // The prayers quote the Douay-Rheims; the Rosary and the Stations follow the translation chosen.
      for (const id of scriptureBooks()) {
        await loadBook(id, 'drb');
        await loadBook(id);
      }
      await saveLoadedBooks();
    } catch {
      // Offline or interrupted; it will be tried again next time.
    }
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(fetchAll, { timeout: 8000 });
  else setTimeout(fetchAll, 3000);
}

// The database is being upgraded and another tab still holds the old one.
window.addEventListener('biblica:blocked', () => {
  const waiting = screen.querySelector('.loading');
  if (waiting) waiting.textContent = 'Biblica is open in another tab or window. Close it and this one will finish updating.';
});

watchForUpdates();
start();
