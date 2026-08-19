import { expect, test, type Page } from "@playwright/test";

async function openLogMenu(page: Page) {
  const firstCategory = page.locator("button[data-log-category]").first();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (await firstCategory.isVisible()) return;
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("bixbo:toggle-log")));
    try {
      await firstCategory.waitFor({ state: "visible", timeout: 500 });
      return;
    } catch {
      // Retry until Home's log-toggle effect is installed.
    }
  }
  await expect(firstCategory).toBeVisible();
}

test("a fast double click cannot skip two Pain wizard steps", async ({ page }) => {
  await page.goto("/");
  await openLogMenu(page);
  await page.locator('button[data-log-category="pain"]').click();

  const surface = page.locator('[data-bixbo-log-surface="pain"]');
  const nav = surface.locator(":scope > div > div.sticky").first();
  await expect(nav.getByText("1/5", { exact: true })).toBeVisible();

  await nav.getByRole("button", { name: "Next", exact: true }).dblclick({ delay: 40 });
  await expect(nav.getByText("2/5", { exact: true })).toBeVisible();
  await expect(nav.getByText("3/5", { exact: true })).toHaveCount(0);
});
