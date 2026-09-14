import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { ReconstructPlaceholder } from "./ReconstructPlaceholder";
import { resetDbConnection, type PassageSnapshot } from "../lib/db";
import { createAttempt, vaultAttempt } from "../lib/store";

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
  sentences: ["VAULT SECRET ONE.", "VAULT SECRET TWO."],
  isCustom: false,
};

function renderReconstruct(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/reconstruct/${id}`]}>
      <Routes>
        <Route path="/reconstruct/:attemptId" element={<ReconstructPlaceholder />} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ReconstructPlaceholder", () => {
  it("shows the next-step message with a link back and never the passage body", async () => {
    const created = await createAttempt(passage, 1000);
    await vaultAttempt(created.id, "micro", 0);
    renderReconstruct(created.id);

    expect(await screen.findByRole("heading", { name: /rebuild/i })).toBeInTheDocument();
    expect(screen.getByText(/the rebuild step opens next/i)).toBeInTheDocument();
    expect(screen.getByText("Walden")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to your attempts/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.queryByText(/VAULT SECRET/)).toBeNull();
  });

  it("shows an in-voice error for a missing attempt", async () => {
    renderReconstruct("missing");
    expect(await screen.findByText(/that attempt is not here/i)).toBeInTheDocument();
  });
});
