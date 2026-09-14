import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initAnalytics } from "./analytics";

afterEach(() => {
  delete window.__APP_CONFIG__;
  document.getElementById("umami-analytics")?.remove();
});

beforeEach(() => {
  document.getElementById("umami-analytics")?.remove();
});

function umamiScript() {
  return document.getElementById("umami-analytics") as HTMLScriptElement | null;
}

describe("initAnalytics", () => {
  it("injects the Umami script when both vars are present", () => {
    window.__APP_CONFIG__ = {
      UMAMI_URL: "https://umami.example/script.js",
      UMAMI_WEBSITE_ID: "site-1",
    };
    initAnalytics();
    const script = umamiScript();
    expect(script).not.toBeNull();
    expect(script?.src).toBe("https://umami.example/script.js");
    expect(script?.getAttribute("data-website-id")).toBe("site-1");
  });

  it("does nothing when the website id is missing", () => {
    window.__APP_CONFIG__ = { UMAMI_URL: "https://umami.example/script.js" };
    initAnalytics();
    expect(umamiScript()).toBeNull();
  });

  it("does nothing when unconfigured", () => {
    initAnalytics();
    expect(umamiScript()).toBeNull();
  });

  it("injects at most once", () => {
    window.__APP_CONFIG__ = {
      UMAMI_URL: "https://umami.example/script.js",
      UMAMI_WEBSITE_ID: "site-1",
    };
    initAnalytics();
    initAnalytics();
    expect(document.querySelectorAll("#umami-analytics")).toHaveLength(1);
  });
});
