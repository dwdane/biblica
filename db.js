// db.js
// Everything the reader creates lives here, in IndexedDB on this device:
// settings, highlights, notes, links between verses, reading progress, the
// daily prayer list and its log, novenas, intentions, the reader's own
// prayers, reflections, the journal and patron saints. No other module
// touches IndexedDB directly.

const DB_NAME = 'biblica';

// Version history:
//   1  settings, highlights, notes, links, plans, readings (release 0.1)
//   2  practices, practiceLog, novenas, intentions, ownPrayers, conscience (release 0.2)
//   3  reflections, journal, patrons (release 0.3)
const DB_VERSION = 3;

// Object stores and their key paths. Adding a store means raising DB_VERSION;
// the upgrade below creates whatever is missing and never touches what exists.
const STORES = {
  settings: { keyPath: 'key' },
  highlights: { keyPath: 'id' }, // id is a verse id such as "GEN.1.1"
  notes: { keyPath: 'id', autoIncrement: true, indexes: ['start'] },
  links: { keyPath: 'id', autoIncrement: true, indexes: ['from', 'to'] },
  plans: { keyPath: 'id' }, // id is the plan id
  readings: { keyPath: 'id' }, // id is an ISO date
  practices: { keyPath: 'id', autoIncrement: true }, // entries of the daily prayer list
  practiceLog: { keyPath: 'id' }, // id is an ISO date; what was prayed that day
  novenas: { keyPath: 'id', autoIncrement: true },
  intentions: { keyPath: 'id', autoIncrement: true },
  ownPrayers: { keyPath: 'id', autoIncrement: true },
  conscience: { keyPath: 'id' }, // examination notes; see PRIVATE_STORES
  reflections: { keyPath: 'id', autoIncrement: true }, // notes on a theme, each citing any number of passages
  journal: { keyPath: 'id' }, // id is an ISO date; what the reader wrote at the examen or on that day
  patrons: { keyPath: 'id', autoIncrement: true }, // the reader's own saints
};

// Stores left out of backups unless the reader asks for them to be included.
const PRIVATE_STORES = ['conscience'];

// Settings that describe this device and not the reader: when it last made a
// backup or asked for an update, and which release it last ran. They stay out
// of backups, and a restore leaves this device's own values as they are.
const DEVICE_SETTINGS = ['lastBackup', 'updateChecked', 'seenVersion'];

let dbPromise = null;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const [name, spec] of Object.entries(STORES)) {
          if (db.objectStoreNames.contains(name)) continue;
          const store = db.createObjectStore(name, { keyPath: spec.keyPath, autoIncrement: Boolean(spec.autoIncrement) });
          for (const index of spec.indexes || []) store.createIndex(index, index);
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        // Step aside if another tab needs to upgrade or delete the database.
        database.onversionchange = () => {
          database.close();
          dbPromise = null;
        };
        resolve(database);
      };
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
      // Another tab still has the older database open. The upgrade goes
      // ahead by itself once that tab closes; until then, say why we wait.
      request.onblocked = () => window.dispatchEvent(new Event('biblica:blocked'));
    });
  }
  return dbPromise;
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(name, mode, work) {
  const db = await open();
  const transaction = db.transaction(name, mode);
  const result = await work(transaction.objectStore(name));
  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  return result;
}

