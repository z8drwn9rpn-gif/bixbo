import { expect, test } from "@playwright/test";

test("Food day overview keeps post-meal feeling and histamine flare visible", async ({ page }) => {
  const date = new Date().toISOString().slice(0, 10);
  await page.addInitScript(({ date }) => {
    localStorage.setItem(
      "bixbo:v2",
      JSON.stringify({
        dayLogs: {
          [date]: {
            food: [
              {
                id: "food-e2e",
                time: "12:30",
                what: "Lunch",
                feelings: ["Good"],
                symptomsAfter: ["Bloating"],
                histamineFlare: true,
                histamineSymptoms: ["Flushing"],
              },
            ],
          },
        },
      }),
    );
  }, { date });

  await page.goto("/");
  await expect(page.getByText("Lunch", { exact: true })).toBeVisible();
  await expect(page.getByText("Good", { exact: true })).toBeVisible();
  const flare = page.getByText(/Histamine flare/).first();
  await expect(flare).toBeVisible();
  const color = await flare.evaluate((node) => getComputedStyle(node).color);
  expect(color).not.toBe("rgba(0, 0, 0, 0)");
  await expect(page.getByText("Flushing", { exact: true })).toBeVisible();
});
