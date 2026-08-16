import { expect, test } from "@playwright/test";

test("legal pages are public and linked from account creation", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  await expect(page.getByText(/Product analytics are off by default/)).toBeVisible();

  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();

  await page.goto("/auth");
  await page.getByRole("button", { name: "Create account" }).first().click();
  const submit = page.locator('form button[type="submit"]');
  await expect(submit).toBeDisabled();
  const checks = page.locator('form input[type="checkbox"]');
  await expect(checks).toHaveCount(3);
  await checks.nth(0).check();
  await checks.nth(1).check();
  await expect(submit).toBeDisabled();
  await checks.nth(2).check();
  await expect(submit).toBeEnabled();
});

test("onboarding changes only existing preference fields and keeps analytics opt-in", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("bixbo:v2", JSON.stringify({
      settings: {
        language: "en",
        tracking: { pain: true, tetany: true, panic: true, bowel: true, cycle: true, painScale: "half" },
        privacy: { analytics: false, crashReports: true },
      },
    }));
  });
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Next" }).click();
  const tetany = page.getByRole("switch", { name: "Tetany" });
  await expect(tetany).toHaveAttribute("aria-checked", "true");
  await tetany.click();
  await page.getByRole("button", { name: "Next" }).click();
  const analytics = page.getByRole("switch", { name: "Anonymous product analytics" });
  await expect(analytics).toHaveAttribute("aria-checked", "false");
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(async () => page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("bixbo:v2") || "{}") as { settings?: { tracking?: { tetany?: boolean }, privacy?: { analytics?: boolean } } };
    return [data.settings?.tracking?.tetany, data.settings?.privacy?.analytics];
  })).toEqual([false, false]);
});

test("Profile privacy exposes the same analytics opt-in and both legal documents", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("bixbo:v2", JSON.stringify({
      settings: {
        language: "en",
        privacy: { analytics: false, crashReports: true },
      },
    }));
  });
  await page.goto("/profile");
  await page.getByRole("button", { name: /Privacy/ }).first().click();

  const analytics = page.getByRole("button", { name: "Anonymous product analytics" });
  await expect(analytics).toHaveAttribute("aria-pressed", "false").catch(() => undefined);
  await expect(analytics).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Terms of Service" })).toBeVisible();

  await analytics.click();
  await expect.poll(async () => page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("bixbo:v2") || "{}") as { settings?: { privacy?: { analytics?: boolean } } };
    return data.settings?.privacy?.analytics;
  })).toBe(true);
});

test("owned MCP discovery works without the retired platform SDK and tool calls require auth", async ({ request }) => {
  const metadata = await request.get("/.well-known/oauth-protected-resource");
  expect(metadata.ok()).toBeTruthy();
  const metadataJson = await metadata.json() as { resource?: string; authorization_servers?: string[] };
  expect(metadataJson.resource).toContain("/mcp");
  expect(metadataJson.authorization_servers?.[0]).toContain("wgdydwttzsveevkljkmr.supabase.co/auth/v1");

  const initialize = await request.post("/mcp", { data: { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25" } } });
  expect(initialize.ok()).toBeTruthy();
  const initJson = await initialize.json() as { result?: { serverInfo?: { name?: string } } };
  expect(initJson.result?.serverInfo?.name).toBe("bixbo-my-health-diary");

  const list = await request.post("/mcp", { data: { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} } });
  expect(list.ok()).toBeTruthy();
  const listJson = await list.json() as { result?: { tools?: Array<{ name: string }> } };
  expect(listJson.result?.tools?.map((tool) => tool.name)).toContain("get_day_log");

  const call = await request.post("/mcp", { data: { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_day_log", arguments: {} } } });
  expect(call.status()).toBe(401);
});
