// view-settings.js
// Settings, backup and restore, and information about the app.

import { books, loadAllBooks, loadedCount, translation } from './bible.js';
import { go, today } from './context.js';
import { exportBackup, importBackup, saveSetting, settings } from './db.js';
import { choice, confirmSheet, el, icon, toast } from './ui.js';
import { APP_VERSION } from './version.js';

export async function render(container, _params, { applyTheme }) {
  const current = settings();

  const segmented = (key, options, after) => choice(options, current[key], async (value) => {
    await saveSetting(key, value);
    if (after) after();
  });

  const toggle = (key, label, help, after) => {
    const input = el('input', { type: 'checkbox', id: `setting-${key}` });
    input.checked = Boolean(current[key]);
    input.addEventListener('change', async () => { await saveSetting(key, input.checked); if (after) after(); });
    return el('label', { class: 'setting-row check-row', for: `setting-${key}` },
      el('span', { class: 'setting-text' }, el('span', { text: label }), help ? el('span', { class: 'muted small', text: help }) : null),
      input);
  };

  // --- Offline text ---
  const offlineStatus = el('p', { class: 'muted small' });
  const offlineButton = el('button', { class: 'button quiet' }, 'Save the whole Bible for offline use');
  const drawOffline = () => {
    const total = books().length;
    const have = loadedCount();
    offlineStatus.textContent = have >= total
      ? `All ${total} books are saved on this device.`
      : `${have} of ${total} books are in memory. The rest are saved as you open them, or all at once below.`;
    offlineButton.hidden = have >= total;
  };
  offlineButton.addEventListener('click', async () => {
    offlineButton.disabled = true;
    try {
      await loadAllBooks((done, total) => { offlineStatus.textContent = `Saving ${done} of ${total} books…`; });
      toast('The whole Bible is saved for offline use');
    } catch {
      toast('Some books could not be saved. Check your connection and try again.');
    }
    offlineButton.disabled = false;
    drawOffline();
  });
  drawOffline();

  // --- Backup ---
  const fileInput = el('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    let backup;
    try {
      backup = JSON.parse(await file.text());
    } catch {
      toast('That file could not be read as a backup.');
      return;
    }
    confirmSheet('Restore this backup?', 'Everything now on this device (notes, highlights, links, your daily list and its record, novenas, intentions, your own prayers, plan progress and settings) will be replaced by the contents of the backup.', 'Restore', async () => {
      try {
        const counts = await importBackup(backup);
        applyTheme();
        toast(`Backup restored: ${counts.notes} notes, ${counts.practices} daily prayers, ${counts.novenas} novenas`);
        go('#/today');
      } catch (error) {
        toast(error.message);
      }
    });
  });

  async function downloadBackup() {
    const backup = await exportBackup(APP_VERSION);
    const blob = new Blob([JSON.stringify(backup, null, 1)], { type: 'application/json' });
    const name = `biblica-backup-${today()}.json`;
    const file = new File([blob], name, { type: 'application/json' });
    // On phones the share sheet is the dependable way to get a file out of an installed app.
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Biblica backup' });
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(blob);
    const anchor = el('a', { href: url, download: name });
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup saved to your downloads');
  }

  const text = translation();
  container.append(
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => go('#/today') }, icon('back'), el('span', { text: 'Today' }))),
    el('h1', { class: 'page-title', text: 'Settings' }),

    el('section', { class: 'card' },
      el('h3', { class: 'card-heading', text: 'Appearance' }),
      el('div', { class: 'setting-row' }, el('span', { text: 'Theme' }), segmented('theme', [['auto', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']], applyTheme)),
      toggle('animations', 'Celebrations', 'A brief shower of symbols when you finish a reading, a devotion or the day’s prayers.')),

    el('section', { class: 'card' },
      el('h3', { class: 'card-heading', text: 'Prayers' }),
      el('div', { class: 'setting-row' }, el('span', { text: 'Language' }), segmented('prayerLanguage', [['en', 'English'], ['la', 'Latin'], ['both', 'Both']])),
      toggle('holyGhost', 'Say “Holy Ghost”', 'Shown in place of “Holy Spirit” in the English prayers.'),
      toggle('luminous', 'Luminous Mysteries', 'Prayed on Thursdays. Turn off for the older fifteen-decade Rosary.'),
      toggle('fatimaPrayer', 'Fatima prayer', 'Added after each decade of the Rosary.')),

    el('section', { class: 'card' },
      el('h3', { class: 'card-heading', text: 'Calendar' }),
      el('div', { class: 'setting-row' }, el('span', { text: 'Region' }), segmented('region', [['us', 'United States'], ['general', 'General Roman']])),
      toggle('ascensionThursday', 'Ascension on Thursday', 'Kept on Thursday in a few provinces of the United States; elsewhere there it moves to Sunday.'),
      el('p', { class: 'muted small', text: 'The calendar and readings follow the ordinary form of the Roman Rite. The General Roman option keeps Epiphany on 6 January and Ascension and Corpus Christi on their Thursdays.' })),

    el('section', { class: 'card' },
      el('h3', { class: 'card-heading', text: 'Your data' }),
      el('p', { class: 'muted', text: 'Your notes, highlights, links, daily list, novenas, intentions, own prayers and plan progress are stored only on this device. Deleting the app or clearing browser data erases them, so keep a backup.' }),
      el('div', { class: 'button-row' },
        el('button', { class: 'button', onclick: downloadBackup }, 'Back up'),
        el('button', { class: 'button quiet', onclick: () => fileInput.click() }, 'Restore from a backup')),
      toggle('backupPrivate', 'Include confession notes in backups', 'Off by default: what you mark in the examination of conscience, and the date of your last confession, stay out of backup files.'),
      fileInput),

    el('section', { class: 'card' },
      el('h3', { class: 'card-heading', text: 'Offline' }),
      offlineStatus, offlineButton),

    el('section', { class: 'card' },
      el('h3', { class: 'card-heading', text: 'About' }),
      el('p', { class: 'muted', text: `Biblica ${APP_VERSION}` }),
      el('p', { class: 'muted small', text: text ? `${text.name}, ${text.edition}. ${text.license}. Psalms carry their modern numbers; the Vulgate number is shown beside each.` : '' }),
      el('p', { class: 'muted small', text: 'Mass readings are shown in the Douay-Rheims, which is not the translation read at Mass. Verse numbers were matched to the lectionary automatically and can be a verse off in a few books, chiefly Sirach and Tobit.' })),
  );
}
