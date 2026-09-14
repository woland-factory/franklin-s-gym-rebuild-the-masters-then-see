import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { Library } from "./Library";
import { seedPassages } from "../data/seedPassages";
import { resetDbConnection } from "../lib/db";
import { listAttempts } from "../lib/store";

beforeEach(() => {
  resetDbConnection();
  globalThis.indexedDB = new IDBFactory();
});

function renderLibrary() {
  return render(
    <MemoryRouter initialEntries={["/library"]}>
      <Routes>
        <Route path="/library" element={<Library />} />
        <Route path="/condense/:attemptId" element={<div>Condense screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Library", () => {
  it("lists every seed passage with its metadata", () => {
    renderLibrary();
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(seedPassages.length);
    expect(screen.getByText(/mark twain/i)).toBeInTheDocument();
  });

  it("filters by length band", async () => {
    const user = userEvent.setup();
    renderLibrary();
    await user.click(screen.getByRole("button", { name: "Short" }));
    const shortCount = seedPassages.filter((p) => p.lengthBand === "short").length;
    expect(screen.getAllByRole("article")).toHaveLength(shortCount);
  });

  it("starts an attempt from a seed card and opens condense", async () => {
    const user = userEvent.setup();
    renderLibrary();
    const firstCard = screen.getAllByRole("article")[0];
    await user.click(within(firstCard).getByRole("button", { name: /^start$/i }));

    expect(await screen.findByText(/condense screen/i)).toBeInTheDocument();
    const attempts = await listAttempts();
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe("condensing");
    expect(attempts[0].passage.isCustom).toBe(false);
  });

  it("offers a paste-your-own surface with the cap stated", () => {
    renderLibrary();
    expect(screen.getByRole("heading", { name: /paste your own/i })).toBeInTheDocument();
    expect(screen.getByText(/up to 400 words, 40 sentences/i)).toBeInTheDocument();
  });
});
