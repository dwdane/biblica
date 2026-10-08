// ui.js
// Small building blocks shared by every screen: element creation, icons,
// bottom sheets, toasts and the falling-symbols celebration.

import { settings } from './db.js';

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
  trash: '<path d="M5 7h14M10 7V4.8h4V7M7 7l.8 12.2h8.4L17 7"/>',
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

// ---------------------------------------------------------------------------
// Bottom sheet
// ---------------------------------------------------------------------------

/**
 * Open a sheet that slides up from the bottom of the screen.
 * `build(close)` returns the sheet's content. Returns the close function.
 */
export function openSheet(title, build, { tall = false } = {}) {
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
export function confirmSheet(title, message, actionLabel, onConfirm) {
  openSheet(title, (close) => [
    el('p', { class: 'sheet-text', text: message }),
    el('div', { class: 'button-row' },
      el('button', { class: 'button quiet', onclick: close }, 'Cancel'),
      el('button', { class: 'button danger', onclick: () => { close(); onConfirm(); } }, actionLabel)),
  ]);
}

// ---------------------------------------------------------------------------
// Celebration
// ---------------------------------------------------------------------------

// What falls, by liturgical season.
const SEASON_SYMBOLS = {
  advent: ['✨', '🕯️'],
  christmas: ['⭐', '✨'],
  lent: ['🌿'],
  'holy-week': ['🌿'],
  triduum: ['🕊️'],
  easter: ['🌸', '🕊️'],
  ordinary: ['🕊️', '🌿'],
};

/**
 * A brief shower of symbols with an optional banner, marking something
 * finished. Does nothing when the reader has turned animations off; with
 * reduced motion set on the device, the banner appears without the shower.
 */
export function celebrate({ season = 'ordinary', symbols, title, sub, count = 22 } = {}) {
  if (!settings().animations) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced && !title) return;
  const layer = el('div', { class: 'celebrate-layer', 'aria-hidden': 'true' });
  if (title) {
    layer.append(el('div', { class: 'celebrate-banner' },
      el('div', { class: 'celebrate-title', text: title }),
      sub ? el('div', { class: 'celebrate-sub', text: sub }) : null));
  }
  if (!reduced) {
    const pool = symbols || SEASON_SYMBOLS[season] || SEASON_SYMBOLS.ordinary;
    for (let i = 0; i < count; i += 1) {
      const drop = el('div', { class: 'celebrate-drop', text: pool[i % pool.length] });
      drop.style.left = `${Math.random() * 100}%`;
      drop.style.animationDelay = `${Math.random() * 0.7}s`;
      drop.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
      drop.style.fontSize = `${1.2 + Math.random() * 1.4}rem`;
      layer.append(drop);
    }
  }
  document.body.append(layer);
  setTimeout(() => layer.classList.add('fade'), title ? 2400 : 2000);
  setTimeout(() => layer.remove(), title ? 3100 : 2700);
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
