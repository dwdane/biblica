// view-settings.js
// Settings: how the app looks and prays, the reader's data, what is kept on
// the device, updates, and the pages about the app.

import { books, currentTranslation, loadAllBooks, savedBookCount, translation, TRANSLATIONS } from './bible.js';
import { go, monthName, today } from './context.js';
import { eraseEverything, exportBackup, importBackup, requestPersistence, saveSetting, settings } from './db.js';
import { readableSize, removeSavedStudy, removeSavedTranslation, storageReport } from './storage.js';
import { loadAllStudy, studySavedOffline } from './study.js';
import { add, choice, clear, confirmSheet, el, icon, once, restartWith, toast } from './ui.js';
import { arrangeSheet } from './view-today.js';
import { checkForUpdate, holdRestarts, reinstallApp, restartNow, updateReady, updatesSupported } from './updates.js';
import { APP_VERSION } from './version.js';

/** "9 October at 14:05", or "today at 14:05", from an ISO time. */
function whenText(isoTime) {
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) return '';
  const clock = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const sameDay = new Date().toDateString() === date.toDateString();
  return sameDay ? `today at ${clock}` : `${monthName(date.getMonth() + 1)} ${date.getDate()} at ${clock}`;
}

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

  const pageLink = (path, label, sub) => el('button', { class: 'list-row', onclick: () => go(path) },
    el('span', { class: 'row-text' },
      el('span', { class: 'row-title', text: label }),
      sub ? el('span', { class: 'row-sub', text: sub }) : null),
    icon('forward', 18));

  const text = translation();
  add(container,
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => go('#/today') }, icon('back'), el('span', { text: 'Today' }))),
    el('h1', { class: 'page-title', text: 'Settings' }),

    el('section', { class: 'card' },
      el('h3', { class: 'card-heading', text: 'Appearance' }),
      el('div', { class: 'setting-row' }, el('span', { text: 'Theme' }), segmented('theme', [['auto', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']], applyTheme))),

    readingCard(current, segmented, toggle, applyTheme),

    el('section', { class: 'card' },
      el('h3', { class: 'card-heading', text: 'Today' }),
      el('div', { class: 'setting-row stacked' },
        el('span', { class: 'setting-text' }, el('span', { text: 'What Today shows' }), el('span', { class: 'muted small', text: 'Show, hide and order the cards below the day: your rule of life, the readings, a short prayer, intentions, the journal and the rest.' })),
        el('button', { class: 'button quiet', onclick: () => arrangeSheet(() => {}) }, 'Arrange Today')),
      toggle('dailyMarks', 'Mark what I have prayed', 'Off unless you want it. When on, a quiet word appears beside what you have prayed in your rule of life today, and you can look back over the month. Nothing is counted either way.')),

    el('section', { class: 'card' },
      el('h3', { class: 'card-heading', text: 'Prayers' }),
      el('div', { class: 'setting-row' }, el('span', { text: 'Language' }), segmented('prayerLanguage', [['en', 'English'], ['la', 'Latin'], ['both', 'Both']])),
      toggle('holyGhost', 'Say “Holy Ghost”', 'Shown in place of “Holy Spirit” in the English prayers.'),
      toggle('luminous', 'Luminous Mysteries', 'Prayed on Thursdays. Turn off for the older fifteen-decade Rosary.'),
      toggle('fatimaPrayer', 'Fatima prayer', 'Added after each decade of the Rosary.'),
      toggle('rosaryScripture', 'Scripture with each mystery', 'A passage from the Gospels shown with each mystery of the Rosary.'),
      toggle('examenJournal', 'Journal in the examen', 'Offers a place to write during the evening examen.'),
      el('div', { class: 'setting-row stacked' }, el('span', { class: 'setting-text' }, el('span', { text: 'Lectio Divina' }), el('span', { class: 'muted small', text: 'Time given to each step.' })),
        segmented('lectioMinutes', [[0, 'Untimed'], [3, '3 min'], [5, '5 min'], [10, '10 min']]))),

    el('section', { class: 'card' },
      el('h3', { class: 'card-heading', text: 'Calendar' }),
      el('div', { class: 'setting-row' }, el('span', { text: 'Region' }), segmented('region', [['us', 'United States'], ['general', 'General Roman']])),
      toggle('ascensionThursday', 'Ascension on Thursday', 'Kept on Thursday in a few provinces of the United States; elsewhere there it moves to Sunday.'),
      el('p', { class: 'muted small', text: 'The calendar and readings follow the ordinary form of the Roman Rite. The General Roman option keeps Epiphany on 6 January and Ascension and Corpus Christi on their Thursdays.' })),

    dataCard(toggle),
    storageCard(),
    updatesCard(toggle),

    el('section', { class: 'card list-card' },
      el('h3', { class: 'card-heading', text: 'About' }),
      el('p', { class: 'muted', text: `Biblica ${APP_VERSION}. A Catholic Bible and daily prayer companion. Free, with no accounts, no advertising and no tracking.` }),
      pageLink('#/about/privacy', 'Privacy', 'What stays on your device (everything) and what leaves it (nothing you write)'),
      pageLink('#/about/terms', 'Terms of use', 'What the app is and is not'),
      pageLink('#/about/sources', 'Sources and licences', 'Where the texts come from, and on what terms'),
      pageLink('#/about/licence', 'The MIT licence', 'The terms on which the app’s code may be reused'),
      pageLink('#/about/news', 'What is new', `In version ${APP_VERSION} and before`)),

    el('section', { class: 'card' },
      el('h3', { class: 'card-heading', text: 'The texts' }),
      el('p', { class: 'muted small', text: text ? `${text.name}, ${text.edition}. ${text.license}. Psalms carry their modern numbers; the Vulgate number is shown beside each.` : '' }),
      el('p', { class: 'muted small', text: 'The Catholic Public Domain Version is Ronald L. Conte Jr.’s translation of the Vulgate, placed by him in the public domain, as published by the Scrollmapper Bible databases. In six chapters the verse divisions of that copy were put back in step with the Douay-Rheims; the words are unchanged.' }),
      el('p', { class: 'muted small', text: 'The Latin is the Clementine Vulgate. The Fathers’ commentary comes from the nineteenth-century English editions and the Catena Aurea, as gathered by the Historical Christian Faith project. Cross-references are from OpenBible.info, under a Creative Commons Attribution licence.' }),
      el('p', { class: 'muted small', text: 'Mass readings are shown in the translation chosen under Reading, which is not the one read at Mass in English-speaking countries. Verse numbers were matched to the lectionary automatically and can be a verse off in a few books, chiefly Sirach and Tobit.' })),
  );
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

function readingCard(current, segmented, toggle, applyTheme) {
  const sample = el('p', { class: 'setting-sample', text: 'In the beginning was the Word, and the Word was with God, and the Word was God.' });
  const size = el('input', { type: 'range', min: '15', max: '28', step: '1', value: String(current.textSize), 'aria-label': 'Text size', class: 'slider' });
  const drawSample = () => { sample.style.fontSize = `${size.value}px`; };
  size.addEventListener('input', drawSample);
  size.addEventListener('change', async () => {
    await saveSetting('textSize', Number(size.value));
    applyTheme();
  });
  drawSample();
  const about = el('p', { class: 'muted small translation-about' });
  const drawAbout = () => { about.textContent = currentTranslation().about; };
  drawAbout();
  return el('section', { class: 'card' },
    el('h3', { class: 'card-heading', text: 'Reading' }),
    el('div', { class: 'setting-row stacked' },
      el('span', { text: 'Translation' }),
      segmented('translation', TRANSLATIONS.map((item) => [item.id, item.short]), drawAbout)),
    about,
    el('div', { class: 'setting-row' }, el('span', { text: 'Text size' }), size),
    sample,
    el('div', { class: 'setting-row' }, el('span', { text: 'Verses' }), segmented('verseLayout', [['lines', 'One to a line'], ['flow', 'Flowing']])),
    toggle('showLatin', 'Latin beneath each verse', 'The Clementine Vulgate, shown under the English in the Bible.'));
}

// ---------------------------------------------------------------------------
// Your data: backup, restore and erasing
// ---------------------------------------------------------------------------

function dataCard(toggle) {
  const backupNote = el('p', { class: 'muted small' });
  const drawBackupNote = () => {
    const last = settings().lastBackup;
    backupNote.textContent = last
      ? `Last backup made on this device: ${whenText(last)}.`
      : 'No backup has been made on this device yet.';
  };
  drawBackupNote();

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
    confirmSheet('Restore this backup?', 'Everything now on this device (notes, reflections, your journal, highlights, links, your daily list and its record, novenas, intentions, your saints, your own prayers, plan progress and settings) will be replaced by the contents of the backup. Anything the backup does not hold, such as reflections or a journal begun since it was made, will be gone.', 'Restore', async () => {
      try {
        const counts = await importBackup(backup);
        // A clean start, so that no screen goes on showing what it had in mind before.
        restartWith(`Backup restored: ${counts.notes} notes, ${counts.reflections} reflections, ${counts.journal} journal entries, ${counts.practices} daily prayers`);
      } catch (error) {
        toast(error.message);
      }
    });
  });

  async function downloadBackup() {
    // Coming back from the share sheet must not be taken for a moment to restart for an update.
    holdRestarts();
    const backup = await exportBackup(APP_VERSION);
    const blob = new Blob([JSON.stringify(backup, null, 1)], { type: 'application/json' });
    const name = `biblica-backup-${today()}.json`;
    const file = new File([blob], name, { type: 'application/json' });
    const made = async () => {
      await saveSetting('lastBackup', new Date().toISOString());
      drawBackupNote();
    };
    // On phones the share sheet is the dependable way to get a file out of an installed app.
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Biblica backup' });
        await made();
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
    await made();
    toast('Backup saved to your downloads');
  }

  const erase = () => confirmSheet('Erase everything?', 'All your notes, reflections, journal, highlights, links, your daily list and its record, novenas, intentions, saints, your own prayers, confession notes, plan progress and settings will be removed from this device. This cannot be undone. A backup file you made earlier is not affected. The app itself and the Bible text saved for offline use stay; they hold nothing you wrote.', 'Erase everything', async () => {
    try {
      await eraseEverything();
      restartWith('Everything you had written has been erased from this device');
    } catch {
      toast('Nothing was erased: the device’s storage could not be reached.');
    }
  });

  return el('section', { class: 'card' },
    el('h3', { class: 'card-heading', text: 'Your data' }),
    el('p', { class: 'muted', text: 'Everything you write stays on this device and is never sent anywhere. Nobody else can see it, and nobody else can recover it: deleting the app or clearing browser data erases it, so keep a backup.' }),
    el('div', { class: 'button-row' },
      el('button', { class: 'button', onclick: once(downloadBackup) }, 'Back up'),
      el('button', { class: 'button quiet', onclick: () => { holdRestarts(); fileInput.click(); } }, 'Restore from a backup')),
    el('p', { class: 'muted small', text: 'A backup is one file holding your notes, reflections, journal, highlights, links, daily list and its record, novenas, intentions, saints, own prayers, plan progress and settings.' }),
    backupNote,
    toggle('backupPrivate', 'Include confession notes in backups', 'Off by default: what you mark in the examination of conscience, and the date of your last confession, stay out of backup files.'),
    el('div', { class: 'setting-row' },
      el('span', { class: 'setting-text' }, el('span', { text: 'Start again' }), el('span', { class: 'muted small', text: 'Removes everything you have written, and every setting, from this device.' })),
      el('button', { class: 'button danger quiet', onclick: erase }, 'Erase everything')),
    el('button', { class: 'text-button', onclick: () => go('#/about/privacy') }, 'Read the privacy statement'),
    fileInput);
}

// ---------------------------------------------------------------------------
// Storage and offline use
// ---------------------------------------------------------------------------

function storageCard() {
  const bookIds = books().map((entry) => entry.id);
  const figures = el('div', { class: 'storage-figures' }, el('p', { class: 'muted small', text: 'Measuring…' }));
  const status = el('p', { class: 'muted small', role: 'status' });
  const bibleButton = el('button', { class: 'button quiet', hidden: true }, 'Save the whole Bible');
  const studyButton = el('button', { class: 'button quiet', hidden: true }, 'Save all the study material');
  const removeButton = el('button', { class: 'button quiet', hidden: true }, 'Remove the study material');
  // The books of a translation no longer read, which can be removed to free their room.
  const otherNode = el('div', {});
  const protection = el('p', { class: 'muted small' });
  const protectButton = el('button', { class: 'text-button', hidden: true }, 'Ask the browser to protect it');

  // The service worker files each file away a moment after it arrives, so the
  // count is asked for a few times before a shortfall is believed.
  const settled = async (check) => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      if (await check()) return true;
      await new Promise((resolve) => { setTimeout(resolve, 400); });
    }
    return false;
  };
  const notKept = 'Not everything could be kept. The device may be short of space, or the app may need closing and opening once before it can save for offline use.';

  const line = (label, value, sub) => el('div', { class: 'storage-line' },
    el('span', { class: 'storage-label' }, el('span', { text: label }), sub ? el('span', { class: 'muted small', text: sub }) : null),
    el('span', { class: 'storage-value', text: value }));

  // Without the cache or a service worker nothing is kept for offline use, whatever is in memory.
  const canKeep = 'caches' in window && 'serviceWorker' in navigator;

  async function draw() {
    const total = bookIds.length;
    if (!canKeep) {
      const report = await storageReport();
      clear(figures);
      add(figures,
        el('p', { class: 'muted small', text: 'This browser keeps nothing for offline use, so the app and the Bible are fetched each time and need a connection. Adding the app to the home screen usually puts that right.' }),
        line('What you have written', readableSize(report.written.bytes)));
      return;
    }
    const [report, savedBooks, studyAll] = await Promise.all([
      storageReport(),
      savedBookCount().catch(() => null),
      studySavedOffline(bookIds).catch(() => false),
    ]);
    const haveBooks = savedBooks === null ? 0 : savedBooks;
    clear(figures);
    add(figures,
      line('The app itself', readableSize(report.app.bytes)),
      line('The Bible', readableSize(report.bible.bytes), haveBooks >= total ? `All ${total} books of the ${currentTranslation().short} are saved for offline use` : `${haveBooks} of ${total} books of the ${currentTranslation().short} saved; the rest are saved as you open them`),
      line('Latin, cross-references, the Fathers and early writings', readableSize(report.study.bytes), studyAll ? 'All of it is saved for offline use' : (report.study.files ? `${report.study.files} files saved; more are saved as you use them` : 'Saved book by book as you use it')),
      line('What you have written', readableSize(report.written.bytes)),
      el('div', { class: 'storage-line total' }, el('span', { class: 'storage-label', text: 'Altogether' }), el('span', { class: 'storage-value', text: readableSize(report.total) })));
    bibleButton.hidden = haveBooks >= total;
    clear(otherNode);
    for (const item of TRANSLATIONS) {
      const kept = report.translations[item.id];
      if (item.id === currentTranslation().id || !kept || !kept.files) continue;
      add(otherNode, el('div', { class: 'storage-other' },
        el('p', { class: 'muted small', text: `${kept.files} ${kept.files === 1 ? 'book' : 'books'} of the ${item.short} (${readableSize(kept.bytes)}) are still saved from when you read it.` }),
        el('button', {
          class: 'text-button',
          onclick: async () => {
            const removed = await removeSavedTranslation(item.id);
            toast(removed ? `The ${item.short} has been removed from this device` : 'There was nothing to remove');
            draw();
          },
        }, `Remove the ${item.short}`)));
    }
    studyButton.hidden = Boolean(studyAll);
    removeButton.hidden = report.study.files === 0;
    if (report.protected === true) {
      protection.textContent = 'Your browser has agreed not to clear this by itself.';
      protectButton.hidden = true;
    } else if (report.protected === false) {
      protection.textContent = 'Your browser may clear this if the device runs very short of space. A backup is the sure protection for what you have written.';
      protectButton.hidden = false;
    } else {
      protection.textContent = '';
      protectButton.hidden = true;
    }
  }

  bibleButton.addEventListener('click', async () => {
    bibleButton.disabled = true;
    try {
      await loadAllBooks((done, total) => { status.textContent = `Saving ${done} of ${total} books…`; });
      const all = await settled(async () => (await savedBookCount()) >= books().length);
      toast(all ? 'The whole Bible is saved for offline use' : notKept);
    } catch {
      toast('Some books could not be saved. Check your connection and try again.');
    }
    status.textContent = '';
    bibleButton.disabled = false;
    draw();
  });

  studyButton.addEventListener('click', async () => {
    studyButton.disabled = true;
    try {
      await loadAllStudy(bookIds, (done, total) => { status.textContent = `Saving ${done} of ${total} files…`; });
      if (!(await settled(() => studySavedOffline(bookIds)))) throw new Error(notKept);
      toast('The study material is saved for offline use');
    } catch (error) {
      toast(error.message || 'Some files could not be saved. Check your connection and try again.');
    }
    status.textContent = '';
    studyButton.disabled = false;
    draw();
  });

  removeButton.addEventListener('click', () => confirmSheet('Remove the study material?', 'The saved Latin, cross-references, commentary and early writings will be removed from this device to free the room they take. Nothing you have written is touched, and each is fetched again when you next open it with a connection.', 'Remove', async () => {
    const removed = await removeSavedStudy();
    toast(removed ? 'The study material has been removed from this device' : 'There was nothing to remove');
    draw();
  }));

  protectButton.addEventListener('click', async () => {
    const granted = await requestPersistence();
    toast(granted ? 'The browser will keep it' : 'The browser did not agree. Adding the app to your home screen usually settles it.');
    draw();
  });

  draw().catch(() => { clear(figures).append(el('p', { class: 'muted small', text: 'This browser does not say how much is kept.' })); });

  return el('section', { class: 'card' },
    el('h3', { class: 'card-heading', text: 'Storage' }),
    el('p', { class: 'muted', text: 'What Biblica keeps on this device, so that it works offline.' }),
    figures,
    otherNode,
    el('p', { class: 'muted small', text: 'Nothing here grows by itself. The app and the texts are copies of fixed files, replaced rather than added to when the app updates, and come to about 40 MB with everything saved in one translation. What you write is text only: years of daily notes stay under a megabyte or two.' }),
    status,
    el('div', { class: 'button-row' }, bibleButton, studyButton, removeButton),
    protection, protectButton);
}

