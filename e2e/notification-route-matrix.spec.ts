import { expect, test } from "@playwright/test";

const DIRECT_LOG_ROUTES = ["meds", "period", "pain", "temp"] as const;

test.describe("notification action route matrix", () => {
  for (const log of DIRECT_LOG_ROUTES) {
    test(`/?log=${log} opens the ${log} action surface`, async ({ page }) => {
      await page.goto(`/?log=${log}`);
      const surface = page.locator("[data-bixbo-log-surface]");
      await expect(surface).toBeVisible();
      await expect(page).not.toHaveURL(new RegExp(`[?&]log=${log}(?:&|$)`));
    });
  }

  test("/?log=menu opens the Log chooser and consumes the one-shot query", async ({ page }) => {
    await page.goto("/?log=menu");
    await expect(page.locator('button[data-log-category="pain"]')).toBeVisible();
    await expect(page.locator('button[data-log-category="meds"]')).toBeVisible();
    await expect(page).not.toHaveURL(/[?&]log=menu(?:&|$)/);
  });

  test("Manage Meds remains a separate explicit route", async ({ page }) => {
    await page.goto("/meds");
    await expect(page.getByRole("heading", { name: "My medications" })).toBeVisible();
    await expect(page.locator("[data-bixbo-log-surface]")).toHaveCount(0);
  });
});
