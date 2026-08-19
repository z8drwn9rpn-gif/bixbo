import { expect, test, type Page } from "@playwright/test";

async function openLogCategory(page: Page, id: string) {
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("bixbo:toggle-log")));
  await page.locator(`button[data-log-category="${id}"]`).click();
  await expect(page.locator("[data-bixbo-log-surface]")).toBeVisible();
  await expect(page.locator("[data-bixbo-log-date-control]")).toBeVisible();
}

async function expectDateNavContiguous(page: Page, navSelector: string) {
  await expect.poll(async () => page.evaluate((selector) => {
    const date = document.querySelector<HTMLElement>("[data-bixbo-log-date-control]");
    const nav = document.querySelector<HTMLElement>(selector);
    if (!date || !nav) return 999;
    return nav.getBoundingClientRect().top - date.getBoundingClientRect().bottom;
  }, navSelector)).toBeLessThanOrEqual(1.5);

  const gap = await page.evaluate((selector) => {
    const date = document.querySelector<HTMLElement>("[data-bixbo-log-date-control]")!;
    const nav = document.querySelector<HTMLElement>(selector)!;
    return nav.getBoundingClientRect().top - date.getBoundingClientRect().bottom;
  }, navSelector);

  // A negative value would mean the navigation is covering the date control.
  expect(gap).toBeGreaterThanOrEqual(-1.5);
}

async function closeLog(page: Page) {
  const surface = page.locator("[data-bixbo-log-surface]");
  const saveBar = surface.locator("[data-bixbo-log-save-bar]");
  if (await saveBar.count()) {
    await saveBar.getByRole("button", { name: "Back", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Close", exact: true }).click();
  }
  await expect(surface).toBeHidden();
}

test("standard logs have no visible gap between the date row and Back/Save", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('nav[aria-label="Primary navigation"]')).toBeVisible();

  for (const id of ["meds", "period", "sex"]) {
    await openLogCategory(page, id);
    await expectDateNavContiguous(page, '[data-bixbo-log-surface="standard"] [data-bixbo-log-save-bar]');
    await closeLog(page);
  }
});

test("Pain has no visible gap between the date row and Back/Next on every step", async ({ page }) => {
  await page.goto("/");
  await openLogCategory(page, "pain");

  const navSelector = '[data-bixbo-log-surface="pain"] > div > div.sticky';
  const nav = page.locator(navSelector).first();
  await expect(nav).toBeVisible();

  for (let step = 0; step < 5; step += 1) {
    await expectDateNavContiguous(page, navSelector);
    if (step < 4) await nav.getByRole("button", { name: "Next", exact: true }).click();
  }
});
