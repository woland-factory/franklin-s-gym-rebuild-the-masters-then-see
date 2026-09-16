import { describe, expect, it } from "vitest";
import {
  buildExport,
  EXPORT_FORMAT,
  EXPORT_VERSION,
  IMPORT_MAX_ATTEMPTS,
  parseExport,
} from "./transfer";
import type { AttemptRecord } from "./db";
import { alignSentences } from "./align";

function condensing(): AttemptRecord {
  return {
    id: "c1",
    status: "condensing",
    createdAt: 1000,
    passage: {
      originalPassageId: "seed-1",
      title: "Walden",
      author: "Henry David Thoreau",
      source: "Project Gutenberg",
      year: 1854,
      sentences: ["One.", "Two."],
      isCustom: false,
    },
    hints: ["a", ""],
    cursor: 1,
  };
}

function vaulted(): AttemptRecord {
  return {
    ...condensing(),
    id: "v1",
    status: "vaulted",
    delayType: "micro",
    vaultedAt: 2000,
    vaultedUntil: 5000,
    hints: ["a", "b"],
    cursor: 2,
  };
}

function reconstructed(): AttemptRecord {
  const sentences = ["One.", "Two."];
  return {
    ...vaulted(),
    id: "r1",
    status: "reconstructed",
    reconstructionText: "One.",
    reconstructedAt: 9000,
    alignment: alignSentences(sentences, ["One."]),
  };
}

describe("buildExport", () => {
  it("produces pretty-printed JSON carrying the format, version, and every attempt", () => {
    const rows = [condensing(), reconstructed()];
    const text = buildExport(rows, 12345);
    expect(text).toContain("\n  ");
    const parsed = JSON.parse(text);
    expect(parsed.format).toBe(EXPORT_FORMAT);
    expect(parsed.version).toBe(EXPORT_VERSION);
    expect(parsed.exportedAt).toBe(12345);
    expect(parsed.attempts).toHaveLength(2);
    expect(parsed.attempts[1].alignment).toBeDefined();
  });
});

describe("parseExport round trip", () => {
  it("returns records deeply equal to the originals", () => {
    const rows = [condensing(), vaulted(), reconstructed()];
    const result = parseExport(buildExport(rows, 1));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.attempts).toEqual(rows);
  });

  it("preserves unknown extra fields through the round trip", () => {
    const row = { ...condensing(), futureField: { nested: true } } as unknown as AttemptRecord;
    const result = parseExport(buildExport([row], 1));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect((result.attempts[0] as Record<string, unknown>).futureField).toEqual({
        nested: true,
      });
    }
  });
});

describe("parseExport validation", () => {
  it("rejects non-JSON as unreadable", () => {
    expect(parseExport("{not json")).toEqual({ ok: false, reason: "unreadable" });
  });

  it("rejects a wrong format", () => {
    const text = JSON.stringify({ format: "other", version: 1, exportedAt: 0, attempts: [] });
    expect(parseExport(text)).toEqual({ ok: false, reason: "wrong-format" });
  });

  it("rejects a wrong version", () => {
    const text = JSON.stringify({ format: EXPORT_FORMAT, version: 2, exportedAt: 0, attempts: [] });
    expect(parseExport(text)).toEqual({ ok: false, reason: "wrong-format" });
  });

  it("rejects a non-array attempts field", () => {
    const text = JSON.stringify({ format: EXPORT_FORMAT, version: 1, exportedAt: 0, attempts: {} });
    expect(parseExport(text)).toEqual({ ok: false, reason: "wrong-format" });
  });

  it("rejects an over-cap attempts array before parsing rows", () => {
    const attempts = Array.from({ length: IMPORT_MAX_ATTEMPTS + 1 }, () => ({}));
    const text = JSON.stringify({ format: EXPORT_FORMAT, version: 1, exportedAt: 0, attempts });
    expect(parseExport(text)).toEqual({ ok: false, reason: "too-large" });
  });

  it("rejects a reconstructed record missing its alignment", () => {
    const bad = reconstructed();
    delete bad.alignment;
    expect(parseExport(buildExport([bad], 1))).toEqual({ ok: false, reason: "bad-record" });
  });

  it("rejects a vaulted record missing vaultedUntil", () => {
    const bad = vaulted();
    delete bad.vaultedUntil;
    expect(parseExport(buildExport([bad], 1))).toEqual({ ok: false, reason: "bad-record" });
  });

  it("rejects a record whose hints length differs from the sentence count", () => {
    const bad = condensing();
    bad.hints = ["only-one"];
    expect(parseExport(buildExport([bad], 1))).toEqual({ ok: false, reason: "bad-record" });
  });

  it("rejects a record with an unknown status", () => {
    const bad = { ...condensing(), status: "archived" } as unknown as AttemptRecord;
    expect(parseExport(buildExport([bad], 1))).toEqual({ ok: false, reason: "bad-record" });
  });
});
