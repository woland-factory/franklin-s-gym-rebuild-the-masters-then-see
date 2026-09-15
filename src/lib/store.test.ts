import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { resetDbConnection } from "./db";
import type { PassageSnapshot } from "./db";
import {
  createAttempt,
  getAttempt,
  listAttempts,
  saveHint,
  saveReconstruction,
  vaultAttempt,
} from "./store";
import { DELAY_PRESETS } from "./delays";
import { alignSentences } from "./align";

// A fresh in-memory factory per test isolates each case from prior state.
beforeEach(() => {
  resetDbConnection();
  globalThis.indexedDB = new IDBFactory();
});

const passage: PassageSnapshot = {
  originalPassageId: "seed-1",
  title: "Walden",
  author: "Henry David Thoreau",
  source: "Project Gutenberg",
  year: 1854,
  sentences: ["First sentence.", "Second sentence.", "Third sentence."],
  isCustom: false,
};

describe("createAttempt", () => {
  it("stores a condensing record sized to the passage", async () => {
    const created = await createAttempt(passage, 1000);
    expect(created.status).toBe("condensing");
    expect(created.createdAt).toBe(1000);
    expect(created.cursor).toBe(0);
    expect(created.hints).toEqual(["", "", ""]);

    const loaded = await getAttempt(created.id);
    expect(loaded).toEqual(created);
  });
});

describe("saveHint", () => {
  it("writes the hint at the index and advances the cursor", async () => {
    const created = await createAttempt(passage, 1000);
    await saveHint(created.id, 0, "sunrise");
    await saveHint(created.id, 1, "warmth");

    const loaded = await getAttempt(created.id);
    expect(loaded?.hints).toEqual(["sunrise", "warmth", ""]);
    expect(loaded?.cursor).toBe(2);
  });

  it("does not move the cursor backward", async () => {
    const created = await createAttempt(passage, 1000);
    await saveHint(created.id, 2, "close");
    await saveHint(created.id, 0, "open");

    const loaded = await getAttempt(created.id);
    expect(loaded?.cursor).toBe(3);
    expect(loaded?.hints).toEqual(["open", "", "close"]);
  });

  it("is a no-op for an unknown attempt", async () => {
    await expect(saveHint("missing", 0, "x")).resolves.toBeUndefined();
  });
});

describe("vaultAttempt", () => {
  it("sets the vault fields from the chosen preset", async () => {
    const created = await createAttempt(passage, 1000);
    const vaulted = await vaultAttempt(created.id, "standard", 5000);
    expect(vaulted.status).toBe("vaulted");
    expect(vaulted.delayType).toBe("standard");
    expect(vaulted.vaultedAt).toBe(5000);
    expect(vaulted.vaultedUntil).toBe(5000 + DELAY_PRESETS.standard.ms);
  });
});

describe("saveReconstruction", () => {
  it("sets the terminal status, the rebuild text, the timestamp, and the alignment", async () => {
    const created = await createAttempt(passage, 1000);
    await vaultAttempt(created.id, "micro", 2000);
    const alignment = alignSentences(passage.sentences, ["First sentence."]);

    const saved = await saveReconstruction(created.id, "First sentence.", alignment, 9000);
    expect(saved.status).toBe("reconstructed");
    expect(saved.reconstructionText).toBe("First sentence.");
    expect(saved.reconstructedAt).toBe(9000);
    expect(saved.alignment).toEqual(alignment);
  });

  it("survives a fresh connection, ready for the ledger", async () => {
    const created = await createAttempt(passage, 1000);
    await vaultAttempt(created.id, "micro", 2000);
    const alignment = alignSentences(passage.sentences, ["First sentence."]);
    await saveReconstruction(created.id, "First sentence.", alignment, 9000);

    resetDbConnection();

    const loaded = await getAttempt(created.id);
    expect(loaded?.status).toBe("reconstructed");
    expect(loaded?.reconstructedAt).toBe(9000);
    expect(loaded?.alignment).toEqual(alignment);
  });

  it("throws for an unknown attempt", async () => {
    const alignment = alignSentences(["A."], ["A."]);
    await expect(saveReconstruction("missing", "A.", alignment, 1)).rejects.toThrow();
  });
});

describe("persistence across reopen", () => {
  it("keeps attempts after a fresh connection", async () => {
    const created = await createAttempt(passage, 1000);
    await saveHint(created.id, 0, "sunrise");
    await vaultAttempt(created.id, "micro", 2000);

    // Simulate a reload: drop the memoized connection but keep the data.
    resetDbConnection();

    const all = await listAttempts();
    expect(all).toHaveLength(1);
    expect(all[0].hints[0]).toBe("sunrise");
    expect(all[0].status).toBe("vaulted");
    expect(all[0].vaultedUntil).toBe(2000 + DELAY_PRESETS.micro.ms);
  });
});
