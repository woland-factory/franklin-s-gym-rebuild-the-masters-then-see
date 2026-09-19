import {
  openDb,
  type Alignment,
  type AttemptRecord,
  type DelayType,
  type PassageSnapshot,
  type SettingRecord,
} from "./db";
import { DELAY_PRESETS } from "./delays";
import { buildDemoAttempt } from "./demo";

// Typed data access over the IndexedDB connection. All reads and writes stay on
// the device. No function here transmits data off the machine.

export async function countAttempts(): Promise<number> {
  const db = await openDb();
  return db.count("attempts");
}

export async function listAttempts(): Promise<AttemptRecord[]> {
  const db = await openDb();
  return db.getAllFromIndex("attempts", "by-createdAt");
}

// Creates a fresh condensing attempt that embeds a frozen snapshot of the
// passage. `now` is passed in so callers stay testable.
export async function createAttempt(
  passage: PassageSnapshot,
  now: number,
): Promise<AttemptRecord> {
  const attempt: AttemptRecord = {
    id: crypto.randomUUID(),
    status: "condensing",
    createdAt: now,
    passage,
    hints: Array(passage.sentences.length).fill(""),
    cursor: 0,
  };
  const db = await openDb();
  await db.put("attempts", attempt);
  return attempt;
}

export async function getAttempt(id: string): Promise<AttemptRecord | undefined> {
  const db = await openDb();
  return db.get("attempts", id);
}

// Writes one hint and advances the resume cursor. No-op if the attempt is gone.
export async function saveHint(id: string, index: number, hint: string): Promise<void> {
  const db = await openDb();
  const attempt = await db.get("attempts", id);
  if (!attempt) return;
  if (index < 0 || index >= attempt.hints.length) return;
  attempt.hints[index] = hint;
  attempt.cursor = Math.max(attempt.cursor, index + 1);
  await db.put("attempts", attempt);
}

// Vaults an attempt behind the chosen delay. The ripe time is `now + preset.ms`.
export async function vaultAttempt(
  id: string,
  delayType: DelayType,
  now: number,
): Promise<AttemptRecord> {
  const db = await openDb();
  const attempt = await db.get("attempts", id);
  if (!attempt) throw new Error("Attempt not found");
  attempt.status = "vaulted";
  attempt.delayType = delayType;
  attempt.vaultedAt = now;
  attempt.vaultedUntil = now + DELAY_PRESETS[delayType].ms;
  await db.put("attempts", attempt);
  return attempt;
}

// Saves a submitted rebuild and its precomputed alignment onto the attempt.
// Terminal for the loop: status becomes "reconstructed". The caller computes
// the alignment (see lib/align.ts) so this stays a thin persistence layer.
// `now` is passed in for testability.
export async function saveReconstruction(
  id: string,
  reconstructionText: string,
  alignment: Alignment,
  now: number,
): Promise<AttemptRecord> {
  const db = await openDb();
  const attempt = await db.get("attempts", id);
  if (!attempt) throw new Error("Attempt not found");
  attempt.status = "reconstructed";
  attempt.reconstructionText = reconstructionText;
  attempt.reconstructedAt = now;
  attempt.alignment = alignment;
  await db.put("attempts", attempt);
  return attempt;
}

// Merges imported records into the attempts store in one readwrite
// transaction. Records whose id already exists are left untouched, so an import
// never overwrites newer local work. Returns what happened for the UI.
export async function importAttempts(
  records: AttemptRecord[],
): Promise<{ added: number; skipped: number }> {
  const db = await openDb();
  const tx = db.transaction("attempts", "readwrite");
  const store = tx.objectStore("attempts");
  let added = 0;
  let skipped = 0;
  for (const record of records) {
    const existing = await store.get(record.id);
    if (existing) {
      skipped += 1;
      continue;
    }
    await store.put(record);
    added += 1;
  }
  await tx.done;
  return { added, skipped };
}

// Seeds the demo attempt for the SEED_DEMO staging demo. No-op when the store
// already holds any attempt, so it never clobbers real user work and is
// idempotent across restarts. `now` is passed in for testability.
export async function seedDemoAttempt(now: number): Promise<void> {
  if ((await countAttempts()) > 0) return;
  const db = await openDb();
  await db.put("attempts", buildDemoAttempt(now));
}

export async function getSetting<T = unknown>(key: string): Promise<T | undefined> {
  const db = await openDb();
  const record = await db.get("settings", key);
  return record?.value as T | undefined;
}

export async function putSetting(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  const record: SettingRecord = { key, value };
  await db.put("settings", record);
}
