import { expect, test } from "@playwright/test";

test("Notifications settings route renders without the app error boundary", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

  const response = await page.goto("/notifications");
  expect(response?.status()).toBeLessThan(500);

  await expect(page.getByText("This page didn't load", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Push notifications", { exact: true })).toBeVisible();
  expect(pageErrors, `Notifications route page errors:\n${pageErrors.join("\n\n")}`).toEqual([]);
});

test("Profile Notifications control navigates to the working settings page", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

  await page.goto("/profile");
  await page.getByRole("button", { name: /Notifications/i }).click();

  await expect(page).toHaveURL(/\/notifications(?:\?|$)/);
  await expect(page.getByText("This page didn't load", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Push notifications", { exact: true })).toBeVisible();
  expect(pageErrors, `Profile → Notifications page errors:\n${pageErrors.join("\n\n")}`).toEqual([]);
});
