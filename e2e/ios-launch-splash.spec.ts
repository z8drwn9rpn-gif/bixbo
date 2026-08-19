import { expect, test } from "@playwright/test";

test("standalone launch hands off from the BIXBO overlay without an artificial one-second hold", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: true,
    });
  });

  await page.goto("/");

  const splash = page.locator("#bixbo-ios-launch-splash");
  const mascot = splash.locator("img");

  await expect(mascot).toHaveAttribute("src", /bixbo-mascot-user\.png\?v=20260816-launch6/);
  await expect(page.locator("html")).toHaveAttribute("data-bixbo-pwa-launch", "hidden", { timeout: 900 });
  await expect(splash).toBeHidden();
});

test("standalone Home header keeps the wordmark on a pixel-stable WebKit path", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: true,
    });
  });

  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-bixbo-pwa-mode", "standalone");

  const frame = page.locator("[data-bixbo-app-frame]");
  const header = page.locator('header[data-bixbo-app-header][data-bixbo-home-header="true"]');
  const heading = header.locator("h1[data-bixbo-app-title]");
  const title = header.locator("[data-bixbo-display-title]");
  const greeting = header.locator("h1[data-bixbo-app-title] [data-bixbo-display-title] + a");
  const mascot = header.locator("img").first();

  await expect(frame).toBeVisible();
  await expect(header).toBeVisible();
  await expect(title).toHaveText("BIXBO");
  await expect(greeting).toBeVisible();

  const frameStyle = await frame.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      overflowX: style.overflowX,
      filter: style.filter,
      transform: style.transform,
      willChange: style.willChange,
    };
  });
  expect(frameStyle.overflowX).toBe("clip");
  expect(frameStyle.filter).toBe("none");
  expect(frameStyle.transform).toBe("none");
  expect(frameStyle.willChange).toBe("auto");

  const headerStyle = await header.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      position: style.position,
      zIndex: style.zIndex,
      overflow: style.overflow,
      backdropFilter: style.backdropFilter || "none",
      webkitBackdropFilter: style.getPropertyValue("-webkit-backdrop-filter") || "none",
      filter: style.filter,
      transform: style.transform,
      willChange: style.willChange,
    };
  });
  expect(headerStyle.position).toBe("static");
  expect(headerStyle.zIndex).toBe("auto");
  expect(headerStyle.overflow).toBe("visible");
  expect(headerStyle.backdropFilter).toBe("none");
  expect(headerStyle.webkitBackdropFilter).toBe("none");
  expect(headerStyle.filter).toBe("none");
  expect(headerStyle.transform).toBe("none");
  expect(headerStyle.willChange).toBe("auto");

  const headingStyle = await heading.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      whiteSpace: style.whiteSpace,
      textOverflow: style.textOverflow,
    };
  });
  expect(headingStyle.overflowX).toBe("visible");
  expect(headingStyle.overflowY).toBe("visible");
  expect(headingStyle.whiteSpace).toBe("normal");
  expect(headingStyle.textOverflow).toBe("clip");

  const titleStyle = await title.evaluate((node) => {
    const computed = getComputedStyle(node);
    return {
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      textShadow: computed.textShadow,
      filter: computed.filter,
      transform: computed.transform,
      opacity: computed.opacity,
    };
  });
  expect(["36px", "40px"]).toContain(titleStyle.lineHeight);
  expect(Number.isInteger(Number.parseFloat(titleStyle.lineHeight))).toBe(true);
  expect(titleStyle.letterSpacing).toBe("-1px");
  expect(titleStyle.textShadow).toBe("none");
  expect(titleStyle.filter).toBe("none");
  expect(titleStyle.transform).toBe("none");
  expect(titleStyle.opacity).toBe("1");

  const greetingStyle = await greeting.evaluate((node) => {
    const computed = getComputedStyle(node);
    return {
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      textShadow: computed.textShadow,
      filter: computed.filter,
      transform: computed.transform,
      opacity: computed.opacity,
    };
  });
  expect(greetingStyle.lineHeight).toBe("16px");
  expect(greetingStyle.letterSpacing).toBe("0px");
  expect(greetingStyle.textShadow).toBe("none");
  expect(greetingStyle.filter).toBe("none");
  expect(greetingStyle.transform).toBe("none");
  expect(greetingStyle.opacity).toBe("1");

  const mascotStyle = await mascot.evaluate((element) => {
    const style = getComputedStyle(element);
    return { filter: style.filter, transform: style.transform };
  });
  expect(mascotStyle.filter).toBe("none");
  expect(mascotStyle.transform).toBe("none");
});

test("normal browser navigation does not replay the standalone splash", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#bixbo-ios-launch-splash")).toBeHidden();
  await expect(page.locator("html")).toHaveAttribute("data-bixbo-pwa-launch", "hidden");
  await expect(page.locator("html")).toHaveAttribute("data-bixbo-pwa-mode", "browser");
});
