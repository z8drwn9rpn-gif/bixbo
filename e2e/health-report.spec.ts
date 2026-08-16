import { expect, test } from "@playwright/test";

test("audited PDF health report loads and opens the printable preview", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

  const response = await page.goto("/report");
  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByText("This page didn't load", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Doctor-friendly summary using the current BIXBO data model and audited calculations.", { exact: true })).toBeVisible();
  await expect(page.getByText("At a glance", { exact: true })).toBeVisible();
  await expect(page.getByText("Symptom intensity overview", { exact: true })).toBeVisible();
  await expect(page.getByText("Medication", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Preview / Save PDF", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save PDF", exact: true })).toBeVisible();
  await expect(page.locator(".modal .pdf-sheet").first()).toBeVisible();
  await expect(page.locator(".modal .pdf-sheet").first()).toHaveCSS("width", "1120px");

  expect(pageErrors, `PDF report page errors:\n${pageErrors.join("\n\n")}`).toEqual([]);
});
