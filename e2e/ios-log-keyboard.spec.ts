import { expect, test } from "@playwright/test";

test("mobile Pain note keeps the background locked and BottomNav stable", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "mobile-only iOS keyboard regression");

  await page.goto("/");
  const bottomNav = page.locator('nav[aria-label="Primary navigation"]');
  await expect(bottomNav).toBeVisible();

  // Open the same Log menu the mobile BottomNav button opens, without depending
  // on localized button text.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("bixbo:toggle-log")));
  await page.locator('button[data-log-category="pain"]').click();

  const painSurface = page.locator('[data-bixbo-log-surface="pain"]');
  await expect(painSurface).toBeVisible();
  await expect(bottomNav).toHaveCSS("display", "none");

  // The background is locked with overflow, never by turning body into a fixed
  // compositor layer. Fixed-body locking fights iOS VisualViewport and was one
  // of the causes of the jump/freeze while focusing text fields.
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
  expect(await page.evaluate(() => document.body.style.position)).not.toBe("fixed");

  const note = page.getByPlaceholder("Anything else…");
  for (let step = 0; step < 7 && !(await note.isVisible()); step += 1) {
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await expect(note).toBeVisible();

  // Reproduce the real iPhone path: Details is long, so the user scrolls down to
  // Note before tapping it. Focusing Note must not reset the log back to top.
  await note.scrollIntoViewIfNeeded();
  const painScrollBeforeFocus = await painSurface.evaluate((element) => element.scrollTop);
  expect(painScrollBeforeFocus).toBeGreaterThan(0);

  const lockedBeforeFocus = await page.evaluate(() => ({
    bodyOverflow: document.body.style.overflow,
    rootOverflow: document.documentElement.style.overflow,
    windowScrollY: window.scrollY,
    lockToken: document.documentElement.getAttribute("data-bixbo-log-form-open"),
  }));
  expect(lockedBeforeFocus.lockToken).toBeTruthy();

  await note.click();
  await note.fill("Line one\nLine two");
  await expect(note).toHaveValue("Line one\nLine two");

  const painScrollAfterFocus = await painSurface.evaluate((element) => element.scrollTop);
  expect(painScrollAfterFocus).toBeGreaterThan(0);

  // Put the caret back into the first line and type there. The old regression
  // jumped/re-rendered the page and often forced the caret back to the end.
  await note.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(4, 4);
  });
  await page.keyboard.type("X");
  await expect(note).toHaveValue("LineX one\nLine two");

  const painScrollAfterCaretEdit = await painSurface.evaluate((element) => element.scrollTop);
  expect(painScrollAfterCaretEdit).toBeGreaterThan(0);

  const afterFocus = await page.evaluate(() => ({
    bodyOverflow: document.body.style.overflow,
    rootOverflow: document.documentElement.style.overflow,
    windowScrollY: window.scrollY,
    bodyPosition: document.body.style.position,
    lockToken: document.documentElement.getAttribute("data-bixbo-log-form-open"),
  }));
  expect(afterFocus.bodyOverflow).toBe(lockedBeforeFocus.bodyOverflow);
  expect(afterFocus.rootOverflow).toBe(lockedBeforeFocus.rootOverflow);
  expect(afterFocus.windowScrollY).toBe(lockedBeforeFocus.windowScrollY);
  expect(afterFocus.bodyPosition).not.toBe("fixed");
  expect(afterFocus.lockToken).toBe(lockedBeforeFocus.lockToken);
  await expect(bottomNav).toHaveCSS("display", "none");

  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(painSurface).toBeHidden();
  await expect(bottomNav).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  await expect.poll(() => page.evaluate(() => document.documentElement.hasAttribute("data-bixbo-log-form-open"))).toBe(false);
});
