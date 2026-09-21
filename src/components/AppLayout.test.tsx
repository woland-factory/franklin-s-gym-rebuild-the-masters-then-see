import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppLayout>
        <p>Page content</p>
      </AppLayout>
    </MemoryRouter>,
  );
}

describe("AppLayout", () => {
  it("offers a focus-revealed skip link that targets the main landmark", () => {
    const { container } = renderAt("/");
    const skip = screen.getByRole("link", { name: /skip to content/i });
    expect(skip).toHaveAttribute("href", "#main");
    // It is not permanently clipped: it uses a focus-reveal module class, not
    // the global visually-hidden clip.
    expect(skip).not.toHaveClass("visually-hidden");
    expect(skip.getAttribute("class")).toBeTruthy();
    expect(container.querySelector("#main")).not.toBeNull();
  });

  it("marks the current section with aria-current", () => {
    renderAt("/library");
    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Ledger" })).not.toHaveAttribute("aria-current");
  });
});
