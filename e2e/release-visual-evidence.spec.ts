import { expect, test, type Page, type TestInfo } from "@playwright/test";

async function attachViewport(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: false }),
    contentType: "image/png",
  });
}

async function openLogMenu(page: Page) {
  const firstCategory = page.locator("button[data-log-category]").first();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (await firstCategory.isVisible()) return;
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("bixbo:toggle-log")));
    try {
      await firstCategory.waitFor({ state: "visible", timeout: 500 });
      return;
    } catch {
      // Retry until Home's log-toggle effect is installed.
    }
  }
  await expect(firstCategory).toBeVisible();
}

async function advancePain(page: Page, to: number) {
  const nav = page.locator('[data-bixbo-log-surface="pain"] > div > div.sticky').first();
  for (let step = 1; step < to; step += 1) {
    await expect(nav.getByText(`${step}/5`, { exact: true })).toBeVisible();
    await nav.getByRole("button", { name: "Next", exact: true }).click();
    await expect(nav.getByText(`${step + 1}/5`, { exact: true })).toBeVisible();
    if (step + 1 < to) await page.waitForTimeout(275);
  }
}

test("capture release visual evidence for the highest-risk BIXBO surfaces", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("bixbo:theme-choice")) localStorage.setItem("bixbo:theme-choice", "light");
  });

  await page.goto("/");
  await expect(page.locator("[data-bixbo-home-paint-island]")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await attachViewport(page, testInfo, "home-light.png");

  await page.evaluate(() => localStorage.setItem("bixbo:theme-choice", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await attachViewport(page, testInfo, "home-dark.png");

  await openLogMenu(page);
  await page.locator('button[data-log-category="pain"]').click();
  const painSurface = page.locator('[data-bixbo-log-surface="pain"]');
  await expect(painSurface).toBeVisible();
  await advancePain(page, 4);
  await attachViewport(page, testInfo, "pain-page-4-episodes.png");

  await page.evaluate(() => {
    const raw = localStorage.getItem("bixbo:v2");
    const data = raw ? JSON.parse(raw) : {};
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    data.events = [
      {
        id: "release-event",
        title: "Release QA event",
        startDate: date,
        endDate: date,
        time: "14:30",
      },
    ];
    localStorage.setItem("bixbo:v2", JSON.stringify(data));
  });
  await page.goto("/?calendar=events&calendarEvent=release-event");
  await expect(page.getByRole("dialog", { name: "Calendar events" })).toBeVisible({ timeout: 10_000 });
  await attachViewport(page, testInfo, "calendar-events-notification-target.png");

  await page.goto("/profile");
  await expect(page.getByRole("link", { name: "Manage meds", exact: true })).toBeVisible();
  await attachViewport(page, testInfo, "profile.png");

  await page.goto("/meds");
  await expect(page.getByRole("heading", { name: "My medications", exact: true })).toBeVisible();
  await attachViewport(page, testInfo, "manage-meds.png");
});
