import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Bootstrap } from "./Bootstrap";

function renderBootstrap(open: () => Promise<unknown>) {
  return render(
    <MemoryRouter>
      <Bootstrap open={open}>
        <p>App ready</p>
      </Bootstrap>
    </MemoryRouter>,
  );
}

describe("Bootstrap", () => {
  it("shows content once persistence opens", async () => {
    renderBootstrap(() => Promise.resolve());
    expect(await screen.findByText("App ready")).toBeInTheDocument();
  });

  it("shows the in-voice error state when persistence fails", async () => {
    renderBootstrap(() => Promise.reject(new Error("blocked")));
    expect(
      await screen.findByRole("heading", { name: /blocked local storage/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText("App ready")).not.toBeInTheDocument();
  });

  it("retries opening persistence from the error state", async () => {
    const user = userEvent.setup();
    const open = vi
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce(new Error("blocked"))
      .mockResolvedValueOnce(undefined);
    renderBootstrap(open);

    await user.click(await screen.findByRole("button", { name: /try again/i }));
    expect(await screen.findByText("App ready")).toBeInTheDocument();
    expect(open).toHaveBeenCalledTimes(2);
  });
});
