import { expect, test } from "@playwright/test";

test("Insights offers one switchable symptoms trend bar chart", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

  const response = await page.goto("/insights");
  expect(response?.status()).toBeLessThan(500);
  await page.getByRole("group", { name: "Insights sections" }).getByRole("button", { name: "Symptoms", exact: true }).click();

  const card = page.locator('[data-symptoms-trend-card="true"]');
  await expect(card).toBeVisible();
  await expect(card.getByText("Symptoms trend", { exact: true })).toBeVisible();

  const period = card.getByRole("group", { name: "Symptoms trend period" });
  await expect(period.getByRole("button", { name: "Week", exact: true })).toBeVisible();
  await expect(period.getByRole("button", { name: "Month", exact: true })).toBeVisible();
  await expect(period.getByRole("button", { name: "Year", exact: true })).toBeVisible();

  const symptoms = card.getByRole("group", { name: "Symptom shown in chart" });
  for (const label of ["Headache", "Tetany", "Panic", "Nausea", "Pressure", "Hot flashes"]) {
    await expect(symptoms.getByRole("button", { name: label, exact: true })).toBeVisible();
  }

  await symptoms.getByRole("button", { name: "Tetany", exact: true }).click();
  await expect(card.getByText("Intensity 0–5", { exact: true })).toBeVisible();
  await symptoms.getByRole("button", { name: "Panic", exact: true }).click();
  await expect(card.getByText("Intensity 0–10", { exact: true })).toBeVisible();
  await symptoms.getByRole("button", { name: "Hot flashes", exact: true }).click();
  await expect(card.getByText("Intensity 0–5", { exact: true })).toBeVisible();

  expect(pageErrors, `Symptoms trend page errors:\n${pageErrors.join("\n\n")}`).toEqual([]);
});
