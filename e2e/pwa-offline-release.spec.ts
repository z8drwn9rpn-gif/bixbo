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
    };
  });
  expect(cachedBeforeOffline).toEqual({ shell: true, manifest: true, shellContainsBixbo: true });

  await context.setOffline(true);
  try {
    // This goes through the active service worker and proves a cached static
    // resource remains readable when the browser network is disabled.
    const offlineManifestName = await page.evaluate(async () => {
      const response = await fetch("/manifest.json");
      if (!response.ok) return "";
      const manifest = (await response.json()) as { name?: string };
      return manifest.name ?? "";
    });
    expect(offlineManifestName).toBe("BIXBO");

    if (testInfo.project.name !== "webkit-mobile") {
      // Chromium reliably exposes offline top-level reloads to Playwright. Its
      // successful reload verifies the navigation fallback end to end.
      await page.reload({ waitUntil: "domcontentloaded", timeout: 15_000 });
      await expect(page.locator("[data-bixbo-home-paint-island]")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", "sk");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    } else {
      // Playwright WebKit can surface an internal driver error for offline
      // top-level reloads even when the service worker cache is healthy. Verify
      // the exact cached navigation shell directly instead of masking that as an
      // app failure.
      const offlineShell = await page.evaluate(async () => {
        const shell = await caches.match("/");
        return shell ? { ok: shell.ok, hasBixbo: (await shell.text()).includes("BIXBO") } : null;
      });
      expect(offlineShell).toEqual({ ok: true, hasBixbo: true });
    }
  } finally {
    await context.setOffline(false);
  }
});
