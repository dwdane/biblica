// lectionary.js
// Finds the Mass readings for a liturgical day in the lectionary table.
// Pure functions: the table and the day are passed in, nothing is fetched.

const SLOT_LABELS = {
  first: 'First Reading',
  psalm: 'Responsorial Psalm',
  second: 'Second Reading',
  gospel: 'Gospel',
  epistle: 'Epistle',
  reading1: 'First Reading',
  reading2: 'Second Reading',
  reading3: 'Third Reading',
  reading4: 'Fourth Reading',
  reading5: 'Fifth Reading',
  reading6: 'Sixth Reading',
  reading7: 'Seventh Reading',
};

function toReading([slot, citation, book, spans]) {
  return { slot, label: SLOT_LABELS[slot] || 'Reading', citation, book, spans };
}

function firstEntry(entries, keys) {
  for (const key of keys) {
    if (entries[key]) return entries[key];
  }
  return null;
}

/**
 * The readings of a day.
 *
 * @param {object} day - A day from liturgicalDay() in calendar.js.
 * @param {object} lectionary - The parsed data-lectionary.json.
 * @returns {{readings: Array, masses: Array, title: (string|null), approximate: boolean}}
 *   `readings` is empty when the table has nothing for the day. `masses`
 *   lists alternative Masses of the same day (Christmas has four).
 */
export function readingsFor(day, lectionary) {
  const entries = lectionary.entries;
  const seasonal = firstEntry(entries, day.readingKeys.seasonal);
  const proper = firstEntry(entries, day.readingKeys.proper);

  let source = seasonal;
  let rows = seasonal ? seasonal.r : [];
  if (proper && proper.partial) {
    // A memorial with one reading of its own: the weekday supplies the rest.
    const replaced = new Set(proper.r.map((row) => row[0]));
    rows = [...rows.filter((row) => !replaced.has(row[0])), ...proper.r];
    const order = ['first', 'psalm', 'second', 'gospel'];
    rows.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  } else if (proper) {
    source = proper;
    rows = proper.r;
  }

  return {
    readings: rows.map(toReading),
    masses: (source && source.sets ? source.sets : []).map((set) => ({
      label: set.label,
      readings: set.r.map(toReading),
    })),
    title: source && source.title ? source.title : null,
    approximate: Boolean(source && source.approx),
  };
}

/** A stable identifier for a reading, used to remember it has been read. */
export function readingId(date, reading, index) {
  return `${date}:${index}:${reading.slot}`;
}
