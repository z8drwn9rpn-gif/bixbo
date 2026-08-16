import { expect, test } from "@playwright/test";

test("standalone launch paints the BIXBO penguin for one second", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: true,
    });
  });

  await page.goto("/");

  const splash = page.locator("#bixbo-ios-launch-splash");
  const mascot = splash.locator("img");

  await expect(splash).toBeVisible({ timeout: 500 });
  await expect(mascot).toHaveAttribute("src", /bixbo-mascot-user\.png\?v=20260816-launch6/);
  await expect(mascot).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-bixbo-pwa-launch", "visible");

  await expect(splash).toBeHidden({ timeout: 1_800 });
  await expect(page.locator("html")).toHaveAttribute("data-bixbo-pwa-launch", "hidden");
});

test("normal browser navigation does not replay the standalone splash", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#bixbo-ios-launch-splash")).toBeHidden();
  await expect(page.locator("html")).toHaveAttribute("data-bixbo-pwa-launch", "hidden");
});
