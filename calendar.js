// calendar.js
// The Roman calendar of the ordinary form: seasons, Sundays, feasts and the
// precedence between them. Pure computation with no DOM or storage access,
// so the data pipeline and the tests can import it under Node.
//
// Dates cross this module's boundary as ISO strings ("2026-10-07"). Inside,
// a date is a whole number of days since the Unix epoch, which keeps the
// arithmetic free of time zones and daylight saving.

const MS_PER_DAY = 86400000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDINALS = [
  '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth',
  'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth',
  'Eighteenth', 'Nineteenth', 'Twentieth', 'Twenty-first', 'Twenty-second', 'Twenty-third',
  'Twenty-fourth', 'Twenty-fifth', 'Twenty-sixth', 'Twenty-seventh', 'Twenty-eighth', 'Twenty-ninth',
  'Thirtieth', 'Thirty-first', 'Thirty-second', 'Thirty-third', 'Thirty-fourth',
];

// Precedence, from the Table of Liturgical Days: a lower number outranks a
// higher one.
export const RANK = {
  TRIDUUM: 1,
  PRIVILEGED: 2, // Christmas, Epiphany, Ascension, Pentecost; Sundays of Advent, Lent, Easter; Holy Week
  SOLEMNITY: 3,
  FEAST_OF_THE_LORD: 5,
  SUNDAY: 6,
  FEAST: 7,
  PRIVILEGED_WEEKDAY: 9, // Lent, 17-24 December, the Christmas octave
  MEMORIAL: 10,
  OPTIONAL_MEMORIAL: 12,
  WEEKDAY: 13,
};

// Grades as they appear in data-calendar.json, mapped to precedence and label.
const GRADES = {
  6: { rank: RANK.SOLEMNITY, type: 'solemnity' },
  5: { rank: RANK.FEAST_OF_THE_LORD, type: 'feast' },
  4: { rank: RANK.FEAST, type: 'feast' },
  3: { rank: RANK.MEMORIAL, type: 'memorial' },
  2: { rank: RANK.OPTIONAL_MEMORIAL, type: 'optional memorial' },
};

export const DEFAULT_OPTIONS = {
  region: 'us', // 'us' or 'general'
  epiphanyOnSunday: true,
  ascensionOnSunday: true,
  corpusChristiOnSunday: true,
};

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

export function dayNumber(year, month, day) {
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

export function fromIso(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return dayNumber(year, month, day);
}

export function parts(dn) {
  const date = new Date(dn * MS_PER_DAY);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    weekday: date.getUTCDay(),
  };
}

