import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlignmentView } from "./AlignmentView";
import type { Alignment } from "../lib/db";

const alignment: Alignment = {
  version: 1,
  pairs: [
    {
      matchType: "matched",
      original: "The quick brown fox jumps.",
      your: "The quick red fox jumps.",
      originalSpans: [
        { text: "The", kind: "same" },
        { text: "quick", kind: "same" },
        { text: "brown", kind: "onlyInOriginal" },
        { text: "fox", kind: "same" },
        { text: "jumps.", kind: "same" },
      ],
      yourSpans: [
        { text: "The", kind: "same" },
        { text: "quick", kind: "same" },
        { text: "red", kind: "onlyInYours" },
        { text: "fox", kind: "same" },
        { text: "jumps.", kind: "same" },
      ],
      originalWords: 5,
      yourWords: 5,
      lengthDelta: 0,
      similarity: 0.8,
    },
    {
      matchType: "omission",
      original: "A sentence you left out.",
      your: null,
      originalSpans: null,
      yourSpans: null,
      originalWords: 5,
      yourWords: 0,
      lengthDelta: -5,
      similarity: 0,
    },
    {
      matchType: "addition",
      original: null,
      your: "A sentence of your own.",
      originalSpans: null,
      yourSpans: null,
      originalWords: 0,
      yourWords: 5,
      lengthDelta: 5,
      similarity: 0,
    },
    {
      matchType: "matched",
      original: "Long one here now.",
      your: "Short.",
      originalSpans: [
        { text: "Long", kind: "onlyInOriginal" },
        { text: "one", kind: "onlyInOriginal" },
        { text: "here", kind: "onlyInOriginal" },
        { text: "now.", kind: "onlyInOriginal" },
      ],
      yourSpans: [{ text: "Short.", kind: "onlyInYours" }],
      originalWords: 4,
      yourWords: 1,
      lengthDelta: -3,
      similarity: 0.4,
    },
  ],
};

function renderView() {
  return render(<AlignmentView title="Walden" author="Henry David Thoreau" alignment={alignment} />);
}

describe("AlignmentView", () => {
  it("renders the passage header and the two-swatch legend", () => {
    renderView();
    expect(screen.getByRole("heading", { name: "Walden" })).toBeInTheDocument();
    expect(screen.getByText("Henry David Thoreau")).toBeInTheDocument();
    expect(screen.getByText("In the original")).toBeInTheDocument();
    expect(screen.getByText("In yours")).toBeInTheDocument();
  });

  it("marks within-sentence differences on each side of a matched pair", () => {
    renderView();
    const brown = screen.getByText("brown");
    expect(brown.tagName).toBe("MARK");
    const red = screen.getByText("red");
    expect(red.tagName).toBe("MARK");
    // Shared words render as plain text, not marks.
    expect(screen.queryByText("fox")?.tagName).not.toBe("MARK");
  });

  it("renders omissions and additions as single-side blocks with neutral captions", () => {
    renderView();
    expect(screen.getByText("Only in the original")).toBeInTheDocument();
    expect(screen.getByText("A sentence you left out.").tagName).toBe("MARK");
    expect(screen.getByText("Only in yours")).toBeInTheDocument();
    expect(screen.getByText("A sentence of your own.").tagName).toBe("MARK");
  });

  it("shows a neutral length line per matched pair", () => {
    renderView();
    expect(screen.getByText("Same length")).toBeInTheDocument();
    expect(screen.getByText("3 words shorter")).toBeInTheDocument();
  });

  it("never claims one version is better", () => {
    const { container } = renderView();
    expect(container.textContent).not.toMatch(
      /\b(better|worse|wrong|right|missed|failed|lost|score|grade)\b/i,
    );
  });

  it("distinguishes each side with a non-color hook on the marks", () => {
    renderView();
    // A word marked on the original side and one on yours carry a stable,
    // non-color side hook, so the two are told apart without relying on hue.
    expect(screen.getByText("brown").closest("mark")).toHaveAttribute("data-side", "original");
    expect(screen.getByText("red").closest("mark")).toHaveAttribute("data-side", "yours");
    // The single-side blocks carry the same per-side hook.
    expect(screen.getByText("A sentence you left out.")).toHaveAttribute("data-side", "original");
    expect(screen.getByText("A sentence of your own.")).toHaveAttribute("data-side", "yours");
  });

  it("exposes the same per-side hook on the legend keys", () => {
    const { container } = renderView();
    const sides = Array.from(container.querySelectorAll("[aria-label='What the marks mean'] [data-side]"))
      .map((el) => el.getAttribute("data-side"));
    expect(sides).toEqual(["original", "yours"]);
  });
});
