import { expect, test } from "@playwright/test";

test("a fast double click cannot skip two Pain wizard steps", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("bixbo:toggle-log")));
  await page.locator('button[data-log-category="pain"]').click();

  const surface = page.locator('[data-bixbo-log-surface="pain"]');
  const nav = surface.locator(":scope > div > div.sticky").first();
  await expect(nav.getByText("1/5", { exact: true })).toBeVisible();

  await nav.getByRole("button", { name: "Next", exact: true }).dblclick({ delay: 40 });
  await expect(nav.getByText("2/5", { exact: true })).toBeVisible();
  await expect(nav.getByText("3/5", { exact: true })).toHaveCount(0);
});
