import { expect, test } from "@playwright/test";

test("audited PDF health report loads and opens the printable preview", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

  const response = await page.goto("/report");
  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByText("This page didn't load", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Doctor-friendly summary using the current BIXBO data model and audited calculations.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^At a glance/ }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Symptom timeline/ }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Symptom frequency/ }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Pain trend/ }).first()).toBeVisible();
  await expect(page.getByText("Mild (1–25%)", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Most painful day", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Best day without pain", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Observed patterns", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("A pain-free day requires an explicit 0/10 pain value. Missing pain data is never treated as zero.", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Medication", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Detailed timeline", exact: true }).first()).toBeVisible();
  await expect(page.getByText("Clinical profile", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Urinary-only", { exact: true })).toHaveCount(0);
  await expect(page.locator(".metrics.ten").first()).toHaveCSS("grid-template-columns", /px .*px .*px .*px .*px .*px .*px .*px .*px .*px/);

  const frequencyColumn = page.locator(".screenPreview .overviewGrid > div").nth(1);
  const rightColumnHeadings = await frequencyColumn.locator("h2").allTextContents();
  const frequencyIndex = rightColumnHeadings.findIndex((text) => text.startsWith("Symptom frequency"));
  const patternsIndex = rightColumnHeadings.findIndex((text) => text.startsWith("Observed patterns"));
  expect(frequencyIndex).toBeGreaterThanOrEqual(0);
  expect(patternsIndex).toBeGreaterThan(frequencyIndex);

  await page.getByRole("button", { name: "Preview / Save PDF", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save PDF", exact: true })).toBeVisible();
  await expect(page.locator(".modal .pdf-sheet").first()).toBeVisible();
  await expect(page.locator(".modal .pdf-sheet").first()).toHaveCSS("width", "1120px");
  await expect(page.locator(".modal").getByText("Observed patterns", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".modal").getByText("Clinical profile", { exact: true })).toHaveCount(0);
  await expect(page.locator(".modal").getByText("Urinary-only", { exact: true })).toHaveCount(0);

  expect(pageErrors, `PDF report page errors:\n${pageErrors.join("\n\n")}`).toEqual([]);
});

test("Profile PDF export opens the PDF reports page directly", async ({ page }) => {
  const response = await page.goto("/profile");
  expect(response?.status()).toBeLessThan(500);

  const pdfExport = page.getByRole("button", { name: /^PDF export/ });
  await expect(pdfExport).toBeVisible();
  await expect(page.getByText("Create a doctor-friendly PDF health report", { exact: true })).toBeVisible();

  await pdfExport.click();
  await expect(page).toHaveURL(/\/report$/);
  await expect(page.getByText("Doctor-friendly summary using the current BIXBO data model and audited calculations.", { exact: true })).toBeVisible();
});
