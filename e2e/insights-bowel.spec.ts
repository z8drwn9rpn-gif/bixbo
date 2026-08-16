import { expect, test } from "@playwright/test";

test("Insights shows one unified Bowel analytics card", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

  const response = await page.goto("/insights");
  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByText("This page didn't load", { exact: true })).toHaveCount(0);

  const bowelCard = page.locator('[data-bowel-overview-card="true"]');
  await expect(bowelCard).toBeVisible();
  await expect(bowelCard.getByText("Distribution of logged bowel types", { exact: true })).toBeVisible();
  await expect(bowelCard.getByText("Quick insights", { exact: true })).toBeVisible();
  await expect(bowelCard.getByText("Latest entries", { exact: true })).toBeVisible();
  await expect(bowelCard.getByText("Bowel trend", { exact: true })).toHaveCount(0);
  await expect(bowelCard.getByText("No bowel movements", { exact: false }).first()).toBeVisible();

  expect(pageErrors, `Insights bowel page errors:\n${pageErrors.join("\n\n")}`).toEqual([]);
});
