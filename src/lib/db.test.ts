import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { openDb, resetDbConnection } from "./db";

// A fresh in-memory factory per test keeps each case isolated: no leftover
// connections, no cross-run migration state.
beforeEach(() => {
  resetDbConnection();
  globalThis.indexedDB = new IDBFactory();
});

describe("openDb", () => {
  it("creates the attempts and settings stores at version 1", async () => {
    const db = await openDb();
    expect(db.version).toBe(1);
    expect(Array.from(db.objectStoreNames).sort()).toEqual(["attempts", "settings"]);
  });

  it("creates the attempts indexes", async () => {
    const db = await openDb();
    const tx = db.transaction("attempts");
    const indexNames = Array.from(tx.store.indexNames).sort();
    expect(indexNames).toEqual(["by-createdAt", "by-status"]);
  });

  it("returns the same connection on repeated calls", async () => {
    const a = await openDb();
    const b = await openDb();
    expect(a).toBe(b);
  });

  it("rejects when IndexedDB is unavailable", async () => {
    resetDbConnection();
    // Simulate a locked-down browser where opening throws.
    globalThis.indexedDB = {
      open: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    } as unknown as IDBFactory;
    await expect(openDb()).rejects.toBeTruthy();
  });
});
