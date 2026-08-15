import { expect, test } from "@playwright/test";

test("Day overview keeps bowel Type 0 and episode treatment cards distinct", async ({ page }) => {
  const date = new Date().toISOString().slice(0, 10);
  await page.addInitScript(({ date }) => {
    localStorage.setItem(
      "bixbo:v2",
      JSON.stringify({
        dayLogs: {
          [date]: {
            bowel: [
              {
                id: "bowel-type-0",
                time: "08:10",
                bristol: 0,
                feelings: [],
                symptoms: [],
                urinary: [],
              },
            ],
            heat: [
              {
                id: "tens-e2e",
                start: "09:00",
                kind: "tens",
                minutes: 20,
                ongoing: false,
                note: "",
              },
            ],
            panic: [
              {
                id: "panic-e2e",
                time: "10:00",
                intensity: 7,
                minutes: 10,
                trigger: "",
                physical: [],
                cognitive: [],
                hyperventilation: "no",
                tetanyPresent: false,
                helped: [],
                rescueMed: "",
                note: "",
              },
            ],
            tetany: [
              {
                id: "tetany-e2e",
                time: "11:00",
                types: [],
                intensity: 3,
                minutes: 15,
                triggers: [],
                location: [],
                helped: [],
                rescueMed: "",
                note: "",
              },
            ],
          },
        },
      }),
    );
  }, { date });

  await page.goto("/");

  await expect(page.getByText("Bowel", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Type 0/).first()).toBeVisible();
  await expect(page.getByText("No bowel movement", { exact: true })).toHaveCount(0);

  await expect(page.getByText("Heat / Cold / TENS", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Type:\s*TENS/).first()).toBeVisible();
  await expect(page.getByText("Panic episode", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Tetany episode", { exact: true }).first()).toBeVisible();
});
