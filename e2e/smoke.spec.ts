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

test.describe("ledger and durability", () => {
  test("the Ledger nav link opens the empty ledger at 390px", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Ledger" }).click();
    await expect(page).toHaveURL(/\/ledger$/);
    await expect(
      page.getByRole("heading", { name: /your record starts with the first rebuild/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /browse passages/i })).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test("importing a record file lands a working ledger entry", async ({ page }) => {
    // One valid reconstructed attempt, built inline as a real export file.
    const when = Date.UTC(2026, 8, 14, 12, 0, 0);
    const record = {
      id: "e2e-ledger-1",
      status: "reconstructed",
      createdAt: when,
      passage: {
        originalPassageId: null,
        title: "A Ledger Passage",
        author: "A Writer",
        source: "Test",
        year: 1900,
        sentences: ["Alpha beta gamma."],
        isCustom: true,
      },
      hints: ["a hint"],
      cursor: 1,
      delayType: "micro",
      vaultedAt: when - 2,
      vaultedUntil: when - 1,
      reconstructionText: "Alpha beta delta.",
      reconstructedAt: when,
      alignment: {
        version: 1,
        pairs: [
          {
            matchType: "matched",
            original: "Alpha beta gamma.",
            your: "Alpha beta delta.",
            originalSpans: [
              { text: "Alpha", kind: "same" },
              { text: "beta", kind: "same" },
              { text: "gamma.", kind: "onlyInOriginal" },
            ],
            yourSpans: [
              { text: "Alpha", kind: "same" },
              { text: "beta", kind: "same" },
              { text: "delta.", kind: "onlyInYours" },
            ],
            originalWords: 3,
            yourWords: 3,
            lengthDelta: 0,
            similarity: 0.66,
          },
        ],
      },
    };
    const exportFile = {
      format: "franklins-gym-record",
      version: 1,
      exportedAt: 0,
      attempts: [record],
    };

    await page.goto("/ledger");
    await expect(
      page.getByRole("heading", { name: /your record starts with the first rebuild/i }),
    ).toBeVisible();

    await page.setInputFiles('input[type="file"]', {
      name: "franklins-gym-record.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(exportFile)),
    });

    await expect(page.getByText("Restored 1 attempt.")).toBeVisible();
    const entry = page.getByRole("listitem").first();
    await expect(entry.getByText(/2026/)).toBeVisible();

    // Following the entry lands on the real alignment view.
    await entry.getByRole("link", { name: /see alignment/i }).click();
    await expect(page).toHaveURL(/\/align\//);
    await expect(page.getByText("In the original", { exact: true })).toBeVisible();
    await expect(page.getByText("In yours", { exact: true })).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
  });
});

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
