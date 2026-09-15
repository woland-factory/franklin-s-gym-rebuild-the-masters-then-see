import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { Align } from "./Align";
import { resetDbConnection, type PassageSnapshot } from "../lib/db";
import { createAttempt, saveReconstruction, vaultAttempt } from "../lib/store";
import { alignSentences } from "../lib/align";
import { segmentSentences } from "../lib/segment";

beforeEach(() => {
  resetDbConnection();
  globalThis.indexedDB = new IDBFactory();
});

const passage: PassageSnapshot = {
  originalPassageId: "seed-1",
  title: "Walden",
  author: "Henry David Thoreau",
  source: "Project Gutenberg",
  year: 1854,
  sentences: ["I went to the woods to live deliberately.", "The pond was still at dawn."],
  isCustom: false,
};

function renderAlign(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/align/${id}`]}>
      <Routes>
        <Route path="/align/:attemptId" element={<Align />} />
        <Route path="/reconstruct/:attemptId" element={<div>Reconstruct screen</div>} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Align", () => {
  it("renders the saved alignment: original beside the rebuild, marks, legend, length line", async () => {
    const created = await createAttempt(passage, 1000);
    await vaultAttempt(created.id, "micro", 0);
    const rebuildText = "I went to the forest to live deliberately. My own extra thought.";
    const alignment = alignSentences(passage.sentences, segmentSentences(rebuildText));
    await saveReconstruction(created.id, rebuildText, alignment, 5000);

    renderAlign(created.id);

    expect(await screen.findByRole("heading", { name: "Walden" })).toBeInTheDocument();
    // The original is revealed here, beside the rebuild, with its differences
    // marked on each side.
    expect(screen.getByText("woods").tagName).toBe("MARK");
    expect(screen.getByText("forest").tagName).toBe("MARK");
    // Legend, single-side blocks, and the neutral length line.
    expect(screen.getByText("In the original")).toBeInTheDocument();
    expect(screen.getByText("In yours")).toBeInTheDocument();
    expect(screen.getByText("Only in the original")).toBeInTheDocument();
    expect(screen.getByText("Only in yours")).toBeInTheDocument();
    expect(screen.getByText("Same length")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to your attempts/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("redirects an attempt without an alignment to the reconstruct screen", async () => {
    const created = await createAttempt(passage, 1000);
    await vaultAttempt(created.id, "micro", 0);
    renderAlign(created.id);
    expect(await screen.findByText("Reconstruct screen")).toBeInTheDocument();
  });

  it("shows an in-voice error for a missing attempt", async () => {
    renderAlign("missing");
    expect(await screen.findByText(/that attempt is not here/i)).toBeInTheDocument();
  });
});
