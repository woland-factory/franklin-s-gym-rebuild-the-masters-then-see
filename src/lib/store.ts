import {
  openDb,
  type AttemptRecord,
  type DelayType,
  type PassageSnapshot,
  type SettingRecord,
} from "./db";
import { DELAY_PRESETS } from "./delays";

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
