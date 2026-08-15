import { expect, test } from "@playwright/test";
import { PRODUCTION_APP_ORIGIN } from "../src/integrations/auth/account";

test("Google OAuth callback surfaces invalid client configuration failures", async ({ page }) => {
  const description = encodeURIComponent("Unable to exchange external code: invalid_client — The provided client secret is invalid.");
  await page.goto(`/auth?error=server_error&error_code=unexpected_failure&error_description=${description}`);

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(
    "Google sign-in is temporarily unavailable because its OAuth client configuration was rejected. Please try again after the Google sign-in configuration is corrected.",
  );
});

test("Google OAuth callback keeps a safe provider message for ordinary failures", async ({ page }) => {
  await page.goto("/auth?error=access_denied&error_description=The%20request%20was%20cancelled.");
  await expect(page.getByRole("status")).toHaveText("The request was cancelled.");
});

test("Google OAuth preserves a safe internal next destination", async ({ page }) => {
  let authorizeUrl = "";
  await page.route("**/auth/v1/authorize**", async (route) => {
    authorizeUrl = route.request().url();
    await route.fulfill({ status: 200, contentType: "text/html", body: "OAuth intercepted by E2E" });
  });

  await page.goto("/auth?next=%2Fcouple%3Ftab%3Dsharing");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect.poll(() => authorizeUrl, { timeout: 10_000 }).not.toBe("");

  const authorize = new URL(authorizeUrl);
  const redirectTo = new URL(authorize.searchParams.get("redirect_to") ?? "");
  expect(redirectTo.origin).toBe(PRODUCTION_APP_ORIGIN);
  expect(redirectTo.pathname).toBe("/auth");
  expect(redirectTo.searchParams.get("next")).toBe("/couple?tab=sharing");
});

test("Google OAuth drops an external next destination", async ({ page }) => {
  let authorizeUrl = "";
  await page.route("**/auth/v1/authorize**", async (route) => {
    authorizeUrl = route.request().url();
    await route.fulfill({ status: 200, contentType: "text/html", body: "OAuth intercepted by E2E" });
  });

  await page.goto("/auth?next=https%3A%2F%2Fevil.example%2Fsteal");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect.poll(() => authorizeUrl, { timeout: 10_000 }).not.toBe("");

  const authorize = new URL(authorizeUrl);
  const redirectTo = new URL(authorize.searchParams.get("redirect_to") ?? "");
  expect(redirectTo.toString()).toBe(`${PRODUCTION_APP_ORIGIN}/auth`);
  expect(redirectTo.searchParams.has("next")).toBe(false);
});
