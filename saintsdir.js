// saintsdir.js
// The directory of saints: everyone a reader can choose from when adding one
// of their own saints. It holds every saint and blessed of the calendar the
// app follows, and the saints widely loved who are not in it (Saint Jude is;
// Saint Christopher, Saint Erasmus and Saint Peregrine are not), each with a
// short account, what they are patron of, and the prayers that belong to
// them. The file is fetched when first wanted and kept for offline use.

let directory = null;

/** { saints: [{ id, name, sort, feast, key, lived, about, patron, status, cautions, prayers, novena }] } */
export async function loadDirectory() {
  if (!directory) {
    const response = await fetch('data-saints.json');
    if (!response.ok) throw new Error('The list of saints could not be loaded.');
    directory = await response.json();
  }
  return directory;
}

/** One saint by directory id, or null. */
export async function saintById(id) {
  return (await loadDirectory()).saints.find((item) => item.id === id) || null;
}

/** The directory entry for one of the reader's own saints: by its directory id, or by its calendar key. */
export async function entryForPatron(patron) {
  const { saints } = await loadDirectory();
  return saints.find((item) => (patron.dir && item.id === patron.dir) || (patron.key && item.key === patron.key)) || null;
}

/** Words to search a saint by: names, patronage and the old names they go by. */
export function searchText(item) {
  return [item.name, item.also || '', item.patron || ''].join(' ').toLowerCase();
}
