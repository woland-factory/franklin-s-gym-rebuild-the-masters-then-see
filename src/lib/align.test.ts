import { describe, expect, it } from "vitest";
import { alignSentences, MATCH_THRESHOLD } from "./align";

describe("alignSentences", () => {
  it("pairs similar sentences, in reading order", () => {
    const original = ["The sun rose over the hill.", "Birds sang in the trees."];
    const your = ["The sun rose over the hill.", "Birds sang in the trees."];
    const { pairs } = alignSentences(original, your);

    expect(pairs).toHaveLength(2);
    expect(pairs[0].matchType).toBe("matched");
    expect(pairs[0].original).toBe(original[0]);
    expect(pairs[0].your).toBe(your[0]);
    expect(pairs[1].matchType).toBe("matched");
    expect(pairs[0].similarity).toBeCloseTo(1);
    expect(pairs[0].originalSpans?.every((s) => s.kind === "same")).toBe(true);
    expect(pairs[0].yourSpans?.every((s) => s.kind === "same")).toBe(true);
  });

  it("emits omissions for original-only sentences and additions for rebuild-only ones", () => {
    const original = [
      "The sun rose over the hill.",
      "A completely different sentence about seafaring ships.",
      "Birds sang in the trees.",
    ];
    const your = [
      "The sun rose over the hill.",
      "Birds sang in the trees.",
      "My own brand-new closing thought.",
    ];
    const { pairs } = alignSentences(original, your);

    expect(pairs.map((p) => p.matchType)).toEqual([
      "matched",
      "omission",
      "matched",
      "addition",
    ]);
    const omission = pairs[1];
    expect(omission.original).toBe(original[1]);
    expect(omission.your).toBeNull();
    expect(omission.originalSpans).toBeNull();
    expect(omission.similarity).toBe(0);
    expect(omission.originalWords).toBe(7);
    expect(omission.lengthDelta).toBe(-7);

    const addition = pairs[3];
    expect(addition.original).toBeNull();
    expect(addition.your).toBe(your[2]);
    expect(addition.yourWords).toBe(5);
    expect(addition.lengthDelta).toBe(5);
  });

  it("marks within-sentence differences on both sides of a matched pair", () => {
    const original = ["The quick brown fox jumps high."];
    const your = ["The quick red fox leaps high."];
    const { pairs } = alignSentences(original, your);

    expect(pairs).toHaveLength(1);
    const [pair] = pairs;
    expect(pair.matchType).toBe("matched");
    expect(pair.originalSpans).toEqual([
      { text: "The", kind: "same" },
      { text: "quick", kind: "same" },
      { text: "brown", kind: "onlyInOriginal" },
      { text: "fox", kind: "same" },
      { text: "jumps", kind: "onlyInOriginal" },
      { text: "high.", kind: "same" },
    ]);
    expect(pair.yourSpans).toEqual([
      { text: "The", kind: "same" },
      { text: "quick", kind: "same" },
      { text: "red", kind: "onlyInYours" },
      { text: "fox", kind: "same" },
      { text: "leaps", kind: "onlyInYours" },
      { text: "high.", kind: "same" },
    ]);
  });

  it("reports the per-pair length comparison as a signed word delta", () => {
    const original = ["The storm broke over the wide gray sea at dawn."];
    const your = ["The storm broke at dawn."];
    const { pairs } = alignSentences(original, your);
    expect(pairs[0].matchType).toBe("matched");
    expect(pairs[0].originalWords).toBe(10);
    expect(pairs[0].yourWords).toBe(5);
    expect(pairs[0].lengthDelta).toBe(-5);
  });

  it("normalizes tokens: case and edge punctuation ignored, apostrophes kept", () => {
    const original = ["I travel for travel's sake."];
    const your = ["i TRAVEL for travel's sake"];
    const { pairs } = alignSentences(original, your);
    expect(pairs[0].matchType).toBe("matched");
    expect(pairs[0].similarity).toBeCloseTo(1);
    expect(pairs[0].originalSpans?.every((s) => s.kind === "same")).toBe(true);
  });

  it("matches at the threshold and splits just below it", () => {
    // Ten tokens a side sharing exactly k in order: dice = lcsSim = 2k / 20.
    const shared = ["alpha", "beta", "gamma"];
    const filler = (prefix: string, n: number) =>
      Array.from({ length: n }, (_, i) => `${prefix}${i}`);

    // k = 3: similarity 0.3, exactly MATCH_THRESHOLD, so the pair matches.
    const atOriginal = [...shared, ...filler("orig", 7)].join(" ") + ".";
    const atYour = [...shared, ...filler("mine", 7)].join(" ") + ".";
    const at = alignSentences([atOriginal], [atYour]);
    expect(at.pairs.map((p) => p.matchType)).toEqual(["matched"]);
    expect(at.pairs[0].similarity).toBeCloseTo(MATCH_THRESHOLD);

    // k = 2: similarity 0.2, below the threshold, so it splits.
    const belowOriginal = [...shared.slice(0, 2), ...filler("orig", 8)].join(" ") + ".";
    const belowYour = [...shared.slice(0, 2), ...filler("mine", 8)].join(" ") + ".";
    const below = alignSentences([belowOriginal], [belowYour]);
    expect(below.pairs.map((p) => p.matchType).sort()).toEqual(["addition", "omission"]);
  });

  it("blends order-insensitive overlap with order-sensitive LCS", () => {
    // Same vocabulary, reversed order: dice 1, LCS only 1 of 4.
    const original = ["alpha beta gamma delta."];
    const your = ["delta gamma beta alpha."];
    const { pairs } = alignSentences(original, your);
    expect(pairs[0].matchType).toBe("matched");
    expect(pairs[0].similarity).toBeCloseTo(0.5 * 1 + 0.5 * (2 * 1) / 8);
  });

  it("is deterministic: the same input always yields identical output", () => {
    const original = [
      "For my part, I travel not to go anywhere, but to go.",
      "I travel for travel's sake.",
      "The great affair is to move.",
    ];
    const your = [
      "I travel not to arrive somewhere, but simply to go.",
      "The great thing is to move.",
      "Travel teaches you about yourself.",
    ];
    const first = alignSentences(original, your);
    const second = alignSentences(original, your);
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("turns an empty rebuild into omissions only, without crashing", () => {
    const original = ["One sentence.", "Two sentences."];
    const { pairs } = alignSentences(original, []);
    expect(pairs.map((p) => p.matchType)).toEqual(["omission", "omission"]);
    expect(pairs[0].original).toBe("One sentence.");
  });

  it("turns an empty original into additions only", () => {
    const { pairs } = alignSentences([], ["Only mine."]);
    expect(pairs.map((p) => p.matchType)).toEqual(["addition"]);
  });

  it("returns zero similarity, never NaN, when a sentence has no content tokens", () => {
    const { pairs } = alignSentences(["..."], ["Real words here."]);
    for (const p of pairs) {
      expect(Number.isNaN(p.similarity)).toBe(false);
      expect(p.similarity).toBe(0);
    }
    expect(pairs.map((p) => p.matchType).sort()).toEqual(["addition", "omission"]);
  });
});
