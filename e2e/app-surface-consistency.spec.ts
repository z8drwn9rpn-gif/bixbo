import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width + 1);
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
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("bixbo:toggle-log")));
  const ids = await page.locator("button[data-log-category]").evaluateAll((nodes) =>
    nodes.filter((node) => (node as HTMLElement).offsetParent !== null)
      .map((node) => (node as HTMLElement).dataset.logCategory)
      .filter((value): value is string => Boolean(value)),
  );
  expect(ids.length).toBeGreaterThan(5);

  for (const id of ids) {
    const button = page.locator(`button[data-log-category="${id}"]`);
    if (!(await button.isVisible())) {
      await page.evaluate(() => window.dispatchEvent(new CustomEvent("bixbo:toggle-log")));
    }
    await page.locator(`button[data-log-category="${id}"]`).click();
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
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("bixbo:toggle-log")));
  }
});
