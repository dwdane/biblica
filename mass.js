// mass.js
// The Mass companion's data, and what can be said about today's Mass from
// the calendar: whether the Gloria and the Creed are said.

let massData = null;

/** The outline and text of both forms of the Mass, from data-mass.json. */
export async function loadMass() {
  if (!massData) {
    const response = await fetch('data-mass.json');
    if (!response.ok) throw new Error('The Mass companion could not be loaded.');
    massData = await response.json();
  }
  return massData;
}

const PENITENTIAL = ['advent', 'lent', 'holy-week'];

/**
 * Whether the Gloria is said at Mass in the ordinary form on a liturgical
 * day: true, false, or null where the calendar alone cannot say (the Triduum,
 * and days with their own rules).
 */
export function gloriaSaid(day) {
  const type = day.celebration.type;
  if (day.season === 'triduum' || type === 'triduum') return null;
  if (day.celebration.key === 'AllSouls') return false;
  if (type === 'solemnity' || type === 'feast') return true;
  if (day.weekday === 0) return !PENITENTIAL.includes(day.season);
  // The octaves of Christmas and Easter keep the Gloria every day.
  if ((day.season === 'christmas' || day.season === 'easter') && day.week === 1) return true;
  return false;
}

/** Whether the Creed is said, on the same terms as gloriaSaid(). */
export function creedSaid(day) {
  const type = day.celebration.type;
  if (day.season === 'triduum' || type === 'triduum') return null;
  if (day.celebration.key === 'AllSouls') return null;
  return type === 'solemnity' || day.weekday === 0;
}