export const db = {
  get: (store, key) => withStore(store, 'readonly', (s) => promisify(s.get(key))),
  all: (store) => withStore(store, 'readonly', (s) => promisify(s.getAll())),
  put: (store, value) => withStore(store, 'readwrite', (s) => promisify(s.put(value))),
  remove: (store, key) => withStore(store, 'readwrite', (s) => promisify(s.delete(key))),
  byIndex: (store, index, value) => withStore(store, 'readonly', (s) => promisify(s.index(index).getAll(value))),
  /**
   * Read a record, change it and write it back in one transaction, so two
   * changes made at the same moment cannot overwrite each other.
   * `change(record)` receives the stored record (or undefined) and returns
   * the record to store; returning undefined leaves the store untouched.
   */
  change: (store, key, change) => withStore(store, 'readwrite', async (s) => {
    const next = change(await promisify(s.get(key)));
    if (next !== undefined) await promisify(s.put(next));
    return next;
  }),
};

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS = {
  textSize: 19, // px, for Scripture text
  verseLayout: 'lines', // 'lines' or 'flow'
  theme: 'auto', // 'auto', 'light' or 'dark'
  region: 'us', // 'us' or 'general'
  ascensionThursday: false,
  lastPlace: null, // { book, chapter }
  prayerLanguage: 'en', // 'en', 'la' or 'both'
  holyGhost: false, // say "Holy Ghost" where the prayers have "Holy Spirit"
  luminous: true, // pray the Luminous Mysteries on Thursdays
  fatimaPrayer: true, // add the Fatima prayer after each decade
  rosaryScripture: true, // show a Scripture passage with each mystery
  lectioMinutes: 0, // minutes per step of Lectio Divina; 0 means untimed
  hideDailySetup: false, // the reader dismissed the invitation to set up a daily list
  favourites: [], // prayer ids kept at the top of the library
  backupPrivate: false, // include examination notes in backups
  devotionProgress: null, // { key, date, step } for resuming a devotion left midway
  showLatin: false, // show the Vulgate beneath each verse in the reader
  examenJournal: true, // offer to write in the journal during the examen
  dailyMarks: false, // show a quiet mark beside what has been prayed today (off: the list is for going to, not ticking off)
  showOnThisDay: true, // the "On this day" card on Today; kept for older backups, now part of todayCards
  todayCards: null, // the cards on Today, in order: [{ id, on }]; null for the usual arrangement (see dashboard.js)
  translation: 'drb', // the Bible shown in the reader: 'drb' (Douay-Rheims) or 'cpdv' (Catholic Public Domain Version)
  autoUpdate: true, // restart into a new release at the next quiet moment, rather than asking
  seenVersion: null, // the release this device last started as
  updateChecked: null, // when Settings last asked the site for an update (ISO time)
  lastBackup: null, // when a backup was last made on this device (ISO time)
  welcomed: false, // the reader has seen the note about privacy on first opening
  massForm: 'ordinary', // which form of the Mass the companion opens on: 'ordinary' or 'traditional'
  massLanguage: 'both', // the traditional Mass in 'la', 'en' or 'both'
  massKind: 'low', // postures shown for the traditional Mass: 'low' or 'sung'
  massWake: true, // keep the screen awake while following the Mass
};

let settingsCache = null;

export async function loadSettings() {
  if (!settingsCache) {
    const loadedSettings = { ...DEFAULT_SETTINGS };
    try {
      const rows = await db.all('settings');
      for (const row of rows) loadedSettings[row.key] = row.value;
      // Marks became something to turn on in 0.5. A reader who had been marking what
      // they prayed keeps them; everyone else starts with the plain list.
      if (rows.length && !rows.some((row) => row.key === 'dailyMarks')) {
        loadedSettings.dailyMarks = (await db.all('practiceLog')).some((log) => Object.keys(log.done || {}).length);
        await db.put('settings', { key: 'dailyMarks', value: loadedSettings.dailyMarks });
      }
    } catch (error) {
      // Storage can be unavailable (some private browsing modes). The Bible
      // is still readable; nothing the reader does will be remembered.
      console.warn('Settings could not be read; using defaults.', error);
    }
    settingsCache = loadedSettings;
  }
  return settingsCache;
}

/** Settings as last loaded. Call loadSettings() once at start-up first. */
export function settings() {
  return settingsCache || DEFAULT_SETTINGS;
}

export async function saveSetting(key, value) {
  await loadSettings();
  settingsCache[key] = value;
  await db.put('settings', { key, value });
}

/** Calendar options derived from the reader's settings. */
export function calendarOptions() {
  const current = settings();
  const us = current.region === 'us';
  return {
    region: current.region,
    epiphanyOnSunday: us,
    ascensionOnSunday: us && !current.ascensionThursday,
    corpusChristiOnSunday: us,
  };
}

// ---------------------------------------------------------------------------
// Backup and restore
// ---------------------------------------------------------------------------

const BACKUP_FORMAT = 'biblica-backup';

