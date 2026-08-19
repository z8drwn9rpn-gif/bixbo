import { expect, test, type Page } from "@playwright/test";

async function openLogCategory(page: Page, id: string) {
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("bixbo:toggle-log")));
  await page.locator(`button[data-log-category="${id}"]`).click();
  const surface = page.locator("[data-bixbo-log-surface]");
  await expect(surface).toBeVisible();
  return surface;
}

async function expectDateTouchesBar(page: Page, selector: string) {
  const geometry = await page.evaluate((barSelector) => {
    const date = document.querySelector<HTMLElement>("[data-bixbo-log-date-control]");
    const bar = document.querySelector<HTMLElement>(barSelector);
    if (!date || !bar) return null;
    const dateRect = date.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    return { dateBottom: dateRect.bottom, barTop: barRect.top };
  }, selector);

  expect(geometry).not.toBeNull();
  expect(Math.abs((geometry?.barTop ?? 0) - (geometry?.dateBottom ?? 0))).toBeLessThanOrEqual(1.5);
}

async function expectNextSiblingBelow(page: Page, selector: string, minimumGap = 1) {
  const geometry = await page.locator(selector).first().evaluate((bar) => {
    const next = bar.nextElementSibling as HTMLElement | null;
    if (!next) return null;
    const barRect = (bar as HTMLElement).getBoundingClientRect();
    const nextRect = next.getBoundingClientRect();
    const style = getComputedStyle(bar as HTMLElement);
    return {
      barBottom: barRect.bottom,
      nextTop: nextRect.top,
      backdropFilter: style.backdropFilter,
      webkitBackdropFilter: (style as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter ?? "",
    };
  });

  expect(geometry).not.toBeNull();
  expect((geometry?.nextTop ?? 0) - (geometry?.barBottom ?? 0)).toBeGreaterThanOrEqual(minimumGap);
  expect(["", "none"]).toContain(geometry?.backdropFilter ?? "");
  expect(["", "none"]).toContain(geometry?.webkitBackdropFilter ?? "");
}

async function closeCurrentLog(page: Page) {
  const surface = page.locator("[data-bixbo-log-surface]");
  const saveBar = surface.locator("[data-bixbo-log-save-bar]");
  if (await saveBar.count()) {
    await saveBar.getByRole("button", { name: "Back", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Close", exact: true }).click();
  }
  await expect(surface).toBeHidden();
}

test("all standard logs keep Date flush with Back/Save while reserving content space below", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('nav[aria-label="Primary navigation"]')).toBeVisible();

  for (const id of ["meds", "period", "sex", "food", "bowel", "workout", "temp"]) {
    const surface = await openLogCategory(page, id);
    const saveBar = surface.locator("[data-bixbo-log-save-bar]");
    await expect(saveBar).toBeVisible();
    await expectDateTouchesBar(page, "[data-bixbo-log-surface] [data-bixbo-log-save-bar]");
    await expectNextSiblingBelow(page, "[data-bixbo-log-surface] [data-bixbo-log-save-bar]", 8);
    await closeCurrentLog(page);
  }
});

test("Pain pages 1 and 5 keep Date flush with Back/Next and reserve the same content space", async ({ page }) => {
  await page.goto("/");
  const surface = await openLogCategory(page, "pain");
  const nav = surface.locator(":scope > div > div.sticky").first();
  await expect(nav).toBeVisible();

  await expectDateTouchesBar(page, '[data-bixbo-log-surface="pain"] > div > div.sticky');
  await expectNextSiblingBelow(page, '[data-bixbo-log-surface="pain"] > div > div.sticky', 8);

  for (let index = 0; index < 4; index += 1) {
    await nav.getByRole("button", { name: "Next", exact: true }).click();
  }
  await expect(nav.getByText("5/5", { exact: true })).toBeVisible();
  await expectDateTouchesBar(page, '[data-bixbo-log-surface="pain"] > div > div.sticky');
  await expectNextSiblingBelow(page, '[data-bixbo-log-surface="pain"] > div > div.sticky', 8);
});
