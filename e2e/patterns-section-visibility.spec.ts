import { expect, test } from "@playwright/test";

test("monthly Patterns keeps every accordion label and explanation visible", async ({ page }) => {
  await page.goto("/patterns");

  // PatternTabs exposes the controls as ARIA tabs, not buttons. Target the stable
  // semantic data id so this test is independent of the active BIXBO locale.
  const monthly = page.locator('[data-bixbo-pattern-tab="monthly"]');
  await expect(monthly).toBeVisible();
  await monthly.click();
  await expect(monthly).toHaveAttribute("aria-selected", "true");

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
