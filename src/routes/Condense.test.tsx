import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { Condense } from "./Condense";
import { resetDbConnection, type PassageSnapshot } from "../lib/db";
import { createAttempt, getAttempt, putSetting, saveHint, vaultAttempt } from "../lib/store";
import { FIRST_RUN_MICRO_DRILL_KEY } from "../lib/firstRun";

vi.mock("../lib/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/store")>();
  return { ...actual, vaultAttempt: vi.fn(actual.vaultAttempt) };
});

beforeEach(() => {
  resetDbConnection();
  globalThis.indexedDB = new IDBFactory();
});

function passage(overrides: Partial<PassageSnapshot> = {}): PassageSnapshot {
  return {
    originalPassageId: "seed-1",
    title: "Walden",
    author: "Henry David Thoreau",
    source: "Project Gutenberg",
    year: 1854,
    sentences: ["Alpha one.", "Beta two."],
    isCustom: false,
    ...overrides,
  };
}

function renderCondense(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/condense/${id}`]}>
      <Routes>
        <Route path="/condense/:attemptId" element={<Condense />} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Condense", () => {
  it("presents one sentence with progress and persists a hint on advance", async () => {
    const user = userEvent.setup();
    const created = await createAttempt(passage(), 1000);
    renderCondense(created.id);

    expect(await screen.findByText("Alpha one.")).toBeInTheDocument();
    expect(screen.getByText(/sentence 1 of 2/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/your hint/i), "sunrise");
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByText("Beta two.")).toBeInTheDocument();
    expect(screen.getByText(/sentence 2 of 2/i)).toBeInTheDocument();

    const stored = await getAttempt(created.id);
    expect(stored?.hints[0]).toBe("sunrise");
    expect(stored?.cursor).toBe(1);
  });

  it("resumes at the saved cursor", async () => {
    const created = await createAttempt(passage(), 1000);
    await saveHint(created.id, 0, "sunrise");
    renderCondense(created.id);

    expect(await screen.findByText("Beta two.")).toBeInTheDocument();
    expect(screen.getByText(/sentence 2 of 2/i)).toBeInTheDocument();
  });

  it("finishes into the delay chooser with standard preselected and vaults", async () => {
    const user = userEvent.setup();
    const created = await createAttempt(passage(), 1000);
    renderCondense(created.id);

    await screen.findByText("Alpha one.");
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /finish and vault/i }));

    const standard = await screen.findByRole("radio", { name: /in 3 days/i });
    expect(standard).toBeChecked();
    expect(screen.getByRole("radio", { name: /in 15 minutes/i })).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: /vault it/i }));

    expect(await screen.findByText(/dashboard/i)).toBeInTheDocument();
    const stored = await getAttempt(created.id);
    expect(stored?.status).toBe("vaulted");
    expect(stored?.delayType).toBe("standard");
  });

  it("defaults the guided micro-drill attempt to the short delay", async () => {
    const user = userEvent.setup();
    const created = await createAttempt(passage(), 1000);
    await putSetting(FIRST_RUN_MICRO_DRILL_KEY, created.id);
    renderCondense(created.id);

    await screen.findByText("Alpha one.");
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /finish and vault/i }));

    expect(await screen.findByRole("radio", { name: /in 15 minutes/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /in 3 days/i })).not.toBeChecked();
  });

  it("never shows a sentence for a vaulted attempt", async () => {
    const created = await createAttempt(
      passage({ sentences: ["VAULT SECRET ONE.", "VAULT SECRET TWO."] }),
      1000,
    );
    await vaultAttempt(created.id, "standard", Date.now());
    renderCondense(created.id);

    expect(await screen.findByText(/this one is vaulted/i)).toBeInTheDocument();
    expect(screen.queryByText(/VAULT SECRET/)).toBeNull();
  });

  it("shows an in-voice error for a missing attempt", async () => {
    renderCondense("does-not-exist");
    expect(await screen.findByText(/start a fresh attempt/i)).toBeInTheDocument();
  });

  it("shows a next step when the vault save fails, and re-enables the action", async () => {
    const user = userEvent.setup();
    const created = await createAttempt(passage(), 1000);
    renderCondense(created.id);

    await screen.findByText("Alpha one.");
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /finish and vault/i }));

    vi.mocked(vaultAttempt).mockRejectedValueOnce(new Error("blocked"));
    await user.click(await screen.findByRole("button", { name: /vault it/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/allow storage, then try again/i);
    expect(screen.getByRole("button", { name: /vault it/i })).toBeEnabled();
  });
});
