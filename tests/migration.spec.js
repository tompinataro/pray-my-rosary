import { test, expect } from "@playwright/test";
const oldRecords = [
  {
    key: "current:cross",
    id: "cross",
    version: "current",
    type: "audio/wav",
    bytes: [1, 2, 3],
  },
  {
    key: "current:hail",
    id: "hail",
    version: "current",
    type: "audio/wav",
    bytes: [4, 5, 6],
  },
  {
    key: "classic:creed",
    id: "creed",
    version: "classic",
    type: "audio/wav",
    bytes: [7, 8, 9],
  },
  {
    key: "traditional:Joyful-0",
    id: "Joyful-0",
    version: "traditional",
    type: "audio/wav",
    bytes: [10, 11, 12],
  },
];
async function seedLegacy(page) {
  await page.route("**/migration-seed", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Migration fixture</title>",
    }),
  );
  await page.goto("/migration-seed");
  await page.evaluate(async (rows) => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("share-my-prayer", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("recordings", { keyPath: "key" });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result,
          t = db.transaction("recordings", "readwrite");
        rows.forEach((row) =>
          t.objectStore("recordings").put({
            ...row,
            bytes: new Uint8Array(row.bytes).buffer,
            savedAt: "legacy",
          }),
        );
        t.oncomplete = () => {
          db.close();
          resolve();
        };
        t.onerror = () => reject(t.error);
      };
    });
    localStorage.setItem(
      "smp-settings",
      JSON.stringify({
        version: "current",
        mode: "whole",
        set: "Glorious",
        decade: 4,
        sender: "Legacy",
      }),
    );
    localStorage.setItem("smp-prompt:current:hail", "legacy prompt");
  }, oldRecords);
}
async function sourceSnapshot(page) {
  return page.evaluate(async () => ({
    settings: localStorage.getItem("smp-settings"),
    prompt: localStorage.getItem("smp-prompt:current:hail"),
    recordings: await new Promise((resolve, reject) => {
      const r = indexedDB.open("share-my-prayer");
      r.onerror = () => reject(r.error);
      r.onsuccess = () => {
        const db = r.result,
          t = db.transaction("recordings", "readonly"),
          q = t.objectStore("recordings").getAll();
        q.onsuccess = () =>
          resolve(
            q.result.map((row) => ({
              ...row,
              bytes: [...new Uint8Array(row.bytes)],
            })),
          );
        t.oncomplete = () => db.close();
      };
    }),
  }));
}
async function destination(page) {
  return page.evaluate(async () => ({
    settings: localStorage.getItem("smr-settings"),
    prompt: localStorage.getItem("smr-prompt:current:hail"),
    recordings: await Promise.all(
      (await (await import("./storage.js")).allRecordings()).map(async (r) => ({
        key: r.key,
        version: r.version,
        bytes: [...new Uint8Array(await r.blob.arrayBuffer())],
      })),
    ),
  }));
}
async function openCopy(page) {
  if (!(await page.locator("#settings-dialog").evaluate((el) => el.open)))
    await page.locator("#settings-open").click();
  await page.locator("#migrate-legacy").click();
  await expect(page.locator("#restore-dialog")).toBeVisible();
}
function backup(format = "share-my-prayer") {
  return {
    format,
    version: 1,
    preferences: { version: "current", sender: "Legacy backup" },
    prompts: { "current:hail": "legacy prompt" },
    recordings: oldRecords.map((row) => ({
      id: row.id,
      version: row.version,
      type: row.type,
      data: Buffer.from(row.bytes).toString("base64"),
      savedAt: "legacy",
    })),
  };
}
async function upload(page, data) {
  if (!(await page.locator("#settings-dialog").evaluate((el) => el.open)))
    await page.locator("#settings-open").click();
  await page.locator("#restore").setInputFiles({
    name: "private-fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
}

test("same-origin namespaces remain isolated until explicit confirmed copy; cancel is read-only", async ({
  page,
}) => {
  await seedLegacy(page);
  const before = await sourceSnapshot(page);
  await page.addInitScript(() => {
    const open = IDBFactory.prototype.open;
    window.openedDatabases = [];
    IDBFactory.prototype.open = function (name, ...args) {
      window.openedDatabases.push(name);
      return open.call(this, name, ...args);
    };
  });
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("Share My Rosary");
  expect((await destination(page)).recordings).toHaveLength(0);
  expect((await destination(page)).settings).toBeNull();
  expect(await page.evaluate(() => window.openedDatabases)).not.toContain(
    "share-my-prayer",
  );
  expect(await sourceSnapshot(page)).toEqual(before);
  await openCopy(page);
  await expect(page.locator("#restore-summary")).toContainText(
    "4 recordings across 3 wording versions",
  );
  await expect(page.locator("#restore-policy")).toContainText(
    "Only missing recordings",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator("#restore-dialog")).toBeHidden();
  expect((await destination(page)).recordings).toHaveLength(0);
  expect(await sourceSnapshot(page)).toEqual(before);
});

test("copy preserves all wording keys and bytes, reloads, and never overwrites newer takes or preferences", async ({
  page,
}) => {
  await seedLegacy(page);
  const before = await sourceSnapshot(page);
  await page.goto("/");
  await openCopy(page);
  await page.locator("#restore-confirm").click();
  await expect(page.locator("#restore-dialog")).toBeHidden();
  let own = await destination(page);
  expect(own.recordings).toHaveLength(4);
  for (const row of oldRecords)
    expect(own.recordings.find((r) => r.key === row.key)).toMatchObject({
      version: row.version,
      bytes: row.bytes,
    });
  expect(JSON.parse(own.settings).version).toBe("current");
  expect(own.prompt).toBe("legacy prompt");
  await page.evaluate(async () => {
    const { saveMany } = await import("./storage.js");
    await saveMany([
      {
        key: "current:hail",
        id: "hail",
        version: "current",
        blob: new Blob([new Uint8Array([99, 98])], { type: "audio/wav" }),
        savedAt: "newer",
      },
    ]);
    localStorage.setItem(
      "smr-settings",
      JSON.stringify({ version: "contemporary", sender: "Newer" }),
    );
    localStorage.setItem("smr-prompt:current:hail", "newer prompt");
  });
  await page.reload();
  await openCopy(page);
  await page.locator("#restore-confirm").click();
  await expect(page.locator("#restore-dialog")).toBeHidden();
  await page.reload();
  own = await destination(page);
  expect(own.recordings.find((r) => r.key === "current:hail").bytes).toEqual([
    99, 98,
  ]);
  expect(JSON.parse(own.settings).sender).toBe("Newer");
  expect(own.prompt).toBe("newer prompt");
  expect(await sourceSnapshot(page)).toEqual(before);
});

test("legacy backup import skips existing, own backup roundtrip and explicit replace remain compatible", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, backup());
  await page.locator("#restore-confirm").click();
  await expect(page.locator("#restore-dialog")).toBeHidden();
  await page.evaluate(async () => {
    const { saveMany } = await import("./storage.js");
    await saveMany([
      {
        id: "hail",
        version: "current",
        key: "current:hail",
        blob: new Blob([new Uint8Array([42])], { type: "audio/wav" }),
      },
    ]);
  });
  await upload(page, backup());
  await page.locator("#restore-confirm").click();
  await expect(page.locator("#restore-dialog")).toBeHidden();
  expect(
    (await destination(page)).recordings.find((r) => r.key === "current:hail")
      .bytes,
  ).toEqual([42]);
  const download = page.waitForEvent("download");
  await page.locator("#backup").click();
  const { readFile } = await import("node:fs/promises");
  const ownBackup = JSON.parse(
    await readFile(await (await download).path(), "utf8"),
  );
  expect(ownBackup.format).toBe("share-my-rosary");
  expect(ownBackup.recordings).toHaveLength(4);
  await upload(page, backup("share-my-rosary"));
  await expect(page.locator("#restore-policy")).toContainText(
    "will be replaced",
  );
  await page.locator("#restore-cancel").click();
  expect(
    (await destination(page)).recordings.find((r) => r.key === "current:hail")
      .bytes,
  ).toEqual([42]);
  await upload(page, backup("share-my-rosary"));
  await page.locator("#restore-confirm").click();
  await expect(page.locator("#restore-dialog")).toBeHidden();
  expect(
    (await destination(page)).recordings.find((r) => r.key === "current:hail")
      .bytes,
  ).toEqual([4, 5, 6]);
});

