import { expect, test } from "@playwright/test";
import { PRODUCTION_APP_ORIGIN } from "../src/integrations/auth/account";

test("auth screen renders and account modes work", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password (min 6 chars)")).toBeVisible();

  await page.getByRole("button", { name: "Create account", exact: true }).first().click();
  await expect(page.getByLabel("Your name (optional)")).toBeVisible();
});

test("local Google OAuth returns to production BIXBO, never localhost", async ({ page }) => {
  let authorizeUrl = "";
  await page.route("**/auth/v1/authorize**", async (route) => {
    authorizeUrl = route.request().url();
    await route.fulfill({ status: 200, contentType: "text/html", body: "OAuth intercepted by E2E" });
  });

  await page.goto("/auth");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect.poll(() => authorizeUrl, { timeout: 10_000 }).not.toBe("");

  const url = new URL(authorizeUrl);
  const redirectTo = url.searchParams.get("redirect_to") ?? "";
  expect(redirectTo).toBe(`${PRODUCTION_APP_ORIGIN}/auth`);
  expect(redirectTo).not.toContain("localhost");
  expect(redirectTo).not.toContain("lovable.app");
});

test("production shell and PWA assets are reachable", async ({ page, request }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBeLessThan(500);
  await expect(page.locator("body")).not.toContainText('{"unhandled":true,"message":"HTTPError"}');

  const manifest = await request.get("/manifest.json");
  expect(manifest.status()).toBe(200);
  expect((await manifest.json()).name).toBeTruthy();

  const serviceWorker = await request.get("/bixbo-push-sw.js");
  expect(serviceWorker.status()).toBe(200);
});

test("mobile layout does not introduce page-level horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only layout regression");
  await page.goto("/auth");
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});
