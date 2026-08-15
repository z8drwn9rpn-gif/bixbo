import { expect, test } from "@playwright/test";

test("mobile Pain note keeps the background locked and BottomNav stable", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "mobile-only iOS keyboard regression");

  await page.goto("/");
  const bottomNav = page.locator('nav[aria-label="Primary navigation"]');
  await expect(bottomNav).toBeVisible();

  await page.evaluate(() => {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, Math.min(360, maxScroll));
  });
  await page.waitForTimeout(50);

  const before = await page.evaluate(() => ({
    scrollY: window.scrollY,
    mainTop: document.querySelector<HTMLElement>("#main-content")?.getBoundingClientRect().top ?? 0,
  }));
  expect(before.scrollY).toBeGreaterThan(0);

  // Open the same Log menu the mobile BottomNav button opens, without depending
  // on localized button text.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("bixbo:toggle-log")));
  await page.locator('button[data-log-category="pain"]').click();

  const painSurface = page.locator('[data-bixbo-log-surface="pain"]');
  await expect(painSurface).toBeVisible();
  await expect(bottomNav).toHaveCSS("display", "none");
  await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe("fixed");

  const note = page.getByPlaceholder("Anything else…");
  for (let step = 0; step < 7 && !(await note.isVisible()); step += 1) {
    await page.getByRole("button", { name: "Next" }).click();
  }
  await expect(note).toBeVisible();

  const lockedTopBeforeFocus = await page.evaluate(
    () => document.querySelector<HTMLElement>("#main-content")?.getBoundingClientRect().top ?? 0,
  );
  expect(Math.abs(lockedTopBeforeFocus - before.mainTop)).toBeLessThanOrEqual(2);

  await note.click();
  await note.fill("Line one\nLine two");
  await expect(note).toHaveValue("Line one\nLine two");

  // Put the caret back into the first line and type there. The old regression
  // jumped/re-rendered the page and often forced the caret back to the end.
  await note.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(4, 4);
  });
  await page.keyboard.type("X");
  await expect(note).toHaveValue("LineX one\nLine two");

  const afterFocus = await page.evaluate(() => ({
    mainTop: document.querySelector<HTMLElement>("#main-content")?.getBoundingClientRect().top ?? 0,
    navDisplay: getComputedStyle(document.querySelector('nav[aria-label="Primary navigation"]') as HTMLElement).display,
  }));
  expect(Math.abs(afterFocus.mainTop - before.mainTop)).toBeLessThanOrEqual(2);
  expect(afterFocus.navDisplay).toBe("none");

  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(painSurface).toBeHidden();
  await expect(bottomNav).toBeVisible();

  const restoredScrollY = await page.evaluate(() => window.scrollY);
  expect(Math.abs(restoredScrollY - before.scrollY)).toBeLessThanOrEqual(2);
});
