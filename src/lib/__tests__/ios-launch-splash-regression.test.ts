import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("iPhone PWA launch presentation", () => {
  it("shows the BIXBO penguin for one second on each new app document launch", () => {
    const root = readFileSync("src/routes/__root.tsx", "utf8");

    expect(existsSync("public/apple-launch-bixbo.png")).toBe(true);
    expect(existsSync("public/bixbo-mascot-user.png")).toBe(true);
    expect(root).toContain('rel: "apple-touch-startup-image"');
    expect(root).toContain('href: "/apple-touch-icon.png"');
    expect(root).toContain("APPLE_PWA_LAUNCH_SPLASH_BOOTSTRAP");
    expect(root).toContain("APPLE_PWA_LAUNCH_SPLASH_CSS");
    expect(root).toContain('id="bixbo-ios-launch-splash"');
    expect(root).toContain('src="/bixbo-mascot-user.png?v=20260816-launch3"');
    expect(root).toContain('root.dataset.bixboPwaLaunch = "visible"');
    expect(root).toContain('}, 1000);');
    expect(root).not.toContain("sessionStorage");
    expect(root).toContain("bixbo-ios-launch-splash-hide");
  });
});
