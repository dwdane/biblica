// app.js
// Start-up, navigation between screens, theming and the service worker.

import { loadBook, loadIndex } from './bible.js';
import { dayFor, loadLiturgy, noteScreenShown, today } from './context.js';
import { loadSettings, requestPersistence, settings } from './db.js';
import { loadPrayers, scriptureBooks } from './prayers.js';
import { clear, el, icon } from './ui.js';
import * as confessionView from './view-confession.js';
import * as dailyView from './view-daily.js';
import * as devotionView from './view-devotion.js';
import * as guidedView from './view-guided.js';
import * as intentionsView from './view-intentions.js';
import * as libraryView from './view-library.js';
import * as notesView from './view-notes.js';
import * as novenasView from './view-novenas.js';
import * as passageView from './view-passage.js';
import * as plansView from './view-plans.js';
import * as prayView from './view-pray.js';
import * as readerView from './view-reader.js';
import * as searchView from './view-search.js';
import * as settingsView from './view-settings.js';
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

async function route() {
  const hash = window.location.hash || '#/today';
  if (currentHash !== null) scrollPositions.set(currentHash, window.scrollY);
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
  // Drawing the same screen again (after a change, or at midnight) is not a
  // step in the reader's history, so it does not count towards "Back".
  if (hash !== currentHash) noteScreenShown();
  currentHash = hash;
  renderedOn = today();
  const visit = (latestVisit += 1);
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
  if (!target.keepScroll) window.scrollTo(0, scrollPositions.get(hash) || 0);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('sw.js');
      registration.update().catch(() => {});
      setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);

      const hadController = Boolean(navigator.serviceWorker.controller);
      let shown = false;
      const offerRefresh = () => {
        if (shown) return;
        shown = true;
        document.body.append(el('div', { class: 'update-banner', role: 'status' },
          el('span', { text: 'A new version of Biblica is ready.' }),
          el('button', { class: 'button', onclick: () => window.location.reload() }, 'Refresh')));
      };
      // A new worker taking over a page that already had one means an update landed.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController) offerRefresh();
      });
    } catch (error) {
      console.warn('Service worker registration failed', error);
    }
  });
}

async function start() {
  root.append(screen, tabbar);
  drawTabs('today');
  screen.append(el('p', { class: 'loading', text: 'Opening…' }));
  try {
    await loadSettings();
    await Promise.all([loadIndex(), loadLiturgy(), loadPrayers()]);
  } catch (error) {
    console.error(error);
    clear(screen).append(el('section', { class: 'card' },
      el('h2', { class: 'card-heading', text: 'Biblica could not start' }),
      el('p', { class: 'muted', text: 'The app’s data could not be loaded. Check your connection and open it again.' }),
      el('button', { class: 'button', onclick: () => window.location.reload() }, 'Try again')));
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
      // Someone praying across midnight keeps their place; the screen
      // catches up with the date when they leave it.
      if (!document.body.classList.contains('has-step-bar')) route();
    }
  });
  warmScripture();
  await route();
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
    for (const id of scriptureBooks()) {
      try {
        await loadBook(id);
      } catch {
        return; // offline or interrupted; it will be tried again next time
      }
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

registerServiceWorker();
start();
