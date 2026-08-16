import { expect, test } from "@playwright/test";

test("App diagnostics runs a full local scan without falling into the error boundary", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

  const response = await page.goto("/diagnostics");
  expect(response?.status()).toBeLessThan(500);

  await expect(page.getByText("This page didn't load", { exact: true })).toHaveCount(0);
  await expect(page.getByText("BIXBO App Scanner", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run scan", exact: true })).toBeVisible();

  await expect(page.getByText("Local storage", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("BIXBO data", { exact: true })).toBeVisible();
  await expect(page.getByText("PWA manifest", { exact: true })).toBeVisible();
  await expect(page.getByText("Push service worker", { exact: true })).toBeVisible();
  await expect(page.getByText("Home", { exact: true })).toBeVisible();
  await expect(page.getByText("Notifications", { exact: true })).toBeVisible();
  await expect(page.getByText("Patterns", { exact: true })).toBeVisible();
  await expect(page.getByText("Notes", { exact: true })).toBeVisible();

  expect(pageErrors, `Diagnostics page errors:\n${pageErrors.join("\n\n")}`).toEqual([]);
});

test("runtime JavaScript errors are surfaced as a BIXBO diagnostic alert", async ({ page }) => {
  await page.goto("/");

  await page.evaluate(() => {
    window.dispatchEvent(new ErrorEvent("error", { message: "E2E diagnostic probe" }));
  });

  await expect(page.getByText("BIXBO detected an app error", { exact: true })).toBeVisible();
  await expect(page.getByText(/Home: .*E2E diagnostic probe/)).toBeVisible();
  await expect(page.getByRole("button", { name: "App scan", exact: true })).toBeVisible();
});
