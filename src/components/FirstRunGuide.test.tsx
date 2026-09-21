import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { FirstRunGuide } from "./FirstRunGuide";
import { resetDbConnection, type AttemptRecord, type PassageSnapshot } from "../lib/db";
import {
  FIRST_RUN_DISMISSED_KEY,
  FIRST_RUN_MICRO_DRILL_KEY,
  MICRO_DRILL_PASSAGE_ID,
  WARMUP_PASSAGE_ID,
} from "../lib/firstRun";
import { createAttempt, getSetting, listAttempts, putSetting } from "../lib/store";
import { DELAY_PRESETS } from "../lib/delays";
import { seedPassages } from "../data/seedPassages";
import { alignSentences } from "../lib/align";

vi.mock("../lib/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/store")>();
  return { ...actual, createAttempt: vi.fn(actual.createAttempt) };
});

const NOW = 1_000_000_000;

beforeEach(() => {
  resetDbConnection();
  globalThis.indexedDB = new IDBFactory();
});

function passage(overrides: Partial<PassageSnapshot> = {}): PassageSnapshot {
  return {
    originalPassageId: "seed-1",
    title: "A Passage",
    author: "An Author",
    source: "Project Gutenberg",
    year: 1900,
    sentences: ["VAULT SECRET ONE.", "VAULT SECRET TWO."],
    isCustom: false,
    ...overrides,
  };
}

function attempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    id: "a1",
    status: "condensing",
    createdAt: NOW,
    passage: passage(),
    hints: ["", ""],
    cursor: 0,
    ...overrides,
  };
}

function renderGuide(attempts: AttemptRecord[], onChanged = vi.fn()) {
  const result = render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<FirstRunGuide attempts={attempts} now={NOW} onChanged={onChanged} />} />
        <Route path="/condense/:attemptId" element={<div>Condense screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return { ...result, onChanged };
}

describe("FirstRunGuide", () => {
  it("shows the heading, three imperative steps, and the start action on a fresh store", async () => {
    renderGuide([]);
    expect(
      await screen.findByRole("heading", { name: /finish your first loop today/i }),
    ).toBeInTheDocument();
    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent(/note each sentence in a few words/i);
    expect(steps[1]).toHaveTextContent(/read the warm-up while the vault holds/i);
    expect(steps[2]).toHaveTextContent(/rebuild the passage and see your alignment/i);
    expect(screen.getByRole("button", { name: /start the quick drill/i })).toBeInTheDocument();
  });

  it("starts the drill: creates an attempt, persists its id, and navigates to condense", async () => {
    const user = userEvent.setup();
    renderGuide([]);
    await user.click(await screen.findByRole("button", { name: /start the quick drill/i }));

    expect(await screen.findByText("Condense screen")).toBeInTheDocument();
    const all = await listAttempts();
    expect(all).toHaveLength(1);
    expect(all[0].passage.originalPassageId).toBe(MICRO_DRILL_PASSAGE_ID);
    expect(await getSetting<string>(FIRST_RUN_MICRO_DRILL_KEY)).toBe(all[0].id);
  });

  it("shows a next step when starting the drill fails, and re-enables the action", async () => {
    const user = userEvent.setup();
    vi.mocked(createAttempt).mockRejectedValueOnce(new Error("blocked"));
    renderGuide([]);
    await user.click(await screen.findByRole("button", { name: /start the quick drill/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/allow storage, then try again/i);
    expect(screen.getByRole("button", { name: /start the quick drill/i })).toBeEnabled();
  });

  it("renders the warm-up passage and a countdown while a micro attempt waits, never the vault", async () => {
    const waiting = attempt({
      id: "a1",
      status: "vaulted",
      delayType: "micro",
      vaultedAt: NOW,
      vaultedUntil: NOW + DELAY_PRESETS.micro.ms,
    });
    await putSetting(FIRST_RUN_MICRO_DRILL_KEY, "a1");
    renderGuide([waiting]);

    expect(await screen.findByRole("heading", { name: /warm-up reading/i })).toBeInTheDocument();
    const warmupSeed = seedPassages.find((p) => p.id === WARMUP_PASSAGE_ID);
    expect(screen.getByText(warmupSeed!.sentences[0])).toBeInTheDocument();
    expect(screen.getByText(/ripe in/i)).toBeInTheDocument();
    // The vaulted original never appears, and there is no rebuild link yet.
    expect(screen.queryByText(/VAULT SECRET/)).toBeNull();
    expect(screen.queryByRole("link", { name: /rebuild now/i })).toBeNull();
  });

  it("offers a rebuild link once the attempt is ripe", async () => {
    const ripe = attempt({
      id: "a1",
      status: "vaulted",
      delayType: "micro",
      vaultedAt: NOW - DELAY_PRESETS.micro.ms,
      vaultedUntil: NOW - 1,
    });
    await putSetting(FIRST_RUN_MICRO_DRILL_KEY, "a1");
    renderGuide([ripe]);

    expect(await screen.findByRole("link", { name: /rebuild now/i })).toHaveAttribute(
      "href",
      "/reconstruct/a1",
    );
  });

  it("skips the guide: persists dismissal, tells Home, and hides itself", async () => {
    const user = userEvent.setup();
    const { onChanged } = renderGuide([]);
    await user.click(await screen.findByRole("button", { name: /skip the guide/i }));

    await vi.waitFor(async () => {
      expect(await getSetting<boolean>(FIRST_RUN_DISMISSED_KEY)).toBe(true);
    });
    expect(onChanged).toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /finish your first loop today/i }),
      ).toBeNull();
    });
  });

  it("renders nothing once an attempt is reconstructed", async () => {
    const done = attempt({
      id: "a1",
      status: "reconstructed",
      alignment: alignSentences(passage().sentences, ["A rebuild."]),
      reconstructionText: "A rebuild.",
      reconstructedAt: NOW,
    });
    const { container } = renderGuide([done]);
    // Let the settings load resolve, then assert the guide stays empty.
    await vi.waitFor(() => {
      expect(container.querySelector("section")).toBeNull();
    });
  });
});
