import { openDb, type AttemptRecord, type SettingRecord } from "./db";

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
