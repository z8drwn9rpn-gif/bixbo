import { expect, test } from "@playwright/test";

test("auth text fields keep native mobile editing behavior with user zoom enabled", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "mobile-only text editing regression");

  await page.goto("/auth");
  const email = page.getByLabel("Email");
  await email.fill("first.line@example.com");
  await email.focus();

  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).toContain("width=device-width");
  expect(viewport).toContain("initial-scale=1");
  expect(viewport).toContain("viewport-fit=cover");
  expect(viewport).not.toContain("user-scalable=no");
  expect(viewport).not.toContain("maximum-scale=1");
  expect(viewport).not.toContain("minimum-scale=1");

  const editing = await email.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      fontSize: Number.parseFloat(style.fontSize),
      userSelect: style.userSelect,
      touchAction: style.touchAction,
    };
  });

  // 16px prevents Safari's automatic input-focus zoom while preserving the
  // user's native pinch zoom and normal caret/selection behavior.
  expect(editing.fontSize).toBeGreaterThanOrEqual(16);
  expect(editing.userSelect).not.toBe("none");
  expect(editing.touchAction).not.toBe("none");
});
