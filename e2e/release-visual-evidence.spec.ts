import { expect, test, type Page, type TestInfo } from "@playwright/test";

async function attachViewport(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: false }),
    contentType: "image/png",
  });
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

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("bixbo:toggle-log")));
  await page.locator('button[data-log-category="pain"]').click();
  const painSurface = page.locator('[data-bixbo-log-surface="pain"]');
  const painNav = painSurface.locator(":scope > div > div.sticky").first();
  await expect(painSurface).toBeVisible();
  for (let index = 0; index < 3; index += 1) {
    await painNav.getByRole("button", { name: "Next", exact: true }).click();
  }
  await expect(painNav.getByText("4/5", { exact: true })).toBeVisible();
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
