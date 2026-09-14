import { describe, expect, it } from "vitest";
import { totalWordCount, wordCount } from "./wordCount";

describe("wordCount", () => {
  it("counts words split on whitespace", () => {
    expect(wordCount("one two three")).toBe(3);
  });

  it("treats empty and whitespace-only strings as zero", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("   ")).toBe(0);
  });

  it("sums across sentences", () => {
    expect(totalWordCount(["one two", "three four five"])).toBe(5);
  });
});
