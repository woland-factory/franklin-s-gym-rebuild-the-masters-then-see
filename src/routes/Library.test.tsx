import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Library } from "./Library";
import { seedPassages } from "../data/seedPassages";

function renderLibrary() {
  return render(
    <MemoryRouter>
      <Library />
    </MemoryRouter>,
  );
}

describe("Library", () => {
  it("lists every seed passage with its metadata", () => {
    renderLibrary();
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(seedPassages.length);
    // Author and year metadata for a known passage is visible.
    expect(screen.getByText(/mark twain/i)).toBeInTheDocument();
  });

  it("filters by length band", async () => {
    const user = userEvent.setup();
    renderLibrary();
    await user.click(screen.getByRole("button", { name: "Short" }));
    const shortCount = seedPassages.filter((p) => p.lengthBand === "short").length;
    expect(screen.getAllByRole("article")).toHaveLength(shortCount);
  });

  it("exposes no attempt-starting action", () => {
    renderLibrary();
    expect(screen.queryByRole("button", { name: /start|begin|attempt|condense/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /start|begin|attempt|condense/i })).toBeNull();
  });
});
