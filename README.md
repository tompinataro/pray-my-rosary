# Share My Rosary — local standalone preparation

This is a standalone static Rosary app prepared from Share My Prayer revision `0cc4321de1e5eacdd0681cc5c79b6fec44ed0bb0`.

**Publication is pending approval.** No GitHub repository or remote has been created. The proposed name is `tompinataro/share-my-rosary` and the proposed Pages path is `https://tompinataro.github.io/share-my-rosary/`; that destination is not established by this project.

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

Share My Rosary uses IndexedDB **`share-my-rosary`**, preferences **`smr-settings`**, and custom prompts **`smr-prompt:<version>:<prayer>`**. It never automatically opens Share My Prayer's database or reads its preferences. GitHub Pages project paths share an origin, so these separate namespaces are necessary.

See [MIGRATION.md](MIGRATION.md) for explicit same-origin copying and private-file import. Both keep source recordings unchanged. Nothing synchronizes between the apps after a copy.

## Publication gate

Before any public release: approve the new repository and destination, review the local build and migration evidence, publish and verify this standalone app, and only then publish the original app's Rosary navigation removal. The copied GitHub Actions workflow is manual-only; its presence is not permission to create a repository or dispatch publication.
