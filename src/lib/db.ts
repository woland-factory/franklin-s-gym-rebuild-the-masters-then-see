import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export const DB_NAME = "franklins-gym";
export const DB_VERSION = 1;

export type DelayType = "standard" | "micro";

// Persisted status. "ripe" and "reconstructed" are NOT stored: ripeness is
// derived from the clock (see attemptState), and reconstruction lands later.
export type AttemptStatus = "condensing" | "vaulted";

// A frozen copy of the passage this attempt trains on. Embedding it (rather
// than only referencing a seed id) keeps custom passages private and local,
// and keeps every attempt stable if the seed library later changes.
export interface PassageSnapshot {
  originalPassageId: string | null; // seed slug, or null for a custom passage
  title: string;
  author: string; // "" allowed for custom
  source: string; // "" allowed for custom
  year: number | null;
  sentences: string[];
  isCustom: boolean;
}

// Attempt records carry the passage snapshot, the hints written while
// condensing, and the vault timing once vaulted. Records are schemaless per
// row: older rows without the newer fields are tolerated by treating the
// absent fields as unset.
export interface AttemptRecord {
  id: string;
  status: AttemptStatus;
  createdAt: number; // epoch ms
  passage: PassageSnapshot;
  hints: string[]; // length === passage.sentences.length; "" until filled
  cursor: number; // sentence index to resume condensing at
  delayType?: DelayType; // set at vault
  vaultedAt?: number; // epoch ms, set at vault
  vaultedUntil?: number; // epoch ms, ripe when now >= this; set at vault
}

export interface SettingRecord {
  key: string;
  value: unknown;
}

export interface FranklinsGymDB extends DBSchema {
  attempts: {
    key: string;
    value: AttemptRecord;
    indexes: { "by-status": string; "by-createdAt": number };
  };
  settings: {
    key: string;
    value: SettingRecord;
  };
}

export type AppDB = IDBPDatabase<FranklinsGymDB>;

let dbPromise: Promise<AppDB> | null = null;

// Opens the database, running forward-only migrations. The upgrade callback
// switches on oldVersion so each future version only adds to the schema and
// never destroys existing user data.
export function openDb(): Promise<AppDB> {
  if (!dbPromise) {
    // Wrapped in an async function so a synchronous failure (for example a
    // browser that throws on indexedDB.open) surfaces as a rejected promise
    // rather than a thrown call, and a retry can attempt a fresh open.
    dbPromise = (async () => {
      try {
        return await openDB<FranklinsGymDB>(DB_NAME, DB_VERSION, {
          upgrade(db, oldVersion) {
            // Fall-through by design: a store opened at an older version keeps
            // applying each later step in order.
            switch (oldVersion) {
              case 0: {
                const attempts = db.createObjectStore("attempts", { keyPath: "id" });
                attempts.createIndex("by-status", "status");
                attempts.createIndex("by-createdAt", "createdAt");
                db.createObjectStore("settings", { keyPath: "key" });
              }
              // case 1: next version's additive migration goes here.
            }
          },
        });
      } catch (error) {
        dbPromise = null;
        throw error;
      }
    })();
  }
  return dbPromise;
}

// Drops the memoized connection so the next openDb() reconnects. Used by the
// error-state retry and by tests to isolate cases.
export function resetDbConnection(): void {
  dbPromise = null;
}
