import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("iPhone PWA launch splash", () => {
  it("shows the BIXBO penguin while a standalone iPhone app starts", () => {
    const root = readFileSync("src/routes/__root.tsx", "utf8");

    expect(existsSync("public/apple-launch-bixbo.png")).toBe(true);
    expect(root).toContain('rel: "apple-touch-startup-image"');
    expect(root).toContain("APPLE_PWA_LAUNCH_SPLASH_BOOTSTRAP");
    expect(root).toContain('id="bixbo-ios-launch-splash"');
    expect(root).toContain('data-ready", "true"');
    expect(root).toContain('href: "/apple-touch-icon.png"');
    expect(root).not.toContain("apple-touch-icon-bixbo-v2.png");
  });
});
