import { expect, test } from "@playwright/test";
import { PRODUCTION_APP_ORIGIN } from "../src/integrations/auth/account";

test("auth screen renders and account modes work", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();

  await page.getByRole("button", { name: "Create account", exact: true }).first().click();
  await expect(page.getByLabel("Your name (optional)")).toBeVisible();
  const signupPassword = page.getByLabel("Password (min 8 chars)");
  await expect(signupPassword).toBeVisible();
  await expect(signupPassword).toHaveAttribute("minlength", "8");
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

test("Worker responses carry baseline security headers", async ({ request }) => {
  const response = await request.get("/auth");
  expect(response.status()).toBeLessThan(500);
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response.headers()["permissions-policy"]).toContain("camera=()");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("mobile layout does not introduce page-level horizontal overflow", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "mobile-only layout regression");
  await page.goto("/auth");
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test("mobile Quick Log Add stays in the viewport and creates a button", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "mobile-only Quick Log regression");

  await page.goto("/");

  const moreOptions = page.getByRole("button", { name: "More options" }).first();
  await moreOptions.scrollIntoViewIfNeeded();
  await moreOptions.click();
  await page.getByRole("button", { name: "Add", exact: true }).click();

  const heading = page.getByText("New quick log button", { exact: true });
  await expect(heading).toBeVisible();

  const surface = heading.locator("..");
  const overlay = surface.locator("..");
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  const overlayBox = await overlay.boundingBox();
  const surfaceBox = await surface.boundingBox();
  expect(overlayBox).not.toBeNull();
  expect(surfaceBox).not.toBeNull();

  expect(Math.abs((overlayBox?.y ?? 0))).toBeLessThanOrEqual(2);
  expect(Math.abs((overlayBox?.height ?? 0) - (viewport?.height ?? 0))).toBeLessThanOrEqual(3);
  expect(surfaceBox?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((surfaceBox?.y ?? 0) + (surfaceBox?.height ?? 0)).toBeLessThanOrEqual((viewport?.height ?? 0) + 2);

  const bottomNavIsTopmost = await page.evaluate(() => {
    const element = document.elementFromPoint(window.innerWidth / 2, Math.max(0, window.innerHeight - 8));
    return Boolean(element?.closest('nav[aria-label="Primary navigation"]'));
  });
  expect(bottomNavIsTopmost).toBe(false);

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("2. Preset values", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("3. Icon and name", { exact: true })).toBeVisible();

  await page.getByPlaceholder("Button name").fill("E2E quick tag");
  await page.getByRole("button", { name: "Create", exact: true }).click();

  await expect(heading).toBeHidden();
  await expect(page.getByRole("button", { name: "E2E quick tag", exact: true })).toBeVisible();
});