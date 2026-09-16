import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { Ledger } from "./Ledger";
import { resetDbConnection } from "../lib/db";
import type { Alignment, AlignmentPair, AttemptRecord, MatchType } from "../lib/db";
import { importAttempts, listAttempts } from "../lib/store";
import { buildExport, parseExport } from "../lib/transfer";

// downloadJson is stubbed so "Export record" can be asserted without a real
// browser download. buildExport and parseExport stay real.
vi.mock("../lib/transfer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/transfer")>();
  return { ...actual, downloadJson: vi.fn() };
});
import { downloadJson } from "../lib/transfer";

beforeEach(() => {
  resetDbConnection();
  globalThis.indexedDB = new IDBFactory();
  vi.mocked(downloadJson).mockClear();
});

function pair(matchType: MatchType): AlignmentPair {
  return {
    matchType,
    original: matchType === "addition" ? null : "An original sentence.",
    your: matchType === "omission" ? null : "Your sentence.",
    originalSpans: null,
    yourSpans: null,
    originalWords: 0,
    yourWords: 0,
    lengthDelta: 0,
    similarity: 0,
  };
}

function alignmentOf(matched: number, omissions: number, additions: number): Alignment {
  const pairs = [
    ...Array.from({ length: matched }, () => pair("matched")),
    ...Array.from({ length: omissions }, () => pair("omission")),
    ...Array.from({ length: additions }, () => pair("addition")),
  ];
  return { version: 1, pairs };
}

function reconstructed(
  id: string,
  reconstructedAt: number,
  align: Alignment,
  title = "Walden",
): AttemptRecord {
  const sentences = align.pairs
    .filter((p) => p.matchType !== "addition")
    .map((_, i) => `Sentence ${i}.`);
  return {
    id,
    status: "reconstructed",
    createdAt: reconstructedAt,
    passage: {
      originalPassageId: "seed-1",
      title,
      author: "Henry David Thoreau",
      source: "Project Gutenberg",
      year: 1854,
      sentences: sentences.length ? sentences : ["One."],
      isCustom: false,
    },
    hints: (sentences.length ? sentences : ["One."]).map(() => "hint"),
    cursor: 0,
    delayType: "micro",
    vaultedAt: reconstructedAt - 2,
    vaultedUntil: reconstructedAt - 1,
    reconstructionText: "A rebuild.",
    reconstructedAt,
    alignment: align,
  };
}

function renderLedger() {
  return render(
    <MemoryRouter>
      <Ledger />
    </MemoryRouter>,
  );
}

const DAY = 24 * 60 * 60 * 1000;

describe("Ledger empty state", () => {
  it("explains what accumulates and points to the first action", async () => {
    renderLedger();
    expect(
      await screen.findByRole("heading", { name: /your record starts with the first rebuild/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/every aligned attempt files here with its date/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse passages/i })).toHaveAttribute(
      "href",
      "/library",
    );
    expect(screen.getByText(/restore from a file/i)).toBeInTheDocument();
  });
});

describe("Ledger populated list", () => {
  it("lists completed attempts newest first with dates, metrics, and alignment links", async () => {
    const older = reconstructed("old", new Date(2026, 8, 10).getTime(), alignmentOf(7, 2, 1));
    const newer = reconstructed("new", new Date(2026, 8, 14).getTime(), alignmentOf(3, 0, 0));
    await importAttempts([older, newer]);

    renderLedger();
    const items = await screen.findAllByRole("listitem");
    // Newest first.
    expect(within(items[0]).getByText(/Sep 14, 2026/)).toBeInTheDocument();
    expect(within(items[1]).getByText(/Sep 10, 2026/)).toBeInTheDocument();

    // Metric texts for the older entry: 7 matched, 2 omissions, 1 addition.
    expect(within(items[1]).getByText("Recovered 7 of 9")).toBeInTheDocument();
    expect(
      within(items[1]).getByText("9 sentences in the original, 8 in yours"),
    ).toBeInTheDocument();

    const links = screen.getAllByRole("link").filter((l) => l.getAttribute("href")?.startsWith("/align/"));
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/align/new");
  });

  it("paginates in pages of 20", async () => {
    const rows = Array.from({ length: 45 }, (_, i) =>
      reconstructed(`a${i}`, new Date(2026, 0, 1).getTime() + i * DAY, alignmentOf(2, 0, 0)),
    );
    await importAttempts(rows);

    renderLedger();
    await screen.findAllByRole("listitem");
    const alignLinks = () =>
      screen.getAllByRole("link").filter((l) => l.getAttribute("href")?.startsWith("/align/"));

    expect(alignLinks()).toHaveLength(20);
    await userEvent.click(screen.getByRole("button", { name: /show more/i }));
    expect(alignLinks()).toHaveLength(40);
    await userEvent.click(screen.getByRole("button", { name: /show more/i }));
    expect(alignLinks()).toHaveLength(45);
    expect(screen.queryByRole("button", { name: /show more/i })).toBeNull();
  });

  it("renders both fidelity charts and never a streak, score, or leaderboard", async () => {
    await importAttempts([reconstructed("x", Date.now(), alignmentOf(3, 1, 0))]);
    renderLedger();

    expect(await screen.findByRole("heading", { name: /hinted ideas recovered/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /sentence count difference/i })).toBeInTheDocument();
    expect(screen.getAllByText("Reconstruction fidelity")).toHaveLength(2);
    // Two separate charts, not one dual-axis chart.
    expect(screen.getAllByRole("img")).toHaveLength(2);

    const body = document.body.textContent?.toLowerCase() ?? "";
    expect(body).not.toContain("streak");
    expect(body).not.toContain("score");
    expect(body).not.toContain("leaderboard");
  });
});

