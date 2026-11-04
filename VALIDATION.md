# Standalone local verification

Source baseline: Share My Prayer `0cc4321de1e5eacdd0681cc5c79b6fec44ed0bb0`.

Tests cover existing recording/playback/export/navigation behavior and additional migration cases: same-origin legacy sentinels remain unchanged before opt-in and after cancel/copy/repeat/failure; legacy and own backup formats; original wording keys and bytes; newer destination takes/preferences/prompts win; aborted probing does not create a legacy database; concurrent copy requests cannot overwrite a destination key; malformed imports make no changes.

The app retains the existing source and permission register in SOURCES.md and copies approved narration assets without byte changes. All public build inputs are explicit allowlist entries. No private recording or backup file was copied from the user's browser or filesystem.

Physical-device microphone/background testing and native share-sheet acceptance remain outstanding. The parent handoff records publication status and exact command results.

## Final local checks — November 4, 2026

- Unit suite: 33 passed, 0 failures.
- Full Chromium/WebKit browser suite: 101 passed, 3 skipped, 0 failures. An initial run exposed an existing mystery Record badge contrast failure (4.24:1 versus required 4.5:1). Both saved and unsaved badge text now use the existing dark ink color. A deterministic unit check verifies both badge states at 101 interpolated button/hover backgrounds. Focused accessibility checks passed in both engines before the clean full run.
- Skips: two expected WebKit microphone cases and one explicit WebKit legacy-Blob fixture skip. WebKit cannot persist the fixture's Blob in IndexedDB; its ArrayBuffer migration coverage remains active. Chromium covers legacy Blob migration.
- Focused deferred File.text/Copy overlap, in-flight Cancel/Escape, and Blob migration regressions: 5 passed, 1 WebKit Blob skip. The deferred read prevents overlapping Copy and closing Settings, then preserves the selected own-format backup preview and restores it without modifying source storage.
- After the full run, the atomic-failure test was strengthened to retry Confirm on the same preview after removing the injected fault; both engines passed (2 tests), with all four records copied and source unchanged.
- Build passed: 16 allowlisted static files and 35 checksum-verified narrator assets.
- Prettier check passed for changed production, migration tests, and documentation. Node syntax checks passed for top-level, scripts, and tests JavaScript.

The Pray My Rosary rename was verified with 33 unit tests, 101 browser passes and 3 explicit skips; the original app passed 30 unit tests and 48 browser tests, and the renamed same-origin integration passed all 4 cases. Both builds, syntax, formatting and package allowlist/hash audits passed. Legacy Share My Prayer imports remain unchanged.

Local and deployed commit identities are recorded in the parent handoff. Approval covers publishing only Pray My Rosary; the original cleanup remains local. No actual private recording or backup was transferred.
