import { afterEach, describe, expect, it, vi } from "vitest";
import { getConfig } from "./config";

afterEach(() => {
  delete window.__APP_CONFIG__;
  vi.unstubAllEnvs();
});

describe("getConfig", () => {
  it("returns empty strings when nothing is configured", () => {
    const config = getConfig();
    expect(config.umamiUrl).toBe("");
    expect(config.umamiWebsiteId).toBe("");
    expect(config.sentryDsn).toBe("");
  });

  it("reads runtime config from window.__APP_CONFIG__", () => {
    window.__APP_CONFIG__ = {
      UMAMI_URL: "https://umami.example/script.js",
      UMAMI_WEBSITE_ID: "abc-123",
      SENTRY_DSN: "https://dsn.example/1",
    };
    const config = getConfig();
    expect(config.umamiUrl).toBe("https://umami.example/script.js");
    expect(config.umamiWebsiteId).toBe("abc-123");
    expect(config.sentryDsn).toBe("https://dsn.example/1");
  });

  it("treats empty runtime values as absent and falls back to build env", () => {
    window.__APP_CONFIG__ = { UMAMI_URL: "", UMAMI_WEBSITE_ID: "", SENTRY_DSN: "" };
    vi.stubEnv("VITE_UMAMI_URL", "https://build.example/script.js");
    const config = getConfig();
    expect(config.umamiUrl).toBe("https://build.example/script.js");
  });

  it("prefers runtime config over build env", () => {
    window.__APP_CONFIG__ = { UMAMI_URL: "https://runtime.example/script.js" };
    vi.stubEnv("VITE_UMAMI_URL", "https://build.example/script.js");
    expect(getConfig().umamiUrl).toBe("https://runtime.example/script.js");
  });

  it("ignores an uninterpolated placeholder", () => {
    window.__APP_CONFIG__ = { SENTRY_DSN: "${SENTRY_DSN}" };
    expect(getConfig().sentryDsn).toBe("");
  });
});
