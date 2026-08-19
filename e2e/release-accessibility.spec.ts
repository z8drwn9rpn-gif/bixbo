import { expect, test, type Page } from "@playwright/test";

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

test("critical controls keep accessible names, landmarks and a blur-free paint path", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#main-content")).toBeVisible();
  const visibleNavigationCount = await page
    .locator('nav[aria-label="Primary navigation"], nav[aria-label="Sidebar navigation"]')
    .evaluateAll((nodes) => nodes.filter((node) => (node as HTMLElement).offsetParent !== null).length);
  expect(visibleNavigationCount).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Previous month" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next month" })).toBeVisible();
  await expect(page.locator("[data-bixbo-home-paint-island]").getByRole("link", { name: "Profile", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "PDF reports", exact: true })).toBeVisible();

  const duplicateHtmlIds = await page.evaluate(() => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const element of document.querySelectorAll<HTMLElement>("[id]")) {
      if (element.closest("svg")) continue;
      if (seen.has(element.id)) duplicates.add(element.id);
      else seen.add(element.id);
    }
    return [...duplicates].sort();
  });
  expect(duplicateHtmlIds).toEqual([]);

  const blurredVisibleElements = await page.evaluate(() => {
    const results: string[] = [];
    for (const element of document.querySelectorAll<HTMLElement>("body[data-bixbo-app-root] *")) {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const backdrop = style.backdropFilter || style.getPropertyValue("-webkit-backdrop-filter") || "none";
      if (backdrop && backdrop !== "none") {
        results.push(`${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}:${backdrop}`);
      }
    }
    return results.slice(0, 20);
  });
  expect(blurredVisibleElements).toEqual([]);

  await openLogMenu(page);
  await page.locator('button[data-log-category="pain"]').click();
  await expect(page.getByLabel("Log date")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("2/5", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();

  await page.goto("/profile");
  await expect(page.getByRole("link", { name: "Manage meds", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "App diagnostics", exact: true })).toBeVisible();

  await page.goto("/meds");
  await expect(page.getByRole("button", { name: "Add", exact: true })).toBeVisible();
});

test("Reduce Motion collapses app transition timing", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const profileLink = page.locator("[data-bixbo-home-paint-island]").getByRole("link", { name: "Profile", exact: true });
  const durationMs = await profileLink.evaluate((element) => {
    const values = getComputedStyle(element).transitionDuration.split(",");
    const toMs = (value: string) => {
      const trimmed = value.trim();
      if (trimmed.endsWith("ms")) return Number.parseFloat(trimmed);
      if (trimmed.endsWith("s")) return Number.parseFloat(trimmed) * 1000;
      return 0;
    };
    return Math.max(0, ...values.map(toMs));
  });

  expect(durationMs).toBeLessThanOrEqual(0.1);
});
