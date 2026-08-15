import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width + 1);
}

async function openLogMenu(page: Page) {
  const firstCategory = page.locator("button[data-log-category]").first();
  if (await firstCategory.isVisible()) return;

  // HomePage installs the custom-event listener in a React effect. Waiting for
  // the rendered BIXBO title prevents dispatching the event during the initial
  // hydration/skeleton commit, where the event would otherwise be lost.
  await expect(page.locator("[data-bixbo-display-title]").first()).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("bixbo:toggle-log")));
  await expect(firstCategory).toBeVisible();
}

test("core routes stay inside the viewport", async ({ page }) => {
  for (const route of ["/", "/insights", "/notes", "/settings"]) {
    await page.goto(route);
    await expect(page.locator("body")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});

test("every visible default Log category opens without clipping", async ({ page }) => {
  await page.goto("/");
  await openLogMenu(page);

  const ids = await page.locator("button[data-log-category]").evaluateAll((nodes) =>
    nodes.filter((node) => (node as HTMLElement).offsetParent !== null)
      .map((node) => (node as HTMLElement).dataset.logCategory)
      .filter((value): value is string => Boolean(value)),
  );
  expect(ids.length).toBeGreaterThan(5);

  for (const id of ids) {
    await openLogMenu(page);
    const button = page.locator(`button[data-log-category="${id}"]`);
    await expect(button).toBeVisible();
    await button.click();

    const surface = page.locator("[data-bixbo-log-surface]");
    await expect(surface).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const box = await surface.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      const viewport = page.viewportSize();
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual((viewport?.width ?? box.width) + 1);
    }

    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(surface).toBeHidden();
  }
});