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

test("standalone Home paint island stays out of the WebKit blur compositor path", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: true,
    });
  });

  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-bixbo-pwa-mode", "standalone");

  const island = page.locator("[data-bixbo-home-paint-island]");
  const title = island.locator("[data-bixbo-home-wordmark]");
  const titleHost = island.locator("[data-bixbo-app-title]");
  const greeting = island.getByRole("link", { name: "Profile", exact: true });
  const mascot = island.locator("img").first();

  await expect(island).toBeVisible();
  await expect(title).toHaveAttribute("aria-label", "BIXBO");
  await expect(greeting).toBeVisible();

  const islandStyle = await island.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      position: style.position,
      backdropFilter: style.backdropFilter || "none",
      webkitBackdropFilter: style.getPropertyValue("-webkit-backdrop-filter") || "none",
      filter: style.filter,
      transform: style.transform,
      willChange: style.willChange,
    };
  });
  expect(islandStyle.position).toBe("relative");
  expect(islandStyle.backdropFilter).toBe("none");
  expect(islandStyle.webkitBackdropFilter).toBe("none");
  expect(islandStyle.filter).toBe("none");
  expect(islandStyle.transform).toBe("none");
  expect(islandStyle.willChange).toBe("auto");

  for (const element of [titleHost, greeting]) {
    const style = await element.evaluate((node) => {
      const computed = getComputedStyle(node);
      return {
        filter: computed.filter,
        transform: computed.transform,
        opacity: computed.opacity,
      };
    });
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
