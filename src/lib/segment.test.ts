import { describe, expect, it } from "vitest";
import { MIN_SENTENCES, segmentSentences, segmentAndValidate } from "./segment";
import { MAX_SENTENCES, MAX_WORDS } from "../data/seedPassages.types";

describe("segmentSentences", () => {
  it("splits a multi-sentence paragraph and keeps terminators", () => {
    expect(segmentSentences("The sun rose. It was warm! Was it though?")).toEqual([
      "The sun rose.",
      "It was warm!",
      "Was it though?",
    ]);
  });

  it("keeps a closing quote or bracket attached to the sentence", () => {
    expect(segmentSentences('He said "go." She left. (It was over.)')).toEqual([
      'He said "go."',
      "She left.",
      "(It was over.)",
    ]);
  });

  it("does not split on the documented abbreviations", () => {
    expect(segmentSentences("Dr. Smith met Mr. Jones. They talked.")).toEqual([
      "Dr. Smith met Mr. Jones.",
      "They talked.",
    ]);
  });

  it("does not split inside a decimal number", () => {
    expect(segmentSentences("Pi is 3.14 here. That is enough.")).toEqual([
      "Pi is 3.14 here.",
      "That is enough.",
    ]);
  });

  it("collapses whitespace and splits paragraphs on newlines", () => {
    expect(segmentSentences("First line\n\nSecond   line\nThird line.")).toEqual([
      "First line",
      "Second line",
      "Third line.",
    ]);
  });

  it("drops empty fragments and returns nothing for blank input", () => {
    expect(segmentSentences("   \n  \n ")).toEqual([]);
  });
});

describe("segmentAndValidate", () => {
  it("accepts valid text and returns its sentences", () => {
    const result = segmentAndValidate("One clear thought. Then a second one.");
    expect(result).toEqual({
      ok: true,
      sentences: ["One clear thought.", "Then a second one."],
    });
  });

  it("rejects fewer than the minimum sentences with the count", () => {
    const result = segmentAndValidate("Only one sentence here.");
    expect(result).toEqual({ ok: false, reason: "too-short", count: 1 });
    expect(MIN_SENTENCES).toBe(2);
  });

  it("rejects too many sentences with the count", () => {
    const text = Array.from({ length: MAX_SENTENCES + 6 }, (_, i) => `S${i}.`).join(" ");
    const result = segmentAndValidate(text);
    expect(result).toEqual({
      ok: false,
      reason: "too-many-sentences",
      count: MAX_SENTENCES + 6,
    });
  });

  it("rejects too many words with the count", () => {
    const words = Array.from({ length: MAX_WORDS + 12 }, () => "word").join(" ");
    const text = `${words}. And a short close here.`;
    const result = segmentAndValidate(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("too-long");
      expect(result.count).toBeGreaterThan(MAX_WORDS);
    }
  });

  it("checks too-short before too-many and too-long", () => {
    // A single very long sentence is too-short, not too-long.
    const oneLong = Array.from({ length: MAX_WORDS + 50 }, () => "word").join(" ") + ".";
    const result = segmentAndValidate(oneLong);
    expect(result).toMatchObject({ ok: false, reason: "too-short" });
  });
});
