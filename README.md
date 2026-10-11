# Biblica 0.5.0

A Catholic Bible and daily prayer companion that installs to the home screen and works offline:
the Douay-Rheims Bible (and, as an option, the Catholic Public Domain Version) with an
introduction to every book, the readings of the day, a rule of life, the Rosary and other
devotions, counsel from the saints for hard and good times, a Mass companion, the commentary of the
Fathers of the Church, and a shelf of early Christian writings.

**Private by design.** Everything a reader writes stays on their own device. There are no
accounts, no servers, no analytics, no advertising and no tracking, and the app is forbidden by
its own content security policy from contacting any site but this one. See
[PRIVACY.md](PRIVACY.md).

**Free.** The code is under the [MIT licence](LICENSE). The texts are in the public domain or
openly licensed, except a few short excerpts from the current English Missal, used with the notice
their owner asks for; [NOTICES.md](NOTICES.md) gives the credits. The [terms of use](TERMS.md)
say what the app is and is not: it is not an official book of the Church. What each release
changed is in [RELEASES.md](RELEASES.md).

## These files

This is the flat copy of the app, made for uploading to GitHub from a phone: every file sits at
the top level. It is generated from the project's folders by `uv run biblica-flat`; change the
source there, not here. Do not edit these files on GitHub either: each release records a
fingerprint of every file, and installed copies refuse a release whose files do not match.

- 79 files are the app and its papers. Replace them all for every release.
- 73 files named `drb-*.json` are the Bible text (Douay-Rheims).
- 73 files named `study-*.json` are the Latin and the cross-references.
- 81 files named `fathers-*.json` and `early-*.json` are the commentary of the Fathers
  and the early Christian writings.
- 73 files named `cpdv-*.json` are the Catholic Public Domain Version, the optional
  second translation.

The last four kinds change rarely; the release notes say when they do.

## Publishing and updating

Put every file in the root of a public repository and turn on GitHub Pages for the `main`
branch, root folder.

Once, on GitHub's website, add an empty file named `.nojekyll` (Add file, Create new file), so
that GitHub publishes the files as they are instead of running them through its site builder.

After uploading a release, open `check.html` on the published site (for example
`https://your-name.github.io/your-repository/check.html`). It lists any file that is missing or
left over from an earlier release. An incomplete upload is never installed: readers stay on the
release they have until it is whole.

Installed copies look for a new release when the app is opened or brought back into view (at
most once in five minutes), and apply it by themselves at a quiet moment. Settings, Updates,
Check for updates does it at once. GitHub Pages can take about ten minutes to hand out a new
upload.
