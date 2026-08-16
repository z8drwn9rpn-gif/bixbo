import { expect, test, type Page } from "@playwright/test";

// The BIXBO PWA service worker can own Supabase fetches before Playwright's
// page.route() sees them. Block it only in this auth spec so the ID-token network
// exchange is deterministic while leaving the rest of the PWA E2E unchanged.
test.use({ serviceWorkers: "block" });

const GOOGLE_CLIENT_ID = "545023380659-ovg56o3vo09oari9g02qodvdbtt42hep.apps.googleusercontent.com";

async function installGoogleIdentityStub(page: Page) {
  await page.route("https://accounts.google.com/gsi/client", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `
        window.__bixboGoogleInit = null;
        window.google = {
          accounts: {
            id: {
              initialize(config) {
                window.__bixboGoogleInit = config;
                window.__bixboGoogleClientId = config.client_id;
              },
              renderButton(parent) {
                const button = document.createElement("button");
                button.type = "button";
                button.setAttribute("aria-label", "Continue with Google");
                button.textContent = "Continue with Google";
                button.addEventListener("click", () => {
                  window.__bixboGoogleInit.callback({ credential: "e2e-google-id-token" });
                });
                parent.replaceChildren(button);
              },
              prompt() {},
            },
          },
        };
      `,
    });
  });
}

async function installSupabaseIdTokenStub(page: Page, capture: (body: Record<string, unknown>) => void) {
  // Playwright glob `?` is a wildcard rather than a literal query separator, so
  // match the endpoint broadly and inspect the query string explicitly.
  await page.route("**/auth/v1/token**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("grant_type") !== "id_token") {
      await route.continue();
      return;
    }

    capture((route.request().postDataJSON() ?? {}) as Record<string, unknown>);
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMDAiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjo0MTAyNDQ0ODAwfQ.",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: 4102444800,
        refresh_token: "e2e-refresh-token",
        user: {
          id: "00000000-0000-4000-8000-000000000000",
          aud: "authenticated",
          role: "authenticated",
          email: "google-e2e@example.com",
          email_confirmed_at: now,
          confirmed_at: now,
          last_sign_in_at: now,
          app_metadata: { provider: "google", providers: ["google"] },
          user_metadata: { email: "google-e2e@example.com", email_verified: true, full_name: "Google E2E" },
          identities: [],
          created_at: now,
          updated_at: now,
          is_anonymous: false,
        },
      }),
    });
  });
}

test("legacy Google OAuth callback still surfaces invalid client configuration failures", async ({ page }) => {
  await installGoogleIdentityStub(page);
  const description = encodeURIComponent("Unable to exchange external code: invalid_client — The provided client secret is invalid.");
  await page.goto(`/auth?error=server_error&error_code=unexpected_failure&error_description=${description}`);

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(
    "Google sign-in is temporarily unavailable because its OAuth client configuration was rejected. Please try again after the Google sign-in configuration is corrected.",
  );
});

test("legacy Google OAuth callback keeps a safe provider message for ordinary failures", async ({ page }) => {
  await installGoogleIdentityStub(page);
  await page.goto("/auth?error=access_denied&error_description=The%20request%20was%20cancelled.");
  await expect(page.getByRole("status")).toHaveText("The request was cancelled.");
});

test("Google sign-in uses GIS ID token and preserves a safe internal next destination", async ({ page }) => {
  let tokenBody: Record<string, unknown> = {};
  await installGoogleIdentityStub(page);
  await installSupabaseIdTokenStub(page, (body) => { tokenBody = body; });

  await page.goto("/auth?next=%2Fcouple%3Ftab%3Dsharing");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __bixboGoogleClientId?: string }).__bixboGoogleClientId)).toBe(GOOGLE_CLIENT_ID);

  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect.poll(() => tokenBody.id_token ?? tokenBody.token, { timeout: 10_000 }).toBe("e2e-google-id-token");
  expect(tokenBody.provider).toBe("google");
  expect(typeof tokenBody.nonce).toBe("string");
  expect(String(tokenBody.nonce).length).toBeGreaterThan(20);
  await page.waitForURL(/\/couple\?tab=sharing$/, { timeout: 10_000 });
});

test("Google sign-in drops an external next destination", async ({ page }) => {
  let tokenBody: Record<string, unknown> = {};
  await installGoogleIdentityStub(page);
  await installSupabaseIdTokenStub(page, (body) => { tokenBody = body; });

  await page.goto("/auth?next=https%3A%2F%2Fevil.example%2Fsteal");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect.poll(() => tokenBody.provider, { timeout: 10_000 }).toBe("google");
  await page.waitForURL(/\/settings$/, { timeout: 10_000 });
  expect(new URL(page.url()).hostname).not.toBe("evil.example");
});
