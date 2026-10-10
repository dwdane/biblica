# Privacy

Last changed with release 0.4.0, 10 October 2026.

## The short version

- Everything you write in Biblica stays on your device. It is never sent anywhere.
- There are no accounts, no sign-in, no analytics, no advertising, no tracking and no cookies.
- The app carries no code from anyone else and asks no other company's servers for anything. Your browser is told to refuse if a page of the app ever tried.
- Nobody can see your notes, your journal, your prayers or what you read: not the person who published this copy, not the people who wrote the app.
- Because your writing exists only on your device, only you can keep it safe. Make a backup now and then.

## What Biblica keeps, and where

Biblica keeps the following in your browser's storage for this app, on this device and nowhere else:

- your notes, highlights and the links you make between verses;
- your reflections and your journal;
- your daily list and, unless you turn it off, a note of what you prayed each day;
- your novenas, intentions, saints and your own prayers;
- your place in the Bible, in reading plans and in the day's readings;
- your settings, such as text size and calendar, and a few facts about this device's copy: which version it last ran, when it last looked for an update and when you last made a backup;
- what you mark in the examination of conscience and the date of your last confession, which are kept apart from the rest and left out of backups unless you ask for them;
- a copy of the app itself, and of the Bible text and study material it has fetched, so that it works offline.

When the app restarts itself (after an update, a restore or erasing), your browser's session storage holds which screen you were on, when it restarted and a message to show you. Session storage is emptied when the app is closed.

None of this is encrypted by the app. It is protected in the way everything in your browser is protected: by the lock on your device. Anyone who can unlock your phone and open Biblica can read what is in it. The app has no passcode of its own.

## What leaves your device

Nothing you write, ever. The only traffic is Biblica fetching its own files from the website it was installed from:

- **The app's files**, when it is first installed and when it is updated.
- **A question about updates.** The app asks the site for one small file when it is opened, when it is brought back into view (at most once in five minutes), every half hour while it stays open, and when a connection returns. If the site does not answer, or a release arrives incomplete, it asks again a few times over the next few minutes. "Check for updates" in Settings asks at once.
- **The Bible and study material, as they are needed.** When the app starts it fetches the books that the day's readings and the prayers quote. It fetches a book when you first open it, the study material for a book when you first study it or read it with the Latin, and every book the first time you search. Each file is fetched once and read from your device after that.

These are ordinary downloads. They carry nothing you have written, no name and no identifier. They do carry what every web request carries: your internet address, a description of your browser, and which file was asked for. So the company that runs the server could tell roughly when someone at your address opens the app, and that the Book of Job was fetched on a certain day. It cannot tell what you do in the app, what you read once a book is on your device, or anything you write. If you would rather not leave even the trace of which books you open, save the whole Bible and the study material at once in Settings, under Storage; opening a book then fetches nothing.

## Who runs the website, and what you are trusting

Biblica is not a service. It is a set of files, and the copy you are using is served by whoever published it. For a copy on GitHub Pages, the servers are run by GitHub, which like every web host keeps a record of requests under [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). GitHub's documentation describes no visitor records or statistics for the publisher of a Pages site, and the app adds none.

Everything on this page describes the app as it was written. The app updates itself from the site it was installed from, so whoever publishes the copy you use decides what code it runs, as with any website or app. If you do not know the publisher, or would rather trust nobody, the code is free to take: publish a copy of your own.

## Links to other websites

A few screens point to another website: the bishops' outline of the Mass, the sites that carry the Liturgy of the Hours, and the sources credited in the app. These are marked as leaving the app and open only when you tap them. What that website learns is then between you and it. Biblica tells your browser not to pass on the address you came from.

## Backups

A backup is a file made on your device when you ask for one. It holds what you have written and your settings. Biblica hands it to your phone's share sheet or its downloads folder, and where it goes from there is your choice. If you put it in a cloud service, that service's terms apply to it. The file is plain text, not encrypted, so keep it somewhere you trust. Confession notes are left out unless you turn that on.

## What Biblica does not do

- It does not ask for your location, contacts, camera, microphone or photos.
- It sends no notifications.
- It shows no advertising and contains nothing from an advertising or analytics company.
- It loads no fonts, scripts or images from other sites.
- It does not send anything you write to an AI service or to anyone else.
- It does not sell or share information, because it has none.

## Erasing what you have written

Settings, Your data, Erase everything removes all your writing and every setting from this device at once. It leaves the app's own files and the Bible text and study material saved for offline use; those hold nothing you wrote, though which books are saved could show which you had opened. To remove those as well, clear this site's data in your browser. On an iPhone, deleting the app from the home screen does the same. A backup you made earlier is not affected: delete that file yourself if you want it gone.

## What is outside the app's control

- Whether your phone's own backups include browser storage is decided by its maker, not by Biblica.
- A browser extension, or a device that has been tampered with, can read any page you open, this one included.
- On a shared device or browser profile, anyone who uses it can open the app.
- Browsers may clear a website's storage that has not been used for a long time. Apps added to the home screen are normally spared, and Biblica asks the browser to protect its storage, but a backup is the only sure protection.

## Children

Biblica collects nothing from anyone, of any age.

## Checking this for yourself

Every file of the app can be read as it is served, and a copy on GitHub Pages is published from a public repository. The first page, `index.html`, carries a content security policy that forbids the app's pages from loading anything from, or sending anything to, any site but their own, and your browser enforces it. The one part a page's policy does not cover is the service worker, the small program that keeps the app available offline; the project's tests check that it, like every other script, names no other site. Your browser's network inspector will show every request the app makes.

## Changes

This statement is part of the app, so it can only change with a new release. "What is new", in Settings, and the release notes (`RELEASES.md`) say when it has.
