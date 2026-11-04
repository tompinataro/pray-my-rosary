# Moving recordings into Share My Rosary

Both apps store recordings in the current browser profile on the current device. Browser private mode, another profile, or another device will not expose the same recordings. Make and keep a private backup before moving anything.

## Option 1: explicit copy on the same origin

When both Pages apps are on `https://tompinataro.github.io`, open Share My Rosary Settings and press **Copy existing Share My Prayer recordings**. This is the first point at which the new app reads the old `share-my-prayer` database.

The app reads that database through a read-only transaction, shows the source, number of recordings and original wording versions, and waits for confirmation. Cancel performs no destination writes. Confirm copies only missing recording keys into `share-my-rosary`. It rechecks each key inside the destination read/write transaction, so another migration or a newer Rosary take is not overwritten. Repeating the copy is safe.

Existing Rosary preferences and custom prompts win. Original preferences and prompts are copied only when the corresponding `smr-*` key is absent. The app never writes or deletes a `smp-*` key or an old recording. Probing an absent old database aborts the upgrade rather than creating an empty legacy database.

The source and destination remain independent after copying. A later recording in one app will not replace the other app's take.

## Option 2: private backup file

In Share My Prayer Settings, download **Back up recordings**. The original app retains and exports all existing legacy Rosary recordings even after its Rosary UI is removed. In Share My Rosary Settings, choose **Restore backup** and select that JSON file.

A version-1 `share-my-prayer` backup is treated as a migration: preview first, then add missing recordings only; existing Rosary takes, preferences and prompts remain intact. Original `classic`, `current`, `contemporary` and legacy `traditional` version keys are preserved. All 112 possible version/prayer combinations remain valid, including mystery announcements. The file stays local; it is not uploaded.

A `share-my-rosary` backup restores into this app's isolated store. Its preview explicitly warns that matching destination recordings will be replaced. Cancel makes no changes; confirmation is required. Other records and current preferences remain intact.

## Compatibility and failure behavior

Audio remains persisted as ArrayBuffer bytes and reconstructed as Blobs when needed, retaining WebKit reload compatibility. Existing recordings' audio bytes and MIME types are not converted during migration. Narrator defaults do not become personal recordings and are not included in private backups.

Recording batches commit atomically. A destination transaction failure leaves the batch unchanged and the source is still untouched. Preference/prompt copying uses separate localStorage writes; a storage failure is reported without misrepresenting the already copied recordings. Close other tabs and retry if the browser blocks database access.

No source cleanup, automatic deletion, upload, background migration, cross-device sync, or new public repository is performed by this project.
