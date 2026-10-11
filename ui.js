// ui.js
// Small building blocks shared by every screen: element creation, icons,
// bottom sheets, toasts, saving as the reader types, and scrolling.

/**
 * Create an element.
 *   el('button', { class: 'primary', onclick: save }, 'Save')
 * Attributes starting with "on" become event listeners; `text` sets text
 * content; children may be nodes, strings, arrays or null.
 */
export function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (name === 'text') node.textContent = value;
    else if (name === 'html') node.innerHTML = value;
    else if (name.startsWith('on') && typeof value === 'function') node.addEventListener(name.slice(2), value);
    else if (name === 'dataset') Object.assign(node.dataset, value);
    else if (name === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else node.setAttribute(name, value === true ? '' : value);
  }
  append(node, children);
  return node;
}

/**
 * Append children to a node with the same rules as el(): nulls are skipped
 * and arrays are flattened, which the DOM's own append() does not do.
 */
export function add(node, ...children) {
  append(node, children);
  return node;
}

function append(node, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(node, child);
    else node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/**
 * Keep what the reader is typing without their having to ask. Call `touch()`
 * on every change: `save` runs a moment after they pause, and at once when
 * the app is hidden or closed, which on a phone is often the last the page
 * hears before it is thrown away. Saves never overlap. `flush()` saves now;
 * `stop()` saves a last time and lets go. Both resolve to true when what was
 * written is safely kept, false when the save failed. A failed save is tried
 * again at the next chance, and the reader is told once that it failed.
 *
 * `onState`, if given, hears each change of state, so that the screen can
 * say plainly whether what is on it is kept: 'waiting' (typed, to be saved
 * in a moment), 'saving', 'saved' or 'failed'.
 */
export function keepSaved(save, delay = 1200, { onState = null } = {}) {
  let timer = null;
  let dirty = false;
  let warned = false;
  let last = Promise.resolve(true);
  const tell = (state) => { if (onState) onState(state); };
  const attempt = async () => {
    tell('saving');
    try {
      await save();
      // More may have been typed while this was being written; that is still waiting.
      tell(dirty ? 'waiting' : 'saved');
      return true;
    } catch (error) {
      console.warn(error);
      // Still unsaved: the next pause, the next flush or leaving the screen tries again.
      dirty = true;
      tell('failed');
      if (!warned) {
        warned = true;
        toast('This could not be saved. The device may be out of space.');
      }
      return false;
    }
  };
  const run = () => {
    clearTimeout(timer);
    timer = null;
    if (dirty) {
      dirty = false;
      last = last.then(attempt);
    }
    return last;
  };
  const whenHidden = () => { if (document.visibilityState === 'hidden') run(); };
  document.addEventListener('visibilitychange', whenHidden);
  window.addEventListener('pagehide', run);
  return {
    touch() {
      dirty = true;
      tell('waiting');
      clearTimeout(timer);
      timer = setTimeout(run, delay);
    },
    flush() {
      return run();
    },
    stop() {
      document.removeEventListener('visibilitychange', whenHidden);
      window.removeEventListener('pagehide', run);
      return run();
    },
  };
}

/**
 * A quiet line that says whether what the reader has written is kept, for
 * screens that save by themselves. Pass its `show` as keepSaved's onState.
 * `initial` is what to say before anything is typed: 'saved' for something
 * already written, or 'new' for an empty page.
 */
export function saveState(initial = 'saved') {
  const words = {
    new: 'Saved as you write',
    waiting: 'Saving…',
    saving: 'Saving…',
    saved: 'Saved',
    failed: 'Not saved yet: the device may be full. It will try again.',
  };
  const node = el('p', { class: 'save-state', role: 'status', 'aria-live': 'polite' });
  const show = (state) => {
    // A screen reader hears the line whenever it is rewritten, so it is rewritten only when the words change.
    if ((words[state] || '') === node.textContent) {
      node.dataset.state = state;
      return;
    }
    node.dataset.state = state;
    node.textContent = words[state] || '';
  };
  show(initial);
  return { node, show };
}

// ---------------------------------------------------------------------------
// Scrolling
// ---------------------------------------------------------------------------

/**
 * The element the screens scroll in. The page itself never scrolls: on an
 * iPhone, a scrolling page moves elements fixed to the bottom of the screen,
 * such as the tab bar, a little up and down as the scroll changes direction
 * and after the keyboard closes. Scrolling inside an element of the page
 * leaves them where they are.
 */
export function scroller() {
  return document.getElementById('scroller') || document.scrollingElement || document.documentElement;
}

/** How far the screen is scrolled. */
export function scrollPosition() {
  return scroller().scrollTop;
}

/** Scroll the screen to a position, at once or smoothly. */
export function scrollToPosition(top, smooth = false) {
  scroller().scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
}

/**
 * Wrap an async redraw so that calls run one after another. Two taps in quick
 * succession then draw twice in order, rather than both writing at once.
 */
export function inTurn(task) {
  let queue = Promise.resolve();
  return (...args) => {
    const run = queue.then(() => task(...args));
    // A redraw that fails must not stop the ones that come after it.
    queue = run.catch((error) => console.error(error));
    return run;
  };
}

/**
 * A row of buttons of which one is chosen, such as English / Latin / Both.
 * `options` is a list of [value, label]; `onChoose(value)` runs after the
 * row has been updated. The chosen button carries aria-pressed.
 */
export function choice(options, current, onChoose, { label, className = 'segmented' } = {}) {
  const row = el('div', { class: className, role: 'group', 'aria-label': label });
  for (const [value, text] of options) {
    const on = value === current;
    const button = el('button', { class: `segment${on ? ' on' : ''}`, 'aria-pressed': on ? 'true' : 'false' }, text);
    button.addEventListener('click', () => {
      for (const node of row.children) {
        node.classList.toggle('on', node === button);
        node.setAttribute('aria-pressed', node === button ? 'true' : 'false');
      }
      onChoose(value);
    });
    row.append(button);
  }
  return row;
}

/**
 * Guard a button's action against a second tap while the first is still
 * being saved. Returns a click handler.
 */
export function once(action) {
  let running = false;
  return async (...args) => {
    if (running) return;
    running = true;
    try {
      await action(...args);
    } finally {
      running = false;
    }
  };
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

// Line icons, drawn on a 24-unit grid.
const ICON_PATHS = {
  today: '<path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/><circle cx="12" cy="12" r="3.6"/>',
  bible: '<path d="M5 4.5h11.5a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2z"/><path d="M5 18a2 2 0 0 1 2-2h11.5"/><path d="M11.5 7.5v5M9.3 9.4h4.4"/>',
  plans: '<path d="M7 4.5h10a1.5 1.5 0 0 1 1.5 1.5v14l-6.5-3.6L5.5 20V6A1.5 1.5 0 0 1 7 4.5z"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="M15.5 15.5 20 20"/>',
  notes: '<path d="M6 4.5h9l3.5 3.5V19.5H6z"/><path d="M9 11h6.5M9 14.5h6.5M14.8 4.7V8.2h3.5"/>',
  settings: '<path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17" r="2"/>',
  back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  forward: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
  up: '<path d="M5.5 14.5 12 8l6.5 6.5"/>',
  down: '<path d="M5.5 9.5 12 16l6.5-6.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="M5 12.5 10 17.5 19 7"/>',
  text: '<path d="M4 18 8.5 6.5 13 18M5.6 14.2h5.8M14.5 18l3-7.5 3 7.5M15.6 15.6h3.8"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2"/>',
  note: '<path d="M5 5.5h14v10H10l-5 4z"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="1.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  cross: '<path d="M12 3.5v17M7 8.5h10"/>',
  star: '<path d="M12 4.2l2.3 4.9 5.3.7-3.9 3.7 1 5.3L12 16.2l-4.7 2.6 1-5.3-3.9-3.7 5.3-.7z"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  edit: '<path d="M5 19l1-4L16.5 4.5l3 3L9 18z"/><path d="M14.5 6.5l3 3"/>',
  study: '<path d="M12 6.5c-1.8-1.3-4.2-1.8-7-1.5v12.5c2.8-.3 5.2.2 7 1.5 1.8-1.3 4.2-1.8 7-1.5V5c-2.8-.3-5.2.2-7 1.5z"/><path d="M12 6.5V19"/>',
  trash: '<path d="M5 7h14M10 7V4.8h4V7M7 7l.8 12.2h8.4L17 7"/>',
  out: '<path d="M13.5 5H19v5.5M19 5l-8 8"/><path d="M10 6.5H6.5A1.5 1.5 0 0 0 5 8v9.5A1.5 1.5 0 0 0 6.5 19H16a1.5 1.5 0 0 0 1.5-1.5V14"/>',
  mass: '<path d="M8.5 4.5h7M9 4.5c0 4 .8 6 3 6s3-2 3-6M12 10.5V17M8 19.5c0-1.4 1.8-2.5 4-2.5s4 1.1 4 2.5z"/>',
  hours: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
};

export function icon(name, size = 22) {
  const wrapper = document.createElement('span');
  wrapper.className = 'icon';
  wrapper.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
  return wrapper;
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

let toastTimer = null;

export function toast(message) {
  let node = document.querySelector('.toast');
  if (!node) {
    node = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(node);
  }
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2400);
}

const FLASH_KEY = 'biblica:flash';

/**
 * Start the app again and show a message once it is back. Used after
 * something that changes everything at once (a restore, erasing), where a
 * clean start is the only sure way that no screen keeps what it had in mind.
 */
export function restartWith(message, hash = '#/today') {
  try {
    sessionStorage.setItem(FLASH_KEY, message);
  } catch {
    // Without session storage the app still restarts; only the message is lost.
  }
  // The address is changed without the router hearing of it: a screen begun now would only
  // have its loading cut off by the reload, and say so in the console.
  window.history.replaceState(null, '', hash);
  window.location.reload();
}

/** Show the message left by restartWith(), if there is one. Called once at start-up. */
export function showFlash() {
  try {
    const message = sessionStorage.getItem(FLASH_KEY);
    sessionStorage.removeItem(FLASH_KEY);
    if (message) toast(message);
  } catch {
    // Nothing was left.
  }
}

// ---------------------------------------------------------------------------
// Bottom sheet
// ---------------------------------------------------------------------------

/**
 * Open a sheet that slides up from the bottom of the screen.
 * `build(close)` returns the sheet's content. Returns the close function.
 */
export function openSheet(title, build, { tall = false, onClose = null } = {}) {
  const previousFocus = document.activeElement;
  const backdrop = el('div', { class: 'sheet-backdrop' });
  const panel = el('div', { class: `sheet${tall ? ' tall' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title, tabindex: '-1' });
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    backdrop.classList.remove('open');
    document.removeEventListener('keydown', onKey);
    openSheets.splice(openSheets.indexOf(panel), 1);
    setTimeout(() => backdrop.remove(), 200);
    if (previousFocus && previousFocus.isConnected && previousFocus.focus) previousFocus.focus({ preventScroll: true });
    // However the sheet was closed: a button, the backdrop or Escape.
    if (onClose) onClose();
  }
  function onKey(event) {
    // Only the sheet on top answers the keyboard.
    if (openSheets[openSheets.length - 1] !== panel) return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      // Keep the focus inside the sheet while it is open.
      const stops = [...panel.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])')]
        .filter((node) => !node.disabled && node.offsetParent !== null);
      if (!stops.length) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const inside = panel.contains(document.activeElement) && document.activeElement !== panel;
      if (event.shiftKey && (!inside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  panel.append(
    el('div', { class: 'sheet-head' },
      el('h2', { class: 'sheet-title', text: title }),
      el('button', { class: 'icon-button', 'aria-label': 'Close', onclick: close }, icon('close'))),
    el('div', { class: 'sheet-body' }, build(close)),
  );
  backdrop.append(panel);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop);
  openSheets.push(panel);
  // Focus the sheet itself, not a field in it: focusing a field would raise
  // the on-screen keyboard before the reader has seen the sheet.
  panel.focus({ preventScroll: true });
  requestAnimationFrame(() => backdrop.classList.add('open'));
  return close;
}

// The sheets now open, the most recent last.
const openSheets = [];

/** Whether a sheet is open over the screen. */
export function sheetIsOpen() {
  return openSheets.length > 0;
}

/** Ask the reader to confirm something that cannot be undone. */
export function confirmSheet(title, message, actionLabel, onConfirm, { onCancel = null } = {}) {
  let confirmed = false;
  openSheet(title, (close) => [
    el('p', { class: 'sheet-text', text: message }),
    el('div', { class: 'button-row' },
      el('button', { class: 'button quiet', onclick: close }, 'Cancel'),
      el('button', { class: 'button danger', onclick: () => { confirmed = true; close(); onConfirm(); } }, actionLabel)),
  ], { onClose: () => { if (!confirmed && onCancel) onCancel(); } });
}

/** Copy text to the clipboard, with a fallback for older browsers. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = el('textarea', { style: { position: 'fixed', opacity: '0' } });
    area.value = text;
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}
