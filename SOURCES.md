# Sources and licences

Almost everything the app ships is public domain text, factual data (calendar dates and Scripture
citations) or text under an open licence (the English of the 1962 Mass, from Divinum Officium). The
one exception is a set of short excerpts from the current English Missal in the Mass companion,
which are under copyright and used with the notice their owner asks for (see "ICEL's texts"
below). This page records where each file in `tools/sources` came from. I am not a lawyer; if the
app is ever distributed widely, have this reviewed.

## Bible text

| File | From | Revision | Licence |
| --- | --- | --- | --- |
| `text/drc-crosswire.json.xz` | [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases), `formats/json/DRC.json` | `e1b254c` | Text public domain; repository MIT |
| `text/dra-ebible.tsv.xz` | [BibleNLP/ebible](https://github.com/BibleNLP/ebible), `corpus/eng-engDRA.txt` (eBible.org "Douay-Rheims 1899") | `c531ff2` | Public domain |
| `text/kjva.json.xz` | scrollmapper/bible_databases, `formats/json/KJVA.json` | `e1b254c` | Text public domain; repository MIT |

The shipped text is the first file, repaired with the second as a witness. The King James text is
used only to line up verse numbering and is not shipped. One verse missing from both Douay-Rheims
files, Baruch 6:37, is supplied from the Unbound Bible edition
([seven1m/open-bibles](https://github.com/seven1m/open-bibles), `eng-dra.zefania.xml`, public domain).

### The OpenBible download

The project started from the `drb.txt` file offered at openbible.com. It is not used. That file:

- has 66 books, not 73, and lacks the longer forms of Daniel and Esther;
- has been renumbered to the King James scheme, which loses some text where the two differ
  (Genesis 27:23 and Exodus 9:21 are simply absent);
- carries hundreds of scanning errors: "leaves" for "loaves", "sides" for "sicles", "end" for "and",
  "Abram tell flat on his face".

## Calendar

| Files | From | Revision | Licence |
| --- | --- | --- | --- |
| `calendar/*.json` | [Liturgical-Calendar/LiturgicalCalendarAPI](https://github.com/Liturgical-Calendar/LiturgicalCalendarAPI), `jsondata/sourcedata/rite/roman` | `4361dca` | Apache-2.0 |

The pipeline folds the editions of the Roman Missal and the later decrees into one current list, and
adds a few United States adaptations the source lacks (see `calendar_build.py`).

## Lectionary

| Files | From | Revision | Licence |
| --- | --- | --- | --- |
| `lectionary/usccb-by-date.json` | [cpbjr/catholic-readings-api](https://github.com/cpbjr/catholic-readings-api), `readings/` and `liturgical-calendar/` | `973e986` | MIT |
| `lectionary/litcal/*.json` | Liturgical-Calendar/LiturgicalCalendarAPI, lectionary tables | `4361dca` | Apache-2.0 |

Only citations are taken ("Luke 11:1-4"). The words shown in the app are always the Douay-Rheims.

## Versification

| Files | From | Revision | Licence |
| --- | --- | --- | --- |
| `versification/*.json` | [Copenhagen-Alliance/versification-specification](https://github.com/Copenhagen-Alliance/versification-specification), `versification-mappings/standard-mappings` | `5f3f82f` | Apache-2.0 (code); see the repository for the data terms |

## Prayers

| Files | From | Licence |
| --- | --- | --- |
| `tools/sources/prayers/0*.txt` | The traditional English and Latin forms of the Church's common prayers, typed out for this project | Public domain: the texts are centuries old, and the English forms used are the long-established ones |
| `tools/sources/prayers/06-scripture.txt` | Canticles and psalms, taken from the shipped Douay-Rheims by reference | Public domain |
| `tools/sources/prayers/devotions.json` | The mysteries of the Rosary, the fourteen Stations and their Scripture passages; novena outlines | The lists are traditional; the short descriptions were written for this project |
| `tools/sources/prayers/guides.json` | The examination of conscience, the guide to confession, the examen and Lectio Divina | Written for this project |

How far to trust them:

- Every prayer was typed from its traditional form and then proofread three times, independently,
  English and Latin. No errors were left standing, and a handful of small variants were settled
  (for example the clause order of the Latin prayer to Saint Michael).
- They have **not** been collated against a printed prayer book or the *Enchiridion Indulgentiarum*.
  That is worth doing before anyone treats the Latin here as a reference text.
- Where a prayer has more than one approved wording, the note on the prayer says which is given.
  The Latin of the acts of faith, hope, charity and contrition is the standard Latin form, not the
  original of the English beside it.
- English translations still under copyright were avoided: the current Roman Missal, the modern
  Catechism, the Liturgy of the Hours, and the translation of Saint Faustina's Diary from which the
  usual English of the Divine Mercy chaplet comes.

## Study material (0.3)

| File | From | Revision | Licence |
| --- | --- | --- | --- |
| `study/vulgate-clementine.json.xz` | [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases), `formats/json/VulgClementine.json` | `e1b254c` | Text public domain (the Clementine Vulgate); repository MIT |
| `study/cross-references.tsv.xz` | The [OpenBible.info cross-references](https://www.openbible.info/labs/cross-references/), as carried in scrollmapper/bible_databases, `sources/extras/cross_references.txt` | `e1b254c` | Creative Commons Attribution (CC BY); the app credits it on the study screen and in Settings |
| `study/fathers.jsonl.xz` | [HistoricalChristianFaith/Commentaries-Database](https://github.com/HistoricalChristianFaith/Commentaries-Database), narrowed by `tools/scripts/vendor_fathers.py` against [Writings-Database](https://github.com/HistoricalChristianFaith/Writings-Database) | `8e8082b5f` and `117b833` | Public domain for what is kept; see below |
| `study/series-works.json` | The list of upstream works that are the old translations | Written for this project | |
| `study/writers.json` | Notes and corrections for particular writers | Written for this project | |
| `study/latin-fixes.json` | Where the Latin is divided differently from the Douay-Rheims | Written for this project | |

### What "public domain" rests on for the Fathers

The upstream database does not separate public domain text from the rest, and I could not take its
source links at face value: thousands of passages link to an old edition and quote a modern one.
What ships was selected by evidence in the text itself:

- **The Catena Aurea** (9,229 passages) is upstream's copy of the edition edited by John Henry
  Newman, published at Oxford in 1841 to 1845.
- **Everything else** (16,454 passages) was kept only because its words were found, at least 95%
  of them in runs of six, in a work on a hand-made list of the old translations: the Ante-Nicene
  Fathers, the Nicene and Post-Nicene Fathers, the Oxford Library of the Fathers, and a few of the
  same age (Payne Smith's and Pusey's Cyril of Alexandria, Gifford's and Ferrar's Eusebius,
  Gardner's edition of the old translation of Gregory's Dialogues). Each file on the list is
  checked for signs of a modern or machine-made text before it is trusted, and seven were set
  aside on those grounds.
- **The list was drawn up from my knowledge of what those series contain**, with the files' own
  English and headers as a check. It was reviewed twice by a second pass that sampled the result
  and found nothing modern in it, but nobody has compared it with the printed volumes.
- **What 95% lets through:** about one passage in a hundred differs from the old edition by a
  modernised pronoun ("Your" for "Thy") taken over from an online edition, and a few hundred carry
  a Scripture reference in square brackets that an editor added. Neither is the kind of change
  that carries a copyright, but the text is then not letter for letter the nineteenth-century one.

`tools/reports/fathers-selection.md` lists what was kept and left out, by reason and by writer,
with a sample of passages on either side of the line. I am not a lawyer; the caution at the top of
this page applies here most of all.

### The notes on the calendar and "On this day"

`tools/sources/days/*.json` holds 235 short accounts of the celebrations in the calendar, notes on
the seasons and movable days, and 986 dated events. All of it was written for this project. None of
it was copied from a source, and for the same reason **none of it has been checked against one**:
it was written from memory, then checked a second time for internal consistency (dates of death
against feast days, popes against years). The first check corrected nineteen entries. Expect a
small number of wrong dates to remain, and treat the feature as a prompt to look something up, not
as the reference.

## The Mass (0.4)

| Files | From | Revision | Licence |
| --- | --- | --- | --- |
| `mass/divinum-officium/latin/*.txt`, `english/*.txt` | [DivinumOfficium/divinum-officium](https://github.com/DivinumOfficium/divinum-officium), `web/www/missa/Latin/Ordo` and `English/Ordo`: `Ordo.txt`, `Prayers.txt`, `Communio.txt`, `Prefationes.txt` | `25911ff7` | MIT (copy of the licence beside the files) |
| `mass/traditional.json` | Which stretches of that text make up each part of the Mass, with titles, customary postures and explanations | | Written for this project |
| `mass/ordinary.json` | The outline of the ordinary form, with explanations | | Written for this project, except the lines of the Mass itself (the people's responses, the priest's short lines and the first words of longer prayers), which are excerpts from the English translation of The Roman Missal © 2010 ICEL |

How far to trust them:

- **The Latin of the 1962 Order of Mass** is the project's transcription of the Missal, which is
  widely used and corrected by many hands. It was not collated against a printed Missal here.
- **The English beside it is the project's own translation**, of uncertain parentage (it reads
  like an early twentieth-century hand missal). It is offered as an aid to following, not as an
  approved text. Fourteen places were corrected: the priest's absolution addressed the people as
  "thee"; rubrics written for a solemn Mass with a deacon now describe a sung Mass; and there were
  misspellings, a heading run into a rubric, and stray punctuation. The corrections are listed in
  `traditional.json`, and the build fails if the upstream wording changes under one or if one is
  never used.
- **The files are paired mechanically**: the same blocks in the same order, and within a block
  the same spoken lines. The build checks every count and refuses to continue on a mismatch, but
  a count cannot tell two swapped lines apart, so a test also holds a fingerprint of the whole
  pairing as it was read through after the review; any change upstream fails it until the new
  pairing has been read. Places where one language gives a prayer as one line and the other as
  two or three are joined by rule. The Asperges and the incensing are given for a sung Mass;
  forms proper to a solemn Mass are left out, and what differs at a Mass for the dead is
  described in a note.
- **The explanations and postures were written for the app.** The postures of the ordinary form
  follow the General Instruction of the Roman Missal as adapted for the United States (no. 43);
  those of the traditional Mass are custom, not law. Both were reviewed once against sources
  (see the release notes), not by a liturgist.
- **ICEL's texts.** The people's responses of the ordinary form, the priest's short greetings,
  invitations and dismissal, and the first words of the longer prayers are given with the notice
  ICEL's published policy asks of free, non-commercial websites. Whether that policy covers an app
  that installs and works offline is not certain (decision 64), and the same doubt applies to
  these excerpts. No line is longer than sixteen words; the build and a test both refuse a longer
  one. The longest given whole are the Lamb of God and the final blessing.

### Checking the notes on the calendar (0.4)

The entries for 9 October to 8 December (152 dated events and 44 accounts of celebrations) were
checked against sources on the web, chiefly Wikipedia, the Catholic Encyclopedia, Vatican pages
and the sites of the orders concerned. 151 events and 42 accounts were confirmed as written. One
age was wrong and two statements were firmer than the sources allow; all three were corrected.

A second pass, during the review of 0.4.0, checked 9 December to 8 February: 158 dated events, 40
accounts and the 7 notes on the Christmas season. None was on the wrong day. Two entries were out
of date or wrong (Fulton Sheen was beatified on 24 September 2026; the US calendar does not call
Saint Jerome Emiliani a priest) and five were firmer than the sources allow (Pope Fabian's death,
the size of Rievaulx under Aelred, Saint John of the Cross's imprisonment, the founding of Fulda,
the first singing of "Silent Night"); all seven were corrected. Where sources disagree and the
entry is defensible (for example the day Angela of Foligno died), it was left as written.

In both passes a number of small details inside otherwise confirmed entries (a place, an epithet,
a quotation) could not be found on the pages read and remain unverified. The other eight months
have not been checked.

## Worth knowing for later releases

The scrollmapper repository also carries the Catholic Public Domain Version (`CPDV.json`), a
modern-English Catholic translation released to the public domain: a candidate for a second
translation. Haydock's commentary was looked for and not found as usable data on GitHub; it exists
as scanned books and as web pages that would need to be gathered and cleaned.
