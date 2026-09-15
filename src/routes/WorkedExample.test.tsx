import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WorkedExample } from "./WorkedExample";
import { getWorkedExample } from "../data/workedExample";

// No fake-indexeddb setup here on purpose: the worked example must render
// without touching the database at all.

function renderExample() {
  return render(
    <MemoryRouter initialEntries={["/example"]}>
      <WorkedExample />
    </MemoryRouter>,
  );
}

describe("worked example", () => {
  it("computes an alignment with all three gap types from the fixed demo", () => {
    const { alignment } = getWorkedExample();
    const types = alignment.pairs.map((p) => p.matchType);
    expect(types).toContain("matched");
    expect(types).toContain("omission");
    expect(types).toContain("addition");
    // A matched pair carries genuine within-sentence marks, so the demo shows
    // real findings, never a blank result.
    const matched = alignment.pairs.filter((p) => p.matchType === "matched");
    expect(
      matched.some((p) => p.originalSpans?.some((s) => s.kind === "onlyInOriginal")),
    ).toBe(true);
    expect(matched.some((p) => p.yourSpans?.some((s) => s.kind === "onlyInYours"))).toBe(
      true,
    );
    // One flattened pair shows a large neutral length gap.
    expect(matched.some((p) => p.lengthDelta < -10)).toBe(true);
  });

  it("renders a populated alignment with the legend and both single-side blocks", () => {
    renderExample();
    expect(screen.getByText("A sample rebuild, aligned against the original.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /travels with a donkey/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("In the original")).toBeInTheDocument();
    expect(screen.getByText("In yours")).toBeInTheDocument();
    expect(screen.getByText("Only in the original")).toBeInTheDocument();
    expect(screen.getByText("Only in yours")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse passages/i })).toHaveAttribute(
      "href",
      "/library",
    );
    expect(screen.getByRole("link", { name: /back to your attempts/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("is deterministic across renders", () => {
    const first = JSON.stringify(getWorkedExample());
    const second = JSON.stringify(getWorkedExample());
    expect(second).toBe(first);
  });
});
