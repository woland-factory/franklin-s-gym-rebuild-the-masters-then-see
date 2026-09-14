import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Home } from "./Home";

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

describe("Home", () => {
  it("names what the app is for", () => {
    renderHome();
    expect(
      screen.getByRole("heading", { name: /train against the masters/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/rebuild it from memory/i)).toBeInTheDocument();
  });

  it("offers one primary action that links to the library", () => {
    renderHome();
    const primary = screen.getByRole("link", { name: /browse passages/i });
    expect(primary).toHaveAttribute("href", "/library");
  });

  it("opens the How it works panel from the secondary action", async () => {
    const user = userEvent.setup();
    renderHome();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /see an example/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /how it works/i })).toBeInTheDocument();
  });

  it("closes the How it works panel", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByRole("button", { name: /see an example/i }));
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