// ---------------------------------------------------------------------------
// Updates
// ---------------------------------------------------------------------------

function updatesCard(toggle) {
  const status = el('div', { class: 'update-status', role: 'status' });
  const say = (...nodes) => add(clear(status), nodes);
  const note = (text) => el('p', { class: 'muted small', text });
  const restartButton = () => el('button', { class: 'button', onclick: () => restartNow() }, 'Restart now');

  const lastChecked = () => {
    const last = settings().updateChecked;
    return last ? `Last checked ${whenText(last)}.` : 'Biblica looks for a new version whenever it is opened or comes back into view.';
  };

  const drawIdle = () => {
    if (updateReady()) say(el('p', { text: 'A newer version has arrived.' }), restartButton());
    else say(note(lastChecked()));
  };

  const describe = (item) => `${item.file} (${item.status === -1 ? 'an older copy' : (item.status || 'no answer')})`;
  const missingList = (missing) => el('ul', { class: 'update-missing' }, missing.slice(0, 12).map((item) => el('li', { text: describe(item) })));

  // A release by its number, or without one where the site's sw.js does not give it.
  const named = (version) => (version ? `Version ${version}` : 'Another version');

  const checkButton = el('button', { class: 'button' }, 'Check for updates');
  checkButton.addEventListener('click', once(async () => {
    say(note('Checking…'));
    const result = await checkForUpdate();
    switch (result.kind) {
      case 'current':
        say(el('p', { text: `This is the latest version (${result.version}).` }), note(lastChecked()));
        break;
      case 'ready':
        say(el('p', { text: result.version === APP_VERSION ? 'A fresh copy of this version has arrived.' : `${named(result.version)} has arrived.` }), restartButton());
        break;
      case 'coming':
        say(el('p', { text: `${named(result.version)} has been published but has not reached this device yet.` }),
          note('A host such as GitHub Pages can take about ten minutes to hand out a new upload. Check again shortly; it will also arrive by itself.'));
        break;
      case 'failed': {
        if (result.reason === 'storage') {
          say(el('p', { text: `${named(result.version)} is published, but this device had no room to keep it, so it is staying on ${APP_VERSION}.` }),
            note('Free some space on the device, or remove the saved study material under Storage above, and check again.'));
          break;
        }
        const unreachable = result.missing.length > 0 && result.missing.every((item) => item.status === 0);
        const stale = result.missing.some((item) => item.status === -1);
        const what = result.missing.length && result.total ? `${result.missing.length} of its ${result.total} files` : 'some of its files';
        say(
          el('p', { text: `${named(result.version)} is published, but ${what} could not be had, so this device is staying on ${APP_VERSION}.` }),
          unreachable ? note('The connection dropped part-way. Try again on a steadier connection.') : null,
          !unreachable && result.missing.length ? missingList(result.missing) : null,
          !unreachable ? note(stale
            ? 'A file marked “an older copy” is on the site but belongs to an earlier release: the upload did not replace it, or the site is still part-way through publishing. The app will look again by itself in a minute. If it stays this way and you publish this copy yourself, upload the whole release again; opening check.html on the site lists the same files.'
            : 'This usually means the upload was not complete, or the site is still part-way through publishing. The app will look again by itself in a minute. If you publish this copy yourself, upload the missing files and check again; opening check.html on the site lists them as well.') : null);
        break;
      }
      case 'offline':
        say(el('p', { text: 'The site could not be reached. You may be offline.' }));
        break;
      default:
        say(el('p', { text: 'This browser cannot install or update the app. It still works while you are online.' }));
    }
  }));

  const reinstall = () => confirmSheet('Fetch the app afresh?', 'Every file of the app is fetched again from the site and checked, replacing the copy on this device. Use this if the app seems stuck on an old version or is misbehaving. Nothing you have written is touched, and the saved Bible text stays. You need to be online.', 'Fetch afresh', async () => {
    say(note('Fetching the app afresh…'));
    const result = await reinstallApp().catch(() => ({ kind: 'offline' }));
    switch (result.kind) {
      case 'restarting':
        break;
      case 'failed':
        if (result.reason === 'storage') {
          say(el('p', { text: 'Nothing was changed: this device had no room to keep the files.' }),
            note('Free some space on the device, or remove the saved study material under Storage above, and try again.'));
          break;
        }
        say(el('p', { text: 'Nothing was changed: some of the app’s files on the site are missing or are not this version’s.' }),
          result.missing.length ? missingList(result.missing) : null,
          note('If you publish this copy yourself, upload the whole release again; opening check.html on the site shows what is wrong.'));
        break;
      case 'coming':
        say(el('p', { text: `Nothing was changed: ${named(result.version).toLowerCase()} has been published but has not reached this device yet. Try again in ten minutes.` }));
        break;
      case 'unsupported':
        say(el('p', { text: 'This browser cannot install the app, so there is nothing to fetch afresh.' }));
        break;
      default:
        say(el('p', { text: 'The site could not be reached, so nothing was changed. Try again when you are online.' }));
    }
  });

  drawIdle();
  window.addEventListener('biblica:update', drawIdle, { once: true });

  return el('section', { class: 'card' },
    el('h3', { class: 'card-heading', text: 'Updates' }),
    el('p', { class: 'muted', text: `This is Biblica ${APP_VERSION}.` }),
    status,
    updatesSupported() ? el('div', { class: 'button-row' }, checkButton) : null,
    toggle('autoUpdate', 'Update by itself', 'A new version is put in place when you open the app or move between screens. Turn off to be asked first.'),
    updatesSupported() ? el('div', { class: 'setting-row' },
      el('span', { class: 'setting-text' }, el('span', { text: 'Stuck on an old version?' }), el('span', { class: 'muted small', text: 'Fetches every file of the app again and checks each one. Your writing is not touched.' })),
      el('button', { class: 'button quiet', onclick: reinstall }, 'Fetch afresh')) : null);
}