test("missing legacy database is not created by the opt-in probe", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#settings-open").click();
  await page.locator("#migrate-legacy").click();
  await expect(page.locator("#settings-dialog .feedback")).toContainText(
    "No existing Share My Prayer recordings",
  );
  const exists = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open("share-my-prayer");
        let absent = false;
        r.onupgradeneeded = () => {
          absent = true;
          r.transaction.abort();
        };
        r.onerror = () => resolve(!absent);
        r.onsuccess = () => {
          r.result.close();
          resolve(true);
        };
      }),
  );
  expect(exists).toBe(false);
});

test("destination migration transaction is atomic and rechecks concurrently requested keys", async ({
  page,
}) => {
  await seedLegacy(page);
  const before = await sourceSnapshot(page);
  await page.goto("/");
  await openCopy(page);
  await page.evaluate(() => {
    const add = IDBObjectStore.prototype.add;
    window.originalMigrationAdd = add;
    let n = 0;
    IDBObjectStore.prototype.add = function (...args) {
      if (++n === 2) throw new Error("fixture migration write failure");
      return add.apply(this, args);
    };
  });
  await page.locator("#restore-confirm").click();
  await expect(page.locator("#restore-dialog .feedback")).toContainText(
    "fixture migration write failure",
  );
  expect((await destination(page)).recordings).toHaveLength(0);
  expect(await sourceSnapshot(page)).toEqual(before);
  await page.evaluate(() => {
    IDBObjectStore.prototype.add = window.originalMigrationAdd;
  });
  await page.locator("#restore-confirm").click();
  await expect(page.locator("#restore-dialog")).toBeHidden();
  expect((await destination(page)).recordings).toHaveLength(4);
  expect(await sourceSnapshot(page)).toEqual(before);
  // Reset only the synthetic destination fixture for the separate concurrency check.
  await page.evaluate(async () => {
    const { db } = await import("./storage.js");
    const destination = await db();
    await new Promise((resolve, reject) => {
      const transaction = destination.transaction("recordings", "readwrite");
      transaction.objectStore("recordings").clear();
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  });
  const results = await page.evaluate(async () => {
    const { saveMissing, allRecordings } = await import("./storage.js");
    const row = {
      id: "hail",
      version: "current",
      key: "current:hail",
      blob: new Blob([new Uint8Array([21])], { type: "audio/wav" }),
    };
    const added = await Promise.all([
      saveMissing([row]),
      saveMissing([
        {
          ...row,
          blob: new Blob([new Uint8Array([22])], { type: "audio/wav" }),
        },
      ]),
    ]);
    return { added, rows: (await allRecordings()).map((r) => r.key) };
  });
  expect(results.added.flat()).toEqual(["current:hail"]);
  expect(results.rows).toEqual(["current:hail"]);
  expect(await sourceSnapshot(page)).toEqual(before);
});

test("malformed imports leave source and destination unchanged", async ({
  page,
}) => {
  await seedLegacy(page);
  const before = await sourceSnapshot(page);
  await page.goto("/");
  const bad = backup();
  bad.recordings[0].type = "text/plain";
  await upload(page, bad);
  await expect(page.locator("#settings-dialog .feedback")).toContainText(
    "Unsupported audio format",
  );
  expect((await destination(page)).recordings).toHaveLength(0);
  expect(await sourceSnapshot(page)).toEqual(before);
});

test("a destination winner saved after preview appears immediately without overwriting it", async ({
  page,
}) => {
  await seedLegacy(page);
  const before = await sourceSnapshot(page);
  await page.goto("/");
  await openCopy(page);
  await page.evaluate(async () => {
    const { saveMany } = await import("./storage.js");
    await saveMany([
      {
        key: "current:hail",
        id: "hail",
        version: "current",
        blob: new Blob([new Uint8Array([55])], { type: "audio/wav" }),
        savedAt: "concurrent",
      },
    ]);
  });
  await page.locator("#restore-confirm").click();
  await expect(page.locator("#restore-dialog")).toBeHidden();
  await page.locator("#settings-done").click();
  await page.locator('#prayers [data-prayer="hail"]').click();
  await expect(page.locator("#play-label")).toHaveText("Play saved");
  await expect(page.locator("#individual-play")).toBeEnabled();
  expect(
    (await destination(page)).recordings.find((r) => r.key === "current:hail")
      .bytes,
  ).toEqual([55]);
  expect(await sourceSnapshot(page)).toEqual(before);
});

test("copy preview and Settings remain usable without horizontal overflow on phones", async ({
  page,
}) => {
  await seedLegacy(page);
  await page.goto("/");
  await openCopy(page);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page
        .locator("#restore-dialog")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/${test.info().project.name}-migration-preview-${width}.png`,
    });
  }
  await page.locator("#restore-cancel").click();
  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page
      .locator("#settings-dialog")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.locator("#migrate-legacy").scrollIntoViewIfNeeded();
  expect(
    (await page.locator("#migrate-legacy").boundingBox()).height,
  ).toBeGreaterThanOrEqual(44);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: `test-results/${test.info().project.name}-migration-settings-${width}.png`,
    });
  }
});

test("confirmed migration cannot be interrupted by Cancel or Escape during an in-flight write", async ({
  page,
}) => {
  await seedLegacy(page);
  const before = await sourceSnapshot(page);
  await page.goto("/");
  await openCopy(page);
  await page.evaluate(() => {
    const read = Blob.prototype.arrayBuffer;
    let first = true;
    Blob.prototype.arrayBuffer = async function () {
      if (first) {
        first = false;
        await new Promise((resolve) => (window.finishMigration = resolve));
      }
      return read.call(this);
    };
  });
  await page.locator("#restore-confirm").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#restore-dialog")).toBeVisible();
  await page.locator("#restore-cancel").click();
  await expect(page.locator("#restore-dialog")).toBeVisible();
  expect((await destination(page)).recordings).toHaveLength(0);
  await page.evaluate(() => window.finishMigration());
  await expect(page.locator("#restore-dialog")).toBeHidden();
  expect((await destination(page)).recordings).toHaveLength(4);
  expect(await sourceSnapshot(page)).toEqual(before);
});

test("legacy Blob-stored takes copy unchanged while destination persists ArrayBuffer bytes", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "WebKit cannot persist legacy Blob values in IndexedDB; ArrayBuffer migration remains covered by the other migration tests.",
  );
  await seedLegacy(page);
  await page.evaluate(async () => {
    const d = await new Promise((resolve, reject) => {
      const r = indexedDB.open("share-my-prayer");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise((resolve, reject) => {
      const t = d.transaction("recordings", "readwrite");
      t.objectStore("recordings").put({
        key: "current:cross",
        id: "cross",
        version: "current",
        type: "audio/wav",
        blob: new Blob([new Uint8Array([21, 22, 23])], { type: "audio/wav" }),
        savedAt: "blob-legacy",
      });
      t.oncomplete = resolve;
      t.onerror = reject;
    });
    d.close();
  });
  await page.goto("/");
  await openCopy(page);
  await page.locator("#restore-confirm").click();
  await expect(page.locator("#restore-dialog")).toBeHidden();
  expect(
    (await destination(page)).recordings.find((r) => r.key === "current:cross")
      .bytes,
  ).toEqual([21, 22, 23]);
  const result = await page.evaluate(async () => {
    const { db } = await import("./storage.js");
    const dest = await db();
    const saved = await new Promise((resolve) => {
      const r = dest
        .transaction("recordings")
        .objectStore("recordings")
        .get("current:cross");
      r.onsuccess = () => resolve(r.result);
    });
    const source = await new Promise((resolve) => {
      const r = indexedDB.open("share-my-prayer");
      r.onsuccess = () => resolve(r.result);
    });
    const old = await new Promise((resolve) => {
      const r = source
        .transaction("recordings")
        .objectStore("recordings")
        .get("current:cross");
      r.onsuccess = () => resolve(r.result);
    });
    source.close();
    return {
      destBytes: saved.bytes instanceof ArrayBuffer && !saved.blob,
      sourceBytes: [...new Uint8Array(await old.blob.arrayBuffer())],
      sourceHasBytes: Object.hasOwn(old, "bytes"),
    };
  });
  expect(result).toEqual({
    destBytes: true,
    sourceBytes: [21, 22, 23],
    sourceHasBytes: false,
  });
});

test("a deferred backup file read blocks overlapping legacy Copy and keeps the selected preview", async ({
  page,
}) => {
  await seedLegacy(page);
  const before = await sourceSnapshot(page);
  await page.goto("/");
  await page.locator("#settings-open").click();
  await page.evaluate(() => {
    const read = File.prototype.text;
    File.prototype.text = async function () {
      await new Promise((resolve) => (window.finishBackupRead = resolve));
      return read.call(this);
    };
  });
  await upload(page, backup("share-my-rosary"));
  await expect
    .poll(() => page.evaluate(() => typeof window.finishBackupRead))
    .toBe("function");
  await page.locator("#migrate-legacy").click();
  await expect(page.locator("#restore-dialog")).toBeHidden();
  await page.locator("#settings-done").click();
  await expect(page.locator("#settings-dialog")).toBeVisible();
  expect((await destination(page)).recordings).toHaveLength(0);
  await page.evaluate(() => window.finishBackupRead());
  await expect(page.locator("#restore-dialog")).toBeVisible();
  await expect(page.locator("#restore-summary")).toContainText(
    "Share My Rosary",
  );
  await page.locator("#restore-confirm").click();
  await expect(page.locator("#restore-dialog")).toBeHidden();
  expect((await destination(page)).recordings).toHaveLength(4);
  expect(await sourceSnapshot(page)).toEqual(before);
});
