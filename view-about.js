// view-about.js
// The pages about the app itself: privacy, terms of use, sources and
// licences, and what each release brought. The words come from
// data-about.json, which is built from the Markdown files at the top of the
// project, so the app and the repository always say the same thing.

import { goBack, monthName } from './context.js';
import { add, el, icon } from './ui.js';
import { APP_VERSION } from './version.js';

let aboutData = null;

async function loadAbout() {
  if (!aboutData) {
    const response = await fetch('data-about.json');
    if (!response.ok) throw new Error('The pages about the app could not be loaded.');
    aboutData = await response.json();
  }
  return aboutData;
}

/** A link that leaves the app: opened in the browser, marked as such, and told nothing of where it came from. */
export function outLink(address, label) {
  return el('a', { class: 'out-link', href: address, target: '_blank', rel: 'noopener noreferrer' },
    label, icon('out', 15), el('span', { class: 'visually-hidden', text: ' (opens another website)' }));
}

function inline(parts) {
  return parts.map((part) => {
    if (typeof part === 'string') return part;
    if (part.b) return el('strong', { text: part.b });
    if (part.c) return el('code', { text: part.c });
    return outLink(part.a, part.x);
  });
}

function header() {
  return el('header', { class: 'reader-bar' },
    el('button', { class: 'back-button', onclick: () => goBack('#/settings') }, icon('back'), el('span', { text: 'Back' })));
}

/** One of the written pages: 'privacy', 'terms' or 'sources'. */
export async function renderPage(container, { page }) {
  const about = await loadAbout();
  const content = about[page] && about[page].blocks ? about[page] : about.privacy;
  const body = el('article', { class: 'card about-page' });
  for (const block of content.blocks) {
    if (block.h) add(body, el('h2', { class: 'about-heading', text: block.h }));
    else if (block.p) add(body, el('p', {}, inline(block.p)));
    else if (block.l) add(body, el('ul', {}, block.l.map((item) => el('li', {}, inline(item)))));
  }
  add(container, header(), el('h1', { class: 'page-title', text: content.title }), body);
}

/** What each release brought, newest first. */
export async function renderNews(container) {
  const about = await loadAbout();
  add(container, header(), el('h1', { class: 'page-title', text: 'What is new' }));
  for (const release of about.news) {
    const [year, month, day] = release.date.split('-').map(Number);
    add(container, el('section', { class: 'card about-page' },
      el('h2', { class: 'about-heading', text: `Version ${release.version}${release.version === APP_VERSION ? ' (this one)' : ''}` }),
      el('p', { class: 'muted small', text: `${monthName(month)} ${day}, ${year}` }),
      el('ul', {}, release.items.map((item) => el('li', { text: item })))));
  }
}
