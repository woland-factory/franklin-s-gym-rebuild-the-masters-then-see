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

  test("the worked example shows a populated alignment", async ({ page }) => {
    await page.goto("/example");

    // The legend and real marks are visible: the demo yields genuine findings.
    await expect(page.getByText("In the original", { exact: true })).toBeVisible();
    await expect(page.getByText("In yours", { exact: true })).toBeVisible();
    await expect(page.locator("mark").first()).toBeVisible();
    await expect(page.getByText("Only in the original", { exact: true })).toBeVisible();
    await expect(page.getByText("Only in yours", { exact: true })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(overflow).toBe(true);
  });

  test("the empty state links to the worked example", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /see an example/i }).click();
    await expect(page).toHaveURL(/\/example$/);
    await expect(page.getByText("In the original", { exact: true })).toBeVisible();
  });
});

async function noHorizontalScroll(page: import("@playwright/test").Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

test.describe("condense and vault loop", () => {
  test("start, hint, reload resumes, then vault shows on the dashboard", async ({ page }) => {
    await page.goto("/library");

    // Start an attempt from the first seed card.
    await page.getByRole("button", { name: /^Start$/ }).first().click();
    await expect(page).toHaveURL(/\/condense\//);
    await expect(page.getByText(/Sentence 1 of/)).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);

    // Add one hint and advance so the write persists.
    await page.getByLabel(/Your hint/i).fill("a trigger note");
    await page.getByRole("button", { name: /^Next$/ }).click();
    await expect(page.getByText(/Sentence 2 of/)).toBeVisible();

    // A reload resumes at the saved cursor, not back at sentence one.
    await page.reload();
    await expect(page.getByText(/Sentence 2 of/)).toBeVisible();

    // Walk to the final sentence.
    for (let i = 0; i < 40; i++) {
      const finish = page.getByRole("button", { name: /Finish and vault/i });
      if (await finish.isVisible().catch(() => false)) break;
      await page.getByRole("button", { name: /^Next$/ }).click();
    }
    await page.getByRole("button", { name: /Finish and vault/i }).click();

    // Choose the short delay and vault.
    await page.getByRole("radio", { name: /In 15 minutes/i }).check();
    await page.getByRole("button", { name: /Vault it/i }).click();

    // The dashboard now shows the vaulted attempt, with no original on screen.
    await expect(page.getByRole("heading", { name: /your attempts/i })).toBeVisible();
    await expect(page.getByText(/Vaulted/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /add to calendar/i }).first()).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
  });
});
