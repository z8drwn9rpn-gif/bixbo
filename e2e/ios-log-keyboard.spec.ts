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

async function advancePain(page: Page, to: number) {
  const nav = page.locator('[data-bixbo-log-surface="pain"] > div > div.sticky').first();
  for (let step = 1; step < to; step += 1) {
    await expect(nav.getByText(`${step}/5`, { exact: true })).toBeVisible();
    await nav.getByRole("button", { name: "Next", exact: true }).click();
    await expect(nav.getByText(`${step + 1}/5`, { exact: true })).toBeVisible();
    if (step + 1 < to) await page.waitForTimeout(275);
  }
}

test("mobile Pain note keeps the log geometry and background stable", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "mobile-only iOS keyboard regression");

  await page.goto("/");
  const bottomNav = page.locator('nav[aria-label="Primary navigation"]');
  await expect(bottomNav).toBeVisible();

  await openLogMenu(page);
  await page.locator('button[data-log-category="pain"]').click();

  const painSurface = page.locator('[data-bixbo-log-surface="pain"]');
  const logShell = page.locator('[data-bixbo-fullscreen-log="true"]');
  await expect(painSurface).toBeVisible();
  await expect(logShell).toBeVisible();
  await expect(bottomNav).toHaveCSS("display", "none");

  // Background lock must never turn body into a fixed compositor layer.
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
  expect(await page.evaluate(() => document.body.style.position)).not.toBe("fixed");

  // Regression for the real iOS failure: old code fed VisualViewport height and
  // offset into the complete sheet. Simulate a dramatic keyboard viewport change
  // by mutating the legacy variables. The rendered shell must remain identical.
  const shellBefore = await logShell.boundingBox();
  expect(shellBefore).not.toBeNull();
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--bixbo-viewport-height", "390px");
    document.documentElement.style.setProperty("--bixbo-viewport-offset", "210px");
    document.documentElement.style.setProperty("--bixbo-keyboard-inset", "390px");
  });
  await page.waitForTimeout(50);
  const shellAfterSyntheticKeyboard = await logShell.boundingBox();
  expect(shellAfterSyntheticKeyboard).not.toBeNull();
  expect(Math.abs((shellAfterSyntheticKeyboard?.y ?? 0) - (shellBefore?.y ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((shellAfterSyntheticKeyboard?.height ?? 0) - (shellBefore?.height ?? 0))).toBeLessThanOrEqual(1);

  await advancePain(page, 5);
  const note = page.getByPlaceholder("Anything else…");
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

  // Put the caret back into the first line and type there. The log and caret must
  // stay where the user put them instead of rerendering back to the end/top.
  await note.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(4, 4);
  });
  await page.keyboard.type("X");
  await expect(note).toHaveValue("LineX one\nLine two");

  // Emoji/BIXBO symbols must use exactly the same native editing path. Previously
  // the component encoded the value during every keystroke, which moved the iOS
  // caret and made wrapped/second-line edits jump back to the end.
  await note.fill("Alpha ⭐ beta\nGamma");
  await note.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(2, 2);
  });
  await page.keyboard.type("X");
  await expect(note).toHaveValue("AlXpha ⭐ beta\nGamma");

  await note.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    const secondLineStart = textarea.value.indexOf("\n") + 1;
    textarea.focus();
    textarea.setSelectionRange(secondLineStart + 2, secondLineStart + 2);
  });
  await page.keyboard.type("Y");
  await expect(note).toHaveValue("AlXpha ⭐ beta\nGaYmma");

  const painScrollAfterCaretEdit = await painSurface.evaluate((element) => element.scrollTop);
  expect(painScrollAfterCaretEdit).toBeGreaterThan(0);

  const shellAfterTyping = await logShell.boundingBox();
  expect(shellAfterTyping).not.toBeNull();
  expect(Math.abs((shellAfterTyping?.y ?? 0) - (shellBefore?.y ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((shellAfterTyping?.height ?? 0) - (shellBefore?.height ?? 0))).toBeLessThanOrEqual(1);

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
