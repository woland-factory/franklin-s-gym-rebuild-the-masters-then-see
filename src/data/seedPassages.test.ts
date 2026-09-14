import { describe, expect, it } from "vitest";
import { seedPassages } from "./seedPassages";
import { BAND_SENTENCE_RANGE, MAX_SENTENCES, MAX_WORDS } from "./seedPassages.types";
import { totalWordCount } from "../lib/wordCount";

describe("seed passage library invariants", () => {
  it("holds at least 12 passages", () => {
    expect(seedPassages.length).toBeGreaterThanOrEqual(12);
  });

  it("holds at least 3 short passages", () => {
    const short = seedPassages.filter((p) => p.lengthBand === "short");
    expect(short.length).toBeGreaterThanOrEqual(3);
  });

  it("gives every passage a unique id", () => {
    const ids = seedPassages.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(seedPassages)("$id has complete, valid metadata", (passage) => {
    expect(passage.title.trim()).not.toBe("");
    expect(passage.author.trim()).not.toBe("");
    expect(passage.source.trim()).not.toBe("");
    expect(passage.year).toBeLessThan(1930);
    expect(passage.isCustom).toBe(false);
  });

  it.each(seedPassages)("$id has at least 2 non-empty sentences", (passage) => {
    expect(passage.sentences.length).toBeGreaterThanOrEqual(2);
    for (const sentence of passage.sentences) {
      expect(sentence.trim().length).toBeGreaterThan(0);
    }
  });

  it.each(seedPassages)("$id sentence count fits its declared band", (passage) => {
    const range = BAND_SENTENCE_RANGE[passage.lengthBand];
    expect(passage.sentences.length).toBeGreaterThanOrEqual(range.min);
    expect(passage.sentences.length).toBeLessThanOrEqual(range.max);
  });

  it.each(seedPassages)("$id stays within the length cap", (passage) => {
    expect(passage.sentences.length).toBeLessThanOrEqual(MAX_SENTENCES);
    expect(totalWordCount(passage.sentences)).toBeLessThanOrEqual(MAX_WORDS);
  });
});
