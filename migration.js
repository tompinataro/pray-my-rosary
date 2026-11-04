import {
  library,
  versions,
  keyFor,
  extension,
  preferredVersion,
  mysteries,
} from "./core.js?v=bella-classic";

export function readLegacyRecordings() {
  return new Promise((resolve, reject) => {
    let absent = false;
    const request = indexedDB.open("share-my-prayer");
    request.onupgradeneeded = () => {
      absent = true;
      request.transaction.abort();
    };
    request.onerror = () => (absent ? resolve([]) : reject(request.error));
    request.onblocked = () =>
      reject(
        Error("Close other Share My Prayer tabs, then try copying again."),
      );
    request.onsuccess = () => {
      const source = request.result;
      if (!source.objectStoreNames.contains("recordings")) {
        source.close();
        resolve([]);
        return;
      }
      const t = source.transaction("recordings", "readonly");
      const read = t.objectStore("recordings").getAll();
      read.onsuccess = () => {
        try {
          const records = read.result.map((record) => {
            if (
              !Object.hasOwn(versions, record.version) ||
              !library.some((p) => p.id === record.id) ||
              record.key !== keyFor(record.version, record.id)
            )
              throw Error(
                "An existing recording has an unsupported identifier. Use a private backup to review it first.",
              );
            const hasBytes =
              record.bytes instanceof ArrayBuffer ||
              ArrayBuffer.isView(record.bytes);
            const blob = record.blob?.size
              ? record.blob
              : hasBytes
                ? new Blob([record.bytes], { type: record.type })
                : null;
            if (!blob?.size)
              throw Error(
                "An existing recording is empty. Its source has not been changed.",
              );
            extension(blob.type);
            return { ...record, blob };
          });
          resolve(records);
        } catch (error) {
          reject(error);
        }
      };
      read.onerror = () => reject(read.error);
      t.oncomplete = () => source.close();
      t.onabort = () => {
        source.close();
        reject(t.error || Error("Could not read existing recordings."));
      };
    };
  });
}

export function readLegacyPrompts() {
  const prompts = {};
  for (const version of Object.keys(versions))
    for (const prayer of library) {
      const key = keyFor(version, prayer.id),
        value = localStorage.getItem("smp-prompt:" + key);
      if (value !== null) prompts[key] = value;
    }
  return prompts;
}

export function restorePreview(data) {
  const legacy = data.format === "share-my-prayer";
  const wordings = [
    ...new Set(data.recordings.map((record) => versions[record.version])),
  ];
  return {
    summary: `${legacy ? "Share My Prayer migration" : "Share My Rosary backup"}: ${data.recordings.length} recordings across ${wordings.length} wording versions (${wordings.join(", ")}).`,
    policy: legacy
      ? "Only missing recordings will be copied. Existing Share My Rosary takes, preferences and prompts stay unchanged. Share My Prayer is never changed."
      : "Recordings with the same prayer and wording will be replaced. Other recordings and current preferences stay unchanged.",
  };
}

export function copyMissingSettings(preferences, defaults) {
  try {
    if (!preferences || localStorage.getItem("smr-settings") !== null)
      return {};
    const copy = {
      ...defaults,
      version: preferredVersion(preferences.version),
      subtitle: !!preferences.subtitle,
      sender: String(preferences.sender || "").slice(0, 60),
    };
    if (["whole", "decade"].includes(preferences.mode))
      copy.mode = preferences.mode;
    if (Object.hasOwn(mysteries, preferences.set)) copy.set = preferences.set;
    if (
      Number.isInteger(+preferences.decade) &&
      +preferences.decade >= 0 &&
      +preferences.decade < 5
    )
      copy.decade = +preferences.decade;
    localStorage.setItem("smr-settings", JSON.stringify(copy));
    return { settings: copy };
  } catch {
    return { failed: true };
  }
}