describe("Ledger export and import", () => {
  function fileFrom(text: string, size?: number): File {
    const file = new File([text], "record.json", { type: "application/json" });
    if (size !== undefined) Object.defineProperty(file, "size", { value: size });
    return file;
  }

  function fileInput(): HTMLInputElement {
    return document.querySelector('input[type="file"]') as HTMLInputElement;
  }

  it("exports every stored attempt as a parseable file", async () => {
    const rows = [
      reconstructed("e1", new Date(2026, 0, 1).getTime(), alignmentOf(2, 0, 0)),
      reconstructed("e2", new Date(2026, 0, 2).getTime(), alignmentOf(1, 1, 0)),
    ];
    await importAttempts(rows);

    renderLedger();
    await userEvent.click(await screen.findByRole("button", { name: /export record/i }));

    expect(downloadJson).toHaveBeenCalledTimes(1);
    const [, contents] = vi.mocked(downloadJson).mock.calls[0];
    const parsed = parseExport(contents);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.attempts.map((a) => a.id).sort()).toEqual(["e1", "e2"]);
  });

  it("imports a valid file, reloads the list, and reports the count", async () => {
    renderLedger();
    await screen.findByRole("heading", { name: /your record starts/i });

    const row = reconstructed("imp", new Date(2026, 8, 14).getTime(), alignmentOf(2, 0, 0));
    const text = buildExport([row], 1);
    fireEvent.change(fileInput(), { target: { files: [fileFrom(text)] } });

    expect(await screen.findByText("Restored 1 attempt.")).toBeInTheDocument();
    expect(within(screen.getByRole("listitem")).getByText(/Sep 14, 2026/)).toBeInTheDocument();
    expect(await listAttempts()).toHaveLength(1);
  });

  it("reports skipped duplicates", async () => {
    const existing = reconstructed("dup", new Date(2026, 0, 1).getTime(), alignmentOf(2, 0, 0));
    await importAttempts([existing]);
    renderLedger();
    await screen.findAllByRole("listitem");

    const fresh = reconstructed("fresh", new Date(2026, 0, 2).getTime(), alignmentOf(2, 0, 0));
    const text = buildExport([existing, fresh], 1);
    fireEvent.change(fileInput(), { target: { files: [fileFrom(text)] } });

    expect(await screen.findByText("Restored 1 attempt. 1 was already here.")).toBeInTheDocument();
  });

  it("shows an in-voice error for an invalid file and stores nothing", async () => {
    await importAttempts([reconstructed("keep", Date.now(), alignmentOf(2, 0, 0))]);
    renderLedger();
    await screen.findAllByRole("listitem");

    fireEvent.change(fileInput(), { target: { files: [fileFrom("not a real export")] } });

    expect(
      await screen.findByText(/that file did not match\. choose a json export/i),
    ).toBeInTheDocument();
    expect(await listAttempts()).toHaveLength(1);
  });

  it("refuses an oversized file before parsing", async () => {
    renderLedger();
    await screen.findByRole("heading", { name: /your record starts/i });

    const huge = fileFrom("{}", 11 * 1024 * 1024);
    fireEvent.change(fileInput(), { target: { files: [huge] } });

    expect(await screen.findByText(/that file did not match/i)).toBeInTheDocument();
    expect(await listAttempts()).toHaveLength(0);
  });
});
