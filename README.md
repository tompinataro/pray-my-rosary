# Pray My Rosary

This is a standalone static Rosary app prepared from Share My Prayer revision `0cc4321de1e5eacdd0681cc5c79b6fec44ed0bb0`.

Tom approved publication as the public `tompinataro/pray-my-rosary` repository with GitHub Pages at `https://tompinataro.github.io/pray-my-rosary/`. The parent handoff records the exact deployed commit, workflow and live verification.

The app retains eight prayer recordings, 20 mystery announcements, Classic/Current/Contemporary wordings, legacy Traditional recording compatibility, decade/full-Rosary playback, local WAV assembly, individual and session sharing/download fallback, and private backup/restore. Existing reviewed Bella assets are byte-identical copies of the source revision. The four ordinary prayers are also needed when assembling a Rosary.

## Local run and checks

```sh
npm ci
npm run dev
npm test
npm run test:browser
npm run build
npx prettier --check app.js core.js storage.js migration.js index.html tests/migration.spec.js
```

The development server and Playwright configuration use port **4174**, keeping the original project's port 4173 separate. Serve `dist/` when previewing the exact public package. The build uses an explicit public-file allowlist; tests, local recordings, backups, dependencies and development artifacts are excluded.

There are no configured separate lint/typecheck scripts. Prettier provides the available formatting check. Browser tests use Chromium and mobile WebKit. Physical-phone microphone, background behavior and native share-sheet acceptance still need attended device QA.

## Storage and migration

Pray My Rosary uses IndexedDB **`pray-my-rosary`**, preferences **`pmr-settings`**, and custom prompts **`pmr-prompt:<version>:<prayer>`**. It never automatically opens Share My Prayer's database or reads its preferences. GitHub Pages project paths share an origin, so these separate namespaces are necessary.

The standalone app has not launched; its database, preference keys and own-backup format consistently use the chosen Pray My Rosary identity. Legacy `share-my-prayer` imports retain their original format and missing-only policy. No browser data is renamed or deleted by this source change.

See [MIGRATION.md](MIGRATION.md) for explicit same-origin copying and private-file import. Both keep source recordings unchanged. Nothing synchronizes between the apps after a copy.

## Publication scope

Publication approval covers this standalone app and its approved public narrator assets. The original Share My Prayer cleanup remains local and requires separate authorization to publish. The GitHub Actions Pages workflow is manual-only; future publication is not automatic on push.
