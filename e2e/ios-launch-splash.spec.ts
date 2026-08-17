import { expect, test } from "@playwright/test";

test("standalone launch hands off from the BIXBO overlay without an artificial one-second hold", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: true,
    });
  });

  await page.goto("/");

  const splash = page.locator("#bixbo-ios-launch-splash");
  const mascot = splash.locator("img");

  await expect(mascot).toHaveAttribute("src", /bixbo-mascot-user\.png\?v=20260816-launch6/);
  await expect(page.locator("html")).toHaveAttribute("data-bixbo-pwa-launch", "hidden", { timeout: 900 });
  await expect(splash).toBeHidden();
});

test("normal browser navigation does not replay the standalone splash", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#bixbo-ios-launch-splash")).toBeHidden();
  await expect(page.locator("html")).toHaveAttribute("data-bixbo-pwa-launch", "hidden");
});
