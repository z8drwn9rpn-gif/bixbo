import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("iPhone PWA launch presentation", () => {
  it("keeps the native startup asset and a non-blocking once-per-session standalone splash", () => {
    const root = readFileSync("src/routes/__root.tsx", "utf8");

    expect(existsSync("public/apple-launch-bixbo.png")).toBe(true);
    expect(root).toContain('rel: "apple-touch-startup-image"');
    expect(root).toContain('href: "/apple-touch-icon.png"');
    expect(root).toContain("APPLE_PWA_LAUNCH_SPLASH_BOOTSTRAP");
    expect(root).toContain("APPLE_PWA_LAUNCH_SPLASH_CSS");
    expect(root).toContain('(display-mode: standalone)');
    expect(root).toContain('sessionStorage.getItem(sessionKey) === "shown"');
    expect(root).toContain('sessionStorage.setItem(sessionKey, "shown")');
    expect(root).toContain('root.dataset.bixboPwaLaunch = "visible"');
    expect(root).toContain('id="bixbo-ios-launch-splash"');
    expect(root).toContain("pointer-events: none");
    expect(root).toContain("bixbo-ios-launch-splash-hide");
    expect(root).toContain("}, 650);");
    expect(root).toContain("window.setTimeout(hide, 3500)");
  });
});
