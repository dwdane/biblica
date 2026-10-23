// icalendar.js
// Calendar files (iCalendar, RFC 5545) that the reader can add to the phone's
// own calendar, which can then sound an alert on the day. An app installed
// from a website cannot raise a notification by itself without a server to
// send it, and this app has none; the phone's calendar can.
//
// Nothing here sends anything anywhere: the file is made on the device and
// handed to the share sheet or saved, as a backup is.

const PRODUCT = '-//Biblica//Biblica//EN';

/** Text made safe for a calendar file: backslashes, commas, semicolons and line breaks escaped. */
export function escapeText(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * A long line folded as the format asks: no line longer than 75 octets,
 * continuations beginning with a space. Counted in UTF-8 bytes, never
 * splitting a character.
 */
export function foldLine(line) {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const pieces = [];
  let current = '';
  let size = 0;
  for (const character of line) {
    const width = encoder.encode(character).length;
    const limit = pieces.length ? 74 : 75;
    if (size + width > limit) {
      pieces.push(current);
      current = '';
      size = 0;
    }
    current += character;
    size += width;
  }
  pieces.push(current);
  return pieces.map((piece, index) => (index ? ` ${piece}` : piece)).join('\r\n');
}

const compact = (iso) => iso.replace(/-/g, '');

/** "20261023T080000Z" for the present moment, as the file's timestamps want. */
function stamp(now = new Date()) {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * One event. A date alone makes an all-day event; with `time` ("08:00") it is
 * set at that hour of the day wherever the phone is ("floating" time), for
 * `minutes` minutes. `alert` sounds at the time given (all-day events: that
 * hour of the day), or not at all when null.
 *
 * @param {{uid: string, date: string, time?: string, minutes?: number, title: string, description?: string, alert?: string|null}} event
 */
function eventLines(event, now) {
  const lines = ['BEGIN:VEVENT', `UID:${event.uid}`, `DTSTAMP:${stamp(now)}`];
  if (event.time) {
    const [hours, minutes] = event.time.split(':').map(Number);
    const start = `${compact(event.date)}T${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}00`;
    const total = hours * 60 + minutes + (event.minutes || 15);
    const endHours = Math.min(23, Math.floor(total / 60));
    const endMinutes = total >= 24 * 60 ? 59 : total % 60;
    lines.push(`DTSTART:${start}`, `DTEND:${compact(event.date)}T${String(endHours).padStart(2, '0')}${String(endMinutes).padStart(2, '0')}00`);
  } else {
    const next = new Date(`${event.date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${compact(event.date)}`, `DTEND;VALUE=DATE:${compact(next.toISOString().slice(0, 10))}`, 'TRANSP:TRANSPARENT');
  }
  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.alert) {
    // At the event's own time, or, for a day, at the hour asked for on that day.
    let trigger = 'PT0M';
    if (!event.time) {
      const [hours, minutes] = event.alert.split(':').map(Number);
      trigger = `PT${hours}H${minutes ? `${minutes}M` : ''}`;
    }
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(event.title)}`, `TRIGGER;RELATED=START:${trigger}`, 'END:VALARM');
  }
  lines.push('END:VEVENT');
  return lines;
}

/**
 * A whole calendar file.
 *
 * @param {string} name - The calendar's name, shown by some calendar apps.
 * @param {Array<object>} events - See eventLines.
 * @returns {string} The file's text, with the line endings the format requires.
 */
export function calendarFile(name, events, now = new Date()) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODUCT}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    ...events.flatMap((event) => eventLines(event, now)),
    'END:VCALENDAR',
  ];
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}
