import { expect, test } from "@playwright/test";

test("auth text fields keep native mobile editing behavior with page zoom locked", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "mobile-only text editing regression");

  await page.goto("/auth");
  const email = page.getByLabel("Email");
  await email.fill("first.line@example.com");
  await email.focus();

  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).toContain("width=device-width");
  expect(viewport).toContain("initial-scale=1");
  expect(viewport).toContain("viewport-fit=cover");
  expect(viewport).toContain("user-scalable=no");
  expect(viewport).toContain("maximum-scale=1");
  expect(viewport).toContain("minimum-scale=1");

  const editing = await email.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      fontSize: Number.parseFloat(style.fontSize),
      userSelect: style.userSelect,
      touchAction: style.touchAction,
    };
  });

  // 16px still prevents Safari's automatic input-focus zoom. Page-level pinch
  // zoom is locked separately by the viewport/CSS policy; native caret and text
  // selection must remain unaffected.
  expect(editing.fontSize).toBeGreaterThanOrEqual(16);
  expect(editing.userSelect).not.toBe("none");
  expect(editing.touchAction).not.toBe("none");
});
