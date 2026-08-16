import { expect, test } from "@playwright/test";

test("App diagnostics runs a full local scan without falling into the error boundary", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

  const response = await page.goto("/diagnostics");
  expect(response?.status()).toBeLessThan(500);

  await expect(page.getByText("This page didn't load", { exact: true })).toHaveCount(0);
  await expect(page.getByText("BIXBO App Scanner", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run scan", exact: true })).toBeVisible();

  const scanner = page.locator("#main-content");
  await expect(scanner.getByText("Local storage", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(scanner.getByText("BIXBO data", { exact: true })).toBeVisible();
  await expect(scanner.getByText("PWA manifest", { exact: true })).toBeVisible();
  await expect(scanner.getByText("Push service worker", { exact: true })).toBeVisible();
  await expect(scanner.getByText("Home", { exact: true })).toBeVisible();
  await expect(scanner.getByText("Notifications", { exact: true })).toBeVisible();
  await expect(scanner.getByText("Patterns", { exact: true })).toBeVisible();
  await expect(scanner.getByText("Notes", { exact: true })).toBeVisible();

  expect(pageErrors, `Diagnostics page errors:\n${pageErrors.join("\n\n")}`).toEqual([]);
});

test("runtime JavaScript errors are surfaced as a BIXBO diagnostic alert", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-bixbo-app-root]")).toBeVisible();

  await page.evaluate(() => window.localStorage.removeItem("bixbo:runtime-diagnostics:v1"));

  // WebKit can finish navigation before React effects have installed the global
  // error listener. Retry the synthetic probe until the real diagnostics store
  // confirms that the listener is active, rather than relying on a fixed delay.
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          window.dispatchEvent(new ErrorEvent("error", { message: "E2E diagnostic probe" }));
          const raw = window.localStorage.getItem("bixbo:runtime-diagnostics:v1");
          return Boolean(raw?.includes("E2E diagnostic probe"));
        }),
      { timeout: 5_000 },
    )
    .toBe(true);

  await expect(page.getByText("BIXBO detected an app error", { exact: true })).toBeVisible();
  await expect(page.getByText(/Home: .*E2E diagnostic probe/)).toBeVisible();
  await expect(page.getByRole("button", { name: "App scan", exact: true })).toBeVisible();
});

test("Profile exposes a manual App scan launcher", async ({ page }) => {
  await page.goto("/profile");

  const launcher = page.getByRole("link", { name: "App diagnostics", exact: true });
  await expect(launcher).toBeVisible();
  await launcher.click();

  await expect(page).toHaveURL(/\/diagnostics(?:\?|$)/);
  await expect(page.getByText("BIXBO App Scanner", { exact: true })).toBeVisible();
  await expect(page.getByText("This page didn't load", { exact: true })).toHaveCount(0);
});
