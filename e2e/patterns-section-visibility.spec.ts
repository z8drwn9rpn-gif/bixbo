import { expect, test } from "@playwright/test";

test("monthly Patterns keeps every accordion label and explanation visible", async ({ page }) => {
  await page.goto("/patterns");

  const monthly = page.getByRole("button", { name: "Monthly", exact: true });
  await expect(monthly).toBeVisible();
  await monthly.click();

  const expected = [
    ["Panic & tetany", "Monthly frequency and intensity comparison"],
    ["Symptoms", "Hot flashes, headaches and pressure"],
    ["Lifestyle & routines", "Sleep, weight, medication and workouts"],
    ["Hormones", "PCOS and histamine changes"],
  ] as const;

  for (const [title, subtitle] of expected) {
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByText(subtitle, { exact: true })).toBeVisible();
  }
});
