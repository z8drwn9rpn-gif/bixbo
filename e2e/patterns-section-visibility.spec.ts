import { expect, test } from "@playwright/test";

test("monthly Patterns keeps every accordion label and explanation visible", async ({ page }) => {
  await page.goto("/patterns");

  // CI can boot with either the English or Slovak BIXBO locale. This regression
  // checks the same Monthly UI in both languages instead of coupling visibility
  // coverage to whichever locale happened to be persisted first.
  const monthly = page.getByRole("button", { name: /^(Monthly|Mesačne)$/ });
  await expect(monthly).toBeVisible();
  await monthly.click();

  const expected = [
    [/^(Panic & tetany|Panika a tetánia)$/, /^(Monthly frequency and intensity comparison|Mesačné porovnanie frekvencie a intenzity)$/],
    [/^(Symptoms|Príznaky)$/, /^(Hot flashes, headaches and pressure|Návaly tepla, bolesti hlavy a tlak)$/],
    [/^(Lifestyle & routines|Životný štýl a rutiny)$/, /^(Sleep, weight, medication and workouts|Spánok, hmotnosť, lieky a cvičenie)$/],
    [/^(Hormones|Hormóny)$/, /^(PCOS and histamine changes|Zmeny PCOS a histamínu)$/],
  ] as const;

  for (const [title, subtitle] of expected) {
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText(subtitle)).toBeVisible();
  }
});
