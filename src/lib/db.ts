import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export const DB_NAME = "franklins-gym";
export const DB_VERSION = 1;

// Attempt records are written by later stages of the loop. The store exists from
// v1 so future schema versions extend it forward without rewriting v1 data.
export interface AttemptRecord {
  id: string;
  status: string;
  createdAt: number;
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
