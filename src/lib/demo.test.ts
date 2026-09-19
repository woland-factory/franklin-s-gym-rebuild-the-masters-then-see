import { describe, expect, it } from "vitest";
import { DEMO_ATTEMPT_ID, buildDemoAttempt } from "./demo";

const NOW = 1_700_000_000_000;

describe("buildDemoAttempt", () => {
  it("returns a reconstructed attempt with a real alignment carrying genuine gaps", () => {
    const demo = buildDemoAttempt(NOW);
    expect(demo.id).toBe(DEMO_ATTEMPT_ID);
    expect(demo.status).toBe("reconstructed");

    const pairs = demo.alignment?.pairs ?? [];
    expect(pairs.some((p) => p.matchType === "omission")).toBe(true);
    expect(pairs.some((p) => p.matchType === "addition")).toBe(true);
  });

  it("has a hint per sentence and a non-empty rebuild", () => {
    const demo = buildDemoAttempt(NOW);
    expect(demo.hints.length).toBe(demo.passage.sentences.length);
    expect(demo.reconstructionText && demo.reconstructionText.length).toBeGreaterThan(0);
    expect(demo.cursor).toBe(demo.passage.sentences.length);
  });

  it("sets finite timestamps with the wait in the past", () => {
    const demo = buildDemoAttempt(NOW);
    expect(Number.isFinite(demo.reconstructedAt)).toBe(true);
    expect(Number.isFinite(demo.vaultedAt)).toBe(true);
    expect(Number.isFinite(demo.vaultedUntil)).toBe(true);
    expect(demo.vaultedUntil as number).toBeLessThan(NOW);
    expect(demo.reconstructedAt).toBe(NOW);
  });

  it("is deterministic for a fixed now", () => {
    expect(buildDemoAttempt(NOW)).toEqual(buildDemoAttempt(NOW));
  });
});
