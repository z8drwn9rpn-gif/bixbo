import { expect, test } from "@playwright/test";

test("explicit dark mode applies before core UI interaction and keeps a solid canvas", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("bixbo:theme-choice", "dark"));
  await page.goto("/");

  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(root).toHaveClass(/dark/);

  const colors = await page.evaluate(() => ({
    rootBackground: getComputedStyle(document.documentElement).backgroundColor,
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    foreground: getComputedStyle(document.body).color,
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
  }));

  expect(colors.rootBackground).not.toBe("rgba(0, 0, 0, 0)");
  expect(colors.bodyBackground).not.toBe("rgba(0, 0, 0, 0)");
  expect(colors.bodyBackground).not.toBe(colors.foreground);
  expect(colors.colorScheme).toContain("dark");
});

test("explicit light mode overrides a dark OS preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => localStorage.setItem("bixbo:theme-choice", "light"));
  await page.goto("/");

  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-theme", "light");
  await expect(root).toHaveClass(/light/);
  await expect(root).not.toHaveClass(/dark/);
});
