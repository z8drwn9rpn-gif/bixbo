import { expect, test } from "@playwright/test";

test("Worker responses carry hardened security headers", async ({ request }) => {
  const response = await request.get("/auth");
  expect(response.status()).toBeLessThan(500);
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response.headers()["permissions-policy"]).toContain("camera=()");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("client telemetry accepts only coarse crash fingerprints", async ({ request }) => {
  const ok = await request.post("/api/public/client-error", {
    data: {
      source: "route-error",
      name: "TypeError",
      path: "/profile?private=value#secret",
      build: "0123456789abcdef",
    },
  });
  expect(ok.status()).toBe(204);

  const arbitrary = await request.post("/api/public/client-error", {
    data: { source: "anything", message: "sensitive health text" },
  });
  expect(arbitrary.status()).toBe(400);
});

test("fingerprinted assets are immutable while app documents are not", async ({ page, request }) => {
  await page.goto("/auth");
  const assetUrl = await page.locator('script[src*="/assets/"]').first().getAttribute("src");
  expect(assetUrl).toBeTruthy();
  const asset = await request.get(assetUrl!);
  expect(asset.headers()["cache-control"]).toContain("max-age=31536000");
  expect(asset.headers()["cache-control"]).toContain("immutable");

  const document = await request.get("/auth");
  expect(document.headers()["cache-control"] ?? "").not.toContain("immutable");
});
