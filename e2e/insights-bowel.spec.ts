import { expect, test } from "@playwright/test";

test("Insights shows one unified Bowel analytics card", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

  const response = await page.goto("/insights");
  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByText("This page didn't load", { exact: true })).toHaveCount(0);

  await page.getByRole("group", { name: "Insights sections" }).getByRole("button", { name: "Bowel", exact: true }).click();
  await expect(page.locator('[data-bowel-overview-card="true"]')).toBeVisible();
  await expect(page.getByText("Distribution of logged bowel types", { exact: true })).toBeVisible();
  await expect(page.getByText("Quick insights", { exact: true })).toBeVisible();
  await expect(page.getByText("Latest entries", { exact: true })).toBeVisible();
  await expect(page.getByText("Bowel trend", { exact: true })).toHaveCount(0);
  await expect(page.getByText("No bowel movements", { exact: false }).first()).toBeVisible();

  expect(pageErrors, `Insights bowel page errors:\n${pageErrors.join("\n\n")}`).toEqual([]);
});
