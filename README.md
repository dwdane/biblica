# Biblica 0.2.0

A Catholic Bible and daily prayer companion that installs to the home screen and works offline.
Nothing leaves the device: there are no accounts, servers or analytics.

This is the flat copy of the app, made for uploading to GitHub from a phone: every file sits at
the top level. It is generated from the project's folders by `uv run biblica-flat`; change the
source there, not here.

- 42 files are the app. Replace them all for every release.
- 73 files named `drb-*.json` are the Bible text. They change rarely.

To publish: put every file in the root of a public repository and turn on GitHub Pages for the
`main` branch, root folder.
