import { describe, expect, it } from "vitest";
import type { AttemptRecord, PassageSnapshot } from "./db";
import { DELAY_PRESETS } from "./delays";
import { seedPassages } from "../data/seedPassages";
import {
  MICRO_DRILL_PASSAGE_ID,
  WARMUP_PASSAGE_ID,
  STEP_NOTE,
  STEP_WARMUP,
  STEP_REBUILD,
  firstRunView,
  hasCompletedAttempt,
  showPipelineNudge,
} from "./firstRun";

const NOW = 1_000_000;

function passage(overrides: Partial<PassageSnapshot> = {}): PassageSnapshot {
  return {
    originalPassageId: "seed-1",
    title: "Walden",
    author: "Henry David Thoreau",
    source: "Project Gutenberg",
    year: 1854,
    sentences: ["One.", "Two."],
    isCustom: false,
    ...overrides,
  };
}

function attempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    id: "a1",
    status: "condensing",
    createdAt: NOW,
    passage: passage(),
    hints: ["", ""],
    cursor: 0,
    ...overrides,
  };
}

describe("hasCompletedAttempt", () => {
  it("is true iff some attempt is reconstructed", () => {
    expect(hasCompletedAttempt([])).toBe(false);
    expect(hasCompletedAttempt([attempt({ status: "condensing" })])).toBe(false);
    expect(hasCompletedAttempt([attempt({ status: "vaulted" })])).toBe(false);
    expect(hasCompletedAttempt([attempt({ status: "reconstructed" })])).toBe(true);
  });
});

describe("firstRunView", () => {
  it("is hidden when dismissed", () => {
    const view = firstRunView({ attempts: [], microDrillId: undefined, dismissed: true, now: NOW });
    expect(view.kind).toBe("hidden");
  });

  it("is hidden when any attempt is reconstructed", () => {
    const view = firstRunView({
      attempts: [attempt({ status: "reconstructed" })],
      microDrillId: "a1",
      dismissed: false,
      now: NOW,
    });
    expect(view.kind).toBe("hidden");
  });

  it("is start with no tracked attempt", () => {
    const view = firstRunView({ attempts: [], microDrillId: undefined, dismissed: false, now: NOW });
    expect(view.kind).toBe("start");
    if (view.kind !== "start") throw new Error("expected start");
    expect(view.steps.map((s) => s.label)).toEqual([STEP_NOTE, STEP_WARMUP, STEP_REBUILD]);
    expect(view.steps.map((s) => s.state)).toEqual(["active", "todo", "todo"]);
  });

  it("tracks the microDrillId attempt while condensing", () => {
    const view = firstRunView({
      attempts: [attempt({ id: "a1", status: "condensing" })],
      microDrillId: "a1",
      dismissed: false,
      now: NOW,
    });
    expect(view.kind).toBe("condensing");
    if (view.kind !== "condensing") throw new Error("expected condensing");
    expect(view.attemptId).toBe("a1");
    expect(view.steps.map((s) => s.state)).toEqual(["active", "todo", "todo"]);
  });

  it("shows a warm-up while a micro-delay attempt waits", () => {
    const view = firstRunView({
      attempts: [
        attempt({
          id: "a1",
          status: "vaulted",
          delayType: "micro",
          vaultedAt: NOW,
          vaultedUntil: NOW + DELAY_PRESETS.micro.ms,
        }),
      ],
      microDrillId: "a1",
      dismissed: false,
      now: NOW,
    });
    expect(view.kind).toBe("waiting");
    if (view.kind !== "waiting") throw new Error("expected waiting");
    expect(view.warmup).toBe(true);
    expect(view.steps.map((s) => s.state)).toEqual(["done", "active", "todo"]);
  });

  it("shows no warm-up for a standard-delay waiting attempt", () => {
    const view = firstRunView({
      attempts: [
        attempt({
          id: "a1",
          status: "vaulted",
          delayType: "standard",
          vaultedAt: NOW,
          vaultedUntil: NOW + DELAY_PRESETS.standard.ms,
        }),
      ],
      microDrillId: "a1",
      dismissed: false,
      now: NOW,
    });
    expect(view.kind).toBe("waiting");
    if (view.kind !== "waiting") throw new Error("expected waiting");
    expect(view.warmup).toBe(false);
  });

  it("is ripe once the vault opens", () => {
    const view = firstRunView({
      attempts: [
        attempt({
          id: "a1",
          status: "vaulted",
          delayType: "micro",
          vaultedAt: NOW - DELAY_PRESETS.micro.ms,
          vaultedUntil: NOW - 1,
        }),
      ],
      microDrillId: "a1",
      dismissed: false,
      now: NOW,
    });
    expect(view.kind).toBe("ripe");
    if (view.kind !== "ripe") throw new Error("expected ripe");
    expect(view.steps.map((s) => s.state)).toEqual(["done", "done", "active"]);
  });

  it("falls back to the most recent non-reconstructed attempt when microDrillId is unset", () => {
    const older = attempt({ id: "old", status: "condensing", createdAt: NOW - 1000 });
    const newer = attempt({ id: "new", status: "condensing", createdAt: NOW });
    const view = firstRunView({
      attempts: [older, newer],
      microDrillId: undefined,
      dismissed: false,
      now: NOW,
    });
    expect(view.kind).toBe("condensing");
    if (view.kind !== "condensing") throw new Error("expected condensing");
    expect(view.attemptId).toBe("new");
  });

  it("is deterministic for identical input", () => {
    const input = {
      attempts: [attempt({ id: "a1", status: "condensing" })],
      microDrillId: "a1",
      dismissed: false,
      now: NOW,
    };
    expect(firstRunView(input)).toEqual(firstRunView(input));
  });
});

describe("showPipelineNudge", () => {
  it("shows only with an attempt and active first-run", () => {
    expect(showPipelineNudge([], false)).toBe(false);
    expect(showPipelineNudge([attempt()], false)).toBe(true);
    expect(showPipelineNudge([attempt()], true)).toBe(false);
    expect(showPipelineNudge([attempt({ status: "reconstructed" })], false)).toBe(false);
  });
});

describe("first-run seed constants", () => {
  it("point at two distinct short seeds", () => {
    const drill = seedPassages.find((p) => p.id === MICRO_DRILL_PASSAGE_ID);
    const warmup = seedPassages.find((p) => p.id === WARMUP_PASSAGE_ID);
    expect(drill).toBeDefined();
    expect(warmup).toBeDefined();
    expect(MICRO_DRILL_PASSAGE_ID).not.toBe(WARMUP_PASSAGE_ID);
    expect(drill?.lengthBand).toBe("short");
    expect(warmup?.lengthBand).toBe("short");
  });
});
