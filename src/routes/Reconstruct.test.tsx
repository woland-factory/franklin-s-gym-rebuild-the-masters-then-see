import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { Reconstruct } from "./Reconstruct";
import { resetDbConnection, type PassageSnapshot } from "../lib/db";
import { createAttempt, getAttempt, saveHint, vaultAttempt, saveReconstruction } from "../lib/store";
import { alignSentences } from "../lib/align";

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
        <Route path="/reconstruct/:attemptId" element={<Reconstruct />} />
        <Route path="/condense/:attemptId" element={<div>Condense screen</div>} />
        <Route path="/align/:attemptId" element={<div>Align screen</div>} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function ripeAttempt(hints?: [string, string]) {
  const created = await createAttempt(passage, 1000);
  if (hints) {
    await saveHint(created.id, 0, hints[0]);
    await saveHint(created.id, 1, hints[1]);
  }
  // A micro vault dated in the past is already ripe.
  await vaultAttempt(created.id, "micro", 0);
  return created;
}

describe("Reconstruct", () => {
  it("shows the hints and a rebuild textarea for a ripe attempt, never the original", async () => {
    const created = await ripeAttempt(["pond at dawn", "the cabin"]);
    renderReconstruct(created.id);

    expect(await screen.findByRole("heading", { name: "Walden" })).toBeInTheDocument();
    expect(screen.getByText("pond at dawn")).toBeInTheDocument();
    expect(screen.getByText("the cabin")).toBeInTheDocument();
    expect(screen.getByLabelText(/your rebuild/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /see alignment/i })).toBeDisabled();
    expect(screen.queryByText(/VAULT SECRET/)).toBeNull();
  });

  it("marks a blank hint so the row still reads", async () => {
    const created = await ripeAttempt(["pond at dawn", ""]);
    renderReconstruct(created.id);
    expect(await screen.findByText("Blank")).toBeInTheDocument();
  });

  it("shows the wait note for a vaulted attempt: no original, no textarea", async () => {
    const created = await createAttempt(passage, 1000);
    await vaultAttempt(created.id, "standard", Date.now());
    renderReconstruct(created.id);

    expect(
      await screen.findByRole("heading", { name: /this opens when it is ripe/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ripe in/i)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText(/VAULT SECRET/)).toBeNull();
    expect(screen.getByRole("link", { name: /back to your attempts/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("redirects a condensing attempt to the condense screen", async () => {
    const created = await createAttempt(passage, 1000);
    renderReconstruct(created.id);
    expect(await screen.findByText("Condense screen")).toBeInTheDocument();
  });

  it("redirects a reconstructed attempt to its alignment", async () => {
    const created = await ripeAttempt();
    await saveReconstruction(
      created.id,
      "My rebuild.",
      alignSentences(passage.sentences, ["My rebuild."]),
      2000,
    );
    renderReconstruct(created.id);
    expect(await screen.findByText("Align screen")).toBeInTheDocument();
  });

  it("blocks an over-cap rebuild with an inline message and saves nothing", async () => {
    const user = userEvent.setup();
    const created = await ripeAttempt();
    renderReconstruct(created.id);

    const textarea = await screen.findByLabelText(/your rebuild/i);
    const tooManySentences = Array.from({ length: 41 }, (_, i) => `Sentence ${i}.`).join(" ");
    fireEvent.change(textarea, { target: { value: tooManySentences } });
    await user.click(screen.getByRole("button", { name: /see alignment/i }));

    expect(await screen.findByText(/keep it to 40 sentences/i)).toBeInTheDocument();
    const stored = await getAttempt(created.id);
    expect(stored?.status).toBe("vaulted");
    expect(stored?.alignment).toBeUndefined();

    // 35 sentences of 13 words each: inside the sentence cap, past 400 words.
    const tooManyWords = Array.from(
      { length: 35 },
      () => "word word word word word word word word word word word word word.",
    ).join(" ");
    fireEvent.change(textarea, { target: { value: tooManyWords } });
    await user.click(screen.getByRole("button", { name: /see alignment/i }));
    expect(await screen.findByText(/keep your rebuild to 400 words/i)).toBeInTheDocument();
  });

  it("saves a valid rebuild with its alignment and navigates to the align view", async () => {
    const user = userEvent.setup();
    const created = await ripeAttempt();
    renderReconstruct(created.id);

    const textarea = await screen.findByLabelText(/your rebuild/i);
    fireEvent.change(textarea, { target: { value: "VAULT SECRET ONE. Something new." } });
    await user.click(screen.getByRole("button", { name: /see alignment/i }));

    expect(await screen.findByText("Align screen")).toBeInTheDocument();
    await waitFor(async () => {
      const stored = await getAttempt(created.id);
      expect(stored?.status).toBe("reconstructed");
      expect(stored?.reconstructionText).toBe("VAULT SECRET ONE. Something new.");
      expect(stored?.alignment?.version).toBe(1);
      expect(stored?.alignment?.pairs.length).toBeGreaterThan(0);
    });
  });

  it("shows an in-voice error for a missing attempt", async () => {
    renderReconstruct("missing");
    expect(await screen.findByText(/start a fresh attempt/i)).toBeInTheDocument();
  });

  it("shows a busy label the moment submit is pressed, then completes the transition", async () => {
    const created = await ripeAttempt();
    renderReconstruct(created.id);

    const textarea = await screen.findByLabelText(/your rebuild/i);
    fireEvent.change(textarea, { target: { value: "VAULT SECRET ONE. Something new." } });
    fireEvent.click(screen.getByRole("button", { name: /see alignment/i }));

    // Feedback within 100ms: the control flips to a busy label right away,
    // before the align compute and save run.
    expect(screen.getByRole("button", { name: /aligning/i })).toBeInTheDocument();

    // The transition still completes onto the alignment.
    expect(await screen.findByText("Align screen")).toBeInTheDocument();
  });
});
