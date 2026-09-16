import { describe, expect, it } from "vitest";
import { fidelityMetrics } from "./metrics";
import type { Alignment, AlignmentPair, MatchType } from "./db";

function pair(matchType: MatchType): AlignmentPair {
  return {
    matchType,
    original: matchType === "addition" ? null : "An original sentence.",
    your: matchType === "omission" ? null : "Your sentence.",
    originalSpans: null,
    yourSpans: null,
    originalWords: 0,
    yourWords: 0,
    lengthDelta: 0,
    similarity: 0,
  };
}

function alignment(types: MatchType[]): Alignment {
  return { version: 1, pairs: types.map(pair) };
}

describe("fidelityMetrics", () => {
  it("derives both metrics from a mixed alignment", () => {
    const m = fidelityMetrics(alignment(["matched", "matched", "omission", "addition"]));
    expect(m.originalSentences).toBe(3);
    expect(m.recoveredSentences).toBe(2);
    expect(m.recoveredShare).toBeCloseTo(2 / 3);
    expect(m.yourSentences).toBe(3);
    expect(m.sentenceDelta).toBe(0);
  });

  it("returns share 0 for an all-omissions alignment", () => {
    const m = fidelityMetrics(alignment(["omission", "omission"]));
    expect(m.recoveredShare).toBe(0);
    expect(m.recoveredSentences).toBe(0);
    expect(m.originalSentences).toBe(2);
    expect(m.sentenceDelta).toBe(-2);
  });

  it("returns all zeros and no NaN for an empty alignment", () => {
    const m = fidelityMetrics(alignment([]));
    expect(m.originalSentences).toBe(0);
    expect(m.recoveredSentences).toBe(0);
    expect(m.recoveredShare).toBe(0);
    expect(m.yourSentences).toBe(0);
    expect(m.sentenceDelta).toBe(0);
    expect(Number.isNaN(m.recoveredShare)).toBe(false);
  });

  it("counts a longer rebuild as a positive delta", () => {
    const m = fidelityMetrics(alignment(["matched", "addition", "addition"]));
    expect(m.sentenceDelta).toBe(2);
    expect(m.yourSentences).toBe(3);
    expect(m.originalSentences).toBe(1);
  });

  it("is deterministic for the same input", () => {
    const a = alignment(["matched", "omission", "addition"]);
    expect(fidelityMetrics(a)).toEqual(fidelityMetrics(a));
  });
});
