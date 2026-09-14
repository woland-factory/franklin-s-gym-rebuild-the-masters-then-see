import { expect, test } from "@playwright/test";

test.describe("first render at 390px", () => {
  test("home shows real content with no horizontal scroll", async ({ page }) => {
    await page.goto("/");

    // Real content, not a blank page.
    await expect(page.getByRole("heading", { name: /train against the masters/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /browse passages/i })).toBeVisible();

    // No horizontal scroll at a 390px viewport.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(overflow).toBe(true);
  });

  test("library deep link resolves via SPA fallback", async ({ page }) => {
    await page.goto("/library");
    await expect(page.getByRole("heading", { name: /the library/i })).toBeVisible();
    await expect(page.getByRole("article").first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(overflow).toBe(true);
  });

  test("see an example opens the how it works panel", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /see an example/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /how it works/i })).toBeVisible();
  });
});
