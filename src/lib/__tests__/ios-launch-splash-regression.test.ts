import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("iPhone PWA launch presentation", () => {
  it("shows the BIXBO penguin on a real standalone launch without replaying it on reload", () => {
    const root = readFileSync("src/routes/__root.tsx", "utf8");

    expect(existsSync("public/apple-launch-bixbo.png")).toBe(true);
    expect(existsSync("public/bixbo-mascot-masked.svg")).toBe(true);
    expect(root).toContain('rel: "apple-touch-startup-image"');
    expect(root).toContain('href: "/apple-touch-icon.png"');
    expect(root).toContain("APPLE_PWA_LAUNCH_SPLASH_BOOTSTRAP");
    expect(root).toContain("APPLE_PWA_LAUNCH_SPLASH_CSS");
    expect(root).toContain('id="bixbo-ios-launch-splash"');
    expect(root).toContain('src="/bixbo-mascot-masked.svg?v=20260816-startup"');
    expect(root).toContain('(display-mode: standalone)');
    expect(root).toContain('navigationType === "reload"');
    expect(root).toContain('navigationType === "back_forward"');
    expect(root).not.toContain("sessionStorage");
    expect(root).toContain("bixbo-ios-launch-splash-hide");
  });
});