export function toIso(dn) {
  const { year, month, day } = parts(dn);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Today's date in the device's own time zone, as an ISO string. */
export function todayIso(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function addDays(iso, count) {
  return toIso(fromIso(iso) + count);
}

function weekdayOf(dn) {
  return (((dn + 4) % 7) + 7) % 7; // 1 January 1970 was a Thursday
}

function sundayOnOrBefore(dn) {
  return dn - weekdayOf(dn);
}

function sundayOnOrAfter(dn) {
  return dn + ((7 - weekdayOf(dn)) % 7);
}

/** Easter Sunday in the Gregorian calendar (the "anonymous" algorithm). */
export function easterDay(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return dayNumber(year, month, day);
}

// ---------------------------------------------------------------------------
// The movable landmarks of one civil year
// ---------------------------------------------------------------------------

const landmarkCache = new Map();

function landmarks(year, options) {
  const cacheKey = `${year}|${options.epiphanyOnSunday}|${options.ascensionOnSunday}|${options.corpusChristiOnSunday}`;
  if (landmarkCache.has(cacheKey)) return landmarkCache.get(cacheKey);

  const easter = easterDay(year);
  const pentecost = easter + 49;
  const jan6 = dayNumber(year, 1, 6);
  const epiphany = options.epiphanyOnSunday ? sundayOnOrAfter(dayNumber(year, 1, 2)) : jan6;
  let baptism;
  if (options.epiphanyOnSunday) {
    // When Epiphany lands on 7 or 8 January the Baptism follows on the Monday.
    baptism = parts(epiphany).day >= 7 ? epiphany + 1 : epiphany + 7;
  } else {
    baptism = sundayOnOrAfter(jan6 + 1);
  }
  const christmas = dayNumber(year, 12, 25);
  const advent1 = sundayOnOrAfter(dayNumber(year, 11, 27));
  const holyFamily = weekdayOf(christmas) === 0 ? dayNumber(year, 12, 30) : sundayOnOrAfter(christmas + 1);

  const result = {
    year,
    easter,
    ashWednesday: easter - 46,
    lent1: easter - 42,
    palmSunday: easter - 7,
    ascension: options.ascensionOnSunday ? easter + 42 : easter + 39,
    pentecost,
    trinity: pentecost + 7,
    corpusChristi: options.corpusChristiOnSunday ? pentecost + 14 : pentecost + 11,
    sacredHeart: pentecost + 19,
    immaculateHeart: pentecost + 20,
    maryMotherOfChurch: pentecost + 1,
    epiphany,
    baptism,
    firstOrdinarySunday: sundayOnOrBefore(baptism),
    advent1,
    christKing: advent1 - 7,
    christmas,
    holyFamily,
  };
  landmarkCache.set(cacheKey, result);
  return result;
}

/** Sunday lectionary cycle (A, B or C) for the liturgical year containing a date. */
export function sundayCycle(dn, options = DEFAULT_OPTIONS) {
  const { year } = parts(dn);
  const liturgicalYear = dn >= landmarks(year, options).advent1 ? year + 1 : year;
  return ['C', 'A', 'B'][liturgicalYear % 3];
}

/** Weekday lectionary cycle (I or II). */
export function weekdayCycle(dn, options = DEFAULT_OPTIONS) {
  const { year } = parts(dn);
  const liturgicalYear = dn >= landmarks(year, options).advent1 ? year + 1 : year;
  return liturgicalYear % 2 === 1 ? 'I' : 'II';
}

// ---------------------------------------------------------------------------
// The temporal cycle: what the day is before any saint is considered
// ---------------------------------------------------------------------------

function temporalDay(dn, options) {
  const { year, month, day, weekday } = parts(dn);
  const L = landmarks(year, options);
  const dayName = WEEKDAYS[weekday];
  const make = (fields) => ({ type: 'weekday', rank: RANK.WEEKDAY, color: 'green', ...fields });

  // --- Advent and the December days of Christmas ---
  if (dn >= L.advent1) {
    if (dn < L.christmas) {
      const week = 1 + Math.floor((dn - L.advent1) / 7);
      if (weekday === 0) {
        return make({
          key: `Advent${week}`, name: `${ORDINALS[week]} Sunday of Advent`, type: 'sunday',
          rank: RANK.PRIVILEGED, season: 'advent', week, color: week === 3 ? 'rose' : 'violet', cyclic: true,
        });
      }
      const late = day >= 17;
      return make({
        key: late ? `AdventWeekdayDec${day}` : `AdventWeekday${week}${dayName}`,
        name: `${dayName} of the ${ORDINALS[week]} Week of Advent`,
        rank: late ? RANK.PRIVILEGED_WEEKDAY : RANK.WEEKDAY, season: 'advent', week, color: 'violet',
      });
    }
    if (dn === L.christmas) {
      return make({
        key: 'Christmas', name: 'The Nativity of the Lord (Christmas)', type: 'solemnity',
        rank: RANK.PRIVILEGED, season: 'christmas', week: 1, color: 'white', cyclic: true,
      });
    }
    if (dn === L.holyFamily) {
      return make({
        key: 'HolyFamily', name: 'The Holy Family of Jesus, Mary and Joseph', type: 'feast',
        rank: RANK.FEAST_OF_THE_LORD, season: 'christmas', week: 1, color: 'white', cyclic: true,
      });
    }
    const octaveDay = ORDINALS[day - 24];
    return make({
      key: `ChristmasWeekdayDec${day}`,
      name: `The ${octaveDay} Day within the Octave of the Nativity of the Lord`,
      rank: RANK.PRIVILEGED_WEEKDAY, season: 'christmas', week: 1, color: 'white',
    });
  }

  // --- January: the rest of the Christmas season ---
  if (dn <= L.baptism) {
    const base = { season: 'christmas', week: 2, color: 'white' };
    if (month === 1 && day === 1) {
      return make({
        ...base, key: 'MaryMotherOfGod', name: 'Mary, the Holy Mother of God', type: 'solemnity',
        rank: RANK.SOLEMNITY, week: 1, cyclic: true,
      });
    }
    if (dn === L.epiphany) {
      return make({
        ...base, key: 'Epiphany', name: 'The Epiphany of the Lord', type: 'solemnity',
        rank: RANK.PRIVILEGED, cyclic: true,
      });
    }
    if (dn === L.baptism) {
      return make({
        ...base, key: 'BaptismLord', name: 'The Baptism of the Lord', type: 'feast',
        rank: RANK.FEAST_OF_THE_LORD, cyclic: true,
      });
    }
    if (weekday === 0) {
      return make({
        ...base, key: 'Christmas2', name: 'Second Sunday after the Nativity', type: 'sunday',
        rank: RANK.SUNDAY, cyclic: true,
      });
    }
    if (dn < L.epiphany) {
      return make({ ...base, key: `ChristmasWeekdayJan${day}`, name: `Christmas Weekday (${day} January)` });
    }
    return make({
      ...base,
      key: options.epiphanyOnSunday ? `DayAfterEpiphany${dayName}` : `DayAfterEpiphanyJan${day}`,
      name: `${dayName} after Epiphany`,
    });
  }

  // --- Ordinary Time before Lent ---
  if (dn < L.ashWednesday) {
    const week = 1 + Math.floor((dn - L.firstOrdinarySunday) / 7);
    return ordinaryDay(make, week, weekday, dayName);
  }

  // --- Lent, Holy Week and the Triduum ---
  if (dn < L.easter) {
    const base = { season: 'lent', color: 'violet' };
    if (dn === L.ashWednesday) {
      return make({ ...base, key: 'AshWednesday', name: 'Ash Wednesday', rank: RANK.PRIVILEGED, week: 0 });
    }
    if (dn < L.lent1) {
      return make({
        ...base, key: `${dayName}AfterAshWednesday`, name: `${dayName} after Ash Wednesday`,
        rank: RANK.PRIVILEGED_WEEKDAY, week: 0,
      });
    }
    if (dn === L.palmSunday) {
      return make({
        ...base, key: 'PalmSun', name: 'Palm Sunday of the Passion of the Lord', type: 'sunday',
        rank: RANK.PRIVILEGED, week: 6, color: 'red', season: 'holy-week', cyclic: true,
      });
    }
    if (dn > L.palmSunday) {
      const holy = { ...base, week: 6, season: 'holy-week' };
      if (weekday <= 3) {
        return make({
          ...holy, key: `${dayName.slice(0, 3)}HolyWeek`, name: `${dayName} of Holy Week`, rank: RANK.PRIVILEGED,
        });
      }
      if (weekday === 4) {
        return make({
          ...holy, key: 'HolyThurs', name: 'Thursday of the Lord’s Supper (Holy Thursday)', type: 'triduum',
          rank: RANK.TRIDUUM, color: 'white', season: 'triduum', cyclic: true,
        });
      }
      if (weekday === 5) {
        return make({
          ...holy, key: 'GoodFri', name: 'Friday of the Passion of the Lord (Good Friday)', type: 'triduum',
          rank: RANK.TRIDUUM, color: 'red', season: 'triduum', cyclic: true,
        });
      }
      return make({
        ...holy, key: 'EasterVigil', name: 'Holy Saturday', type: 'triduum',
        rank: RANK.TRIDUUM, color: 'white', season: 'triduum', cyclic: true,
      });
    }
    const week = 1 + Math.floor((dn - L.lent1) / 7);
    if (weekday === 0) {
      return make({
        ...base, key: `Lent${week}`, name: `${ORDINALS[week]} Sunday of Lent`, type: 'sunday',
        rank: RANK.PRIVILEGED, week, color: week === 4 ? 'rose' : 'violet', cyclic: true,
      });
    }
    return make({
      ...base, key: `LentWeekday${week}${dayName}`, name: `${dayName} of the ${ORDINALS[week]} Week of Lent`,
      rank: RANK.PRIVILEGED_WEEKDAY, week,
    });
  }

  // --- The Easter season ---
  if (dn <= L.pentecost) {
    const base = { season: 'easter', color: 'white' };
    const week = 1 + Math.floor((dn - L.easter) / 7);
    if (dn === L.easter) {
      return make({
        ...base, key: 'Easter', name: 'Easter Sunday of the Resurrection of the Lord', type: 'solemnity',
        rank: RANK.TRIDUUM, week: 1, cyclic: true,
      });
    }
    if (dn === L.pentecost) {
      return make({
        ...base, key: 'Pentecost', name: 'Pentecost Sunday', type: 'solemnity',
        rank: RANK.PRIVILEGED, week: 8, color: 'red', cyclic: true,
      });
    }
    if (dn === L.ascension) {
      return make({
        ...base, key: 'Ascension', name: 'The Ascension of the Lord', type: 'solemnity',
        rank: RANK.PRIVILEGED, week, cyclic: true,
      });
    }
    if (week === 1) {
      return make({
        ...base, key: `${dayName.slice(0, 3)}OctaveEaster`, name: `${dayName} in the Octave of Easter`,
        rank: RANK.PRIVILEGED, week,
      });
    }
    if (weekday === 0) {
      const name = week === 2
        ? 'Second Sunday of Easter (Sunday of Divine Mercy)'
        : `${ORDINALS[week]} Sunday of Easter`;
      return make({ ...base, key: `Easter${week}`, name, type: 'sunday', rank: RANK.PRIVILEGED, week, cyclic: true });
    }
    return make({
      ...base, key: `EasterWeekday${week}${dayName}`, name: `${dayName} of the ${ORDINALS[week]} Week of Easter`, week,
    });
  }

  // --- Ordinary Time after Pentecost ---
  const solemnity = (key, name) => make({
    key, name, type: 'solemnity', rank: RANK.SOLEMNITY, season: 'ordinary', color: 'white', cyclic: true,
    week: 34 - Math.floor((L.christKing - sundayOnOrBefore(dn)) / 7),
  });
  if (dn === L.trinity) return solemnity('Trinity', 'The Most Holy Trinity');
  if (dn === L.corpusChristi) return solemnity('CorpusChristi', 'The Most Holy Body and Blood of Christ (Corpus Christi)');
  if (dn === L.sacredHeart) return solemnity('SacredHeart', 'The Most Sacred Heart of Jesus');
  if (dn === L.christKing) return solemnity('ChristKing', 'Our Lord Jesus Christ, King of the Universe');
  const week = 34 - Math.floor((L.christKing - sundayOnOrBefore(dn)) / 7);
  return ordinaryDay(make, week, weekday, dayName);
}

function ordinaryDay(make, week, weekday, dayName) {
  if (weekday === 0) {
    return make({
      key: `OrdSunday${week}`, name: `${ORDINALS[week]} Sunday in Ordinary Time`, type: 'sunday',
      rank: RANK.SUNDAY, season: 'ordinary', week, cyclic: true,
    });
  }
  return make({
    key: `OrdWeekday${week}${dayName}`, name: `${dayName} of the ${ORDINALS[week]} Week in Ordinary Time`,
    season: 'ordinary', week, weekdayCyclic: true,
  });
}

// ---------------------------------------------------------------------------
// The sanctoral cycle: saints and fixed feasts, with transfers
// ---------------------------------------------------------------------------

const sanctoralIndexCache = new WeakMap();

function sanctoralIndex(entries) {
  if (!sanctoralIndexCache.has(entries)) {
    const byDate = new Map();
    for (const entry of entries) {
      const slot = `${entry.m}-${entry.d}`;
      if (!byDate.has(slot)) byDate.set(slot, []);
      byDate.get(slot).push(entry);
    }
    sanctoralIndexCache.set(entries, byDate);
  }
  return sanctoralIndexCache.get(entries);
}

const transferCache = new Map();

/**
 * Solemnities that cannot be kept on their own date in a given year, with the
 * day each moves to. Returns a Map from event key to day number.
 */
function transfers(year, entries, options) {
  const cacheKey = `${year}|${options.region}|${options.epiphanyOnSunday}|${options.ascensionOnSunday}|${options.corpusChristiOnSunday}`;
  if (transferCache.has(cacheKey)) return transferCache.get(cacheKey);
  const L = landmarks(year, options);
  const moved = new Map();
  for (const entry of entries) {
    if (entry.g !== 6) continue;
    const natural = dayNumber(year, entry.m, entry.d);
    const temporal = temporalDay(natural, options);
    if (temporal.rank > RANK.SOLEMNITY) continue;
    let target = natural + 1;
    const inHolyWeekOrOctave = natural >= L.palmSunday && natural <= L.easter + 7;
    if (entry.k === 'StJoseph' && natural >= L.palmSunday && natural < L.easter) {
      target = L.palmSunday - 1;
    } else if (inHolyWeekOrOctave) {
      target = L.easter + 8;
    }
    // Step past any day that is itself too high to yield.
    while (temporalDay(target, options).rank <= RANK.SOLEMNITY && target !== L.palmSunday - 1) target += 1;
    moved.set(entry.k, target);
  }
  transferCache.set(cacheKey, moved);
  return moved;
}

function sanctoralFor(dn, entries, options) {
  const { year, month, day, weekday } = parts(dn);
  const L = landmarks(year, options);
  const moved = transfers(year, entries, options);
  const found = [];
  for (const entry of sanctoralIndex(entries).get(`${month}-${day}`) || []) {
    if (moved.has(entry.k)) continue;
    // In the United States the day of prayer moves off a Sunday.
    if (entry.k === 'PrayerUnborn' && weekday === 0) continue;
    found.push(entry);
  }
  for (const [key, target] of moved) {
    if (target === dn) found.push(entries.find((entry) => entry.k === key));
  }
  if (options.region === 'us') {
    if (month === 1 && day === 23 && weekday === 1) {
      const prayer = entries.find((entry) => entry.k === 'PrayerUnborn');
      if (prayer) found.push(prayer);
    }
    const november1 = dayNumber(year, 11, 1);
    const thanksgiving = november1 + ((4 - weekdayOf(november1) + 7) % 7) + 21;
    if (dn === thanksgiving) {
      found.push({ k: 'ThanksgivingDay', g: 2, n: 'Thanksgiving Day', c: 'white' });
    }
  }
  if (dn === L.maryMotherOfChurch) {
    found.push({ k: 'MaryMotherChurch', g: 3, n: 'The Blessed Virgin Mary, Mother of the Church', c: 'white' });
  }
  if (dn === L.immaculateHeart) {
    found.push({ k: 'ImmaculateHeart', g: 3, n: 'The Immaculate Heart of the Blessed Virgin Mary', c: 'white' });
  }
  return found.map((entry) => ({
    key: entry.k,
    name: entry.n,
    color: entry.c === 'purple' ? 'violet' : entry.c,
    grade: entry.g,
    ...GRADES[entry.g],
  })).sort((a, b) => a.rank - b.rank);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const SEASON_NAMES = {
  advent: 'Advent',
  christmas: 'Christmas',
  ordinary: 'Ordinary Time',
  lent: 'Lent',
  'holy-week': 'Holy Week',
  triduum: 'Paschal Triduum',
  easter: 'Easter',
};

/**
 * Describe one day of the liturgical year.
 *
 * @param {string} iso - Date as "YYYY-MM-DD".
 * @param {Array} sanctoral - Fixed celebrations, from data-calendar.json.
 * @param {object} [options] - Regional options; see DEFAULT_OPTIONS.
 * @returns {object} The day's celebration, season, colour, lectionary keys
 *   and observances.
 */
export function liturgicalDay(iso, sanctoral = [], options = DEFAULT_OPTIONS) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const dn = fromIso(iso);
  const { year, month, day, weekday } = parts(dn);
  const L = landmarks(year, opts);
  const temporal = temporalDay(dn, opts);
  const saints = sanctoralFor(dn, sanctoral, opts);
  const cycle = sundayCycle(dn, opts);
  const ferialCycle = weekdayCycle(dn, opts);

  // Decide who keeps the day.
  let celebration = { ...temporal, source: 'temporal' };
  let commemorations = [];
  const top = saints[0];
  const memorials = saints.filter((saint) => saint.rank === RANK.MEMORIAL);
  const asOptional = (list) => list.map((saint) => ({ ...saint, type: 'optional memorial' }));
  if (top && top.rank <= RANK.FEAST && top.rank < temporal.rank) {
    celebration = { ...top, source: 'sanctoral' };
  } else if (temporal.rank === RANK.PRIVILEGED_WEEKDAY) {
    // Memorials give way to these weekdays but may still be commemorated.
    commemorations = asOptional(saints.filter((saint) => saint.rank >= RANK.MEMORIAL));
  } else if (temporal.rank === RANK.WEEKDAY) {
    const motherOfTheChurch = memorials.find((saint) => saint.key === 'MaryMotherChurch');
    if (memorials.length === 1 || motherOfTheChurch) {
      celebration = { ...(motherOfTheChurch || memorials[0]), source: 'sanctoral' };
    } else {
      // No obligatory memorial, or two that collide: everything is optional.
      commemorations = asOptional(saints.filter((saint) => saint.rank >= RANK.MEMORIAL));
    }
  }

  // Lectionary keys, most specific first. "proper" keys belong to a saint or
  // fixed feast and may fill only some of the readings; "seasonal" keys give
  // the readings of the day in the temporal cycle.
  const readingKeys = { proper: [], seasonal: [] };
  if (celebration.source === 'sanctoral') {
    readingKeys.proper.push(`S:${celebration.key}@${cycle}`, `S:${celebration.key}`);
  } else if (commemorations.some((item) => item.key === 'ThanksgivingDay')) {
    // In the United States the Mass of thanksgiving is the one ordinarily said.
    readingKeys.proper.push('S:ThanksgivingDay');
  }
  if (temporal.cyclic) readingKeys.seasonal.push(`${cycle}:${temporal.key}`);
  if (temporal.weekdayCyclic) {
    readingKeys.seasonal.push(`${ferialCycle}:${temporal.key}@${cycle}`, `${ferialCycle}:${temporal.key}`);
  }
  readingKeys.seasonal.push(`${temporal.key}@${cycle}`, temporal.key);

  const isLentFriday = weekday === 5 && (temporal.season === 'lent' || temporal.season === 'holy-week');
  const fast = dn === L.ashWednesday || dn === L.easter - 2;
  const abstinence = fast || isLentFriday;

  return {
    date: iso,
    weekday,
    weekdayName: WEEKDAYS[weekday],
    season: temporal.season,
    seasonName: SEASON_NAMES[temporal.season],
    week: temporal.week,
    color: celebration.color || temporal.color,
    celebration: {
      key: celebration.key,
      name: celebration.name,
      type: celebration.type,
      rank: celebration.rank,
      source: celebration.source,
    },
    temporal: { key: temporal.key, name: temporal.name, type: temporal.type },
    commemorations: commemorations.map(({ key, name, type, color }) => ({ key, name, type, color })),
    sundayCycle: cycle,
    weekdayCycle: ferialCycle,
    readingKeys,
    fast,
    abstinence,
    holyDay: holyDayOfObligation({ month, day, weekday, dn, L, opts }),
  };
}

/**
 * Holy days of obligation. Only the United States list is known to the app;
 * elsewhere the bishops' conference decides and the app stays silent.
 */
function holyDayOfObligation({ month, day, weekday, dn, L, opts }) {
  if (opts.region !== 'us') return false;
  if (weekday === 0) return false; // Sundays are of obligation already
  if (month === 12 && (day === 25 || day === 8)) return true;
  if (!opts.ascensionOnSunday && dn === L.ascension) return true;
  // These three lose the obligation when they fall on a Saturday or a Monday.
  const movable = (month === 1 && day === 1) || (month === 8 && day === 15) || (month === 11 && day === 1);
  return movable && weekday !== 6 && weekday !== 1;
}

/**
 * The dates of the movable feasts that devotions are timed by, as ISO strings.
 */
export function movableFeasts(year, options = DEFAULT_OPTIONS) {
  const L = landmarks(year, { ...DEFAULT_OPTIONS, ...options });
  return {
    ashWednesday: toIso(L.ashWednesday),
    easter: toIso(L.easter),
    pentecost: toIso(L.pentecost),
    sacredHeart: toIso(L.sacredHeart),
    advent: toIso(L.advent1),
  };
}

/** The seven days, Sunday to Saturday, of the week containing a date. */
export function weekOf(iso) {
  const start = sundayOnOrBefore(fromIso(iso));
  return Array.from({ length: 7 }, (_, offset) => toIso(start + offset));
}

export { WEEKDAYS };
