import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { IDBFactory } from "fake-indexeddb";
import { Bootstrap } from "./Bootstrap";
import { openDb, resetDbConnection } from "../lib/db";
import { getConfig } from "../lib/config";
import { listAttempts, seedDemoAttempt } from "../lib/store";

vi.mock("../lib/config", () => ({ getConfig: vi.fn() }));

vi.mock("../lib/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/store")>();
  return { ...actual, seedDemoAttempt: vi.fn(actual.seedDemoAttempt) };
});

const BASE_CONFIG = {
  umamiUrl: "",
  umamiWebsiteId: "",
  sentryDsn: "",
  seedDemo: false,
};

beforeEach(() => {
  resetDbConnection();
  globalThis.indexedDB = new IDBFactory();
  vi.mocked(getConfig).mockReturnValue({ ...BASE_CONFIG });
  vi.mocked(seedDemoAttempt).mockClear();
});

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

  it("seeds the demo attempt when seedDemo is set and the store is empty", async () => {
    vi.mocked(getConfig).mockReturnValue({ ...BASE_CONFIG, seedDemo: true });
    renderBootstrap(openDb);
    expect(await screen.findByText("App ready")).toBeInTheDocument();
    expect(await listAttempts()).toHaveLength(1);
  });

  it("seeds nothing when seedDemo is off", async () => {
    renderBootstrap(openDb);
    expect(await screen.findByText("App ready")).toBeInTheDocument();
    expect(seedDemoAttempt).not.toHaveBeenCalled();
    expect(await listAttempts()).toHaveLength(0);
  });

  it("stays ready when a demo seed fails", async () => {
    vi.mocked(getConfig).mockReturnValue({ ...BASE_CONFIG, seedDemo: true });
    vi.mocked(seedDemoAttempt).mockRejectedValueOnce(new Error("seed failed"));
    renderBootstrap(openDb);
    expect(await screen.findByText("App ready")).toBeInTheDocument();
  });
});
