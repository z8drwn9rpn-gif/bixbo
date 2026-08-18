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

test("standalone Home header stays out of the WebKit blur compositor path", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: true,
    });
  });

  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-bixbo-pwa-mode", "standalone");

  const header = page.locator('header[data-bixbo-app-header][data-bixbo-home-header="true"]');
  const title = header.locator("[data-bixbo-display-title]");
  const greeting = header.locator("h1[data-bixbo-app-title] [data-bixbo-display-title] + a");
  const mascot = header.locator("img").first();

  await expect(header).toBeVisible();
  await expect(title).toHaveText("BIXBO");
  await expect(greeting).toBeVisible();

  const headerStyle = await header.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      position: style.position,
      top: style.top,
      backdropFilter: style.backdropFilter || "none",
      webkitBackdropFilter: style.getPropertyValue("-webkit-backdrop-filter") || "none",
      filter: style.filter,
      transform: style.transform,
      willChange: style.willChange,
    };
  });
  expect(headerStyle.position).toBe("relative");
  expect(headerStyle.top).toBe("auto");
  expect(headerStyle.backdropFilter).toBe("none");
  expect(headerStyle.webkitBackdropFilter).toBe("none");
  expect(headerStyle.filter).toBe("none");
  expect(headerStyle.transform).toBe("none");
  expect(headerStyle.willChange).toBe("auto");

  for (const element of [title, greeting]) {
    const style = await element.evaluate((node) => {
      const computed = getComputedStyle(node);
      return {
        textShadow: computed.textShadow,
        filter: computed.filter,
        transform: computed.transform,
        opacity: computed.opacity,
      };
    });
    expect(style.textShadow).toBe("none");
    expect(style.filter).toBe("none");
    expect(style.transform).toBe("none");
    expect(style.opacity).toBe("1");
  }

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
