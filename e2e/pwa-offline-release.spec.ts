import { expect, test } from "@playwright/test";

test("app-level service worker keeps the BIXBO shell usable after an offline reload", async ({ page, context }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "bixbo:v2",
      JSON.stringify({
        settings: {
          language: "sk",
          userName: "Offline QA",
          theme: "dark",
        },
      }),
    );
    localStorage.setItem("bixbo:theme-choice", "dark");
  });

  await page.goto("/");

  const serviceWorkerSupported = await page.evaluate(() => "serviceWorker" in navigator);
  test.skip(!serviceWorkerSupported, "This browser project does not expose ServiceWorker.");

  await expect(page.locator("html")).toHaveAttribute("lang", "sk");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("[data-bixbo-home-paint-island]")).toBeVisible();

  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker.ready;
          return registration.active ? new URL(registration.active.scriptURL).pathname : "";
        }),
      { timeout: 15_000 },
    )
    .toBe("/bixbo-push-sw.js");

  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 15_000 })
    .toBe(true);

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 15_000 });
    await expect(page.locator("[data-bixbo-home-paint-island]")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "sk");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  } finally {
    await context.setOffline(false);
  }
});