export async function exportBackup(appVersion) {
  const stores = {};
  const includePrivate = Boolean(settings().backupPrivate);
  for (const name of Object.keys(STORES)) {
    if (PRIVATE_STORES.includes(name) && !includePrivate) continue;
    stores[name] = await db.all(name);
  }
  stores.settings = stores.settings.filter((row) => !DEVICE_SETTINGS.includes(row.key));
  return { format: BACKUP_FORMAT, formatVersion: 1, appVersion, exported: new Date().toISOString(), stores };
}

/**
 * Refuse a file that is not a usable backup, before anything is changed.
 * Every store present must be a list of records, each carrying the key its
 * store needs, and at least one store must be present at all.
 */
function checkBackup(backup) {
  const stores = backup && backup.format === BACKUP_FORMAT ? backup.stores : null;
  if (!stores || typeof stores !== 'object' || Array.isArray(stores)) {
    throw new Error('That file is not a Biblica backup.');
  }
  const damaged = new Error('That backup file is damaged. Nothing on this device was changed.');
  let present = 0;
  for (const [name, spec] of Object.entries(STORES)) {
    const rows = stores[name];
    if (rows === undefined) continue;
    if (!Array.isArray(rows)) throw damaged;
    present += 1;
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw damaged;
      const key = row[spec.keyPath];
      const keyed = typeof key === 'string' || (typeof key === 'number' && Number.isFinite(key));
      if (!keyed && !(spec.autoIncrement && key === undefined)) throw damaged;
    }
  }
  if (!present) throw new Error('That file is not a Biblica backup.');
}

/**
 * Replace everything on this device with the contents of a backup.
 * Throws if the file is not a Biblica backup, before anything is changed.
 * A backup from an older release simply lacks the newer stores, which are
 * then emptied like the rest. Private stores are the exception: they are
 * only replaced when the backup actually carries them.
 */
export async function importBackup(backup) {
  checkBackup(backup);
  const database = await open();
  const names = Object.keys(STORES);
  const kept = Object.fromEntries(DEVICE_SETTINGS.map((key) => [key, settings()[key]]));
  const transaction = database.transaction(names, 'readwrite');
  const finished = new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('The backup could not be restored.'));
  });
  try {
    for (const name of names) {
      if (PRIVATE_STORES.includes(name) && backup.stores[name] === undefined) continue;
      const store = transaction.objectStore(name);
      store.clear();
      for (const row of backup.stores[name] || []) {
        // A backup made by an earlier release may carry another device's bookkeeping.
        if (name === 'settings' && DEVICE_SETTINGS.includes(row.key)) continue;
        store.put(row);
      }
      if (name === 'settings') {
        for (const key of DEVICE_SETTINGS) {
          if (kept[key] !== null && kept[key] !== undefined) store.put({ key, value: kept[key] });
        }
      }
    }
  } catch {
    // Undo everything already queued, so the device is left as it was.
    transaction.abort();
    await finished.catch(() => {});
    throw new Error('That backup file is damaged. Nothing on this device was changed.');
  }
  await finished;
  settingsCache = null;
  await loadSettings();
  const counts = {};
  for (const name of names) counts[name] = (backup.stores[name] || []).length;
  return counts;
}

/** Roughly how many bytes everything the reader has written takes up, counted as a backup would hold it. */
export async function writtenBytes() {
  let total = 0;
  for (const name of Object.keys(STORES)) {
    total += new Blob([JSON.stringify(await db.all(name))]).size;
  }
  return total;
}

/**
 * Remove everything the reader has written, and every setting, from this
 * device, private stores included. The app's own files are left alone.
 */
export async function eraseEverything() {
  const database = await open();
  const names = Object.keys(STORES);
  const transaction = database.transaction(names, 'readwrite');
  const finished = new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Nothing was erased.'));
  });
  for (const name of names) transaction.objectStore(name).clear();
  await finished;
  settingsCache = null;
  await loadSettings();
}

/** Whether the browser has agreed not to clear this app's storage by itself; null where it cannot say. */
export async function storageProtected() {
  if (navigator.storage && navigator.storage.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch {
      return null;
    }
  }
  return null;
}

/** Ask the browser not to evict this app's data when the device runs low on space. */
export async function requestPersistence() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}
