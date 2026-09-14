import { describe, expect, it } from "vitest";
import { attemptState, ripeLabel } from "./attempts";
import type { AttemptRecord } from "./db";
import { DEFAULT_DELAY, DELAY_PRESETS } from "./delays";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function record(overrides: Partial<AttemptRecord>): AttemptRecord {
  return {
    id: "a1",
    status: "condensing",
    createdAt: 0,
    passage: {
      originalPassageId: null,
      title: "Test",
      author: "",
      source: "",
      year: null,
      sentences: ["One.", "Two."],
      isCustom: true,
    },
    hints: ["", ""],
    cursor: 0,
    ...overrides,
  };
}

describe("attemptState", () => {
  it("is condensing while still condensing", () => {
    expect(attemptState(record({ status: "condensing" }), 1000)).toBe("condensing");
  });

  it("is vaulted before the ripe time", () => {
    const a = record({ status: "vaulted", vaultedUntil: 5000 });
    expect(attemptState(a, 4999)).toBe("vaulted");
  });

  it("is ripe at or after the ripe time", () => {
    const a = record({ status: "vaulted", vaultedUntil: 5000 });
    expect(attemptState(a, 5000)).toBe("ripe");
    expect(attemptState(a, 6000)).toBe("ripe");
  });
});

describe("ripeLabel", () => {
  const base = 1_000_000_000_000;

  it("says Ready once the time has passed", () => {
    expect(ripeLabel(base, base)).toBe("Ready");
    expect(ripeLabel(base, base + HOUR)).toBe("Ready");
  });

  it("counts down in minutes, hours, and days", () => {
    expect(ripeLabel(base + 15 * MINUTE, base)).toBe("Ripe in 15 minutes");
    expect(ripeLabel(base + 3 * HOUR, base)).toBe("Ripe in 3 hours");
    expect(ripeLabel(base + 2 * DAY, base)).toBe("Ripe in 2 days");
  });

  it("uses singular units at one", () => {
    expect(ripeLabel(base + 1 * MINUTE, base)).toBe("Ripe in 1 minute");
    expect(ripeLabel(base + 1 * DAY, base)).toBe("Ripe in 1 day");
  });

  it("falls back to a calendar date when far off", () => {
    const at = Date.UTC(2026, 8, 17, 12, 0, 0);
    const now = Date.UTC(2026, 7, 1, 12, 0, 0);
    const label = ripeLabel(at, now);
    expect(label.startsWith("Ripe on ")).toBe(true);
  });

  it("produces positive, dash-free strings", () => {
    const labels = [
      ripeLabel(base, base),
      ripeLabel(base + 15 * MINUTE, base),
      ripeLabel(base + 3 * DAY, base),
    ];
    for (const l of labels) {
      expect(l).not.toMatch(/[—–]/);
    }
  });
});

describe("delay presets", () => {
  it("defaults to standard and offers both presets", () => {
    expect(DEFAULT_DELAY).toBe("standard");
    expect(Object.keys(DELAY_PRESETS).sort()).toEqual(["micro", "standard"]);
    expect(DELAY_PRESETS.standard.ms).toBe(3 * DAY);
    expect(DELAY_PRESETS.micro.ms).toBe(15 * MINUTE);
  });
});
