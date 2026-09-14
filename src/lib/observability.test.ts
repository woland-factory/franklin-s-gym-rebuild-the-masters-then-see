import { afterEach, describe, expect, it, vi } from "vitest";

const init = vi.fn();
vi.mock("@sentry/react", () => ({ init }));

import { initObservability } from "./observability";

afterEach(() => {
  delete window.__APP_CONFIG__;
  init.mockClear();
});

describe("initObservability", () => {
  it("initializes Sentry when a DSN is present", async () => {
    window.__APP_CONFIG__ = { SENTRY_DSN: "https://dsn.example/1" };
    await initObservability();
    expect(init).toHaveBeenCalledOnce();
    expect(init).toHaveBeenCalledWith(expect.objectContaining({ dsn: "https://dsn.example/1" }));
  });

  it("does nothing when no DSN is present", async () => {
    await initObservability();
    expect(init).not.toHaveBeenCalled();
  });
});
