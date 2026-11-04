import test from "node:test";
import assert from "node:assert/strict";
import { validateBackup } from "../core.js";
import { copyMissingSettings, restorePreview } from "../migration.js";

test("own and legacy v1 backup formats are explicit and unknown formats remain rejected", () => {
  const record = {
    id: "hail",
    version: "current",
    type: "audio/wav",
    data: "AQ==",
  };
  for (const format of ["share-my-prayer", "pray-my-rosary"]) {
    const data = { format, version: 1, recordings: [record] };
    assert.equal(validateBackup(data), data);
    assert.match(
      restorePreview(data).summary,
      /1 recordings across 1 wording versions/,
    );
  }
  assert.throws(
    () =>
      validateBackup({ format: "other-app", version: 1, recordings: [record] }),
    /not a supported/,
  );
});

test("legacy preferences fill only an absent own key and report localStorage failure", () => {
  const original = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  try {
    const defaults = {
      version: "classic",
      mode: "decade",
      set: "Joyful",
      decade: 0,
      subtitle: false,
      sender: "",
    };
    const result = copyMissingSettings(
      {
        version: "current",
        mode: "whole",
        set: "Glorious",
        decade: 4,
        sender: "Legacy",
      },
      defaults,
    );
    assert.equal(result.settings.version, "current");
    assert.equal(result.settings.mode, "whole");
    values.set(
      "pmr-settings",
      JSON.stringify({ version: "contemporary", sender: "Newer" }),
    );
    assert.deepEqual(
      copyMissingSettings({ version: "current", sender: "Legacy" }, defaults),
      {},
    );
    assert.equal(JSON.parse(values.get("pmr-settings")).sender, "Newer");
    values.delete("pmr-settings");
    globalThis.localStorage.setItem = () => {
      throw Error("quota");
    };
    assert.deepEqual(copyMissingSettings({ version: "current" }, defaults), {
      failed: true,
    });
  } finally {
    globalThis.localStorage = original;
  }
});
