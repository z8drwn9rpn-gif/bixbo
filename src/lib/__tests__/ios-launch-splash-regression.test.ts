import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("iPhone PWA launch presentation", () => {
  it("keeps the native startup asset without overlaying a penguin on every document reload", () => {
    const root = readFileSync("src/routes/__root.tsx", "utf8");

    expect(existsSync("public/apple-launch-bixbo.png")).toBe(true);
    expect(root).toContain('rel: "apple-touch-startup-image"');
    expect(root).toContain('href: "/apple-touch-icon.png"');
    expect(root).not.toContain("APPLE_PWA_LAUNCH_SPLASH_BOOTSTRAP");
    expect(root).not.toContain("APPLE_PWA_LAUNCH_SPLASH_CSS");
    expect(root).not.toContain('dataset.applePwaLaunch = "true"');
    expect(root).not.toContain('id="bixbo-ios-launch-splash"');
    expect(root).not.toContain("bixbo-ios-launch-splash-hide");
  });
});
