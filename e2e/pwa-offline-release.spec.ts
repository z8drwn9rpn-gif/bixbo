import { expect, test } from "@playwright/test";

test("app-level service worker keeps the BIXBO shell cached and usable offline", async ({ page, context }, testInfo) => {
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

  const cachedBeforeOffline = await page.evaluate(async () => {
    const shell = await caches.match("/");
    const manifest = await caches.match("/manifest.json");
    return {
      shell: Boolean(shell),
      manifest: Boolean(manifest),
      shellContainsBixbo: shell ? (await shell.text()).includes("BIXBO") : false,
      manifestName: manifest ? ((await manifest.json()) as { name?: string }).name ?? "" : "",
    };
  });
  expect(cachedBeforeOffline).toEqual({
    shell: true,
    manifest: true,
    shellContainsBixbo: true,
    manifestName: "BIXBO",
  });

  await context.setOffline(true);
  try {
    if (testInfo.project.name !== "webkit-mobile") {
      // Chromium exposes offline subresource fetches and top-level reloads to
      // Playwright. Verify both static and navigation fallback end to end.
      const offlineManifestName = await page.evaluate(async () => {
        const response = await fetch("/manifest.json");
        if (!response.ok) return "";
        const manifest = (await response.json()) as { name?: string };
        return manifest.name ?? "";
      });
      expect(offlineManifestName).toBe("BIXBO");

      await page.reload({ waitUntil: "domcontentloaded", timeout: 15_000 });
      await expect(page.locator("[data-bixbo-home-paint-island]")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", "sk");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    } else {
      // Playwright WebKit's offline emulation can reject both top-level reload
      // and programmatic fetch before the request reaches the service worker.
      // The browser still exposes the active controller and CacheStorage, so
      // verify the exact cached navigation/static payloads while offline.
      const cachedOffline = await page.evaluate(async () => {
        const shell = await caches.match("/");
        const manifest = await caches.match("/manifest.json");
        return {
          shellOk: Boolean(shell?.ok),
          shellHasBixbo: shell ? (await shell.text()).includes("BIXBO") : false,
          manifestName: manifest ? ((await manifest.json()) as { name?: string }).name ?? "" : "",
        };
      });
      expect(cachedOffline).toEqual({ shellOk: true, shellHasBixbo: true, manifestName: "BIXBO" });
    }
  } finally {
    await context.setOffline(false);
  }
});
