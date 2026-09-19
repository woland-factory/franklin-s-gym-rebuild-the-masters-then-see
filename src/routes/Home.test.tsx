import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { Home } from "./Home";
import { resetDbConnection, type PassageSnapshot } from "../lib/db";
import {
  createAttempt,
  putSetting,
  saveHint,
  saveReconstruction,
  vaultAttempt,
} from "../lib/store";
import { FIRST_RUN_DISMISSED_KEY } from "../lib/firstRun";
import { alignSentences } from "../lib/align";

// downloadIcs is stubbed so the "Add to calendar" action can be asserted without
// a real browser download. buildIcs stays real so a valid file is still built.
vi.mock("../lib/ics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/ics")>();
  return { ...actual, downloadIcs: vi.fn() };
});
import { downloadIcs } from "../lib/ics";

beforeEach(() => {
  resetDbConnection();
  globalThis.indexedDB = new IDBFactory();
  vi.mocked(downloadIcs).mockClear();
});

function passage(overrides: Partial<PassageSnapshot> = {}): PassageSnapshot {
  return {
    originalPassageId: "seed-1",
    title: "Walden",
    author: "Henry David Thoreau",
    source: "Project Gutenberg",
    year: 1854,
    sentences: ["SECRET ORIGINAL ONE.", "SECRET ORIGINAL TWO."],
    isCustom: false,
    ...overrides,
  };
}

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

describe("Home dashboard", () => {
  it("shows the first-run guide on a fresh store", async () => {
    renderHome();
    expect(
      await screen.findByRole("heading", { name: /finish your first loop today/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start the quick drill/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse passages/i })).toHaveAttribute(
      "href",
      "/library",
    );
    expect(screen.getByRole("link", { name: /see an example/i })).toHaveAttribute(
      "href",
      "/example",
    );
  });

  it("falls back to the designed empty state once the guide is skipped", async () => {
    await putSetting(FIRST_RUN_DISMISSED_KEY, true);
    renderHome();
    expect(
      await screen.findByRole("heading", { name: /train against the masters/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /finish your first loop today/i }),
    ).toBeNull();
  });

  it("shows the pipeline nudge on a populated first-run store", async () => {
    await createAttempt(passage(), Date.now());
    renderHome();
    expect(await screen.findByText(/so one is always ripe when you come back/i)).toBeInTheDocument();
  });

  it("hides the guide and the nudge once an attempt is reconstructed", async () => {
    const created = await createAttempt(passage(), Date.now());
    await vaultAttempt(created.id, "micro", 0);
    const alignment = alignSentences(passage().sentences, ["My rebuild of it."]);
    await saveReconstruction(created.id, "My rebuild of it.", alignment, Date.now());

    renderHome();
    await screen.findByRole("article");
    expect(
      screen.queryByRole("heading", { name: /finish your first loop today/i }),
    ).toBeNull();
    expect(screen.queryByText(/so one is always ripe when you come back/i)).toBeNull();
  });

  it("shows a condensing attempt with progress and a resume action", async () => {
    const created = await createAttempt(passage(), Date.now());
    await saveHint(created.id, 0, "first hint");

    renderHome();
    const card = await screen.findByRole("article");
    expect(within(card).getByText(/condensing/i)).toBeInTheDocument();
    expect(within(card).getByText(/1 of 2 hinted/i)).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /resume/i })).toHaveAttribute(
      "href",
      `/condense/${created.id}`,
    );
  });

  it("shows a vaulted attempt with a countdown, a calendar action, and no passage body", async () => {
    const created = await createAttempt(passage(), Date.now());
    await vaultAttempt(created.id, "standard", Date.now());

    renderHome();
    const card = await screen.findByRole("article");
    expect(within(card).getByText(/vaulted/i)).toBeInTheDocument();
    expect(within(card).getByText(/ripe in/i)).toBeInTheDocument();
    expect(screen.queryByText(/SECRET ORIGINAL/)).toBeNull();

    await userEvent.click(within(card).getByRole("button", { name: /add to calendar/i }));
    expect(downloadIcs).toHaveBeenCalledTimes(1);
    const [, contents] = vi.mocked(downloadIcs).mock.calls[0];
    expect(contents).toContain("BEGIN:VCALENDAR");
    expect(contents).not.toContain("SECRET ORIGINAL");
  });

  it("shows a reconstructed attempt with the Aligned chip and a see-alignment action", async () => {
    const created = await createAttempt(passage(), Date.now());
    await vaultAttempt(created.id, "micro", 0);
    const alignment = alignSentences(passage().sentences, ["My rebuild of it."]);
    await saveReconstruction(created.id, "My rebuild of it.", alignment, Date.now());

    renderHome();
    const card = await screen.findByRole("article");
    expect(within(card).getByText("Aligned")).toBeInTheDocument();
    expect(within(card).getByText(/rebuilt and aligned/i)).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /see alignment/i })).toHaveAttribute(
      "href",
      `/align/${created.id}`,
    );
    expect(screen.queryByText(/SECRET ORIGINAL/)).toBeNull();
  });

  it("elevates a ripe attempt with a prominent rebuild action", async () => {
    const created = await createAttempt(passage(), Date.now());
    // A micro vault dated in the past is already ripe.
    await vaultAttempt(created.id, "micro", 0);

    renderHome();
    const card = await screen.findByRole("article");
    expect(within(card).getByText(/ready/i)).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /rebuild/i })).toHaveAttribute(
      "href",
      `/reconstruct/${created.id}`,
    );
    expect(screen.queryByText(/SECRET ORIGINAL/)).toBeNull();
  });
});
